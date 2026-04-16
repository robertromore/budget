import type { FloorPlanNode, NewFloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
import { FloorPlanRepository } from "./repository";

export interface SaveFloorPlanInput {
  homeId: number;
  floorLevel: number;
  nodes: NewFloorPlanNode[];
  deletedNodeIds: string[];
}

export class FloorPlanService {
  constructor(private repository: FloorPlanRepository) {}

  async getFloorPlan(
    homeId: number,
    workspaceId: number,
    floorLevel?: number
  ): Promise<FloorPlanNode[]> {
    return await this.repository.findAllByHome(homeId, workspaceId, floorLevel);
  }

  async getFloorLevels(homeId: number, workspaceId: number): Promise<number[]> {
    const levels = await this.repository.getFloorLevels(homeId, workspaceId);
    return levels.length > 0 ? levels : [0];
  }

  async saveFloorPlan(data: SaveFloorPlanInput, workspaceId: number): Promise<FloorPlanNode[]> {
    // Delete removed nodes first
    if (data.deletedNodeIds.length > 0) {
      await this.repository.deleteMany(data.deletedNodeIds, workspaceId);
    }

    // Upsert all current nodes
    if (data.nodes.length > 0) {
      const nodesWithWorkspace = data.nodes.map((n) => ({
        ...n,
        workspaceId,
        homeId: data.homeId,
        floorLevel: data.floorLevel,
      }));
      await this.repository.upsertMany(nodesWithWorkspace, workspaceId);
    }

    // Return the current state
    return await this.repository.findAllByHome(data.homeId, workspaceId, data.floorLevel);
  }

  async deleteFloorPlan(homeId: number, workspaceId: number): Promise<void> {
    await this.repository.deleteAllByHome(homeId, workspaceId);
  }
}
