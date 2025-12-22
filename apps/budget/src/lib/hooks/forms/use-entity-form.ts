import { zod4Client } from "sveltekit-superforms/adapters";
import { superForm } from "sveltekit-superforms/client";

export interface EntityFormOptions<T = any> {
  formData: any;
  schema: any;
  formId: string;
  onSave?: (entity: T) => void;
  onUpdate?: (entity: T) => void;
  onDelete?: (id: number) => void;
  /** Called after successful save - use to reset tainted state */
  onSuccess?: (entity: T) => void;
  entityId?: number | undefined;
  customOptions?: any;
}

export function useEntityForm<T = any>(options: EntityFormOptions<T>): any {
  const {
    formData,
    schema,
    formId,
    onSave,
    onUpdate,
    onDelete,
    onSuccess,
    entityId,
    customOptions = {},
  } = options;

  const isUpdate = entityId && entityId > 0;

  const form = superForm(formData, {
    id: formId,
    validators: zod4Client(schema),
    warnings: {
      duplicateId: false,
    },
    onResult: async ({ result }) => {
      if (result.type === "success" && result.data) {
        const entity = result.data["entity"];

        if (isUpdate && onUpdate) {
          onUpdate(entity);
        } else if (!isUpdate && onSave) {
          onSave(entity);
        } else if (onSave && !onUpdate) {
          // Backward compatibility: only call if not already handled above
          onSave(entity);
        }

        // Call onSuccess callback for any post-save cleanup (like resetting tainted)
        if (onSuccess) {
          onSuccess(entity);
        }
      }
    },
    ...customOptions,
  });

  return {
    ...form,
    isUpdate,
    onDelete,
  };
}

export function createEntityFormConfig<T = any>(
  baseOptions: Omit<EntityFormOptions<T>, "customOptions">,
  customOptions?: any
): EntityFormOptions<T> {
  return {
    ...baseOptions,
    customOptions: customOptions || {},
  };
}
