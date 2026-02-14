-- GhostNote Team Migration - Step 1: Create Teams Table
-- Run this first before creating team_members
-- Supports both SQLite and PostgreSQL

-- Create Teams table
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'User''s Team',
    owner_id TEXT NOT NULL UNIQUE,
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    subscription_plan TEXT DEFAULT 'echo' CHECK (subscription_plan IN ('echo', 'clone', 'syndicate')),
    settings TEXT DEFAULT '{"allowMemberInvites": true, "defaultRole": "editor", "sharingEnabled": true}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SQLite: Use this for ID generation
-- CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);

-- PostgreSQL: Use these instead:
-- For PostgreSQL, we'll set IDs in the application layer or use triggers
-- The id will be generated as 'team_' || encode(gen_random_bytes(8), 'hex')
