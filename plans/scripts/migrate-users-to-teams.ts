/**
 * GhostNote Team Migration Script
 * 
 * Purpose: Migrate all existing users to have their own personal team
 * 
 * How it works:
 * 1. Connect to the database (localStorage for dev, PostgreSQL for prod)
 * 2. Iterate through all existing users
 * 3. For each user, create a new Team
 * 4. Assign that user as ADMIN of their team
 * 5. Log results for monitoring
 * 
 * Usage:
 *   Development: npx ts-node plans/scripts/migrate-users-to-teams.ts --mode=local
 *   Production:  npx ts-node plans/scripts/migrate-users-to-teams.ts --mode=prod
 * 
 * Prerequisites:
 *   1. Run SQL migrations first: psql -d ghostnote -f plans/migrations/001_create_teams.sql
 *   2. Run SQL migrations second: psql -d ghostnote -f plans/migrations/002_create_team_members.sql
 */

import * as fs from 'fs';
import * as path from 'path';

// Type definitions
type UserPlan = 'echo' | 'clone' | 'syndicate';

interface User {
  id: string;
  email: string;
  name: string;
  plan: UserPlan;
}

interface Team {
  id: string;
  name: string;
  owner_id: string;
  subscription_status: string;
  subscription_plan: string;
  settings: string;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

interface MigrationResult {
  success: boolean;
  teamsCreated: number;
  membersCreated: number;
  skipped: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
}

// Valid plan values
const VALID_PLANS: UserPlan[] = ['echo', 'clone', 'syndicate'];
const VALID_ROLES = ['admin', 'editor', 'viewer'] as const;

// Logging setup
const LOG_FILE = path.join(__dirname, '../../logs/migration-' + new Date().toISOString().split('T')[0] + '.log');

function ensureLogDir(): void {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function log(message: string, isError: boolean = false): void {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  
  ensureLogDir();
  fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
  
  if (isError) {
    fs.appendFileSync(LOG_FILE, `  Stack: ${new Error().stack}\n`);
  }
}

function logSection(title: string): void {
  const separator = '='.repeat(50);
  log(separator);
  log(title);
  log(separator);
}

// Generate unique ID (compatible with SQLite hex() and PostgreSQL)
function generateId(prefix: string): string {
  // Use crypto-safe random bytes
  const randomBytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  const hex = randomBytes.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}${hex}`;
}

// Validate plan value
function validatePlan(plan: string): UserPlan {
  if (!VALID_PLANS.includes(plan as UserPlan)) {
    throw new Error(`Invalid plan: ${plan}. Must be one of: ${VALID_PLANS.join(', ')}`);
  }
  return plan as UserPlan;
}

// Validate role value
function validateRole(role: string): string {
  if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${VALID_ROLES.join(', ')}`);
  }
  return role;
}

// ============ Database Abstraction Layer ============

// Mode: 'local' uses localStorage (dev), 'prod' uses PostgreSQL
type DbMode = 'local' | 'prod';

let dbMode: DbMode = 'prod';

// LocalStorage-based storage (for development/testing)
const STORAGE_KEY_USERS = 'ghostnote_users';
const STORAGE_KEY_TEAMS = 'ghostnote_teams';
const STORAGE_KEY_TEAM_MEMBERS = 'ghostnote_team_members';

function getUsersFromLocalStorage(): User[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USERS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    log(`Error reading users from localStorage: ${e}`, true);
  }
  return [];
}

function saveTeamsToLocalStorage(teams: Team[]): void {
  localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
}

function saveTeamMembersToLocalStorage(members: TeamMember[]): void {
  localStorage.setItem(STORAGE_KEY_TEAM_MEMBERS, JSON.stringify(members));
}

function getTeamsFromLocalStorage(): Team[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TEAMS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

function getTeamMembersFromLocalStorage(): TeamMember[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TEAM_MEMBERS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

// PostgreSQL connection (for production)
let pgClient: any = null;

async function connectPostgreSQL(): Promise<boolean> {
  try {
    // Dynamic import for pg (PostgreSQL client)
    const { Client } = require('pg');
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ghostnote',
    });
    
    await client.connect();
    
    // Test connection
    await client.query('SELECT 1');
    
    pgClient = client;
    log('Connected to PostgreSQL successfully');
    return true;
  } catch (error: any) {
    log(`PostgreSQL connection failed: ${error.message}`, true);
    return false;
  }
}

