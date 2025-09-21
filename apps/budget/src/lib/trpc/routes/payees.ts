import {formInsertPayeeSchema, removePayeeSchema, removePayeesSchema} from "$lib/schema";
import {z} from "zod";
import {publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t} from "$lib/trpc";
import {TRPCError} from "@trpc/server";
import {PayeeService, payeeIdSchema, searchPayeesSchema} from "$lib/server/domains/payees";
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

  save: rateLimitedProcedure
    .input(formInsertPayeeSchema)
    .mutation(async ({input: {id, name, notes}}) => {
      try {
        if (id) {
          // Update existing payee
          return await payeeService.updatePayee(id, {name, notes});
        } else {
          // Create new payee
          return await payeeService.createPayee({name, notes});
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
});
