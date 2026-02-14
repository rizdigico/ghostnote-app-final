-- GhostNote Team Migration - Step 3: Add team_id to Voice Presets
-- Run this after 001 and 002 migrations
-- This migrates existing voice presets to be owned by teams

BEGIN TRANSACTION;

-- Add team_id column to voice_presets table (if not already added)
-- SQLite: Add column if not exists (SQLite requires special handling)
-- ALTER TABLE voice_presets ADD COLUMN team_id TEXT;

-- For SQLite: Create new table with team_id, copy data, rename
-- This is the SQLite-compatible way to add a NOT NULL column with a default
CREATE TABLE IF NOT EXISTS voice_presets_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    reference_text TEXT,
    owner_id TEXT,
    team_id TEXT,
    is_custom INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy existing data to new table
INSERT INTO voice_presets_new (id, name, reference_text, owner_id, is_custom, created_at)
SELECT id, name, reference_text, owner_id, is_custom, created_at
FROM voice_presets;

-- Drop old table and rename new one
DROP TABLE IF EXISTS voice_presets;
ALTER TABLE voice_presets_new RENAME TO voice_presets;

-- Create indexes for team-based lookups
CREATE INDEX IF NOT EXISTS idx_voice_presets_team ON voice_presets(team_id);
CREATE INDEX IF NOT EXISTS idx_voice_presets_owner ON voice_presets(owner_id);

-- For PostgreSQL, use these instead:
-- ALTER TABLE voice_presets ADD COLUMN team_id TEXT;
-- CREATE INDEX idx_voice_presets_team ON voice_presets(team_id);

COMMIT;

-- ============================================
-- DATA MIGRATION: Populate team_id for existing voice presets
-- ============================================
-- This script updates existing voice presets with their owner's team_id

/*
-- For PostgreSQL:
UPDATE voice_presets vp
SET team_id = t.id
FROM teams t
WHERE t.owner_id = vp.owner_id
AND vp.team_id IS NULL;

-- For SQLite:
UPDATE voice_presets 
SET team_id = (
    SELECT t.id FROM teams t 
    WHERE t.owner_id = voice_presets.owner_id
)
WHERE team_id IS NULL;
*/
