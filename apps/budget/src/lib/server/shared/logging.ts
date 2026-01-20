/**
 * Server-side logging utility
 * Provides structured logging with different severity levels
 */

import { nowISOString } from "$lib/utils/dates";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

/**
 * Options for error logging.
 * Supports multiple calling patterns for flexibility:
 * - logger.error("message", error)
 * - logger.error("message", error, { context })
 * - logger.error("message", { error, ...context })
 */
export interface ErrorLogOptions {
  error?: Error | unknown;
  [key: string]: unknown;
}

/**
 * Serialize an error to a plain object for logging
 */
function serializeError(error: unknown): Record<string, unknown> | unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = nowISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage("info", message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("warn", message, context));
  }

  /**
   * Log an error with optional context.
   *
   * Supports multiple calling patterns:
   * @example
   * // Pattern 1: Just message and error
   * logger.error("Failed to process", error);
   *
   * // Pattern 2: Message, error, and context
   * logger.error("Failed to process", error, { userId: 123 });
   *
   * // Pattern 3: Message with options object (recommended)
   * logger.error("Failed to process", { error, userId: 123 });
   */
  error(
    message: string,
    errorOrOptions?: Error | unknown | ErrorLogOptions,
    context?: LogContext
  ): void {
    let errorInfo: unknown = undefined;
    let contextInfo: LogContext = {};

    if (errorOrOptions instanceof Error) {
      // Pattern 1 or 2: error(message, Error, context?)
      errorInfo = serializeError(errorOrOptions);
      contextInfo = context ?? {};
    } else if (errorOrOptions && typeof errorOrOptions === "object") {
      // Pattern 3: error(message, { error, ...context })
      const { error: embeddedError, ...rest } = errorOrOptions as ErrorLogOptions;
      if (embeddedError !== undefined) {
        errorInfo = serializeError(embeddedError);
        contextInfo = { ...rest, ...context };
      } else {
        // No error property, treat entire object as context
        contextInfo = { ...errorOrOptions, ...context } as LogContext;
      }
    } else if (errorOrOptions !== undefined) {
      // Primitive value passed as error
      errorInfo = errorOrOptions;
      contextInfo = context ?? {};
    }

    const fullContext: LogContext = {
      ...contextInfo,
      ...(errorInfo !== undefined && { error: errorInfo }),
    };

    console.error(this.formatMessage("error", message, fullContext));
  }
}

export const logger = new Logger();
