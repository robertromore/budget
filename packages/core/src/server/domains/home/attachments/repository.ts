import {
  homeAttachments,
  type HomeAttachment,
  type NewHomeAttachment,
} from "$core/schema/home/home-attachments";
import { db } from "$core/server/db";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { and, eq } from "drizzle-orm";

export interface UpdateAttachmentData {
  fileName?: string;
  fileType?: string;
  isPrimary?: boolean;
  notes?: string | null;
}

export class HomeAttachmentRepository {
  async findById(id: number, workspaceId: number): Promise<HomeAttachment | null> {
    const result = await db
      .select()
      .from(homeAttachments)
      .where(and(eq(homeAttachments.id, id), eq(homeAttachments.workspaceId, workspaceId)))
      .limit(1);

    return result[0] || null;
  }

  async findByItem(itemId: number, workspaceId: number): Promise<HomeAttachment[]> {
    return await db
      .select()
      .from(homeAttachments)
      .where(and(eq(homeAttachments.itemId, itemId), eq(homeAttachments.workspaceId, workspaceId)));
  }

  async create(data: NewHomeAttachment, workspaceId: number): Promise<HomeAttachment> {
    const [attachment] = await db
      .insert(homeAttachments)
      .values({ ...data, workspaceId })
      .returning();

    if (!attachment) throw new Error("Failed to create attachment");
    return attachment;
  }

  async update(
    id: number,
    data: UpdateAttachmentData,
    workspaceId: number
  ): Promise<HomeAttachment> {
    const [updated] = await db
      .update(homeAttachments)
      .set({ ...data, updatedAt: getCurrentTimestamp() })
      .where(and(eq(homeAttachments.id, id), eq(homeAttachments.workspaceId, workspaceId)))
      .returning();

    if (!updated) throw new Error("Failed to update attachment");
    return updated;
  }

  async setPrimary(id: number, itemId: number, workspaceId: number): Promise<void> {
    // Clear all primary flags for this item
    await db
      .update(homeAttachments)
      .set({ isPrimary: false })
      .where(and(eq(homeAttachments.itemId, itemId), eq(homeAttachments.workspaceId, workspaceId)));

    // Set this one as primary
    await db
      .update(homeAttachments)
      .set({ isPrimary: true })
      .where(and(eq(homeAttachments.id, id), eq(homeAttachments.workspaceId, workspaceId)));
  }

  async delete(id: number, workspaceId: number): Promise<void> {
    await db
      .delete(homeAttachments)
      .where(and(eq(homeAttachments.id, id), eq(homeAttachments.workspaceId, workspaceId)));
  }
}
