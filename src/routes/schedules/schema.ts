import { superformInsertScheduleSchema } from "$lib/schema/superforms";
import { z } from "zod/v4";

export const insertFormSchema = z.object({});

export type InsertFormSchema = typeof insertFormSchema;
