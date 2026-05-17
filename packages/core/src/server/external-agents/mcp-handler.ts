/**
 * MCP JSON-RPC dispatcher for the external-agent HTTP endpoint.
 *
 * Implements just enough of the MCP protocol (initialize / tools/list /
 * tools/call) to serve Claude Desktop, Codex CLI, and the MCP
 * Inspector. The transport (HTTP POST with JSON bodies) is handled by
 * the SvelteKit endpoint in apps/budget/src/routes/api/mcp/+server.ts;
 * this module is the protocol-aware bit.
 *
 * Protocol version pinned to 2024-11-05 (the Streamable HTTP transport
 * spec). Newer clients that negotiate up will work; older ones get
 * rejected at initialize.
 */

import type { AIToolName } from "$core/server/ai/tools";
import { AI_TOOL_NAMES, AI_TOOL_SCOPES, createAITools } from "$core/server/ai/tools";
import { AIToolCallCollector } from "$core/server/ai/telemetry";
import type { ExternalApiKeyScope } from "$core/schema/external-api-keys";
import { MCP_PDF_TOOLS } from "./mcp-pdf-tools";

const PDF_TOOL_BY_NAME = new Map(MCP_PDF_TOOLS.map((t) => [t.name, t]));

export const MCP_PROTOCOL_VERSION = "2024-11-05";
export const MCP_SERVER_NAME = "budget-app";
export const MCP_SERVER_VERSION = "0.1.0";

export interface MCPRequestContext {
  apiKeyId: number;
  workspaceId: number;
  userId: string;
  scope: ExternalApiKeyScope;
}

/** Minimal JSON-RPC 2.0 request shape. */
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// JSON-RPC standard error codes plus MCP-specific extensions.
const ERR_PARSE = -32700;
const ERR_INVALID_REQUEST = -32600;
const ERR_METHOD_NOT_FOUND = -32601;
const ERR_INVALID_PARAMS = -32602;
const ERR_INTERNAL = -32603;
// MCP-specific: tool not found / unauthorized scope.
const ERR_TOOL_NOT_FOUND = -32000;
const ERR_SCOPE_DENIED = -32001;

