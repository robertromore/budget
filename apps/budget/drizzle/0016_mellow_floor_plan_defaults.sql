-- Backfill default floor-plan hierarchy for existing homes that have NEVER
-- held any floor-plan nodes.
--
-- Safety constraints (intentional):
--   1. Filter on tombstoned nodes too (no `deleted_at IS NULL` on the
--      NOT EXISTS). A home whose user intentionally cleared their plan
--      still has soft-deleted rows; re-seeding it would resurrect a
--      default under the user's nose after they purged it.
--   2. `wall_height`, `thickness`, `elevation` match the schema defaults.
--      They're meaningless for site/building/level nodes but the columns
--      are NOT NULL, so we write them explicitly rather than relying on
--      a future schema change silently altering the defaults.
--   3. Dimensions (40/40 origin, 1120×720 site) are in the canvas's
--      working-unit system; users who customise `gridSize` later will
--      see mismatched defaults for these particular rows, but the data
--      is still valid and editable.
WITH homes_without_floor_plan AS (
  SELECT h.id AS home_id, h.workspace_id
  FROM home h
  WHERE h.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM home_floor_plan_node fp
      WHERE fp.home_id = h.id
        AND fp.workspace_id = h.workspace_id
      -- NOTE: deliberately no `fp.deleted_at IS NULL` — a home whose
      -- user cleared their plan still has tombstones; do not re-seed.
    )
),
generated_ids AS (
  SELECT
    home_id,
    workspace_id,
    'site-' || lower(hex(randomblob(16))) AS site_id,
    'building-' || lower(hex(randomblob(16))) AS building_id,
    'level-' || lower(hex(randomblob(16))) AS level_id
  FROM homes_without_floor_plan
)
INSERT INTO home_floor_plan_node (
  id,
  workspace_id,
  home_id,
  floor_level,
  parent_id,
  node_type,
  name,
  pos_x,
  pos_y,
  width,
  height,
  rotation,
  wall_height,
  thickness,
  elevation,
  color,
  opacity,
  created_at,
  updated_at
)
SELECT
  site_id,
  workspace_id,
  home_id,
  0,
  NULL,
  'site',
  'Site',
  40,
  40,
  1120,
  720,
  0,
  2.5,
  0.15,
  0,
  NULL,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM generated_ids
UNION ALL
SELECT
  building_id,
  workspace_id,
  home_id,
  0,
  site_id,
  'building',
  'Building',
  200,
  140,
  780,
  500,
  0,
  2.5,
  0.15,
  0,
  NULL,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM generated_ids
UNION ALL
SELECT
  level_id,
  workspace_id,
  home_id,
  0,
  building_id,
  'level',
  'Ground Level',
  240,
  160,
  700,
  460,
  0,
  2.5,
  0.15,
  0,
  NULL,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM generated_ids;