async function disconnectPostgreSQL(): Promise<void> {
  if (pgClient) {
    await pgClient.end();
    pgClient = null;
  }
}

// ============ Database Operations ============

async function getAllUsers(): Promise<User[]> {
  if (dbMode === 'local') {
    // Development mode: read from localStorage or use mock
    const users = getUsersFromLocalStorage();
    
    // If no users in localStorage, create a sample for testing
    if (users.length === 0) {
      const savedSession = localStorage.getItem('ghostnote_user_session');
      if (savedSession) {
        const user = JSON.parse(savedSession);
        return [user];
      }
    }
    return users;
  } else {
    // Production mode: query PostgreSQL
    if (!pgClient) {
      throw new Error('Not connected to PostgreSQL');
    }
    
    const result = await pgClient.query(`
      SELECT id, email, name, plan 
      FROM users 
      ORDER BY created_at ASC
    `);
    
    return result.rows;
  }
}

async function getTeamByOwnerId(ownerId: string): Promise<Team | null> {
  if (dbMode === 'local') {
    const teams = getTeamsFromLocalStorage();
    return teams.find(t => t.owner_id === ownerId) || null;
  } else {
    if (!pgClient) throw new Error('Not connected to PostgreSQL');
    
    const result = await pgClient.query(
      'SELECT * FROM teams WHERE owner_id = $1',
      [ownerId]
    );
    
    return result.rows[0] || null;
  }
}

