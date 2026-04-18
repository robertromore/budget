import { homeItems } from "$core/schema/home/home-items";
import { homeLocations } from "$core/schema/home/home-locations";
import { homes } from "$core/schema/home/homes";
import type {
  FloorPlanNode,
  FloorPlanNodeType,
  NewFloorPlanNode,
} from "$core/schema/home/home-floor-plan-nodes";
import { db } from "$core/server/db";
import { NotFoundError, ValidationError } from "$core/server/shared/types/errors";
import { and, eq, inArray } from "drizzle-orm";
import { FloorPlanRepository } from "./repository";

/**
 * Node shape accepted by the save endpoint. Notably missing `workspaceId` —
 * the service injects it from the authenticated context. The route-level
 * zod schema infers to this shape; if you change one, change both.
 */
export type FloorPlanNodeInput = Omit<NewFloorPlanNode, "workspaceId">;

export interface SaveFloorPlanInput {
  homeId: number;
  floorLevel: number;
  nodes: FloorPlanNodeInput[];
  deletedNodeIds: string[];
}

const ALLOWED_PARENT_TYPES: Partial<Record<FloorPlanNodeType, FloorPlanNodeType[]>> = {
  building: ["site"],
  level: ["building"],
  slab: ["level"],
  ceiling: ["level"],
  roof: ["level"],
  stair: ["level"],
  door: ["wall"],
  window: ["wall"],
  "roof-segment": ["roof"],
  "stair-segment": ["stair"],
};

const REQUIRED_PARENT_TYPES = new Set<FloorPlanNodeType>([
  "level",
  "slab",
  "ceiling",
  "roof",
  "stair",
  "roof-segment",
  "stair-segment",
]);

export class FloorPlanService {
  constructor(private repository: FloorPlanRepository) {}

  /**
   * Verify a home row belongs to the caller's workspace.
   * Throws NotFoundError (not "forbidden") so an attacker cannot enumerate
   * home IDs across tenants.
   */
  private async assertHomeInWorkspace(
    homeId: number,
    workspaceId: number
  ): Promise<void> {
    const [row] = await db
      .select({ id: homes.id })
      .from(homes)
      .where(and(eq(homes.id, homeId), eq(homes.workspaceId, workspaceId)))
      .limit(1);
    if (!row) {
      throw new NotFoundError("Home", homeId);
    }
  }

  /**
   * Validate that every linked location and item referenced by the submitted
   * nodes lives in the caller's workspace. Without this, an attacker could
   * attach their own nodes to another tenant's locations/items, causing
   * cross-workspace pointer leakage at render time.
   */
  private async assertLinkedEntitiesInWorkspace(
    nodes: FloorPlanNodeInput[],
    workspaceId: number
  ): Promise<void> {
    const locationIds = Array.from(
      new Set(
        nodes
          .map((n) => n.linkedLocationId)
          .filter((v): v is number => typeof v === "number")
      )
    );
    const itemIds = Array.from(
      new Set(
        nodes.map((n) => n.linkedItemId).filter((v): v is number => typeof v === "number")
      )
    );

    if (locationIds.length > 0) {
      const found = await db
        .select({ id: homeLocations.id })
        .from(homeLocations)
        .where(
          and(
            inArray(homeLocations.id, locationIds),
            eq(homeLocations.workspaceId, workspaceId)
          )
        );
      if (found.length !== locationIds.length) {
        throw new ValidationError(
          "One or more linked locations do not belong to this workspace"
        );
      }
    }

    if (itemIds.length > 0) {
      const found = await db
        .select({ id: homeItems.id })
        .from(homeItems)
        .where(
          and(inArray(homeItems.id, itemIds), eq(homeItems.workspaceId, workspaceId))
        );
      if (found.length !== itemIds.length) {
        throw new ValidationError(
          "One or more linked items do not belong to this workspace"
        );
      }
    }
  }

  /**
   * Every `parentId` referenced by the submitted nodes must resolve either to
   * another submitted node (same batch) or to an existing node already in the
   * same home + workspace. Without this an attacker could supply an arbitrary
   * foreign parentId, producing cross-home geometry in the 3D viewer.
   */
  private async assertParentsInHome(
    nodes: FloorPlanNodeInput[],
    homeId: number,
    workspaceId: number
  ): Promise<void> {
    const submittedById = new Map(nodes.map((n) => [n.id, n] as const));
    const externalParentIds = Array.from(
      new Set(
        nodes
          .map((n) => n.parentId)
          .filter(
            (v): v is string =>
              typeof v === "string" && v.length > 0 && !submittedById.has(v)
          )
      )
    );

    const externalParentTypes = await this.repository.findNodeTypesInHome(
      externalParentIds,
      homeId,
      workspaceId
    );
    if (Object.keys(externalParentTypes).length !== externalParentIds.length) {
      throw new ValidationError(
        "One or more parent nodes are not part of this home"
      );
    }

    const resolveParentType = (parentId: string): FloorPlanNodeType | undefined =>
      submittedById.get(parentId)?.nodeType ?? externalParentTypes[parentId];

    for (const node of nodes) {
      if (node.parentId === node.id) {
        throw new ValidationError(
          `Node ${node.id} cannot use itself as parent`
        );
      }

      if (node.nodeType === "site" && node.parentId) {
        throw new ValidationError("Site nodes cannot have a parent");
      }

      if (!node.parentId) {
        if (REQUIRED_PARENT_TYPES.has(node.nodeType)) {
          throw new ValidationError(
            `${node.nodeType} nodes require a parent`
          );
        }
        continue;
      }

      const parentType = resolveParentType(node.parentId);
      if (!parentType) {
        throw new ValidationError(
          `Parent node ${node.parentId} is not part of this home`
        );
      }

      const allowedParentTypes = ALLOWED_PARENT_TYPES[node.nodeType];
      if (
        allowedParentTypes &&
        !allowedParentTypes.includes(parentType)
      ) {
        throw new ValidationError(
          `${node.nodeType} nodes must be parented by ${allowedParentTypes.join(" or ")}`
        );
      }
    }
  }

