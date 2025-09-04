import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import type { Context } from "$lib/trpc";

// Initialize tRPC instance for middleware creation
const t = initTRPC.context<Context>().create();

/**
 * Sanitize string inputs to prevent XSS attacks
 * Removes or escapes potentially dangerous characters
 */
function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  
  // Remove or escape HTML tags and script content
  const sanitized = input
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/\x00-\x1F/g, '') // Remove control characters
    .trim();
    
  return sanitized;
}

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Also sanitize keys to prevent property pollution
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate that input doesn't contain suspicious patterns
 */
function validateInput(input: any): void {
  if (input === null || input === undefined) {
    return; // Allow null/undefined inputs
  }
  
  const inputStr = JSON.stringify(input);
  
  // Check for excessive nesting (potential DoS)
  const maxDepth = 15; // Increased from 10 to be less restrictive
  let depth = 0;
  for (const char of inputStr) {
    if (char === '{' || char === '[') {
      depth++;
      if (depth > maxDepth) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Input structure is too deeply nested',
        });
      }
    } else if (char === '}' || char === ']') {
      depth--;
    }
  }
}

/**
 * Input sanitization middleware for tRPC
 * Sanitizes all string inputs and validates for suspicious patterns
 */
export const inputSanitization = t.middleware(async ({ next, input }) => {
  try {
    // Validate input for dangerous patterns
    validateInput(input);
    
    // Sanitize all string inputs
    const sanitizedInput = sanitizeObject(input);
    
    return next({ input: sanitizedInput });
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid input provided',
    });
  }
});

/**
 * More strict sanitization for sensitive operations
 * Applies additional validation and stricter sanitization
 */
export const strictInputSanitization = t.middleware(async ({ next, input }) => {
  try {
    if (input === null || input === undefined) {
      return next({ input });
    }
    
    // Apply regular sanitization first
    validateInput(input);
    let sanitizedInput = sanitizeObject(input);
    
    // Additional strict validation for sensitive operations
    const inputStr = JSON.stringify(sanitizedInput);
    
    // Check for obvious attack patterns only
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi, // Script tags
      /javascript:\s*[^"\s]+/i, // JavaScript protocols
      /on\w+\s*=\s*[^"\s]+/i, // Event handlers
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(inputStr)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Input contains potentially dangerous content',
        });
      }
    }
    
    // Check for SQL injection patterns (even though we use prepared statements)
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
    ];
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(inputStr)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Input contains potentially dangerous SQL patterns',
        });
      }
    }
    
    return next({ input: sanitizedInput });
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid input provided',
    });
  }
});