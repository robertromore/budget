/**
 * Financial Data Import Types
 *
 * Type definitions for the multi-format import system supporting
 * CSV, Excel, QIF, and OFX file formats with intelligent entity matching
 * and validation.
 */

// Import row states
export type ImportRowStatus = "pending" | "valid" | "invalid" | "warning" | "duplicate" | "skipped" | "transfer_match";
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
  /** Original payee value from CSV before any user overrides - used for alias tracking */
  originalPayee?: string | null;
  /** Match to an existing transfer target transaction (Phase 9) */
  transferTargetMatch?: TransferTargetMatch;
  /** Source file ID for multi-file imports (Phase 10) */
  sourceFileId?: string;
  /** Source file name for multi-file imports */
  sourceFileName?: string;
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
  // Transfer support - when specified, this transaction creates a transfer instead of regular transaction
  transferAccountId?: number;
  transferAccountName?: string;
  rememberTransferMapping?: boolean;
  // Suggested transfer from saved mappings (for UI display)
  suggestedTransferAccountId?: number;
  suggestedTransferAccountName?: string;
  transferMappingConfidence?: "high" | "medium" | "low";
  // Utility account specific fields
  periodStart?: string;
  periodEnd?: string;
  usageAmount?: number;
  usageUnit?: string;
  meterReadingStart?: number;
  meterReadingEnd?: number;
  baseCharge?: number;
  usageCost?: number;
  taxes?: number;
  fees?: number;
  dueDate?: string;
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
  date: string | null;
  amount?: string | null;
  debit?: string | null;
  credit?: string | null;
  payee?: string | null;
  notes?: string | null;
  category?: string | null;
  status?: string | null;
  // Schema naming convention
  inflow?: string | null;
  outflow?: string | null;
  memo?: string | null;
  description?: string | null;
  // Utility account specific fields
  periodStart?: string | null;
  periodEnd?: string | null;
  usageAmount?: string | null;
  usageUnit?: string | null;
  meterReadingStart?: string | null;
  meterReadingEnd?: string | null;
  baseCharge?: string | null;
  usageCost?: string | null;
  taxes?: string | null;
  fees?: string | null;
  dueDate?: string | null;
}

// Entity matching results
export interface EntityMatch {
  type: MatchType;
  confidence: number;
  entityId?: number;
  entityName: string;
  created: boolean;
  alternatives?: Array<{ id: number; name: string; confidence: number }>;
}

export interface EntityMatches {
  payee?: EntityMatch;
  category?: EntityMatch;
}

// Transfer target matching (Phase 9)
// When importing to an account, detect if a row matches an existing transfer target
// created from a transfer originating in another account
export interface TransferTargetMatch {
  /** ID of the existing transfer target transaction */
  existingTransactionId: number;
  /** Shared transfer ID linking both sides of the transfer */
  existingTransferId: string;
  /** The account where the transfer originated (the source side) */
  sourceAccountId: number;
  /** Display name of the source account */
  sourceAccountName: string;
  /** Days difference between import row date and existing transfer date (0-3) */
  dateDifference: number;
  /** Confidence level based on date proximity */
  confidence: "high" | "medium" | "low";
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
  /** Mapping of created payees: original import string → new payee (for alias tracking) */
  createdPayeeMappings?: Array<{
    originalName: string;    // Raw import string (e.g., "WALMART #1234 DALLAS TX")
    normalizedName: string;  // Cleaned name stored as payee.name (e.g., "Walmart")
    payeeId: number;         // ID of the newly created payee
  }>;
  /** Mapping of category assignments: raw import string → category (for category alias tracking) */
  createdCategoryMappings?: Array<{
    rawString: string;       // The raw payee/description string from import
    categoryId: number;      // The category that was assigned
    payeeId?: number;        // The payee ID if known (for payee-context matching)
    wasAiSuggested?: boolean; // Whether this was an AI/ML suggestion (vs explicit user selection)
  }>;
  /** Transfer pairs created during import */
  transfersCreated?: number;
  /** Transfer mappings that were saved for future imports */
  transferMappingsSaved?: number;
  /** Utility usage records created (for utility account imports) */
  utilityRecordsCreated?: number;
  /** Count of rows reconciled with existing transfer targets (Phase 9) */
  reconciled?: number;
  /** Details of reconciled transfer targets */
  reconciledTransactions?: Array<{
    rowIndex: number;
    existingTransactionId: number;
    sourceAccountName: string;
  }>;
  /** Per-file breakdown for multi-file imports */
  byFile?: Record<string, {
    fileName: string;
    imported: number;
    duplicates: number;
    errors: number;
    reconciled: number;
    transfers: number;
  }>;
}

// Progress tracking
export interface ImportProgress {
  phase: ImportPhase;
  processed: number;
  total: number;
  percentage: number;
  currentRow?: number;
  errors: Array<{ row: number; message: string }>;
}

/**
 * Alias candidate emitted when user confirms a different payee during import.
 * Used to record the mapping for future imports.
 *
 * For existing payees: payeeId is set, payeeName may be set for reference
 * For new payees: payeeId is null, payeeName is set (resolved to ID after import)
 */
export interface AliasCandidate {
  rawString: string;
  payeeId?: number | null;  // For existing payees
  payeeName?: string;       // For new payees (resolved to ID after import)
}

