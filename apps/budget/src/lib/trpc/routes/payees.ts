import {formInsertPayeeSchema, removePayeeSchema, removePayeesSchema} from "$lib/schema";
import {z} from "zod";
import {publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t} from "$lib/trpc";
import {TRPCError} from "@trpc/server";
import {
  PayeeService,
  payeeIdSchema,
  searchPayeesSchema,
  advancedSearchPayeesSchema,
  getPayeesByTypeSchema,
  mergePayeesSchema,
  applyIntelligentDefaultsSchema,
  updateCalculatedFieldsSchema,
  createPayeeSchema,
  updatePayeeSchema,
} from "$lib/server/domains/payees";
import {ValidationError, NotFoundError, ConflictError} from "$lib/server/shared/types/errors";

const payeeService = new PayeeService();

export const payeeRoutes = t.router({
  all: publicProcedure.query(async () => {
    try {
      return await payeeService.getAllPayees();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch payees",
      });
    }
  }),

  load: publicProcedure.input(payeeIdSchema).query(async ({input}) => {
    try {
      return await payeeService.getPayeeById(input.id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error.message,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to load payee",
      });
    }
  }),

  search: publicProcedure.input(searchPayeesSchema).query(async ({input}) => {
    try {
      return await payeeService.searchPayees(input.query);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to search payees",
      });
    }
  }),

  remove: rateLimitedProcedure.input(removePayeeSchema).mutation(async ({input}) => {
    try {
      return await payeeService.deletePayee(input.id, {force: false});
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error.message,
        });
      }
      if (error instanceof ConflictError) {
        throw new TRPCError({
          code: "CONFLICT",
          message: error.message,
        });
      }
      if (error instanceof ValidationError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to delete payee",
      });
    }
  }),

  delete: bulkOperationProcedure
    .input(removePayeesSchema)
    .mutation(async ({input: {entities}}) => {
      try {
        const result = await payeeService.bulkDeletePayees(entities, {force: false});
        return {
          deletedCount: result.deletedCount,
          errors: result.errors,
        };
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to bulk delete payees",
        });
      }
    }),

  create: rateLimitedProcedure
    .input(createPayeeSchema)
    .mutation(async ({input}) => {
      try {
        return await payeeService.createPayee(input);
      } catch (error) {
        if (error instanceof ConflictError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create payee",
        });
      }
    }),

  update: rateLimitedProcedure
    .input(updatePayeeSchema.extend({id: z.number().int().positive()}))
    .mutation(async ({input}) => {
      try {
        const {id, ...updateData} = input;
        return await payeeService.updatePayee(id, updateData);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        if (error instanceof ConflictError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update payee",
        });
      }
    }),

  save: rateLimitedProcedure
    .input(formInsertPayeeSchema)
    .mutation(async ({input}) => {
      try {
        const {id, name, notes} = input;
        if (id) {
          // Update existing payee
          return await payeeService.updatePayee(id, {name: name!, notes});
        } else {
          // Create new payee
          return await payeeService.createPayee({name: name!, notes});
        }
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        if (error instanceof ConflictError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to save payee",
        });
      }
    }),

  // Enhanced search and filtering endpoints
  searchAdvanced: publicProcedure
    .input(advancedSearchPayeesSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.searchPayeesAdvanced(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to search payees",
        });
      }
    }),

  byType: publicProcedure
    .input(getPayeesByTypeSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.getPayeesByType(input.payeeType);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payees by type",
        });
      }
    }),

  withRelations: publicProcedure
    .query(async () => {
      try {
        return await payeeService.getPayeesWithRelations();
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payees with relations",
        });
      }
    }),

  needingAttention: publicProcedure
    .query(async () => {
      try {
        return await payeeService.getPayeesNeedingAttention();
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payees needing attention",
        });
      }
    }),

  // Intelligence and analytics endpoints
  stats: publicProcedure
    .input(payeeIdSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.getPayeeStats(input.id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payee stats",
        });
      }
    }),

  suggestions: publicProcedure
    .input(payeeIdSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.generatePayeeSuggestions(input.id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate payee suggestions",
        });
      }
    }),

  intelligence: publicProcedure
    .input(payeeIdSchema)
    .query(async ({input}) => {
      try {
        return await payeeService.getPayeeIntelligence(input.id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payee intelligence",
        });
      }
    }),

  analytics: publicProcedure
    .query(async () => {
      try {
        return await payeeService.getPayeeAnalytics();
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payee analytics",
        });
      }
    }),

  // Management and automation endpoints
  merge: rateLimitedProcedure
    .input(mergePayeesSchema)
    .mutation(async ({input}) => {
      try {
        await payeeService.mergePayees(input.sourceId, input.targetId);
        return {success: true};
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to merge payees",
        });
      }
    }),

  applyIntelligentDefaults: rateLimitedProcedure
    .input(applyIntelligentDefaultsSchema)
    .mutation(async ({input}) => {
      try {
        return await payeeService.applyIntelligentDefaults(
          input.id,
          input.applyCategory ?? true,
          input.applyBudget ?? true
        );
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to apply intelligent defaults",
        });
      }
    }),

  updateCalculatedFields: rateLimitedProcedure
    .input(updateCalculatedFieldsSchema)
    .mutation(async ({input}) => {
      try {
        return await payeeService.updateCalculatedFields(input.payeeId);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update calculated fields",
        });
      }
    }),
});
