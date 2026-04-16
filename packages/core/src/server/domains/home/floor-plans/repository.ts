import {
  homeFloorPlanNodes,
  type FloorPlanNode,
  type NewFloorPlanNode,
} from "$core/schema/home/home-floor-plan-nodes";
import { db } from "$core/server/db";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { and, eq, inArray, isNull } from "drizzle-orm";

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

    for (const node of nodes) {
      await client
        .insert(homeFloorPlanNodes)
        .values({ ...node, workspaceId })
        .onConflictDoUpdate({
          target: homeFloorPlanNodes.id,
          set: {
            parentId: node.parentId,
            nodeType: node.nodeType,
            name: node.name,
            posX: node.posX,
            posY: node.posY,
            width: node.width,
            height: node.height,
            rotation: node.rotation,
            x2: node.x2,
            y2: node.y2,
            color: node.color,
            opacity: node.opacity,
            floorLevel: node.floorLevel,
            linkedLocationId: node.linkedLocationId,
            linkedItemId: node.linkedItemId,
            properties: node.properties,
            deletedAt: null,
            updatedAt: getCurrentTimestamp(),
          },
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
   */
  async deleteOrphanOpenings(homeId: number, workspaceId: number): Promise<void> {
    const now = getCurrentTimestamp();
    await db
      .update(homeFloorPlanNodes)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(homeFloorPlanNodes.homeId, homeId),
          eq(homeFloorPlanNodes.workspaceId, workspaceId),
          isNull(homeFloorPlanNodes.parentId),
          isNull(homeFloorPlanNodes.deletedAt),
          inArray(homeFloorPlanNodes.nodeType, ["door", "window"])
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
