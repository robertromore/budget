/**
 * Wire types for the bulk-PDF-import flow. Shared between the
 * /api/import/bulk/* endpoints and the /import/bulk wizard so the
 * client doesn't need to import server modules to get response shapes.
 */

import type {
  ExtractedStatementTx,
  StatementHeader,
} from "$core/server/import/parser-runtime/executors/pdf-statement-extraction";

export interface BulkExtractResponse {
  fileName: string;
  fileSize: number;
  header: StatementHeader;
  transactions: ExtractedStatementTx[];
  match: {
    confidence: "exact" | "high" | "medium" | "none";
    accountId: number | null;
    accountName: string | null;
    reason: string;
  };
  chunkErrors: string[];
  fatalError?: string;
}

export interface BulkCommitFileResult {
  fileId: string;
  fileName: string;
  action: "skipped" | "imported" | "failed";
  accountId: number | null;
  accountName: string | null;
  accountCreated: boolean;
  transactionsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
  reconciledBalanceSet: boolean;
}

export interface BulkCommitResponse {
  results: BulkCommitFileResult[];
}