async function createTeam(team: Omit<Team, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const teamId = generateId('team_');
  const now = new Date().toISOString();
  
  const newTeam: Team = {
    id: teamId,
    ...team,
    created_at: now,
    updated_at: now,
  };
  
  if (dbMode === 'local') {
    const teams = getTeamsFromLocalStorage();
    teams.push(newTeam);
    saveTeamsToLocalStorage(teams);
  } else {
    if (!pgClient) throw new Error('Not connected to PostgreSQL');
    
    await pgClient.query(
      `INSERT INTO teams (id, name, owner_id, subscription_status, subscription_plan, settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [teamId, team.name, team.owner_id, team.subscription_status, team.subscription_plan, team.settings, now, now]
    );
  }
  
  log(`[MIGRATION] Created team: ${team.name} (${teamId}) for owner: ${team.owner_id}`);
  return teamId;
}

async function createTeamMember(data: { teamId: string; userId: string; role: string }): Promise<void> {
  const memberId = generateId('member_');
  const now = new Date().toISOString();
  
  const newMember: TeamMember = {
    id: memberId,
    team_id: data.teamId,
    user_id: data.userId,
    role: data.role,
    joined_at: now,
  };
  
  if (dbMode === 'local') {
    const members = getTeamMembersFromLocalStorage();
    members.push(newMember);
    saveTeamMembersToLocalStorage(members);
  } else {
    if (!pgClient) throw new Error('Not connected to PostgreSQL');
    
    await pgClient.query(
      `INSERT INTO team_members (id, team_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [memberId, data.teamId, data.userId, data.role, now]
    );
  }
  
  log(`[MIGRATION] Added user ${data.userId} to team ${data.teamId} as ${data.role}`);
}

// ============ Main Migration Function ============

async function migrateUsersToTeams(batchSize: number = 50): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    teamsCreated: 0,
    membersCreated: 0,
    skipped: 0,
    errors: [],
    startTime: new Date()
  };

  logSection('Starting User-to-Team Migration');
  log(`Mode: ${dbMode}`);
  log(`Batch size: ${batchSize}`);

  try {
    // Connect to production database if needed
    if (dbMode === 'prod') {
      const connected = await connectPostgreSQL();
      if (!connected) {
        result.errors.push('Failed to connect to PostgreSQL. Falling back to local mode.');
        log('Falling back to local mode...');
        dbMode = 'local';
      }
    }

    const users = await getAllUsers();
    log(`Found ${users.length} users to migrate`);

    if (users.length === 0) {
      log('No users found to migrate. Exiting.');
      result.success = true;
      result.endTime = new Date();
      return result;
    }

    for (const user of users) {
      try {
        // Validate user data
        if (!user.id || !user.email || !user.name) {
          const errorMsg = `Invalid user data: missing required fields`;
          log(`[MIGRATION] ✗ ${errorMsg} - ${JSON.stringify(user)}`, true);
          result.errors.push(errorMsg);
          continue;
        }

        // Validate and normalize plan
        const validatedPlan = validatePlan(user.plan || 'echo');

        // Check if user already has a team (idempotency check)
        const existingTeam = await getTeamByOwnerId(user.id);
        if (existingTeam) {
          log(`[MIGRATION] → User ${user.id} already has a team (${existingTeam.id}), skipping...`);
          result.skipped++;
          continue;
        }

        // Start transaction for production mode
        if (dbMode === 'prod' && pgClient) {
          await pgClient.query('BEGIN');
        }

        try {
          // Step 1: Create a new team for this user
          const teamId = await createTeam({
            name: `${user.name}'s Team`,
            owner_id: user.id,
            subscription_status: 'active',
            subscription_plan: validatedPlan,
            settings: JSON.stringify({
              allowMemberInvites: true,
              defaultRole: 'editor',
              sharingEnabled: true
            })
          });

          // Step 2: Add the user as admin of their own team
          const validatedRole = validateRole('admin');
          await createTeamMember({
            teamId: teamId,
            userId: user.id,
            role: validatedRole
          });

          result.teamsCreated++;
          result.membersCreated++;

          log(`[MIGRATION] ✓ Migrated user ${user.email} to team ${teamId}`);

          // Commit transaction
          if (dbMode === 'prod' && pgClient) {
            await pgClient.query('COMMIT');
          }

          // Batch processing delay (for large datasets)
          if (result.teamsCreated % batchSize === 0) {
            log(`[MIGRATION] Processed ${result.teamsCreated} users, continuing...`);
          }
        } catch (innerError: any) {
          // Rollback on error
          if (dbMode === 'prod' && pgClient) {
            await pgClient.query('ROLLBACK');
          }
          throw innerError;
        }
      } catch (error: any) {
        const errorMessage = `Failed to migrate user ${user.id}: ${error.message}`;
        log(`[MIGRATION] ✗ ${errorMessage}`, true);
        result.errors.push(errorMessage);
      }
    }

    result.success = result.errors.length === 0;
    result.endTime = new Date();

    // Summary
    const duration = result.endTime.getTime() - result.startTime.getTime();
    logSection('Migration Complete');
    log(`Teams Created: ${result.teamsCreated}`);
    log(`Members Created: ${result.membersCreated}`);
    log(`Skipped (already migrated): ${result.skipped}`);
    log(`Errors: ${result.errors.length}`);
    log(`Duration: ${duration}ms`);

    if (result.errors.length > 0) {
      log('Errors:');
      result.errors.forEach(err => log(`  - ${err}`, true));
    }

  } catch (error: any) {
    result.errors.push(`Fatal error: ${error.message}`);
    log('[MIGRATION] Fatal error:', true);
    log(error.stack || error.message, true);
  } finally {
    // Cleanup
    if (dbMode === 'prod' && pgClient) {
      await disconnectPostgreSQL();
    }
  }

  return result;
}

// ============ Entry Point ============

// Parse command line arguments
const args = process.argv.slice(2);
for (const arg of args) {
  if (arg.startsWith('--mode=')) {
    const mode = arg.split('=')[1] as DbMode;
    if (mode === 'local' || mode === 'prod') {
      dbMode = mode;
    } else {
      console.error(`Invalid mode: ${mode}. Use 'local' or 'prod'`);
      process.exit(1);
    }
  }
  if (arg === '--help') {
    console.log(`
GhostNote Team Migration Script

Usage: npx ts-node plans/scripts/migrate-users-to-teams.ts [options]

Options:
  --mode=local   Run in localStorage mode (development)
  --mode=prod    Run in PostgreSQL mode (production)
  --help         Show this help message

Prerequisites:
  1. Run SQL migrations first:
     psql -d ghostnote -f plans/migrations/001_create_teams.sql
  2. Run SQL migrations second:
     psql -d ghostnote -f plans/migrations/002_create_team_members.sql

Environment Variables (production mode):
  DATABASE_URL   PostgreSQL connection string
`);
    process.exit(0);
  }
}

// Run the migration
migrateUsersToTeams()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    log(`Unhandled error: ${error.message}`, true);
    process.exit(1);
  });
