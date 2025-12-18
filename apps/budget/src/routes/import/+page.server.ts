import { CSVProcessor } from "$lib/server/import/file-processors/csv-processor";
import { ExcelProcessor } from "$lib/server/import/file-processors/excel-processor";
import { OFXProcessor } from "$lib/server/import/file-processors/ofx-processor";
import { QIFProcessor } from "$lib/server/import/file-processors/qif-processor";
import { ImportOrchestrator } from "$lib/server/import/import-orchestrator";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import type { ParseResult } from "$lib/types/import";
import { fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  // Load accounts, payees, and categories for import
  const caller = createCaller(await createContext(event));
  const accounts = await caller.accountRoutes.all();
  const payees = await caller.payeeRoutes.all();
  const categories = await caller.categoriesRoutes.all();

  // Get preselected account ID from query parameter if provided
  const preselectedAccountId = event.url.searchParams.get("accountId");

  return {
    accounts,
    payees,
    categories,
    preselectedAccountId: preselectedAccountId || undefined,
  };
};

export const actions: Actions = {
  "upload-file": async ({ request }) => {
    try {
      const formData = await request.formData();
      const file = formData.get("importFile") as File;

      if (!file) {
        return fail(400, { error: "No file provided" });
      }

      // Determine file type and get appropriate processor
      const processor = getFileProcessor(file.name);

      if (!processor) {
        return fail(400, {
          error:
            "Unsupported file type. Supported formats: .csv, .txt, .xlsx, .xls, .qif, .ofx, .qfx",
        });
      }

      // Validate file
      const validation = processor.validateFile(file);
      if (!validation.valid) {
        return fail(400, { error: validation.error || "File validation failed" });
      }

      // Parse file
      const rawData = await processor.parseFile(file);

      // Extract column names
      const columns =
        rawData.length > 0 && rawData[0] ? Object.keys(rawData[0].normalizedData) : [];

      // Create parse result - ensure all data is plain objects
      const result: ParseResult = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "text/csv",
        rowCount: rawData.length,
        columns,
        rows: rawData.map((row) => ({
          rowIndex: row.rowIndex,
          rawData: { ...row.rawData },
          normalizedData: { ...row.normalizedData },
          validationStatus: row.validationStatus,
          validationErrors: row.validationErrors,
        })),
        parseErrors: [],
      };

      return result;
    } catch (error) {
      console.error("File upload error:", error);
      return fail(500, {
        error: error instanceof Error ? error.message : "Failed to process file",
      });
    }
  },

  "process-import": async ({ request, locals }) => {
    try {
      const formData = await request.formData();
      const importDataStr = formData.get("importData") as string;

      if (!importDataStr) {
        return fail(400, { error: "No import data provided" });
      }

      const importData = JSON.parse(importDataStr);

      // Create orchestrator and process import
      const orchestrator = new ImportOrchestrator();
      const result = await orchestrator.processImport(
        importData.accountId,
        importData.data,
        importData.options
      );

      // Return the result directly - SvelteKit will wrap it
      return { result };
    } catch (error) {
      console.error("Import processing error:", error);
      return fail(500, {
        error: error instanceof Error ? error.message : "Failed to process import",
      });
    }
  },
};

function getFileProcessor(fileName: string) {
  const extension = `.${fileName.split(".").pop()?.toLowerCase()}`;

  switch (extension) {
    case ".csv":
    case ".txt":
      return new CSVProcessor();
    case ".xlsx":
    case ".xls":
      return new ExcelProcessor();
    case ".qif":
      return new QIFProcessor();
    case ".ofx":
    case ".qfx":
      return new OFXProcessor();
    default:
      return null;
  }
}
