import { superForm } from 'sveltekit-superforms/client';
import { zod4Client } from 'sveltekit-superforms/adapters';
import type { z } from 'zod';

export interface EntityFormOptions<T = any> {
  formData: any;
  schema: any;
  formId: string;
  onSave?: (entity: T) => void;
  onUpdate?: (entity: T) => void;
  onDelete?: (id: number) => void;
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
    entityId,
    customOptions = {}
  } = options;

  const isUpdate = entityId && entityId > 0;

  const form = superForm(formData, {
    id: formId,
    validators: zod4Client(schema),
    onResult: async ({ result }) => {
      if (result.type === 'success' && result.data) {
        const entity = result.data['entity'];

        if (isUpdate && onUpdate) {
          onUpdate(entity);
        } else if (!isUpdate && onSave) {
          onSave(entity);
        }

        // Call generic onSave if provided (for backward compatibility)
        if (onSave && !onUpdate) {
          onSave(entity);
        }
      }
    },
    ...customOptions
  });

  return {
    ...form,
    isUpdate,
    onDelete
  };
}

export function createEntityFormConfig<T = any>(
  baseOptions: Omit<EntityFormOptions<T>, 'customOptions'>,
  customOptions?: any
): EntityFormOptions<T> {
  return {
    ...baseOptions,
    customOptions: customOptions || {}
  };
}