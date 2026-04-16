import type { HomeLocation } from "$core/schema/home/home-locations";
import { NotFoundError, ValidationError } from "$core/server/shared/types/errors";
import {
  HomeLocationRepository,
  type LocationTreeNode,
  type UpdateLocationData,
} from "./repository";

export interface CreateLocationData {
  homeId: number;
  parentId?: number | null;
  name: string;
  description?: string | null;
  locationType?: string;
  icon?: string | null;
  color?: string | null;
  displayOrder?: number;
}

export class HomeLocationService {
  constructor(private repository: HomeLocationRepository) {}

  async createLocation(data: CreateLocationData, workspaceId: number): Promise<HomeLocation> {
    if (!data.name?.trim()) {
      throw new ValidationError("Location name is required");
    }

    // Validate parentId exists if provided
    if (data.parentId) {
      const parent = await this.repository.findById(data.parentId, workspaceId);
      if (!parent) {
        throw new NotFoundError("HomeLocation", data.parentId);
      }
    }

    return await this.repository.create(
      {
        homeId: data.homeId,
        parentId: data.parentId ?? null,
        name: data.name.trim(),
        description: data.description ?? null,
        locationType: data.locationType ?? "room",
        icon: data.icon ?? null,
        color: data.color ?? null,
        displayOrder: data.displayOrder ?? 0,
        workspaceId,
      },
      workspaceId
    );
  }

  async getLocation(id: number, workspaceId: number): Promise<HomeLocation> {
    const location = await this.repository.findById(id, workspaceId);
    if (!location) {
      throw new NotFoundError("HomeLocation", id);
    }
    return location;
  }

  async listLocations(homeId: number, workspaceId: number): Promise<HomeLocation[]> {
    return await this.repository.findAllByHome(homeId, workspaceId);
  }

  async getLocationTree(homeId: number, workspaceId: number): Promise<LocationTreeNode[]> {
    const allLocations = await this.repository.findAllByHome(homeId, workspaceId);
    return this.buildTree(allLocations);
  }

  async updateLocation(
    id: number,
    data: UpdateLocationData,
    workspaceId: number
  ): Promise<HomeLocation> {
    await this.getLocation(id, workspaceId);

    // Prevent circular parent references
    if (data.parentId !== undefined && data.parentId !== null) {
      if (data.parentId === id) {
        throw new ValidationError("A location cannot be its own parent");
      }
      await this.validateNoCircularReference(id, data.parentId, workspaceId);
    }

    return await this.repository.update(id, data, workspaceId);
  }

  async moveLocation(
    id: number,
    newParentId: number | null,
    workspaceId: number
  ): Promise<HomeLocation> {
    return await this.updateLocation(id, { parentId: newParentId }, workspaceId);
  }

  async deleteLocation(id: number, workspaceId: number): Promise<void> {
    await this.getLocation(id, workspaceId);
    // Children will have parentId set to null via FK constraint
    await this.repository.delete(id, workspaceId);
  }

  private buildTree(locations: HomeLocation[]): LocationTreeNode[] {
    const nodeMap = new Map<number, LocationTreeNode>();
    const roots: LocationTreeNode[] = [];

    // Create nodes
    for (const loc of locations) {
      nodeMap.set(loc.id, { ...loc, children: [] });
    }

    // Build tree
    for (const loc of locations) {
      const node = nodeMap.get(loc.id)!;
      if (loc.parentId && nodeMap.has(loc.parentId)) {
        nodeMap.get(loc.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private async validateNoCircularReference(
    locationId: number,
    newParentId: number,
    workspaceId: number
  ): Promise<void> {
    let currentId: number | null = newParentId;
    const visited = new Set<number>();

    while (currentId !== null) {
      if (currentId === locationId) {
        throw new ValidationError("Moving this location would create a circular reference");
      }
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const parent = await this.repository.findById(currentId, workspaceId);
      currentId = parent?.parentId ?? null;
    }
  }
}
