import {
  homeFloorPlanNodes,
  type FloorPlanNode,
  type NewFloorPlanNode,
} from "$core/schema/home/home-floor-plan-nodes";
import { db } from "$core/server/db";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { and, eq, inArray } from "drizzle-orm";

export class FloorPlanRepository {
  async findAllByHome(
    homeId: number,
    workspaceId: number,
    floorLevel?: number
  ): Promise<FloorPlanNode[]> {
    const conditions = [
      eq(homeFloorPlanNodes.homeId, homeId),
      eq(homeFloorPlanNodes.workspaceId, workspaceId),
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
        and(eq(homeFloorPlanNodes.id, id), eq(homeFloorPlanNodes.workspaceId, workspaceId))
      )
      .limit(1);

    return result[0] || null;
  }

  async create(data: NewFloorPlanNode): Promise<FloorPlanNode> {
    const [node] = await db.insert(homeFloorPlanNodes).values(data).returning();

    if (!node) {
      throw new Error("Failed to create floor plan node");
    }

    return node;
  }

  async upsertMany(nodes: NewFloorPlanNode[], workspaceId: number): Promise<void> {
    if (nodes.length === 0) return;

    for (const node of nodes) {
      await db
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
            updatedAt: getCurrentTimestamp(),
          },
        });
    }
  }

  async deleteMany(ids: string[], workspaceId: number): Promise<void> {
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
    await db
      .delete(homeFloorPlanNodes)
      .where(
        and(
          eq(homeFloorPlanNodes.homeId, homeId),
          eq(homeFloorPlanNodes.workspaceId, workspaceId)
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
          eq(homeFloorPlanNodes.workspaceId, workspaceId)
        )
      )
      .orderBy(homeFloorPlanNodes.floorLevel);

    return result.map((r) => r.floorLevel);
  }
}
