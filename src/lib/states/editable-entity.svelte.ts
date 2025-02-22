import { trpc } from "$lib/trpc/client";
import { without } from "$lib/utils";
import { Context } from "runed";
import type { EditableEntityItem } from "$lib/types";
import type { Category } from "$lib/schema";

export class EditableEntityState<T extends EditableEntityItem> {
  entities: T[] = $state() as T[];

  getById(id: number) {
    return this.entities.find((entity) => entity.id === id);
  }

  add(entity: T) {
    this.entities.push(entity);
  }

  update(entity: T) {
    const index = this.entities.findIndex((c) => c.id === entity.id);
    if (index !== -1) {
      this.entities[index] = entity;
    } else {
      this.add(entity);
    }
  }

  async delete(entities: number[], cb?: (id: T[]) => void) {
    await trpc().entityRoutes.delete.mutate({
      entities: entities,
    });
    const [, removed] = without(this.entities, (entity: T) => entities.includes(entity.id));
    if (cb) {
      cb(removed);
    }
  }

  async deleteOne(entity: number) {
    return this.delete([entity]);
  }

  constructor(entities: T[]) {
    this.entities = entities;
  }
}

export const entitiesContext = new Context<EditableEntityState<Category>>("categories");
