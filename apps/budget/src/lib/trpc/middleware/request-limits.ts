import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import type { Context } from "$lib/trpc";

// Initialize tRPC instance for middleware creation
const t = initTRPC.context<Context>().create();

interface RequestLimitOptions {
  maxInputSize?: number; // Maximum input size in bytes
  maxArrayLength?: number; // Maximum array length
  maxStringLength?: number; // Maximum string length
  maxObjectProperties?: number; // Maximum number of object properties
}

/**
 * Calculate the approximate size of an object in bytes
 */
function calculateObjectSize(obj: any): number {
  const jsonString = JSON.stringify(obj);
  // UTF-8 encoding can use up to 4 bytes per character
  return new Blob([jsonString]).size;
}

/**
 * Recursively validate object structure and limits
 */
function validateObjectStructure(
  obj: any,
  options: Required<RequestLimitOptions>,
  depth: number = 0
): void {
  const maxDepth = 20; // Prevent deeply nested objects

  if (depth > maxDepth) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Input structure is too deeply nested",
    });
  }

  if (obj === null || obj === undefined) {
    return;
  }

  if (typeof obj === "string") {
    if (obj.length > options.maxStringLength) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `String length exceeds maximum of ${options.maxStringLength} characters`,
      });
    }
    return;
  }

  if (Array.isArray(obj)) {
    if (obj.length > options.maxArrayLength) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Array length exceeds maximum of ${options.maxArrayLength} items`,
      });
    }

    for (const item of obj) {
      validateObjectStructure(item, options, depth + 1);
    }
    return;
  }

  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length > options.maxObjectProperties) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Object has too many properties (${keys.length}). Maximum allowed: ${options.maxObjectProperties}`,
      });
    }

    for (const value of Object.values(obj)) {
      validateObjectStructure(value, options, depth + 1);
    }
  }
}

/**
 * Request limits middleware for tRPC
 * Validates input size and structure to prevent DoS attacks
 */
export const requestLimits = (options: RequestLimitOptions = {}) => {
  const defaultOptions: Required<RequestLimitOptions> = {
    maxInputSize: 1024 * 1024, // 1MB default
    maxArrayLength: 1000,
    maxStringLength: 10000,
    maxObjectProperties: 100,
  };

  const finalOptions = { ...defaultOptions, ...options };

  return t.middleware(async ({ next, input, type }) => {
    try {
      // Skip for empty inputs
      if (!input) {
        return next({ rawInput: input });
      }

      // Check total input size
      const inputSize = calculateObjectSize(input);
      if (inputSize > finalOptions.maxInputSize) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Input size (${inputSize} bytes) exceeds maximum of ${finalOptions.maxInputSize} bytes`,
        });
      }

      // Validate object structure
      validateObjectStructure(input, finalOptions);

      return next({ rawInput: input });
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Request validation failed",
      });
    }
  });
};

// Predefined limit configurations
export const standardLimits = requestLimits({
  maxInputSize: 512 * 1024, // 512KB
  maxArrayLength: 500,
  maxStringLength: 5000,
  maxObjectProperties: 50,
});

export const bulkOperationLimits = requestLimits({
  maxInputSize: 2 * 1024 * 1024, // 2MB for bulk operations
  maxArrayLength: 100, // Smaller array limit for bulk operations
  maxStringLength: 2000,
  maxObjectProperties: 20,
});

export const strictLimits = requestLimits({
  maxInputSize: 64 * 1024, // 64KB
  maxArrayLength: 50,
  maxStringLength: 1000,
  maxObjectProperties: 20,
});
