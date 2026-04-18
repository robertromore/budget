import { randomUUID } from "node:crypto";
import type { NewFloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
import { db } from "$core/server/db";
import type { Home } from "$core/schema/home/homes";
import { NotFoundError, ValidationError } from "$core/server/shared/types/errors";
import { FloorPlanRepository } from "../floor-plans/repository";
import { HomeRepository, type UpdateHomeData } from "./repository";

export interface CreateHomeData {
  name: string;
  description?: string | null;
  address?: string | null;
  notes?: string | null;
}

const DEFAULT_FLOOR_LEVEL = 0;
const DEFAULT_VIEWBOX_WIDTH = 1200;
const DEFAULT_VIEWBOX_HEIGHT = 800;
const DEFAULT_GRID_SIZE = 20;
const DEFAULT_SITE_MARGIN = DEFAULT_GRID_SIZE * 2;

function snapToGrid(value: number): number {
  return Math.round(value / DEFAULT_GRID_SIZE) * DEFAULT_GRID_SIZE;
}

export class HomeService {
  constructor(
    private repository: HomeRepository,
    private floorPlanRepository: FloorPlanRepository = new FloorPlanRepository()
  ) {}

  async createHome(data: CreateHomeData, workspaceId: number): Promise<Home> {
    if (!data.name?.trim()) {
      throw new ValidationError("Home name is required");
    }

    const slug = this.generateSlug(data.name);

    // Ensure slug is unique within workspace
    const existing = await this.repository.findBySlug(slug, workspaceId);
    if (existing) {
      throw new ValidationError("A home with a similar name already exists");
    }

    let createdHomeId: number | null = null;

    try {
      return await db.transaction(async (tx) => {
        const home = await this.repository.createTx(
          tx,
          {
            name: data.name.trim(),
            slug,
            description: data.description ?? null,
            address: data.address ?? null,
            notes: data.notes ?? null,
            workspaceId,
          },
          workspaceId
        );
        createdHomeId = home.id;

        const defaultNodes = this.buildDefaultFloorPlanHierarchy(home.id, workspaceId);
        await this.floorPlanRepository.upsertManyTx(tx, defaultNodes, workspaceId);

        return home;
      });
    } catch (error) {
      // Defensive cleanup for runtimes where transaction rollback semantics
      // are not guaranteed. Prefer consistency over keeping a partially
      // initialized home visible.
      if (createdHomeId !== null) {
        await this.floorPlanRepository.deleteAllByHome(createdHomeId, workspaceId);
        await this.repository.delete(createdHomeId, workspaceId);
      }
      throw error;
    }
  }

  async getHome(id: number, workspaceId: number): Promise<Home> {
    const home = await this.repository.findById(id, workspaceId);
    if (!home) {
      throw new NotFoundError("Home", id);
    }
    return home;
  }

  async getHomeBySlug(slug: string, workspaceId: number): Promise<Home> {
    const home = await this.repository.findBySlug(slug, workspaceId);
    if (!home) {
      throw new NotFoundError("Home", slug);
    }
    return home;
  }

  async listHomes(workspaceId: number): Promise<Home[]> {
    return await this.repository.findAllByWorkspace(workspaceId);
  }

  async updateHome(id: number, data: UpdateHomeData, workspaceId: number): Promise<Home> {
    await this.getHome(id, workspaceId);

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new ValidationError("Home name cannot be empty");
      }
      data.slug = this.generateSlug(data.name);
    }

    return await this.repository.update(id, data, workspaceId);
  }

  async deleteHome(id: number, workspaceId: number): Promise<void> {
    await this.getHome(id, workspaceId);
    await this.repository.delete(id, workspaceId);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private buildDefaultFloorPlanHierarchy(
    homeId: number,
    workspaceId: number
  ): NewFloorPlanNode[] {
    const siteId = `site-${randomUUID()}`;
    const buildingId = `building-${randomUUID()}`;
    const levelId = `level-${randomUUID()}`;

    const siteWidth = Math.max(
      DEFAULT_GRID_SIZE * 20,
      DEFAULT_VIEWBOX_WIDTH - DEFAULT_SITE_MARGIN * 2
    );
    const siteHeight = Math.max(
      DEFAULT_GRID_SIZE * 14,
      DEFAULT_VIEWBOX_HEIGHT - DEFAULT_SITE_MARGIN * 2
    );
    const siteX = (DEFAULT_VIEWBOX_WIDTH - siteWidth) / 2;
    const siteY = (DEFAULT_VIEWBOX_HEIGHT - siteHeight) / 2;

    const buildingWidth = Math.max(DEFAULT_GRID_SIZE * 10, siteWidth * 0.7);
    const buildingHeight = Math.max(DEFAULT_GRID_SIZE * 8, siteHeight * 0.7);
    const buildingX = siteX + (siteWidth - buildingWidth) / 2;
    const buildingY = siteY + (siteHeight - buildingHeight) / 2;

    const levelWidth = Math.max(DEFAULT_GRID_SIZE * 8, snapToGrid(buildingWidth) * 0.9);
    const levelHeight = Math.max(DEFAULT_GRID_SIZE * 8, snapToGrid(buildingHeight) * 0.9);
    const levelX = snapToGrid(buildingX) + (snapToGrid(buildingWidth) - levelWidth) / 2;
    const levelY = snapToGrid(buildingY) + (snapToGrid(buildingHeight) - levelHeight) / 2;

    return [
      {
        id: siteId,
        workspaceId,
        homeId,
        floorLevel: DEFAULT_FLOOR_LEVEL,
        parentId: null,
        nodeType: "site",
        name: "Site",
        posX: snapToGrid(siteX),
        posY: snapToGrid(siteY),
        width: snapToGrid(siteWidth),
        height: snapToGrid(siteHeight),
        color: null,
      },
      {
        id: buildingId,
        workspaceId,
        homeId,
        floorLevel: DEFAULT_FLOOR_LEVEL,
        parentId: siteId,
        nodeType: "building",
        name: "Building",
        posX: snapToGrid(buildingX),
        posY: snapToGrid(buildingY),
        width: snapToGrid(buildingWidth),
        height: snapToGrid(buildingHeight),
        color: null,
      },
      {
        id: levelId,
        workspaceId,
        homeId,
        floorLevel: DEFAULT_FLOOR_LEVEL,
        parentId: buildingId,
        nodeType: "level",
        name: "Ground Level",
        posX: snapToGrid(levelX),
        posY: snapToGrid(levelY),
        width: snapToGrid(levelWidth),
        height: snapToGrid(levelHeight),
        elevation: 0,
        color: null,
      },
    ];
  }
}