function makeError(
  id: number | string | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

function makeResult(id: number | string | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

/**
 * Top-level dispatcher. Returns a JSON-RPC response object that the
 * SvelteKit endpoint serializes back to the client. Never throws on a
 * bad request — it folds errors into the JSON-RPC envelope so MCP
 * clients see structured failures.
 */
export async function handleMcpRequest(
  request: JsonRpcRequest,
  context: MCPRequestContext
): Promise<JsonRpcResponse> {
  const id = request.id ?? null;

  if (request.jsonrpc !== "2.0" || !request.method) {
    return makeError(id, ERR_INVALID_REQUEST, "Invalid JSON-RPC request");
  }

  try {
    switch (request.method) {
      case "initialize":
        return makeResult(id, handleInitialize(request.params));
      case "tools/list":
        return makeResult(id, handleToolsList(context));
      case "tools/call":
        return makeResult(id, await handleToolsCall(request.params, context));
      // Notifications and other MCP methods we don't yet support
      // — return empty result so initialize handshakes can complete.
      case "notifications/initialized":
        return makeResult(id, {});
      case "ping":
        return makeResult(id, {});
      default:
        return makeError(id, ERR_METHOD_NOT_FOUND, `Method not found: ${request.method}`);
    }
  } catch (error) {
    const code =
      error instanceof MCPError
        ? error.code
        : ERR_INTERNAL;
    const message = error instanceof Error ? error.message : String(error);
    return makeError(id, code, message);
  }
}

class MCPError extends Error {
  constructor(
    public code: number,
    message: string
  ) {
    super(message);
  }
}

function handleInitialize(_params: unknown): {
  protocolVersion: string;
  capabilities: { tools: Record<string, unknown> };
  serverInfo: { name: string; version: string };
} {
  return {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {
      // We support the tools capability; resources/prompts come later.
      tools: { listChanged: false },
    },
    serverInfo: {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
  };
}

interface MCPToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Read tool descriptors off `createAITools`. The AI SDK's `tool()`
 * factory stores { description, inputSchema, execute } as-is, so we
 * can inspect them without invoking. Filter by scope at the end.
 */
function buildToolDescriptors(scope: ExternalApiKeyScope): MCPToolDescriptor[] {
  // We need a tools object to read descriptors from. Pass a throwaway
  // workspaceId (0) since we're not executing — just reading metadata.
  // The collector is omitted so the wrapper doesn't fire.
  const tools = createAITools(0);
  const out: MCPToolDescriptor[] = [];
  for (const name of AI_TOOL_NAMES) {
    const toolScope = AI_TOOL_SCOPES[name];
    if (scope === "read_only" && toolScope !== "read") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tool = (tools as any)[name];
    if (!tool) continue;
    out.push({
      name,
      description: tool.description ?? "",
      inputSchema:
        (tool.inputSchema?.jsonSchema as Record<string, unknown> | undefined) ??
        (tool.inputSchema as Record<string, unknown> | undefined) ??
        { type: "object", properties: {} },
    });
  }
  for (const pdfTool of MCP_PDF_TOOLS) {
    if (scope === "read_only" && pdfTool.scope !== "read") continue;
    out.push({
      name: pdfTool.name,
      description: pdfTool.description,
      inputSchema: pdfTool.inputSchema,
    });
  }
  return out;
}

function handleToolsList(context: MCPRequestContext): { tools: MCPToolDescriptor[] } {
  return { tools: buildToolDescriptors(context.scope) };
}

interface ToolsCallParams {
  name?: string;
  arguments?: Record<string, unknown>;
}

async function handleToolsCall(
  params: unknown,
  context: MCPRequestContext
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  if (!params || typeof params !== "object") {
    throw new MCPError(ERR_INVALID_PARAMS, "Missing params");
  }
  const { name, arguments: args } = params as ToolsCallParams;
  if (!name) throw new MCPError(ERR_INVALID_PARAMS, "Missing tool name");

  // PDF-specific tools live in mcp-pdf-tools.ts because they take a
  // different shape from the AI-SDK chat tools (workspaceId-bound
  // execute, no telemetry wrapper). Dispatch them here.
  const pdfTool = PDF_TOOL_BY_NAME.get(name);
  if (pdfTool) {
    if (context.scope === "read_only" && pdfTool.scope !== "read") {
      throw new MCPError(
        ERR_SCOPE_DENIED,
        `Tool "${pdfTool.name}" requires a read+write API key.`
      );
    }
    const startedAt = Date.now();
    const collector = new AIToolCallCollector();
    let toolResult: unknown;
    let isError = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolResult = await pdfTool.execute(args as any, context.workspaceId);
    } catch (error) {
      isError = true;
      toolResult = {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // PDF tools aren't wrapped by withTelemetry, so emit a single
      // tool_call record directly so the Activity page surfaces them.
      collector.record({
        toolName: pdfTool.name,
        inputShape: undefined,
        outputShape: undefined,
        latencyMs: Date.now() - startedAt,
        success: !isError,
      });
      await collector.flush({ workspaceId: context.workspaceId, apiKeyId: context.apiKeyId });
    }
    return {
      content: [{ type: "text", text: JSON.stringify(toolResult) }],
      ...(isError ? { isError: true } : {}),
    };
  }

  if (!(AI_TOOL_NAMES as readonly string[]).includes(name)) {
    throw new MCPError(ERR_TOOL_NOT_FOUND, `Unknown tool: ${name}`);
  }
  const toolName = name as AIToolName;
  const requiredScope = AI_TOOL_SCOPES[toolName];
  if (context.scope === "read_only" && requiredScope !== "read") {
    throw new MCPError(
      ERR_SCOPE_DENIED,
      `Tool "${toolName}" requires a read+write API key.`
    );
  }

  // Build a real tools object bound to this workspace, with the
  // telemetry collector tagged for external attribution. Flush at
  // the end so each MCP call gets recorded in ai_tool_call.
  const collector = new AIToolCallCollector();
  const tools = createAITools(context.workspaceId, collector);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tool = (tools as any)[toolName];
  if (!tool || typeof tool.execute !== "function") {
    throw new MCPError(ERR_TOOL_NOT_FOUND, `Tool "${toolName}" not callable`);
  }

  let toolResult: unknown;
  let isError = false;
  try {
    toolResult = await tool.execute(args ?? {}, { abortSignal: undefined });
  } catch (error) {
    isError = true;
    toolResult = {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await collector.flush({ workspaceId: context.workspaceId, apiKeyId: context.apiKeyId });
  }

  // MCP returns content as an array of typed parts. For now we serialize
  // the tool's JSON result as a single text part — agents reading it
  // will JSON.parse, but the protocol allows them to consume it as
  // human-readable too.
  return {
    content: [{ type: "text", text: JSON.stringify(toolResult) }],
    ...(isError ? { isError: true } : {}),
  };
}
