-- Add is_default column to views table to identify default/system views
ALTER TABLE views ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;
