/**
 * AI Telemetry
 *
 * Lightweight buffer + flush primitives for capturing tool-call
 * observability. A request-scoped collector accumulates one row per
 * tool invocation; the chat handler flushes the buffer once after
 * generateText resolves so we make a single bulk insert per request
 * instead of one insert per tool.
 */

import { db } from "$core/server/db";
import {
  aiToolCalls,
  type AIToolCallShape,
  type NewAIToolCall,
} from "$core/schema/ai-tool-calls";

export interface ToolCallRecord {
  toolName: string;
  inputShape?: AIToolCallShape;
  outputShape?: AIToolCallShape;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
}

/**
 * Per-request buffer. Pass one instance through `createAITools()` and
 * flush at the end of the chat handler.
 */
export class AIToolCallCollector {
  private readonly records: ToolCallRecord[] = [];

  record(record: ToolCallRecord): void {
    this.records.push(record);
  }

  get pendingCount(): number {
    return this.records.length;
  }

  /**
   * Persist all buffered rows in a single insert. Errors are swallowed
   * (logged only): telemetry must never break the user-facing chat.
   */
  async flush(args: { workspaceId: number; conversationId?: number | null }): Promise<void> {
    if (this.records.length === 0) return;
    const rows: NewAIToolCall[] = this.records.map((r) => ({
      workspaceId: args.workspaceId,
      conversationId: args.conversationId ?? null,
      toolName: r.toolName,
      inputShape: r.inputShape ?? null,
      outputShape: r.outputShape ?? null,
      latencyMs: r.latencyMs,
      success: r.success,
      errorCode: r.errorCode ?? null,
    }));
    this.records.length = 0;
    try {
      await db.insert(aiToolCalls).values(rows);
    } catch (error) {
      console.error("[AI Telemetry] Failed to flush tool-call records:", error);
    }
  }
}

/**
 * Describe an object's shape for telemetry: keys + JS-typeof of values.
 * Skips raw values so PII (notes, search queries, names) never lands in
 * the telemetry table.
 */
export function describeShape(input: unknown): AIToolCallShape | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const shape: AIToolCallShape = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === null) shape[key] = "null";
    else if (Array.isArray(value)) shape[key] = `array[${value.length}]`;
    else shape[key] = typeof value;
  }
  return shape;
}

/**
 * Wrap a tool's execute function to record start/end timestamps,
 * input/output shape, success state, and error code into the given
 * collector. Variadic additional args (e.g. AI SDK's options object
 * with abortSignal) are forwarded through untouched.
 */
export function withTelemetry<TInput, TOutput, TRest extends unknown[]>(
  toolName: string,
  collector: AIToolCallCollector,
  execute: (input: TInput, ...rest: TRest) => Promise<TOutput>
): (input: TInput, ...rest: TRest) => Promise<TOutput> {
  return async (input: TInput, ...rest: TRest) => {
    const started = Date.now();
    try {
      const result = await execute(input, ...rest);
      const latencyMs = Date.now() - started;
      collector.record({
        toolName,
        inputShape: describeShape(input),
        outputShape: describeShape(result),
        latencyMs,
        success: true,
      });
      return result;
    } catch (error) {
      const latencyMs = Date.now() - started;
      collector.record({
        toolName,
        inputShape: describeShape(input),
        latencyMs,
        success: false,
        errorCode: error instanceof Error ? error.name : "unknown",
      });
      throw error;
    }
  };
}