  /**
   * Fetch a home's floor-plan nodes. A numeric `floorLevel` filters to that
   * specific storey; passing `undefined` returns ALL floors across the home
   * — supported for internal batch operations (e.g. export / audit flows),
   * not exposed at the tRPC boundary where the route input makes
   * `floorLevel` required to keep per-floor cache keys stable.
   */
  async getFloorPlan(
    homeId: number,
    workspaceId: number,
    floorLevel?: number
  ): Promise<FloorPlanNode[]> {
    await this.assertHomeInWorkspace(homeId, workspaceId);
    return await this.repository.findAllByHome(homeId, workspaceId, floorLevel);
  }

  async getFloorLevels(homeId: number, workspaceId: number): Promise<number[]> {
    await this.assertHomeInWorkspace(homeId, workspaceId);
    const levels = await this.repository.getFloorLevels(homeId, workspaceId);
    // Return an empty array when the home has no plan yet so callers can
    // distinguish "no plan" from "plan exists on ground floor only".
    return levels;
  }

  async saveFloorPlan(
    data: SaveFloorPlanInput,
    workspaceId: number
  ): Promise<FloorPlanNode[]> {
    // Reject contradictory payloads where the same node is submitted as both
    // "upsert" and "delete" in one request.
    const deletedSet = new Set(data.deletedNodeIds);
    if (data.nodes.some((n) => deletedSet.has(n.id))) {
      throw new ValidationError(
        "A node cannot be saved and deleted in the same request"
      );
    }

    // Reject nodes whose parent is being deleted in the same batch. Without
    // this, a child could be upserted with a parentId pointing at a node
    // the same transaction soft-deletes, leaving the child dangling (FKs
    // are not enforced at the libsql layer, so no cascade nullification).
    for (const node of data.nodes) {
      if (node.parentId && deletedSet.has(node.parentId)) {
        throw new ValidationError(
          `Node ${node.id} cannot reference parent ${node.parentId} that is being deleted in the same request`
        );
      }
    }

    // All authorization checks happen before any mutation so the transaction
    // below never has to roll back for security reasons.
    await this.assertHomeInWorkspace(data.homeId, workspaceId);
    await this.assertLinkedEntitiesInWorkspace(data.nodes, workspaceId);
    await this.assertParentsInHome(data.nodes, data.homeId, workspaceId);

    // Wrap delete + upsert in a single transaction so a mid-batch failure
    // leaves the floor plan unchanged rather than half-migrated.
    const nodesWithWorkspace = data.nodes.map((n) => ({
      ...n,
      workspaceId,
      homeId: data.homeId,
      floorLevel: data.floorLevel,
    }));

    await db.transaction(async (tx) => {
      if (data.deletedNodeIds.length > 0) {
        await this.repository.deleteManyTx(tx, data.deletedNodeIds, workspaceId);
      }
      if (nodesWithWorkspace.length > 0) {
        await this.repository.upsertManyTx(tx, nodesWithWorkspace, workspaceId);
      }
    });

    // Clean up any opening nodes whose parent wall was just deleted.
    // The schema FK uses `onDelete: "set null"`, which would otherwise leave
    // "floating" openings rendered in the 2D and 3D scene.
    if (data.deletedNodeIds.length > 0) {
      await this.repository.deleteOrphanOpenings(data.homeId, workspaceId, data.floorLevel);
    }

    return await this.repository.findAllByHome(data.homeId, workspaceId, data.floorLevel);
  }

  async deleteFloorPlan(homeId: number, workspaceId: number): Promise<void> {
    await this.assertHomeInWorkspace(homeId, workspaceId);
    await this.repository.deleteAllByHome(homeId, workspaceId);
  }
}

// NOTE ON FOREIGN KEYS
// --------------------
// The floor-plan schema declares `onDelete: "set null"` on `parentId` and
// `onDelete: "cascade"` on `homeId`/`workspaceId`. SQLite only enforces
// these when `PRAGMA foreign_keys = ON` is set per connection. libsql does
// NOT enable this pragma by default, and the project's `db` client does
// not turn it on globally (only `delete-all.ts` toggles it during whole-
// database scrubs).
//
// Implications for this service:
//   - `deleteOrphanOpenings` is REQUIRED after removing a wall — the
//     parentId `set null` cascade will not fire automatically.
//   - Home soft-deletion (`homes.deletedAt`) does NOT cascade to floor-plan
//     nodes. If/when the home is hard-deleted, those nodes orphan.
//     `deleteAllByHome` is the explicit cleanup path; callers in the home
//     domain must invoke it on hard-delete.
//   - Workspace deletion follows the same pattern.
//
// The right long-term fix is enabling `PRAGMA foreign_keys = ON` at the
// connection layer for the whole app, but that requires an audit of
// existing data for dangling references and is out of scope here.
