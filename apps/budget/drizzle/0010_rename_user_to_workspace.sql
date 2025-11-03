-- Rename user table to workspace
ALTER TABLE user RENAME TO workspace;

-- Rename user_id columns to workspace_id in all tables
ALTER TABLE account RENAME COLUMN user_id TO workspace_id;
ALTER TABLE budget RENAME COLUMN user_id TO workspace_id;
ALTER TABLE budget_automation_settings RENAME COLUMN user_id TO workspace_id;
ALTER TABLE categories RENAME COLUMN user_id TO workspace_id;
ALTER TABLE category_groups RENAME COLUMN user_id TO workspace_id;
ALTER TABLE detected_patterns RENAME COLUMN user_id TO workspace_id;
ALTER TABLE payee RENAME COLUMN user_id TO workspace_id;
ALTER TABLE payee_category_corrections RENAME COLUMN user_id TO workspace_id;
ALTER TABLE schedules RENAME COLUMN user_id TO workspace_id;
ALTER TABLE views RENAME COLUMN user_id TO workspace_id;

-- Rename indexes
DROP INDEX IF EXISTS account_user_id_idx;
CREATE INDEX account_workspace_id_idx ON account(workspace_id);

DROP INDEX IF EXISTS budget_user_id_idx;
CREATE INDEX budget_workspace_id_idx ON budget(workspace_id);

DROP INDEX IF EXISTS budget_automation_settings_user_id_idx;
CREATE INDEX budget_automation_settings_workspace_id_idx ON budget_automation_settings(workspace_id);

DROP INDEX IF EXISTS category_user_id_idx;
CREATE INDEX category_workspace_id_idx ON categories(workspace_id);

DROP INDEX IF EXISTS category_groups_user_id_idx;
CREATE INDEX category_groups_workspace_id_idx ON category_groups(workspace_id);

DROP INDEX IF EXISTS detected_patterns_user_id_idx;
CREATE INDEX detected_patterns_workspace_id_idx ON detected_patterns(workspace_id);

DROP INDEX IF EXISTS payee_user_id_idx;
CREATE INDEX payee_workspace_id_idx ON payee(workspace_id);

DROP INDEX IF EXISTS payee_corrections_user_id_idx;
CREATE INDEX payee_corrections_workspace_id_idx ON payee_category_corrections(workspace_id);


DROP INDEX IF EXISTS schedules_user_id_idx;
CREATE INDEX schedules_workspace_id_idx ON schedules(workspace_id);

DROP INDEX IF EXISTS views_user_id_idx;
CREATE INDEX views_workspace_id_idx ON views(workspace_id);

-- Drop old indexes on user table
DROP INDEX IF EXISTS user_slug_idx;
DROP INDEX IF EXISTS user_email_idx;
DROP INDEX IF EXISTS user_deleted_at_idx;

-- Create new indexes on workspace table
CREATE INDEX workspace_slug_idx ON workspace(slug);
CREATE INDEX workspace_deleted_at_idx ON workspace(deleted_at);
