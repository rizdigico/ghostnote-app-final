-- GhostNote Team Migration - Step 5: Voice Locking & Member Status
-- Run this to add voice preset locking and team member status support

BEGIN TRANSACTION;

-- Add is_locked column to voice_presets for Syndicate asset locking
ALTER TABLE voice_presets ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Add status column to team_members for deactivation on downgrade
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deactivated'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_voice_presets_locked ON voice_presets(is_locked);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

COMMIT;

-- Note: For Firestore, you'll need to update the VoicePreset type to include isLocked
-- The field will be added to existing documents automatically with default value false
