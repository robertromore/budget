import type { HomeItem } from "$core/schema/home/home-items";
import type { HomeLabel } from "$core/schema/home/home-labels";
import { NotFoundError, ValidationError } from "$core/server/shared/types/errors";
import { HomeItemRepository, type ItemWithDetails, type UpdateItemData } from "./repository";

export interface CreateItemData {
  homeId: number;
  locationId?: number | null;
  parentItemId?: number | null;
  name: string;
  description?: string | null;
  notes?: string | null;
  serialNumber?: string | null;
  modelNumber?: string | null;
  manufacturer?: string | null;
  quantity?: number;
  isInsured?: boolean;
  purchaseDate?: string | null;
  purchaseVendor?: string | null;
  purchasePrice?: number | null;
  warrantyExpires?: string | null;
  warrantyNotes?: string | null;
  lifetimeWarranty?: boolean;
  currentValue?: number | null;
  customFields?: string | null;
  labelIds?: number[];
}

export class HomeItemService {
  constructor(private repository: HomeItemRepository) {}

  async createItem(data: CreateItemData, workspaceId: number): Promise<HomeItem> {
    if (!data.name?.trim()) {
      throw new ValidationError("Item name is required");
    }

    // Auto-assign asset ID
    const assetId = await this.repository.getNextAssetId(data.homeId);

    const item = await this.repository.create(
      {
        homeId: data.homeId,
        locationId: data.locationId ?? null,
        parentItemId: data.parentItemId ?? null,
        assetId,
        name: data.name.trim(),
        description: data.description ?? null,
        notes: data.notes ?? null,
        serialNumber: data.serialNumber ?? null,
        modelNumber: data.modelNumber ?? null,
        manufacturer: data.manufacturer ?? null,
        quantity: data.quantity ?? 1,
        isInsured: data.isInsured ?? false,
        purchaseDate: data.purchaseDate ?? null,
        purchaseVendor: data.purchaseVendor ?? null,
        purchasePrice: data.purchasePrice ?? null,
        warrantyExpires: data.warrantyExpires ?? null,
        warrantyNotes: data.warrantyNotes ?? null,
        lifetimeWarranty: data.lifetimeWarranty ?? false,
        currentValue: data.currentValue ?? null,
        customFields: data.customFields ?? null,
        workspaceId,
      },
      workspaceId
    );

    // Assign labels if provided
    if (data.labelIds?.length) {
      for (const labelId of data.labelIds) {
        await this.repository.assignLabel(item.id, labelId);
      }
    }

    return item;
  }

  async getItem(id: number, workspaceId: number): Promise<HomeItem> {
    const item = await this.repository.findById(id, workspaceId);
    if (!item) {
      throw new NotFoundError("HomeItem", id);
    }
    return item;
  }

  async getItemByCuid(cuid: string, workspaceId: number): Promise<HomeItem> {
    const item = await this.repository.findByCuid(cuid, workspaceId);
    if (!item) {
      throw new NotFoundError("HomeItem", cuid);
    }
    return item;
  }

  async getItemWithDetails(id: number, workspaceId: number): Promise<ItemWithDetails> {
    const item = await this.getItem(id, workspaceId);
    const labels = await this.repository.findItemLabels(item.id);

    return { ...item, labels };
  }

  async listItems(
    homeId: number,
    workspaceId: number,
    options?: { includeArchived?: boolean; locationId?: number; search?: string }
  ): Promise<HomeItem[]> {
    return await this.repository.findAllByHome(homeId, workspaceId, options);
  }

  async updateItem(id: number, data: UpdateItemData, workspaceId: number): Promise<HomeItem> {
    await this.getItem(id, workspaceId);
    return await this.repository.update(id, data, workspaceId);
  }

  async moveItem(id: number, locationId: number | null, workspaceId: number): Promise<HomeItem> {
    return await this.updateItem(id, { locationId }, workspaceId);
  }

  async assignLabel(itemId: number, labelId: number, workspaceId: number): Promise<void> {
    await this.getItem(itemId, workspaceId);
    await this.repository.assignLabel(itemId, labelId);
  }

  async removeLabel(itemId: number, labelId: number, workspaceId: number): Promise<void> {
    await this.getItem(itemId, workspaceId);
    await this.repository.removeLabel(itemId, labelId);
  }

  async getItemLabels(itemId: number, workspaceId: number): Promise<HomeLabel[]> {
    await this.getItem(itemId, workspaceId);
    return await this.repository.findItemLabels(itemId);
  }

  async archiveItem(id: number, workspaceId: number): Promise<HomeItem> {
    return await this.updateItem(id, { isArchived: true }, workspaceId);
  }

  async unarchiveItem(id: number, workspaceId: number): Promise<HomeItem> {
    return await this.updateItem(id, { isArchived: false }, workspaceId);
  }

  async deleteItem(id: number, workspaceId: number): Promise<void> {
    await this.getItem(id, workspaceId);
    await this.repository.delete(id, workspaceId);
  }
}
