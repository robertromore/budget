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
  errors: Array<{ row: number; message: string }>;
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
