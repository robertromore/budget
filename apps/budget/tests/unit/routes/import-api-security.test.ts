import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockImportApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "MockImportApiError";
  }
}

const mocks = {
  MockImportApiError,
  requireImportUserId: vi.fn(),
  parseOptionalPositiveInt: vi.fn(),
  parseRequiredPositiveInt: vi.fn(),
  requireImportAccountAccess: vi.fn(),
  requireImportWorkspaceAccess: vi.fn(),
  processImport: vi.fn(),
};

vi.mock("../../../src/routes/api/import/auth", () => ({
  ImportApiError: mocks.MockImportApiError,
  isImportApiError: (error: unknown) => error instanceof mocks.MockImportApiError,
  requireImportUserId: (...args: [Request]) => mocks.requireImportUserId(...args),
  parseOptionalPositiveInt: (...args: [unknown, string]) => mocks.parseOptionalPositiveInt(...args),
  parseRequiredPositiveInt: (...args: [unknown, string]) => mocks.parseRequiredPositiveInt(...args),
  requireImportAccountAccess: (...args: [string, number]) =>
    mocks.requireImportAccountAccess(...args),
  requireImportWorkspaceAccess: (...args: [string, number]) =>
    mocks.requireImportWorkspaceAccess(...args),
}));

vi.mock("$core/server/import/import-orchestrator", () => ({
  ImportOrchestrator: class {
    processImport(...args: unknown[]) {
      return mocks.processImport(...args);
    }
  },
}));

function defaultParseOptional(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new mocks.MockImportApiError(400, "Invalid numeric value");
  }
  return parsed;
}

function defaultParseRequired(value: unknown): number {
  const parsed = defaultParseOptional(value);
  if (parsed === null) throw new mocks.MockImportApiError(400, "account ID is required");
  return parsed;
}

function maybeResetModules() {
  const resetModules = (vi as unknown as { resetModules?: () => void }).resetModules;
  if (typeof resetModules === "function") {
    resetModules();
  }
}

async function loadUploadHandler() {
  maybeResetModules();
  const mod = await import("../../../src/routes/api/import/upload/+server");
  return mod.POST;
}

async function loadRemapHandler() {
  maybeResetModules();
  const mod = await import("../../../src/routes/api/import/remap/+server");
  return mod.POST;
}

async function loadPreviewEntitiesHandler() {
  maybeResetModules();
  const mod = await import("../../../src/routes/api/import/preview-entities/+server");
  return mod.POST;
}

async function loadInferCategoriesHandler() {
  maybeResetModules();
  const mod = await import("../../../src/routes/api/import/infer-categories/+server");
  return mod.POST;
}

async function loadProcessHandler() {
  maybeResetModules();
  const mod = await import("../../../src/routes/api/import/process/+server");
  return mod.POST;
}

function createUploadEvent() {
  const url = "http://localhost/api/import/upload?accountId=42";
  const form = new FormData();
  const request = new Request(url, { method: "POST", body: form });
  return { request, url: new URL(url) } as any;
}

function createRemapEvent() {
  const url = "http://localhost/api/import/remap";
  const formData = new FormData();
  formData.append("importFile", new File([""], "import.csv", { type: "text/csv" }));
  formData.append("columnMapping", JSON.stringify({ date: "Date", amount: "Amount" }));
  formData.append("accountId", "42");
  const request = new Request(url, {
    method: "POST",
    body: formData,
  });
  return { request, url: new URL(url) } as any;
}

function createPreviewEntitiesEvent() {
  const url = "http://localhost/api/import/preview-entities";
  const request = new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rows: [], accountId: 42 }),
  });
  return { request, url: new URL(url) } as any;
}

function createInferCategoriesEvent(workspaceId = 42) {
  const url = "http://localhost/api/import/infer-categories";
  const request = new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rows: [], accountId: 42, workspaceId }),
  });
  return { request, url: new URL(url) } as any;
}

function createProcessEvent() {
  const url = "http://localhost/api/import/process";
  const request = new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accountId: 42, rows: [] }),
  });
  return { request, url: new URL(url) } as any;
}

describe("Import API security regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.requireImportUserId.mockResolvedValue("user_123");
    mocks.parseOptionalPositiveInt.mockImplementation(defaultParseOptional);
    mocks.parseRequiredPositiveInt.mockImplementation(defaultParseRequired);
    mocks.requireImportAccountAccess.mockResolvedValue({ id: 42, workspaceId: 42 });
    mocks.requireImportWorkspaceAccess.mockResolvedValue(undefined);
    mocks.processImport.mockResolvedValue({
      success: true,
      transactionsCreated: 0,
      entitiesCreated: { payees: 0, categories: 0 },
      errors: [],
      warnings: [],
      duplicatesDetected: [],
      summary: { totalRows: 0, validRows: 0, invalidRows: 0, skippedRows: 0 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const unauthorizedCases = [
    { name: "upload", load: loadUploadHandler, event: createUploadEvent },
    { name: "remap", load: loadRemapHandler, event: createRemapEvent },
    {
      name: "preview-entities",
      load: loadPreviewEntitiesHandler,
      event: createPreviewEntitiesEvent,
    },
    {
      name: "infer-categories",
      load: loadInferCategoriesHandler,
      event: createInferCategoriesEvent,
    },
    { name: "process", load: loadProcessHandler, event: createProcessEvent },
  ];

  for (const testCase of unauthorizedCases) {
    it(`returns 401 for unauthenticated ${testCase.name} requests`, async () => {
      mocks.requireImportUserId.mockRejectedValue(
        new mocks.MockImportApiError(401, "Authentication required")
      );

      const handler = await testCase.load();
      const response = await handler(testCase.event());
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Authentication required");
    });
  }

  const forbiddenCases = [
    { name: "upload", load: loadUploadHandler, event: createUploadEvent },
    { name: "remap", load: loadRemapHandler, event: createRemapEvent },
    {
      name: "preview-entities",
      load: loadPreviewEntitiesHandler,
      event: createPreviewEntitiesEvent,
    },
    {
      name: "infer-categories",
      load: loadInferCategoriesHandler,
      event: createInferCategoriesEvent,
    },
    { name: "process", load: loadProcessHandler, event: createProcessEvent },
  ];

  for (const testCase of forbiddenCases) {
    it(`returns 403 when account/workspace access is denied for ${testCase.name}`, async () => {
      mocks.requireImportAccountAccess.mockRejectedValue(
        new mocks.MockImportApiError(403, "You do not have access to this workspace")
      );

      const handler = await testCase.load();
      const response = await handler(testCase.event());
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe("You do not have access to this workspace");
    });
  }

  it("rejects infer-categories when workspaceId does not match authorized account workspace", async () => {
    mocks.requireImportAccountAccess.mockResolvedValue({ id: 42, workspaceId: 777 });

    const handler = await loadInferCategoriesHandler();
    const response = await handler(createInferCategoriesEvent(42));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Workspace ID does not match account workspace");
    expect(mocks.requireImportWorkspaceAccess).not.toHaveBeenCalled();
  });

  it("does not run import orchestration when process access is denied", async () => {
    mocks.requireImportAccountAccess.mockRejectedValue(
      new mocks.MockImportApiError(403, "You do not have access to this workspace")
    );

    const handler = await loadProcessHandler();
    const response = await handler(createProcessEvent());

    expect(response.status).toBe(403);
    expect(mocks.processImport).not.toHaveBeenCalled();
  });
});
