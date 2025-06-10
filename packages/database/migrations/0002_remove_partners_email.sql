-- Migration: Remove partners_email column for privacy/security
-- Date: 2025-06-10
-- Description: Drop partners_email column from players table as emails should not be stored

ALTER TABLE players DROP COLUMN IF EXISTS partners_email;