// File processor interface
export interface FileProcessor {
  parseFile(file: File): Promise<ImportRow[]>;
  validateFile(file: File): { valid: boolean; error?: string };
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

// ============================================================================
// Payee Cleanup & Category Recommendation Types (Phase 13)
// ============================================================================

/**
 * User decision for payee group handling
 */
export type PayeeGroupDecision = "accept" | "reject" | "custom" | "pending";

/**
 * A group of similar payees detected during import cleanup
 */
export interface PayeeGroupMember {
  rowIndex: number;
  originalPayee: string;
  normalizedPayee: string;
}

export interface ExistingPayeeMatch {
  id: number;
  name: string;
  confidence: number;
}

export interface PayeeGroup {
  /** Unique identifier for this group */
  groupId: string;
  /** The cleaned/normalized name to use for all members */
  canonicalName: string;
  /** How confident we are in grouping (0-1) */
  confidence: number;
  /** All payee variations that were grouped together */
  members: PayeeGroupMember[];
  /** Match to existing payee in database, if found */
  existingMatch?: ExistingPayeeMatch;
  /** User's decision for how to handle this group */
  userDecision: PayeeGroupDecision;
  /** Custom name if user chose 'custom' decision */
  customName?: string;
  /** If user marked this group as a transfer, the target account ID */
  transferAccountId?: number;
  /** If user marked this group as a transfer, the target account name */
  transferAccountName?: string;
}

/**
 * Reason for a category suggestion
 */
export type CategorySuggestionReason =
  | "payee_match" // Payee has a default category
  | "payee_history" // This payee typically uses this category
  | "amount_pattern" // Amount pattern matches this category
  | "time_pattern" // Transaction time pattern matches
  | "similar_transaction" // Similar transactions use this category
  | "ml_prediction"; // ML model prediction

export interface CategorySuggestionOption {
  categoryId: number;
  categoryName: string;
  categoryGroupName?: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Why this category was suggested */
  reason: CategorySuggestionReason;
}

export interface CategorySuggestion {
  rowIndex: number;
  /** Top suggestions ordered by confidence */
  suggestions: CategorySuggestionOption[];
  /** The category ID that was selected (auto or user) */
  selectedCategoryId?: number;
  /** Whether user manually overrode the auto-selection */
  userOverride: boolean;
}

/**
 * State for the cleanup step in the import wizard
 */
export interface CleanupState {
  /** Grouped payees with merge suggestions */
  payeeGroups: PayeeGroup[];
  /** Category suggestions for each row */
  categorySuggestions: CategorySuggestion[];
  /** Whether analysis is currently running */
  isAnalyzing: boolean;
  /** Analysis progress (0-100) */
  analysisProgress: number;
  /** Current analysis phase */
  analysisPhase?: "grouping_payees" | "matching_existing" | "suggesting_categories";
}

/**
 * Summary statistics for the cleanup step
 */
export interface CleanupSummary {
  /** Number of unique payee groups */
  payeeGroupCount: number;
  /** Number of groups matched to existing payees */
  existingPayeeMatches: number;
  /** Number of new payees to create */
  newPayeesToCreate: number;
  /** Number of rows with high-confidence category suggestions */
  autoFilledCategories: number;
  /** Number of rows needing manual category review */
  manualCategoryReview: number;
}

// ============================================================================
// Multi-File Import Types (Phase 10)
// ============================================================================

/**
 * Supported import file types
 */
export type ImportFileType = "csv" | "excel" | "ofx" | "qif" | "qfx" | "iif" | "qbo";

/**
 * Entity overrides for a single import row
 */
export interface EntityOverride {
  payeeId?: number | null;
  payeeName?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  description?: string | null;
  // Transfer support
  transferAccountId?: number | null;
  transferAccountName?: string | null;
  rememberTransferMapping?: boolean;
}

/**
 * Represents a single file in a multi-file import session
 */
export interface ImportFile {
  /** Unique identifier for this file */
  id: string;
  /** The actual file object */
  file: File;
  /** Display name of the file */
  fileName: string;
  /** Detected file type */
  fileType: ImportFileType;
  /** Current processing status */
  status: "pending" | "uploading" | "mapping" | "cleanup" | "preview" | "ready" | "error";
  /** Error message if status is 'error' */
  error?: string;
  /** Parse result from file upload */
  parseResult?: ParseResult;
  /** Column mapping (for CSV/Excel files that need mapping) */
  columnMapping?: ColumnMapping;
  /** Validated rows after processing */
  validatedRows?: ImportRow[];
  /** Entity overrides for this file's rows */
  entityOverrides?: Record<number, EntityOverride>;
  /** Schedule matches detected in this file */
  scheduleMatches?: ScheduleMatch[];
  /** Whether this file needs column mapping step */
  needsColumnMapping?: boolean;
  /** Detected or matched import profile */
  matchedProfile?: { id: number; name: string } | null;
}

/**
 * Global state for multi-file import session
 */
export type MultiFileGlobalStep = "upload" | "processing" | "review" | "importing" | "complete";

export interface MultiFileImportState {
  /** All files in the import session */
  files: ImportFile[];
  /** Index of the currently processing file */
  currentFileIndex: number;
  /** Global step in the import wizard */
  globalStep: MultiFileGlobalStep;
  /** Enforced file type (set after first file is added) */
  enforceFileType?: ImportFileType;
}

// Note: Multi-file import results use ImportResult.byFile field for per-file breakdown
