-- Create payee_categories table for organizing/grouping payees in the UI
-- This is separate from transaction categories (which categorize transactions)
-- Examples: "Utilities", "Subscriptions", "Local Businesses", "Healthcare Providers"
CREATE TABLE payee_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Visual customization
  icon TEXT,
  color TEXT,

  -- Organization
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,

  -- Ensure unique category names per workspace
  UNIQUE(workspace_id, name)
);

-- Add indexes for performance
CREATE INDEX payee_category_workspace_id_idx ON payee_categories(workspace_id);
CREATE INDEX payee_category_name_idx ON payee_categories(name);
CREATE INDEX payee_category_slug_idx ON payee_categories(slug);
CREATE INDEX payee_category_deleted_at_idx ON payee_categories(deleted_at);
CREATE INDEX payee_category_display_order_idx ON payee_categories(display_order);
CREATE INDEX payee_category_is_active_idx ON payee_categories(is_active);

-- Add payee_category_id to payee table
ALTER TABLE payee ADD COLUMN payee_category_id INTEGER REFERENCES payee_categories(id) ON DELETE SET NULL;

-- Add index for the foreign key
CREATE INDEX payee_category_id_idx ON payee(payee_category_id);
