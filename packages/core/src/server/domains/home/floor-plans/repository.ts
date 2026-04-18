import {
  floorPlanOpeningNodeTypeEnum,
  homeFloorPlanNodes,
  type FloorPlanNodeType,
  type FloorPlanNode,
  type NewFloorPlanNode,
} from "$core/schema/home/home-floor-plan-nodes";
import { db } from "$core/server/db";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

/**
 * Narrow helper type so repository methods can run against either the
 * process-wide `db` client or a transaction supplied by `db.transaction()`.
 * Drizzle's transaction type is a distinct class from the top-level client;
 * unifying them via a parameter union lets callers pass either.
 */
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export class FloorPlanRepository {
  async findAllByHome(
    homeId: number,
    workspaceId: number,
    floorLevel?: number
  ): Promise<FloorPlanNode[]> {
    const conditions = [
      eq(homeFloorPlanNodes.homeId, homeId),
      eq(homeFloorPlanNodes.workspaceId, workspaceId),
      // Soft-deleted rows are hidden from the primary read path. Callers
      // that need tombstones (e.g. an admin-level restore flow) should
      // use a dedicated method.
      isNull(homeFloorPlanNodes.deletedAt),
    ];

    if (floorLevel !== undefined) {
      conditions.push(eq(homeFloorPlanNodes.floorLevel, floorLevel));
    }

    return await db
      .select()
      .from(homeFloorPlanNodes)
      .where(and(...conditions));
  }

  async findById(id: string, workspaceId: number): Promise<FloorPlanNode | null> {
    const result = await db
      .select()
      .from(homeFloorPlanNodes)
      .where(
        and(
          eq(homeFloorPlanNodes.id, id),
          eq(homeFloorPlanNodes.workspaceId, workspaceId),
          isNull(homeFloorPlanNodes.deletedAt)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Return the subset of `ids` that exist in the given home + workspace.
   * Used to verify that attacker-supplied `parentId` values point at nodes
   * in the tenant's own home, not another workspace's. Tombstones are
   * excluded so an undeletion flow can't be used as a validation backdoor.
   */
  async findIdsInHome(
    ids: string[],
    homeId: number,
    workspaceId: number
  ): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await db
      .select({ id: homeFloorPlanNodes.id })
      .from(homeFloorPlanNodes)
      .where(
        and(
          inArray(homeFloorPlanNodes.id, ids),
          eq(homeFloorPlanNodes.homeId, homeId),
          eq(homeFloorPlanNodes.workspaceId, workspaceId),
          isNull(homeFloorPlanNodes.deletedAt)
        )
      );
    return rows.map((r) => r.id);
  }

  /**
   * Return a node-type lookup for the given ids within a single home/workspace.
   * Used by service-level scene-graph validation to verify parent/child type
   * relationships without trusting client-supplied parent node types.
   */
  async findNodeTypesInHome(
    ids: string[],
    homeId: number,
    workspaceId: number
  ): Promise<Record<string, FloorPlanNodeType>> {
    if (ids.length === 0) return {};
    const rows = await db
      .select({ id: homeFloorPlanNodes.id, nodeType: homeFloorPlanNodes.nodeType })
      .from(homeFloorPlanNodes)
      .where(
        and(
          inArray(homeFloorPlanNodes.id, ids),
          eq(homeFloorPlanNodes.homeId, homeId),
          eq(homeFloorPlanNodes.workspaceId, workspaceId),
          isNull(homeFloorPlanNodes.deletedAt)
        )
      );

    const byId: Record<string, FloorPlanNodeType> = {};
    for (const row of rows) byId[row.id] = row.nodeType;
    return byId;
  }

  async create(data: NewFloorPlanNode): Promise<FloorPlanNode> {
    const [node] = await db.insert(homeFloorPlanNodes).values(data).returning();

    if (!node) {
      throw new Error("Failed to create floor plan node");
    }

    return node;
  }

  /**
   * Transaction-aware upsert. The non-Tx variant wraps this for existing
   * callers; prefer the Tx variant from the service so delete + upsert can
   * share a single transaction and stay atomic.
   *
   * If a row is being upserted that previously tombstoned, the upsert
   * clears `deletedAt` as part of the update so the node reappears.
   */
  async upsertManyTx(
    client: DbOrTx,
    nodes: NewFloorPlanNode[],
    workspaceId: number
  ): Promise<void> {
    if (nodes.length === 0) return;

    // Batch into a single multi-row INSERT per chunk so a 2000-node save
    // no longer pays a per-row round-trip inside the transaction. SQLite
    // variable binding caps near 32k, and each row binds ~20 columns, so
    // a chunk size of 100 (≈2000 bindings) is well clear of the ceiling
    // and keeps individual statements small enough to stream.
    const CHUNK_SIZE = 100;
    const now = getCurrentTimestamp();
    const payload = nodes.map((n) => ({ ...n, workspaceId }));

    // Drizzle's `onConflictDoUpdate.set` accepts either literal values or
    // `sql\`excluded.<col>\`` to copy from the proposed row. Copying from
    // `excluded` lets a single statement apply per-row updates; literal
    // values would force serial calls (the original loop).
    const conflictSet = {
      parentId: sql`excluded.parent_id`,
      nodeType: sql`excluded.node_type`,
      name: sql`excluded.name`,
      posX: sql`excluded.pos_x`,
      posY: sql`excluded.pos_y`,
      width: sql`excluded.width`,
      height: sql`excluded.height`,
      rotation: sql`excluded.rotation`,
      x2: sql`excluded.x2`,
      y2: sql`excluded.y2`,
      color: sql`excluded.color`,
      opacity: sql`excluded.opacity`,
      floorLevel: sql`excluded.floor_level`,
      linkedLocationId: sql`excluded.linked_location_id`,
      linkedItemId: sql`excluded.linked_item_id`,
      properties: sql`excluded.properties`,
      deletedAt: null,
      updatedAt: now,
    };

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      await client
        .insert(homeFloorPlanNodes)
        .values(chunk)
        .onConflictDoUpdate({
          target: homeFloorPlanNodes.id,
          set: conflictSet,
          // Defence in depth: the conflict-update only touches rows already
          // owned by this workspace. Without this, a pathological client
          // supplying an id colliding with another tenant's node would
          // overwrite that tenant's row.
          setWhere: eq(homeFloorPlanNodes.workspaceId, workspaceId),
        });
    }
  }

  async upsertMany(nodes: NewFloorPlanNode[], workspaceId: number): Promise<void> {
    return this.upsertManyTx(db, nodes, workspaceId);
  }

  /**
   * Soft-delete nodes. The rows remain on disk with `deletedAt` set to the
   * current timestamp. Callers that need hard deletion (purge flow, GDPR
   * erasure) should use `hardDeleteMany` instead.
   */
  async deleteManyTx(
    client: DbOrTx,
    ids: string[],
    workspaceId: number
  ): Promise<void> {
    if (ids.length === 0) return;
    const now = getCurrentTimestamp();
    await client
      .update(homeFloorPlanNodes)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          inArray(homeFloorPlanNodes.id, ids),
          eq(homeFloorPlanNodes.workspaceId, workspaceId),
          isNull(homeFloorPlanNodes.deletedAt)
        )
      );
  }

  async deleteMany(ids: string[], workspaceId: number): Promise<void> {
    return this.deleteManyTx(db, ids, workspaceId);
  }

  /**
   * Permanently remove soft-deleted (or all) nodes for a home. Used by
   * the workspace / home delete flow and by an explicit purge action.
   */
  async hardDeleteMany(ids: string[], workspaceId: number): Promise<void> {
    if (ids.length === 0) return;
    await db
      .delete(homeFloorPlanNodes)
      .where(
        and(
          inArray(homeFloorPlanNodes.id, ids),
          eq(homeFloorPlanNodes.workspaceId, workspaceId)
        )
      );
  }

  async deleteAllByHome(homeId: number, workspaceId: number): Promise<void> {
    // Hard-delete here: when the home itself is being removed there is no
    // meaningful recovery UX for orphaned floor-plan tombstones.
    await db
      .delete(homeFloorPlanNodes)
      .where(
        and(
          eq(homeFloorPlanNodes.homeId, homeId),
          eq(homeFloorPlanNodes.workspaceId, workspaceId)
        )
      );
  }

  /**
   * Clean up openings (doors / windows) whose `parentId` has become null
   * because their parent wall was deleted. Called by the service after
   * batch mutations so the scene doesn't render floating openings.
   * Soft-deletes to match the rest of the mutation surface.
   *
   * Scoped to a specific `floorLevel` — saving floor 0 must not delete
   * a door that the user has temporarily unparented on floor 1 (e.g.
   * mid-drag before re-attaching to another wall). Orphan cleanup fires
   * once per saved floor, not across the whole home.
   */
  async deleteOrphanOpenings(
    homeId: number,
    workspaceId: number,
    floorLevel: number
  ): Promise<void> {
    const now = getCurrentTimestamp();
    await db
      .update(homeFloorPlanNodes)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(homeFloorPlanNodes.homeId, homeId),
          eq(homeFloorPlanNodes.workspaceId, workspaceId),
          eq(homeFloorPlanNodes.floorLevel, floorLevel),
          isNull(homeFloorPlanNodes.parentId),
          isNull(homeFloorPlanNodes.deletedAt),
          inArray(homeFloorPlanNodes.nodeType, floorPlanOpeningNodeTypeEnum)
        )
      );
  }

  async getFloorLevels(homeId: number, workspaceId: number): Promise<number[]> {
    const result = await db
      .selectDistinct({ floorLevel: homeFloorPlanNodes.floorLevel })
      .from(homeFloorPlanNodes)
      .where(
        and(
          eq(homeFloorPlanNodes.homeId, homeId),
          eq(homeFloorPlanNodes.workspaceId, workspaceId),
          isNull(homeFloorPlanNodes.deletedAt)
        )
      )
      .orderBy(homeFloorPlanNodes.floorLevel);

    return result.map((r) => r.floorLevel);
  }
}
