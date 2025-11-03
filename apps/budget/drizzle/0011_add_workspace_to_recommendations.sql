-- Add workspace_id to budget_recommendation table
ALTER TABLE budget_recommendation RENAME COLUMN user_id TO workspace_id;

-- Update index
DROP INDEX IF EXISTS recommendation_user_id_idx;
CREATE INDEX recommendation_workspace_id_idx ON budget_recommendation(workspace_id);
