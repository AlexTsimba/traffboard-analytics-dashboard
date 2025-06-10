-- Migration: Fix players table constraints for multi-date player records
-- Date: 2025-06-10
-- Description: Remove unique constraint on player_id alone and add composite constraint on (player_id, date)
--              This allows the same player to have records on different dates

-- Drop existing unique constraint on player_id
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_player_id_unique;

-- Add composite unique constraint on (player_id, date)
CREATE UNIQUE INDEX IF NOT EXISTS player_date_unique ON players (player_id, date);
