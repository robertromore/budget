import type { HomeLabel } from "$core/schema/home/home-labels";
import { NotFoundError, ValidationError } from "$core/server/shared/types/errors";
import { HomeLabelRepository, type LabelWithCount, type UpdateLabelData } from "./repository";

export interface CreateLabelData {
  homeId: number;
  name: string;
  description?: string | null;
  color?: string | null;
}

export class HomeLabelService {
  constructor(private repository: HomeLabelRepository) {}

  async createLabel(data: CreateLabelData, workspaceId: number): Promise<HomeLabel> {
    if (!data.name?.trim()) {
      throw new ValidationError("Label name is required");
    }

    return await this.repository.create(
      {
        homeId: data.homeId,
        name: data.name.trim(),
        description: data.description ?? null,
        color: data.color ?? null,
        workspaceId,
      },
      workspaceId
    );
  }

  async getLabel(id: number, workspaceId: number): Promise<HomeLabel> {
    const label = await this.repository.findById(id, workspaceId);
    if (!label) {
      throw new NotFoundError("HomeLabel", id);
    }
    return label;
  }

  async listLabels(homeId: number, workspaceId: number): Promise<HomeLabel[]> {
    return await this.repository.findAllByHome(homeId, workspaceId);
  }

  async listLabelsWithCounts(homeId: number, workspaceId: number): Promise<LabelWithCount[]> {
    return await this.repository.findAllWithCounts(homeId, workspaceId);
  }

  async updateLabel(id: number, data: UpdateLabelData, workspaceId: number): Promise<HomeLabel> {
    await this.getLabel(id, workspaceId);

    if (data.name !== undefined && !data.name.trim()) {
      throw new ValidationError("Label name cannot be empty");
    }

    return await this.repository.update(id, data, workspaceId);
  }

  async deleteLabel(id: number, workspaceId: number): Promise<void> {
    await this.getLabel(id, workspaceId);
    await this.repository.delete(id, workspaceId);
  }
}
