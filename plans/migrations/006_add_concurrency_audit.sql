-- GhostNote Advanced Tier Features - Phase 1 & 2
-- 1. Add job tracking to teams
-- 2. Add audit_logs table
-- 3. Add client_shares table

BEGIN TRANSACTION;

-- Add concurrency tracking to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS active_jobs_count INTEGER DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'echo' CHECK (plan_tier IN ('echo', 'clone', 'syndicate'));

-- Create Audit Logs table for Syndicate "Intern Insurance"
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'shared', etc.
    target_type TEXT NOT NULL, -- 'voice_preset', 'content', 'team_member', etc.
    target_id TEXT,
    details JSONB, -- Additional action-specific data
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_team ON audit_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);

-- Create Client Shares table for Syndicate "Client Approval Mode"
CREATE TABLE IF NOT EXISTS client_shares (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    content_id TEXT NOT NULL,
    share_token TEXT NOT NULL UNIQUE,
    password_hash TEXT, -- Optional password protection
    is_password_protected BOOLEAN DEFAULT FALSE,
    created_by TEXT NOT NULL,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for share token lookup
CREATE INDEX IF NOT EXISTS idx_client_shares_token ON client_shares(share_token);

COMMIT;

-- Note: These changes support:
-- 1. Concurrency gating (active_jobs_count)
-- 2. Plan tier tracking (plan_tier)
-- 3. Audit logs (Intern Insurance)
-- 4. Client approval sharing
