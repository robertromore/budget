import type { HomeMaintenance } from "$core/schema/home/home-maintenance";
import { NotFoundError, ValidationError } from "$core/server/shared/types/errors";
import { HomeMaintenanceRepository, type UpdateMaintenanceData } from "./repository";

export interface CreateMaintenanceData {
  itemId: number;
  name: string;
  description?: string | null;
  maintenanceType?: string;
  scheduledDate?: string | null;
  completedDate?: string | null;
  cost?: number | null;
  notes?: string | null;
}

export class HomeMaintenanceService {
  constructor(private repository: HomeMaintenanceRepository) {}

  async createRecord(data: CreateMaintenanceData, workspaceId: number): Promise<HomeMaintenance> {
    if (!data.name?.trim()) {
      throw new ValidationError("Maintenance name is required");
    }

    return await this.repository.create(
      {
        itemId: data.itemId,
        name: data.name.trim(),
        description: data.description ?? null,
        maintenanceType: data.maintenanceType ?? "completed",
        scheduledDate: data.scheduledDate ?? null,
        completedDate: data.completedDate ?? null,
        cost: data.cost ?? null,
        notes: data.notes ?? null,
        workspaceId,
      },
      workspaceId
    );
  }

  async getRecord(id: number, workspaceId: number): Promise<HomeMaintenance> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundError("HomeMaintenance", id);
    return record;
  }

  async listByItem(itemId: number, workspaceId: number): Promise<HomeMaintenance[]> {
    return await this.repository.findByItem(itemId, workspaceId);
  }

  async updateRecord(
    id: number,
    data: UpdateMaintenanceData,
    workspaceId: number
  ): Promise<HomeMaintenance> {
    await this.getRecord(id, workspaceId);
    return await this.repository.update(id, data, workspaceId);
  }

  async completeRecord(id: number, workspaceId: number): Promise<HomeMaintenance> {
    return await this.repository.update(
      id,
      { maintenanceType: "completed", completedDate: new Date().toISOString().split("T")[0] },
      workspaceId
    );
  }

  async deleteRecord(id: number, workspaceId: number): Promise<void> {
    await this.getRecord(id, workspaceId);
    await this.repository.delete(id, workspaceId);
  }
}
