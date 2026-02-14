# GhostNote SaaS Upgrade - Block 1.1: Team/Organization Layer

## Executive Summary

This document outlines the database architecture changes required to introduce a Team (Organization) layer to GhostNote, enabling agency/multi-user workflows while maintaining backward compatibility.

---

## 1. Current Schema Analysis

### 1.1 Existing Data Models

**User Table** (from [`types.ts`](types.ts:18)):
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique user ID (format: `user_*`) |
| `email` | string | User email |
| `name` | string | Display name |
| `plan` | UserPlan | `echo` \| `clone` \| `syndicate` |
| `credits` | number | Credits for echo plan |
| `joinedDate` | string | ISO timestamp |

**VoicePreset Table** (Linguistic DNA / Voice Profiles):
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique preset ID |
| `name` | string | Display name |
| `referenceText` | string | Style reference text |
| `ownerId` | string | FK to User.id |

---

## 2. New Data Models

### 2.1 Team Model

```sql
-- See: plans/migrations/001_create_teams.sql
```

**TypeScript Interface:**
```typescript
interface Team {
  id: string;                    // "team_*" + random
  name: string;                  // Default: "User's Team"
  ownerId: string;               // FK to User.id
  subscriptionStatus: 'active' | 'suspended' | 'cancelled';
  subscriptionPlan: UserPlan;
  settings: TeamSettings;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 TeamMember Model

```sql
-- See: plans/migrations/002_create_team_members.sql
```

**TypeScript Interface:**
```typescript
enum TeamRole {
  ADMIN = 'admin',      // Full access, manage settings
  EDITOR = 'editor',    // Create/edit content
  VIEWER = 'viewer'     // Read-only
}

interface TeamMember {
  id: string;           // "member_*" + random
  teamId: string;       // FK to Team.id
  userId: string;       // FK to User.id
  role: TeamRole;
  joinedAt: Date;
}
```

---

## 3. Migration Strategy

### 3.1 Phase 1: Schema Migration (Non-Breaking)

Run SQL migrations in order:
```bash
psql -d ghostnote -f plans/migrations/001_create_teams.sql
psql -d ghostnote -f plans/migrations/002_create_team_members.sql
```

### 3.2 Phase 2: Data Migration

Execute [`plans/scripts/migrate-users-to-teams.ts`](plans/scripts/migrate-users-to-teams.ts):

```
FOR EACH user:
  1. Create Team (name: "User's Team", ownerId: user.id)
  2. Create TeamMember (userId: user.id, role: admin)
```

---

## 4. Backward Compatibility

### 4.1 Key Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| User login unchanged | No changes to `dbService.login()` |
| Legacy ownerId preserved | VoicePreset.ownerId stays intact |
| Lazy migration | Teams created on-first-access for existing users |

### 4.2 Compatibility Query Pattern

```typescript
// Get user's content (supports both legacy and new)
async function getUserVoicePresets(userId: string): Promise<VoicePreset[]> {
  // 1. Get user's team
  const teamId = await getUserTeamId(userId);
  
  // 2. Query both ownership models
  return db.voice_presets.find({
    $or: [
      { ownerId: userId },          // Legacy: direct ownership
      { teamId: teamId }            // New: team ownership
    ]
  });
}
```

---

## 5. Production Deployment

### 5.1 Pre-Migration Checklist

- [ ] Backup database: `pg_dump ghostnote_prod > backup_$(date +%Y%m%d).sql`
- [ ] Test migrations on staging environment
- [ ] Schedule low-traffic maintenance window

### 5.2 Deployment Commands

```bash
# 1. Run schema migrations
psql -d ghostnote_prod -f plans/migrations/001_create_teams.sql
psql -d ghostnote_prod -f plans/migrations/002_create_team_members.sql

# 2. Run data migration (during maintenance window)
npx ts-node plans/scripts/migrate-users-to-teams.ts

# 3. Verify
psql -d ghostnote_prod -c "SELECT COUNT(*) FROM teams;"
psql -d ghostnote_prod -c "SELECT COUNT(*) FROM team_members;"

# 4. Deploy application
npm run build && npm run start
```

### 5.3 Rollback

```bash
# If critical failure occurs:
psql -d ghostnote_prod -c "DROP TABLE IF EXISTS team_members CASCADE;"
psql -d ghostnote_prod -c "DROP TABLE IF EXISTS teams CASCADE;"
psql -d ghostnote_prod < backup_20260214.sql
```

---

## 6. Post-Migration Tasks (Future Blocks)

1. **Block 1.2**: Migrate VoicePreset.ownerId → VoicePreset.teamId
2. **Block 1.3**: Implement team invitation system
3. **Block 1.4**: Add role-based access control (RBAC)
4. **Block 1.5**: Build team dashboard UI

---

## 7. Files Created

| File | Purpose |
|------|---------|
| [`plans/migrations/001_create_teams.sql`](plans/migrations/001_create_teams.sql) | SQL to create teams table |
| [`plans/migrations/002_create_team_members.sql`](plans/migrations/002_create_team_members.sql) | SQL to create team_members table |
| [`plans/scripts/migrate-users-to-teams.ts`](plans/scripts/migrate-users-to-teams.ts) | Data migration script |
| [`plans/TEAM_MIGRATION_PLAN.md`](plans/TEAM_MIGRATION_PLAN.md) | This document |

---

## 8. Summary

- **Team Model**: Created with default name "User's Team"
- **TeamMember Model**: Links users to teams with Admin/Editor/Viewer roles
- **Migration**: Idempotent script creates 1:1 user-to-team mapping
- **Backward Compatibility**: Legacy ownerId preserved, lazy team creation for existing users
- **Production Safe**: Includes rollback procedure and verification queries
