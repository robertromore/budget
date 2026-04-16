import type { HomeAttachment } from "$core/schema/home/home-attachments";
import { trpc } from "$core/trpc/client-factory";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const homeAttachmentKeys = createQueryKeys("homeAttachments", {
  byItem: (itemId: number) => ["homeAttachments", "byItem", itemId] as const,
});

export const listAttachmentsByItem = (itemId: number) =>
  defineQuery<HomeAttachment[]>({
    queryKey: homeAttachmentKeys["byItem"](itemId),
    queryFn: () => trpc().homeAttachmentsRoutes.listByItem.query({ itemId }),
    options: { staleTime: 60_000 },
  });

interface CreateAttachmentInput {
  itemId: number;
  fileName: string;
  fileType?: string;
  mimeType?: string | null;
  fileSize?: number | null;
  url: string;
  isPrimary?: boolean;
  notes?: string | null;
}

export const createAttachment = defineMutation<CreateAttachmentInput, HomeAttachment>({
  mutationFn: (input) => trpc().homeAttachmentsRoutes.create.mutate(input),
  successMessage: "Attachment added",
  errorMessage: "Failed to add attachment",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeAttachmentKeys["byItem"](data.itemId) });
  },
});

export const setPrimaryAttachment = defineMutation<{ id: number }, { success: boolean }>({
  mutationFn: (input) => trpc().homeAttachmentsRoutes.setPrimary.mutate(input),
  successMessage: "Primary photo set",
  errorMessage: "Failed to set primary photo",
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["homeAttachments"] });
  },
});

export const deleteAttachment = defineMutation<{ id: number }, { success: boolean }>({
  mutationFn: (input) => trpc().homeAttachmentsRoutes.delete.mutate(input),
  successMessage: "Attachment deleted",
  errorMessage: "Failed to delete attachment",
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["homeAttachments"] });
  },
});
