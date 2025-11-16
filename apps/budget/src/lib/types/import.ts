/**
 * Financial Data Import Types
 *
 * Type definitions for the multi-format import system supporting
 * CSV, Excel, QIF, and OFX file formats with intelligent entity matching
 * and validation.
 */

// Import row states
export type ImportRowStatus = "pending" | "valid" | "invalid" | "warning" | "duplicate" | "skipped";
export type ImportPhase =
  | "validation"
  | "entity_matching"
  | "transaction_creation"
  | "finalization";
export type MatchType = "exact" | "fuzzy" | "created" | "none";

// Raw import data from file parsing
export interface ImportRow {
  rowIndex: number;
  rawData: Record<string, any>;
  normalizedData: Record<string, any>;
  validationStatus: ImportRowStatus;
  validationErrors?: ValidationError[];
  duplicateMatch?: DuplicateMatch;
}

// Normalized transaction data after parsing
export interface NormalizedTransaction {
  date: string;
  amount: number;
  payee?: string;
  notes?: string;
  category?: string;
  status?: "pending" | "cleared";
  fitid?: string; // OFX Financial Institution Transaction ID
}

// Validation error structure
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  severity: "error" | "warning";
}

// Column mapping for flexible CSV structures
export interface ColumnMapping {
  date: string;
  amount?: string;
  debit?: string;
  credit?: string;
  payee?: string;
  notes?: string;
  category?: string;
  status?: string;
}

// Entity matching results
export interface EntityMatch {
  type: MatchType;
  confidence: number;
  entityId?: number;
  entityName: string;
  created: boolean;
  alternatives?: Array<{id: number; name: string; confidence: number}>;
}

export interface EntityMatches {
  payee?: EntityMatch;
  category?: EntityMatch;
}

// Duplicate detection
export interface DuplicateMatch {
  transactionId: number;
  score: number;
  factors: {
    amountMatch: boolean;
    dateMatch: boolean;
    payeeMatch: boolean;
    descriptionSimilarity: number;
  };
  transaction: {
    id: number;
    date: string;
    amount: number;
    payee?: string;
    description?: string;
  };
}

export interface DuplicateDetectionCriteria {
  dateWindow: number; // Days before/after to search
  amountTolerance: number; // Dollar amount variance
  descriptionThreshold: number; // Similarity percentage
  minimumScore: number; // Minimum match score
}

// Import request and result
export interface ImportRequest {
  accountId: number;
  data: ImportRow[];
  columnMapping: ColumnMapping;
  entityMatches: Record<number, EntityMatches>;
  options?: ImportOptions;
}

export interface ImportOptions {
  allowPartialImport?: boolean;
  createMissingEntities?: boolean;
  createMissingPayees?: boolean;
  createMissingCategories?: boolean;
  skipDuplicates?: boolean;
  duplicateThreshold?: number;
  reverseAmountSigns?: boolean;
  fileName?: string; // Source file name for tracking import history
}

export interface ImportResult {
  success: boolean;
  transactionsCreated: number;
  entitiesCreated: {
    payees: number;
    categories: number;
  };
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value?: any;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
    value?: any;
  }>;
  duplicatesDetected: DuplicateMatch[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    skippedRows: number;
  };
}

// Progress tracking
export interface ImportProgress {
  phase: ImportPhase;
  processed: number;
  total: number;
  percentage: number;
  currentRow?: number;
  errors: Array<{row: number; message: string}>;
}

// File processor interface
export interface FileProcessor {
  parseFile(file: File): Promise<ImportRow[]>;
  validateFile(file: File): {valid: boolean; error?: string};
  getSupportedFormats(): string[];
}

// Parse result from file upload
export interface ParseResult {
  fileName: string;
  fileSize: number;
  fileType: string;
  rowCount: number;
  columns: string[];
  rows: ImportRow[];
  parseErrors: string[];
  scheduleMatches?: ScheduleMatch[]; // Detected schedule matches
}

// Validated row after processing
export interface ValidatedRow {
  originalIndex: number;
  mappedData: Record<string, any>;
  validatedData: NormalizedTransaction;
  entityMatches: EntityMatches;
}

// QIF transaction structure
export interface QIFTransaction {
  date: string;
  amount: number;
  payee?: string;
  memo?: string;
  category?: string;
  number?: string;
  cleared?: boolean;
}

// OFX transaction structure
export interface OFXTransaction {
  type: string;
  date: string;
  amount: string;
  fitid: string;
  name?: string;
  memo?: string;
}

export interface OFXData {
  transactions: OFXTransaction[];
  accountInfo?: {
    accountId: string;
    accountType: string;
    balance?: number;
  };
}

// Entity preview for review before creation
export interface EntityPreview {
  name: string;
  source: "import" | "inferred"; // Whether explicitly provided or inferred from transaction data
  occurrences: number; // How many transactions use this entity
  selected: boolean; // Whether user selected to create this entity
  existing?: {
    id: number;
    name: string;
  }; // If matching entity already exists
}

export interface PayeePreview extends EntityPreview {
  suggestedType?: "individual" | "business";
}

export interface CategoryPreview extends EntityPreview {
  suggestedType?: "income" | "expense" | "transfer";
}

// Preview data returned before actual import
export interface ImportPreviewData {
  payees: PayeePreview[];
  categories: CategoryPreview[];
  transactions: {
    total: number;
    valid: number;
    duplicates: number;
    errors: number;
  };
}

// Enhanced parse result with preview data
export interface ParseResultWithPreview extends ParseResult {
  preview: ImportPreviewData;
}

// IIF (Intuit Interchange Format) transaction structure
export interface IIFTransaction {
  type: string; // TRNS, SPL, ENDTRNS, etc.
  date: string;
  account: string;
  name: string;
  amount: number;
  memo?: string;
  category?: string;
  cleared?: boolean;
  number?: string;
  splits?: IIFSplit[];
}

export interface IIFSplit {
  account: string;
  amount: number;
  memo?: string;
  category?: string;
}

// QBO (QuickBooks Online Backup) transaction structure
export interface QBOTransaction {
  type: string; // Check, Deposit, Payment, etc.
  date: string;
  amount: number;
  account: string;
  vendor?: string;
  customer?: string;
  memo?: string;
  category?: string;
  checkNumber?: string;
  txnId?: string;
}

// Schedule matching
export type ScheduleMatchConfidence = "exact" | "high" | "medium" | "low" | "none";

export interface ScheduleMatch {
  rowIndex: number;
  scheduleId: number;
  scheduleName: string;
  confidence: ScheduleMatchConfidence;
  score: number;
  matchedOn: string[];
  reasons: string[];
  selected: boolean; // User selection state
  transactionData: {
    date: string;
    amount: number;
    payee?: string;
  };
  scheduleData: {
    name: string;
    amount: number;
    amount_type: "exact" | "approximate" | "range";
    recurring: boolean;
  };
}
