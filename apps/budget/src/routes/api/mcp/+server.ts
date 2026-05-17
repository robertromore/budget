/**
 * MCP HTTP transport entry point.
 *
 * External AI clients (Claude Desktop, Codex CLI, MCP Inspector) POST
 * JSON-RPC requests here with `Authorization: Bearer <api_key>`. We
 * verify the key, build a per-request context, dispatch to the
 * protocol handler, and return the JSON-RPC response.
 *
 * No CSRF / session cookie checks — this is bearer-token only. We
 * deliberately reject requests without a valid token before doing any
 * work.
 */

import { verifyApiKey } from "$core/server/external-agents/api-key-service";
import { handleMcpRequest, type JsonRpcRequest } from "$core/server/external-agents/mcp-handler";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const MAX_BODY_BYTES = 25 * 1024 * 1024; // 25 MB — base64 PDF in extractStatement

function extractBearer(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

function jsonRpcError(
  status: number,
  code: number,
  message: string,
  id: number | string | null = null
): Response {
  return json(
    {
      jsonrpc: "2.0",
      id,
      error: { code, message },
    },
    { status }
  );
}

export const POST: RequestHandler = async ({ request }) => {
  const auth = request.headers.get("authorization");
  const token = extractBearer(auth);
  if (!token) {
    return jsonRpcError(401, -32001, "Missing or malformed Authorization header. Expected `Authorization: Bearer <api-key>`.");
  }

  // Read body up to the cap. Streaming would be nicer but JSON-RPC
  // payloads are bounded; if the client sends more, we reject.
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonRpcError(413, -32001, `Payload too large (${contentLength} bytes; max ${MAX_BODY_BYTES}).`);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(400, -32700, "Parse error: body is not valid JSON.");
  }

  // Batch requests aren't supported yet — explicit reject so clients
  // know to fall back to one-by-one.
  if (Array.isArray(body)) {
    return jsonRpcError(400, -32600, "Batch requests not supported. Send one JSON-RPC request per call.");
  }
  if (!body || typeof body !== "object") {
    return jsonRpcError(400, -32600, "Invalid request: expected a JSON-RPC object.");
  }

  // Verify the bearer token. We do this AFTER parsing the body so the
  // client gets clearer errors when both are wrong, but auth failure
  // still returns 401 immediately — no work done with an invalid key.
  const verified = await verifyApiKey(token);
  if (!verified) {
    return jsonRpcError(
      401,
      -32001,
      "Invalid or revoked API key. Generate a new one at /settings/external-agents.",
      (body as JsonRpcRequest).id ?? null
    );
  }

  const response = await handleMcpRequest(body as JsonRpcRequest, {
    apiKeyId: verified.apiKeyId,
    workspaceId: verified.workspaceId,
    userId: verified.userId,
    scope: verified.scope,
  });

  return json(response);
};

/**
 * GET on /api/mcp returns a tiny health probe. Some MCP clients
 * (notably the Inspector) issue a GET first to confirm the transport
 * is reachable before sending a real initialize.
 */
export const GET: RequestHandler = async () => {
  return json({
    server: "budget-app",
    transport: "http",
    methods: ["POST"],
    note: "POST JSON-RPC 2.0 here with Authorization: Bearer <api-key>",
  });
};
