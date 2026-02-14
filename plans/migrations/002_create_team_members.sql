-- GhostNote Team Migration - Step 2: Create Team Members Table
-- Run this after 001_create_teams.sql

BEGIN TRANSACTION;

-- Create Team Members table
CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'editor', 'viewer')),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(team_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);

COMMIT;

-- Optional: Add team_id column to voice_presets for team ownership
-- Uncomment after confirming migration is successful
-- ALTER TABLE voice_presets ADD COLUMN team_id TEXT;
-- CREATE INDEX IF NOT EXISTS idx_voice_presets_team ON voice_presets(team_id);
-- ALTER TABLE voice_presets ADD FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
