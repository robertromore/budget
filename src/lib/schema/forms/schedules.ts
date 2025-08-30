import { z } from "zod/v4";

// Superforms-compatible schemas for schedules
export const scheduleFormSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "inactive"]).default("active").optional(),
  amount: z.number().default(0),
  amount_2: z.number().default(0),
  amount_type: z.enum(["exact", "approximate", "range"]).default("exact"),
  recurring: z.boolean().default(false).optional(),
  auto_add: z.boolean().default(false).optional(),
  dateId: z.number().nullable().optional(),
  payeeId: z.number(),
  accountId: z.number(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional(),
});

export const removeScheduleFormSchema = z.object({ 
  id: z.number().nonnegative() 
});

export const removeSchedulesFormSchema = z.object({ 
  entities: z.array(z.number().nonnegative()) 
});

export type ScheduleFormSchema = typeof scheduleFormSchema;
export type RemoveScheduleFormSchema = typeof removeScheduleFormSchema;
export type RemoveSchedulesFormSchema = typeof removeSchedulesFormSchema;