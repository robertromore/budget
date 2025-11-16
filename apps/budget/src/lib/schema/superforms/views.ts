import { z } from "zod";
import type { ViewFilter, ViewDisplayState } from "$lib/types";

// Superform-compatible schemas for views (not using drizzle-zod)
export const superformInsertViewSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, "Name must contain at least 2 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .nullable(),
  icon: z.string().optional().nullable(),
  filters: z.optional(
    z
      .array(
        z.object({
          column: z.string(),
          filter: z.string(),
          value: z.array(z.unknown()),
        })
      )
      .or(z.null())
  ),
  display: z.optional(
    z
      .object({
        grouping: z.optional(z.array(z.string())),
        sort: z.optional(
          z.array(
            z.object({
              desc: z.boolean(),
              id: z.string(),
            })
          )
        ),
        expanded: z.literal(true).default(true).or(z.record(z.string(), z.boolean())),
        visibility: z.literal(true).default(true).or(z.record(z.string(), z.boolean())),
        pinning: z.optional(
          z.object({
            left: z.array(z.string()),
            right: z.array(z.string()),
          })
        ),
      })
      .or(z.null())
  ),
  dirty: z.boolean().optional(),
});

export const superformUpdateViewSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(2, "Name must contain at least 2 characters").optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .nullable(),
  icon: z.string().optional().nullable(),
  filters: z.optional(
    z
      .array(
        z.object({
          column: z.string(),
          filter: z.string(),
          value: z.array(z.unknown()),
        })
      )
      .or(z.null())
  ),
  display: z.optional(
    z
      .object({
        grouping: z.optional(z.array(z.string())),
        sort: z.optional(
          z.array(
            z.object({
              desc: z.boolean(),
              id: z.string(),
            })
          )
        ),
        expanded: z.literal(true).default(true).or(z.record(z.string(), z.boolean())),
        visibility: z.literal(true).default(true).or(z.record(z.string(), z.boolean())),
        pinning: z.optional(
          z.object({
            left: z.array(z.string()),
            right: z.array(z.string()),
          })
        ),
      })
      .or(z.null())
  ),
  dirty: z.boolean().optional(),
});

export type SuperformInsertViewSchema = typeof superformInsertViewSchema;
export type SuperformUpdateViewSchema = typeof superformUpdateViewSchema;
