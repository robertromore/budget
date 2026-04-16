import type { Home } from "$core/schema/home/homes";
import { NotFoundError, ValidationError } from "$core/server/shared/types/errors";
import { HomeRepository, type UpdateHomeData } from "./repository";

export interface CreateHomeData {
  name: string;
  description?: string | null;
  address?: string | null;
  notes?: string | null;
}

export class HomeService {
  constructor(private repository: HomeRepository) {}

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

    return await this.repository.create(
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
}
