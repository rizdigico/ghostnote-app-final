-- GhostNote Block 1.4: Voice Preset Visibility
-- Add visibility column to voice_presets table
-- Default: 'private' (existing presets remain private)
-- New: Can be 'team' (shared with team members)

BEGIN TRANSACTION;

-- Add visibility column (SQLite-compatible approach)
-- SQLite doesn't support ADD COLUMN with CHECK, so we use INTEGER for boolean
ALTER TABLE voice_presets ADD COLUMN visibility TEXT DEFAULT 'private';

-- Add created_by column to track original author
ALTER TABLE voice_presets ADD COLUMN created_by TEXT;

-- Backfill created_by from owner_id for existing records
UPDATE voice_presets SET created_by = owner_id WHERE created_by IS NULL;

-- Add CHECK constraint for PostgreSQL (uncomment for PostgreSQL)
-- ALTER TABLE voice_presets ADD CHECK (visibility IN ('private', 'team'));

-- Create index for team visibility queries
CREATE INDEX IF NOT EXISTS idx_voice_presets_team_visibility 
ON voice_presets(team_id, visibility);

COMMIT;

-- ============================================
-- SAMPLE UPDATES (for testing)
-- ============================================
-- Update an existing preset to be shared:
-- UPDATE voice_presets SET visibility = 'team' WHERE id = 'preset_id_here';

-- Query to see all team-visible presets:
-- SELECT * FROM voice_presets WHERE team_id = 'team_xxx' AND visibility = 'team';
