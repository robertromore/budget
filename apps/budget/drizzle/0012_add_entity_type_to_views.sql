-- Add entity_type column to views table to support multi-table view system
ALTER TABLE views ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'transactions';

-- Create index for efficient filtering by workspace and entity type
CREATE INDEX idx_views_workspace_entity ON views(workspace_id, entity_type);
