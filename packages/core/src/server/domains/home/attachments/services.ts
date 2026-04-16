import type { HomeAttachment } from "$core/schema/home/home-attachments";
import { NotFoundError, ValidationError } from "$core/server/shared/types/errors";
import { HomeAttachmentRepository, type UpdateAttachmentData } from "./repository";

export interface CreateAttachmentData {
  itemId: number;
  fileName: string;
  fileType?: string;
  mimeType?: string | null;
  fileSize?: number | null;
  url: string;
  isPrimary?: boolean;
  notes?: string | null;
}

export class HomeAttachmentService {
  constructor(private repository: HomeAttachmentRepository) {}

  async createAttachment(data: CreateAttachmentData, workspaceId: number): Promise<HomeAttachment> {
    if (!data.fileName?.trim()) {
      throw new ValidationError("File name is required");
    }
    if (!data.url?.trim()) {
      throw new ValidationError("URL is required");
    }

    return await this.repository.create(
      {
        itemId: data.itemId,
        fileName: data.fileName.trim(),
        fileType: data.fileType ?? "other",
        mimeType: data.mimeType ?? null,
        fileSize: data.fileSize ?? null,
        url: data.url,
        isPrimary: data.isPrimary ?? false,
        notes: data.notes ?? null,
        workspaceId,
      },
      workspaceId
    );
  }

  async getAttachment(id: number, workspaceId: number): Promise<HomeAttachment> {
    const attachment = await this.repository.findById(id, workspaceId);
    if (!attachment) throw new NotFoundError("HomeAttachment", id);
    return attachment;
  }

  async listByItem(itemId: number, workspaceId: number): Promise<HomeAttachment[]> {
    return await this.repository.findByItem(itemId, workspaceId);
  }

  async updateAttachment(
    id: number,
    data: UpdateAttachmentData,
    workspaceId: number
  ): Promise<HomeAttachment> {
    await this.getAttachment(id, workspaceId);
    return await this.repository.update(id, data, workspaceId);
  }

  async setPrimaryPhoto(id: number, workspaceId: number): Promise<void> {
    const attachment = await this.getAttachment(id, workspaceId);
    await this.repository.setPrimary(id, attachment.itemId, workspaceId);
  }

  async deleteAttachment(id: number, workspaceId: number): Promise<void> {
    await this.getAttachment(id, workspaceId);
    await this.repository.delete(id, workspaceId);
  }
}
