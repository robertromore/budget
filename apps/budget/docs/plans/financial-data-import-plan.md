# Financial Data Import Plan: Multi-Format Import System

## Overview

This document outlines the comprehensive implementation of a financial data import system that supports multiple file formats (CSV, Excel, QIF, OFX) with intelligent entity matching, validation, and user-friendly workflows. The goal is to enable users to seamlessly import their financial data from banks, accounting software, and manual records.

## Current System Analysis

### Existing Foundation

#### Strong Architecture Base (✅ Available)

- **Domain-Driven Services**: Robust service layer with comprehensive validation patterns
- **Entity Schemas**: Well-defined schemas for transactions, accounts, payees, and categories
- **Validation Infrastructure**: Input sanitization, security measures, and business rule validation
- **tRPC Integration**: Type-safe API layer with error handling and rate limiting
- **Bulk Operations**: Limited bulk delete functionality with error collection patterns

#### Current Gaps (❌ Missing)

- **File Upload Infrastructure**: No file handling components or server-side processing
- **Import/Export Features**: No existing import functionality or data transformation utilities
- **Bulk Creation Operations**: No bulk insert or batch creation capabilities
- **Entity Matching**: No fuzzy matching or auto-creation logic for payees/categories
- **Progress Tracking**: No long-running operation progress indicators

### Entity Requirements Analysis

#### Transaction Import Requirements

**Required Fields**:
- `accountId` - Must resolve to existing account or create new account
- `amount` - Range: -$999,999.99 to $999,999.99
- `date` - Auto-assigns status based on current date comparison

**Optional Fields**:
- `payeeId` - Auto-match or create payee from name/description
- `categoryId` - Auto-match or create category from patterns
- `notes` - 500 character limit with XSS prevention
- `status` - Override automatic status assignment

**Data Transformation Needs**:
- **Date Formats**: Handle various date formats (MM/DD/YYYY, DD/MM/YYYY, ISO, Excel serial)
- **Amount Formats**: Parse currency symbols, thousands separators, negative indicators
- **Text Encoding**: Support UTF-8, UTF-16, and legacy encodings
- **Duplicate Detection**: Identify potential duplicates by date, amount, and description

## Implementation Strategy

### Phase 1: File Upload Infrastructure (Weeks 1-2)

#### 1.1 File Upload Components

**File Upload Interface** (`src/lib/components/import/file-upload-dropzone.svelte`):

```typescript
interface FileUploadProps {
  acceptedFormats: string[];              // ['.csv', '.xlsx', '.qif', '.ofx']
  maxFileSize: number;                    // 10MB default
  onFileSelected: (file: File) => void;
  onFileRejected: (error: string) => void;
  allowMultiple?: boolean;

  // Visual customization
  dragAreaClass?: string;
  showPreview?: boolean;
  progressTracker?: boolean;
}

// Features:
// - Drag-and-drop interface with visual feedback
// - File type validation with clear error messages
// - File size limits with progress indicators
// - Preview of selected files before upload
// - Support for multiple file selection
```

**Import Preview Table** (`src/lib/components/import/import-preview-table.svelte`):

```typescript
interface ImportPreviewProps {
  rawData: ImportRow[];
  columnMapping: ColumnMapping;
  validationResults: ValidationResult[];
  entityMatches: EntityMatchResult[];

  onColumnMappingChange: (mapping: ColumnMapping) => void;
  onEntityMatchConfirm: (matches: EntityMatchResult[]) => void;
  onDataEdit: (rowIndex: number, field: string, value: any) => void;
}

// Features:
// - Editable data grid with real-time validation
// - Column mapping interface for flexible CSV structures
// - Entity matching suggestions with confidence scores
// - Inline error display and correction tools
// - Batch operations for common corrections
```

#### 1.2 Server-Side File Processing

**File Upload Handler** (`src/routes/import/+page.server.ts`):

```typescript
export const actions: Actions = {
  'upload-file': async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('importFile') as File;

    // Validate file type and size
    const validation = validateImportFile(file);
    if (!validation.valid) {
      return fail(400, { error: validation.error });
    }

    // Process file and extract data
    const processor = getFileProcessor(file.type);
    const rawData = await processor.parseFile(file);

    // Return parsed data for preview
    return {
      success: true,
      data: rawData,
      fileName: file.name,
      rowCount: rawData.length,
    };
  },

  'process-import': async ({ request }) => {
    const formData = await request.formData();
    const importData = JSON.parse(formData.get('importData') as string);

    // Process import with progress tracking
    const importService = new ImportService();
    const result = await importService.processImport(importData);

    return { success: true, result };
  }
};
```

### Phase 2: File Format Processors (Weeks 2-3)

#### 2.1 CSV Processing

**CSV Processor** (`src/lib/server/import/file-processors/csv-processor.ts`):

```typescript
export class CSVProcessor implements FileProcessor {
  async parseFile(file: File): Promise<ImportRow[]> {
    const text = await file.text();

    // Use Papa Parse for robust CSV handling
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => this.normalizeHeader(header),
      transform: (value: string, field: string) => this.transformValue(value, field),
    });

    if (result.errors.length > 0) {
      throw new ImportError('CSV parsing failed', result.errors);
    }

    return result.data.map((row, index) => ({
      rowIndex: index,
      rawData: row,
      normalizedData: this.normalizeRow(row),
      validationStatus: 'pending',
    }));
  }

  private normalizeHeader(header: string): string {
    // Convert common header variations to standard field names
    const headerMap = {
      'trans date': 'date',
      'transaction date': 'date',
      'posted date': 'date',
      'amount': 'amount',
      'debit': 'amount',
      'credit': 'amount',
      'description': 'description',
      'memo': 'description',
      'payee': 'payee',
      'merchant': 'payee',
      'category': 'category',
      'account': 'account',
    };

    const normalized = header.toLowerCase().trim();
    return headerMap[normalized] || normalized;
  }

  private transformValue(value: string, field: string): any {
    switch (field) {
      case 'date':
        return this.parseDate(value);
      case 'amount':
        return this.parseAmount(value);
      default:
        return value.trim();
    }
  }

  private parseDate(dateString: string): string {
    // Handle multiple date formats
    const formats = [
      'MM/DD/YYYY',
      'DD/MM/YYYY',
      'YYYY-MM-DD',
      'MM-DD-YYYY',
      'DD-MM-YYYY'
    ];

    for (const format of formats) {
      const parsed = this.tryParseDate(dateString, format);
      if (parsed) return parsed.toISOString().split('T')[0];
    }

    throw new ValidationError(`Invalid date format: ${dateString}`, 'date');
  }

  private parseAmount(amountString: string): number {
    // Remove currency symbols and separators
    const cleaned = amountString
      .replace(/[$£€¥,\s]/g, '')
      .replace(/[()]/g, '-'); // Handle parentheses as negative

    const amount = parseFloat(cleaned);
    if (isNaN(amount)) {
      throw new ValidationError(`Invalid amount: ${amountString}`, 'amount');
    }

    return amount;
  }
}
```

#### 2.2 Excel Processing

**Excel Processor** (`src/lib/server/import/file-processors/excel-processor.ts`):

```typescript
export class ExcelProcessor implements FileProcessor {
  async parseFile(file: File): Promise<ImportRow[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // Default to first sheet, allow user to select
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with headers
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    if (rawData.length === 0) {
      throw new ImportError('Excel file is empty or unreadable');
    }

    // Extract headers and data
    const headers = rawData[0] as string[];
    const dataRows = rawData.slice(1) as any[][];

    return dataRows.map((row, index) => {
      const rowData: Record<string, any> = {};
      headers.forEach((header, colIndex) => {
        rowData[this.normalizeHeader(header)] = this.transformValue(row[colIndex], header);
      });

      return {
        rowIndex: index,
        rawData: rowData,
        normalizedData: this.normalizeRow(rowData),
        validationStatus: 'pending',
      };
    });
  }

  private transformValue(value: any, header: string): any {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const normalizedHeader = this.normalizeHeader(header);

    switch (normalizedHeader) {
      case 'date':
        // Handle Excel date serial numbers
        if (typeof value === 'number') {
          return this.excelDateToISO(value);
        }
        return this.parseDate(value.toString());

      case 'amount':
        if (typeof value === 'number') {
          return value;
        }
        return this.parseAmount(value.toString());

      default:
        return value.toString().trim();
    }
  }

  private excelDateToISO(excelDate: number): string {
    // Excel dates are days since 1900-01-01 (with leap year bug)
    const excelEpoch = new Date(1900, 0, 1);
    const days = excelDate - 1; // Account for Excel's leap year bug
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }
}
```

#### 2.3 QIF Processing

**QIF Processor** (`src/lib/server/import/file-processors/qif-processor.ts`):

```typescript
export class QIFProcessor implements FileProcessor {
  async parseFile(file: File): Promise<ImportRow[]> {
    const text = await file.text();
    const transactions = this.parseQIFText(text);

    return transactions.map((transaction, index) => ({
      rowIndex: index,
      rawData: transaction,
      normalizedData: this.normalizeQIFTransaction(transaction),
      validationStatus: 'pending',
    }));
  }

  private parseQIFText(text: string): QIFTransaction[] {
    const lines = text.split('\n').map(line => line.trim());
    const transactions: QIFTransaction[] = [];
    let currentTransaction: Partial<QIFTransaction> = {};

    for (const line of lines) {
      if (line === '^') {
        // End of transaction
        if (currentTransaction.date && currentTransaction.amount !== undefined) {
          transactions.push(currentTransaction as QIFTransaction);
        }
        currentTransaction = {};
      } else if (line.length > 1) {
        const code = line[0];
        const value = line.substring(1);

        switch (code) {
          case 'D': // Date
            currentTransaction.date = this.parseQIFDate(value);
            break;
          case 'T': // Amount
            currentTransaction.amount = parseFloat(value);
            break;
          case 'P': // Payee
            currentTransaction.payee = value;
            break;
          case 'M': // Memo
            currentTransaction.memo = value;
            break;
          case 'L': // Category
            currentTransaction.category = value;
            break;
          case 'N': // Number (check number)
            currentTransaction.number = value;
            break;
          case 'C': // Cleared status
            currentTransaction.cleared = value === 'X' || value === 'c';
            break;
        }
      }
    }

    return transactions;
  }

  private parseQIFDate(dateString: string): string {
    // QIF dates are typically MM/DD/YYYY or MM/DD/YY
    const parts = dateString.split('/');
    if (parts.length === 3) {
      let [month, day, year] = parts;

      // Handle 2-digit years
      if (year.length === 2) {
        const currentYear = new Date().getFullYear();
        const currentCentury = Math.floor(currentYear / 100) * 100;
        year = String(currentCentury + parseInt(year));

        // If year is more than 20 years in the future, assume previous century
        if (parseInt(year) > currentYear + 20) {
          year = String(parseInt(year) - 100);
        }
      }

      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toISOString().split('T')[0];
    }

    throw new ValidationError(`Invalid QIF date format: ${dateString}`, 'date');
  }

  private normalizeQIFTransaction(qif: QIFTransaction): NormalizedTransaction {
    return {
      date: qif.date,
      amount: qif.amount,
      payee: qif.payee,
      description: qif.memo,
      category: qif.category,
      status: qif.cleared ? 'cleared' : 'pending',
      checkNumber: qif.number,
    };
  }
}
```

### Phase 3: Entity Matching and Creation (Weeks 3-4)

#### 3.1 Intelligent Entity Matching

**Payee Matching Service** (`src/lib/server/import/matching/payee-matcher.ts`):

```typescript
export class PayeeMatchingService {
  constructor(
    private payeeService: PayeeService,
    private transactionRepository: TransactionRepository
  ) {}

  async findOrCreatePayee(
    payeeName: string,
    transactionAmount?: number,
    transactionDate?: string
  ): Promise<PayeeMatchResult> {
    // Normalize payee name
    const normalizedName = this.normalizePayeeName(payeeName);

    // Try exact match first
    const exactMatch = await this.payeeService.findByName(normalizedName);
    if (exactMatch) {
      return {
        payee: exactMatch,
        matchType: 'exact',
        confidence: 1.0,
        created: false,
      };
    }

    // Try fuzzy matching
    const allPayees = await this.payeeService.findAll();
    const fuzzyMatches = this.findFuzzyMatches(normalizedName, allPayees);

    if (fuzzyMatches.length > 0 && fuzzyMatches[0].confidence > 0.8) {
      return {
        payee: fuzzyMatches[0].payee,
        matchType: 'fuzzy',
        confidence: fuzzyMatches[0].confidence,
        created: false,
        alternatives: fuzzyMatches.slice(1, 3), // Top 2 alternatives
      };
    }

    // Create new payee
    const newPayee = await this.payeeService.create({
      name: this.capitalizePayeeName(normalizedName),
      notes: `Auto-created during import`,
    });

    return {
      payee: newPayee,
      matchType: 'created',
      confidence: 1.0,
      created: true,
    };
  }

  private normalizePayeeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s&'-]/g, '') // Remove special characters except &, ', -
      .toLowerCase();
  }

  private findFuzzyMatches(
    searchName: string,
    payees: Payee[]
  ): Array<{ payee: Payee; confidence: number }> {
    const matches = payees.map(payee => ({
      payee,
      confidence: this.calculateSimilarity(searchName, payee.name.toLowerCase()),
    }));

    return matches
      .filter(match => match.confidence > 0.6)
      .sort((a, b) => b.confidence - a.confidence);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Use Levenshtein distance for similarity calculation
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (matrix[str2.length][str1.length] / maxLength);
  }

  private capitalizePayeeName(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
```

#### 3.2 Category Intelligence

**Category Matching Service** (`src/lib/server/import/matching/category-matcher.ts`):

```typescript
export class CategoryMatchingService {
  constructor(
    private categoryService: CategoryService,
    private transactionRepository: TransactionRepository
  ) {}

  async suggestCategory(
    payeeName: string,
    transactionDescription: string,
    amount: number
  ): Promise<CategorySuggestion[]> {
    const suggestions: CategorySuggestion[] = [];

    // 1. Historical pattern matching
    const historicalSuggestion = await this.getHistoricalCategorySuggestion(payeeName);
    if (historicalSuggestion) {
      suggestions.push(historicalSuggestion);
    }

    // 2. Keyword-based matching
    const keywordSuggestions = await this.getKeywordCategorySuggestions(
      payeeName,
      transactionDescription
    );
    suggestions.push(...keywordSuggestions);

    // 3. Amount-based patterns
    const amountSuggestions = await this.getAmountBasedSuggestions(amount);
    suggestions.push(...amountSuggestions);

    // Deduplicate and sort by confidence
    const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
    return uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  private async getHistoricalCategorySuggestion(
    payeeName: string
  ): Promise<CategorySuggestion | null> {
    const payee = await this.payeeService.findByName(payeeName);
    if (!payee) return null;

    // Get recent transactions for this payee
    const recentTransactions = await this.transactionRepository.findByPayee(
      payee.id,
      { limit: 20 }
    );

    if (recentTransactions.length === 0) return null;

    // Find most common category
    const categoryFrequency = new Map<number, number>();
    recentTransactions.forEach(transaction => {
      if (transaction.categoryId) {
        const count = categoryFrequency.get(transaction.categoryId) || 0;
        categoryFrequency.set(transaction.categoryId, count + 1);
      }
    });

    if (categoryFrequency.size === 0) return null;

    const [mostCommonCategoryId, frequency] = Array.from(categoryFrequency.entries())
      .sort(([, a], [, b]) => b - a)[0];

    const category = await this.categoryService.findById(mostCommonCategoryId);
    const confidence = frequency / recentTransactions.length;

    return {
      category: category!,
      reason: `Used in ${frequency}/${recentTransactions.length} recent transactions with ${payeeName}`,
      confidence,
      source: 'historical_pattern',
    };
  }

  private async getKeywordCategorySuggestions(
    payeeName: string,
    description: string
  ): Promise<CategorySuggestion[]> {
    const text = `${payeeName} ${description}`.toLowerCase();
    const categories = await this.categoryService.findAll();
    const suggestions: CategorySuggestion[] = [];

    // Keyword patterns for common categories
    const keywordPatterns = {
      'Groceries': ['grocery', 'supermarket', 'food', 'safeway', 'kroger', 'walmart grocery'],
      'Gas': ['gas', 'fuel', 'chevron', 'shell', 'exxon', 'bp'],
      'Dining Out': ['restaurant', 'cafe', 'pizza', 'mcdonald', 'starbucks', 'dining'],
      'Utilities': ['electric', 'gas bill', 'water', 'utility', 'power', 'internet'],
      'Transportation': ['uber', 'lyft', 'taxi', 'bus', 'metro', 'parking'],
      'Healthcare': ['doctor', 'pharmacy', 'medical', 'hospital', 'dentist', 'cvs'],
      'Entertainment': ['movie', 'netflix', 'spotify', 'entertainment', 'concert'],
      'Shopping': ['amazon', 'target', 'mall', 'store', 'shopping'],
    };

    for (const [categoryName, keywords] of Object.entries(keywordPatterns)) {
      const category = categories.find(c =>
        c.name.toLowerCase().includes(categoryName.toLowerCase())
      );

      if (category) {
        const matchingKeywords = keywords.filter(keyword =>
          text.includes(keyword)
        );

        if (matchingKeywords.length > 0) {
          suggestions.push({
            category,
            reason: `Matches keywords: ${matchingKeywords.join(', ')}`,
            confidence: Math.min(0.8, matchingKeywords.length * 0.3),
            source: 'keyword_pattern',
          });
        }
      }
    }

    return suggestions;
  }

  private deduplicateSuggestions(
    suggestions: CategorySuggestion[]
  ): CategorySuggestion[] {
    const seen = new Set<number>();
    const unique: CategorySuggestion[] = [];

    for (const suggestion of suggestions) {
      if (!seen.has(suggestion.category.id)) {
        seen.add(suggestion.category.id);
        unique.push(suggestion);
      }
    }

    return unique;
  }
}
```

### Phase 4: Import Orchestration (Weeks 4-5)

#### 4.1 Import Service

**Main Import Service** (`src/lib/server/import/import-service.ts`):

```typescript
export class ImportService {
  constructor(
    private transactionService: TransactionService,
    private payeeMatchingService: PayeeMatchingService,
    private categoryMatchingService: CategoryMatchingService,
    private accountService: AccountService
  ) {}

  async processImport(importRequest: ImportRequest): Promise<ImportResult> {
    const {
      accountId,
      data,
      options = {},
      columnMapping,
      entityMatches,
    } = importRequest;

    // Validate account exists
    const account = await this.accountService.findById(accountId);
    if (!account) {
      throw new ValidationError('Account not found', 'accountId');
    }

    // Initialize progress tracking
    const progressTracker = new ImportProgressTracker(data.length);

    try {
      // Phase 1: Validate all data
      progressTracker.setPhase('validation');
      const validationResults = await this.validateImportData(data, columnMapping);

      if (validationResults.errors.length > 0 && !options.allowPartialImport) {
        throw new ImportError('Validation failed', validationResults.errors);
      }

      // Phase 2: Process entity matching
      progressTracker.setPhase('entity_matching');
      const entityMatchResults = await this.processEntityMatching(
        validationResults.validRows,
        entityMatches
      );

      // Phase 3: Create transactions
      progressTracker.setPhase('transaction_creation');
      const createdTransactions = await this.createTransactions(
        accountId,
        entityMatchResults,
        progressTracker
      );

      // Phase 4: Final validation and cleanup
      progressTracker.setPhase('finalization');
      const finalResult = await this.finalizeImport(
        createdTransactions,
        validationResults,
        entityMatchResults
      );

      return {
        success: true,
        transactionsCreated: createdTransactions.length,
        entitiesCreated: {
          payees: entityMatchResults.newPayees.length,
          categories: entityMatchResults.newCategories.length,
        },
        errors: validationResults.errors,
        warnings: validationResults.warnings,
        duplicatesDetected: finalResult.duplicatesDetected,
        summary: finalResult.summary,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
        transactionsCreated: 0,
        entitiesCreated: { payees: 0, categories: 0 },
        errors: [],
        warnings: [],
        duplicatesDetected: [],
      };
    }
  }

  private async validateImportData(
    data: ImportRow[],
    columnMapping: ColumnMapping
  ): Promise<ValidationResult> {
    const validRows: ValidatedRow[] = [];
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    for (const [index, row] of data.entries()) {
      try {
        const mappedData = this.mapRowData(row.normalizedData, columnMapping);
        const validation = await this.validateRowData(mappedData, index);

        if (validation.isValid) {
          validRows.push({
            originalIndex: index,
            mappedData,
            validatedData: validation.data,
          });
        } else {
          errors.push({
            row: index,
            field: validation.field,
            message: validation.message,
            value: validation.value,
          });
        }

        if (validation.warnings) {
          warnings.push(...validation.warnings.map(warning => ({
            row: index,
            field: warning.field,
            message: warning.message,
            value: warning.value,
          })));
        }

      } catch (error) {
        errors.push({
          row: index,
          field: 'general',
          message: error instanceof Error ? error.message : 'Validation failed',
          value: row.normalizedData,
        });
      }
    }

    return { validRows, errors, warnings };
  }

  private async createTransactions(
    accountId: number,
    entityMatchResults: EntityMatchResults,
    progressTracker: ImportProgressTracker
  ): Promise<Transaction[]> {
    const createdTransactions: Transaction[] = [];
    const batchSize = 50; // Process in batches to avoid overwhelming the database

    for (let i = 0; i < entityMatchResults.processedRows.length; i += batchSize) {
      const batch = entityMatchResults.processedRows.slice(i, i + batchSize);

      // Create batch of transactions
      const batchPromises = batch.map(async (row) => {
        const transactionData: CreateTransactionData = {
          accountId,
          amount: row.validatedData.amount,
          date: row.validatedData.date,
          payeeId: row.entityMatches.payee?.id,
          categoryId: row.entityMatches.category?.id,
          notes: row.validatedData.description,
          status: row.validatedData.status || 'pending',
        };

        return this.transactionService.createTransaction(transactionData);
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // Collect successful transactions and handle errors
      batchResults.forEach((result, batchIndex) => {
        const overallIndex = i + batchIndex;

        if (result.status === 'fulfilled') {
          createdTransactions.push(result.value);
          progressTracker.updateProgress(overallIndex + 1);
        } else {
          progressTracker.addError(overallIndex, result.reason.message);
        }
      });
    }

    return createdTransactions;
  }
}
```

#### 4.2 Progress Tracking

**Import Progress Tracker** (`src/lib/server/import/progress-tracker.ts`):

```typescript
export class ImportProgressTracker {
  private phase: ImportPhase = 'validation';
  private processed = 0;
  private errors: Array<{ row: number; message: string }> = [];

  constructor(private total: number) {}

  setPhase(phase: ImportPhase): void {
    this.phase = phase;
    this.processed = 0;
  }

  updateProgress(processed: number): void {
    this.processed = processed;
    this.emitProgress();
  }

  addError(row: number, message: string): void {
    this.errors.push({ row, message });
    this.emitProgress();
  }

  private emitProgress(): void {
    const progress: ImportProgress = {
      phase: this.phase,
      processed: this.processed,
      total: this.total,
      percentage: Math.round((this.processed / this.total) * 100),
      errors: this.errors,
    };

    // Emit progress update (WebSocket or SSE)
    ImportEventEmitter.emit('progress', progress);
  }
}
```

### Phase 5: User Interface Integration (Weeks 5-6)

#### 5.1 Import Wizard

**Import Wizard Component** (`src/routes/import/+page.svelte`):

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import FileUploadDropzone from '$lib/components/import/file-upload-dropzone.svelte';
  import ImportPreviewTable from '$lib/components/import/import-preview-table.svelte';
  import ColumnMappingInterface from '$lib/components/import/column-mapping-interface.svelte';
  import EntityMatchingInterface from '$lib/components/import/entity-matching-interface.svelte';
  import ImportProgressTracker from '$lib/components/import/import-progress-tracker.svelte';
  import ImportSummary from '$lib/components/import/import-summary.svelte';

  let currentStep = $state<'upload' | 'preview' | 'mapping' | 'matching' | 'processing' | 'complete'>('upload');
  let selectedFile = $state<File | null>(null);
  let parseResults = $state<ParseResult | null>(null);
  let columnMapping = $state<ColumnMapping | null>(null);
  let entityMatches = $state<EntityMatchResults | null>(null);
  let importProgress = $state<ImportProgress | null>(null);
  let importResult = $state<ImportResult | null>(null);

  const accounts = $derived($page.data.accounts);
  let selectedAccountId = $state<string>('');

  async function handleFileSelected(file: File) {
    selectedFile = file;

    // Parse file and move to preview step
    const formData = new FormData();
    formData.append('importFile', file);

    const response = await fetch('/import?/upload-file', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (result.success) {
      parseResults = result.data;
      currentStep = 'preview';
    }
  }

  function handleColumnMappingComplete(mapping: ColumnMapping) {
    columnMapping = mapping;
    currentStep = 'matching';
  }

  function handleEntityMatchingComplete(matches: EntityMatchResults) {
    entityMatches = matches;
    currentStep = 'processing';
    processImport();
  }

  async function processImport() {
    if (!parseResults || !columnMapping || !entityMatches) return;

    const importData = {
      accountId: parseInt(selectedAccountId),
      data: parseResults.rows,
      columnMapping,
      entityMatches,
      options: {
        allowPartialImport: true,
        createMissingEntities: true,
      },
    };

    const formData = new FormData();
    formData.append('importData', JSON.stringify(importData));

    const response = await fetch('/import?/process-import', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    importResult = result;
    currentStep = 'complete';
  }
</script>

<div class="container mx-auto py-8">
  <div class="max-w-4xl mx-auto">
    <!-- Progress indicator -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        {#each ['upload', 'preview', 'mapping', 'matching', 'processing', 'complete'] as step, index}
          <div class="flex items-center">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              {currentStep === step ? 'bg-primary text-primary-foreground' :
               index < ['upload', 'preview', 'mapping', 'matching', 'processing', 'complete'].indexOf(currentStep) ?
               'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}">
              {index + 1}
            </div>
            {#if index < 5}
              <div class="w-16 h-0.5 bg-muted mx-2"></div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Step content -->
    {#if currentStep === 'upload'}
      <div class="space-y-6">
        <div>
          <h1 class="text-3xl font-bold">Import Financial Data</h1>
          <p class="text-muted-foreground mt-2">
            Upload your financial data from CSV, Excel, QIF, or OFX files
          </p>
        </div>

        <!-- Account selection -->
        <div class="space-y-2">
          <label for="account" class="text-sm font-medium">Select Account</label>
          <select bind:value={selectedAccountId} class="w-full p-2 border rounded">
            <option value="">Choose an account...</option>
            {#each accounts as account}
              <option value={account.id}>{account.name}</option>
            {/each}
          </select>
        </div>

        <!-- File upload -->
        <FileUploadDropzone
          acceptedFormats={['.csv', '.xlsx', '.xls', '.qif', '.ofx']}
          maxFileSize={10 * 1024 * 1024}
          onFileSelected={handleFileSelected}
          onFileRejected={(error) => console.error(error)}
        />
      </div>

    {:else if currentStep === 'preview' && parseResults}
      <ImportPreviewTable
        data={parseResults.rows}
        fileName={selectedFile?.name || ''}
        onNext={() => currentStep = 'mapping'}
        onBack={() => currentStep = 'upload'}
      />

    {:else if currentStep === 'mapping' && parseResults}
      <ColumnMappingInterface
        columns={parseResults.columns}
        sampleData={parseResults.rows.slice(0, 5)}
        onMappingComplete={handleColumnMappingComplete}
        onBack={() => currentStep = 'preview'}
      />

    {:else if currentStep === 'matching' && parseResults && columnMapping}
      <EntityMatchingInterface
        data={parseResults.rows}
        columnMapping={columnMapping}
        onMatchingComplete={handleEntityMatchingComplete}
        onBack={() => currentStep = 'mapping'}
      />

    {:else if currentStep === 'processing' && importProgress}
      <ImportProgressTracker
        progress={importProgress}
      />

    {:else if currentStep === 'complete' && importResult}
      <ImportSummary
        result={importResult}
        onStartNew={() => {
          currentStep = 'upload';
          selectedFile = null;
          parseResults = null;
          columnMapping = null;
          entityMatches = null;
          importResult = null;
        }}
      />
    {/if}
  </div>
</div>
```

## Implementation Benefits

### User Experience

- **Intuitive Wizard Flow**: Step-by-step guided import process with clear progress indicators
- **Smart Entity Matching**: Automatic payee and category suggestions based on historical patterns
- **Flexible Column Mapping**: Handle various CSV formats and bank export structures
- **Real-Time Validation**: Immediate feedback on data issues before import
- **Progress Tracking**: Live updates during long-running import operations

### Data Quality

- **Comprehensive Validation**: Multi-layer validation from file format to business rules
- **Duplicate Detection**: Identify potential duplicate transactions before creation
- **Entity Consistency**: Intelligent matching prevents duplicate payees and categories
- **Error Handling**: Detailed error reporting with correction guidance
- **Rollback Capability**: Safe import with ability to undo entire operations

### Technical Robustness

- **Multiple File Formats**: Support for CSV, Excel, QIF, OFX with format-specific processing
- **Batch Processing**: Efficient handling of large import files with memory management
- **Transaction Safety**: Database transactions ensure data integrity
- **Security**: File validation, size limits, and content sanitization
- **Performance**: Optimized bulk operations with progress tracking

## Success Metrics

- **Import Success Rate**: Percentage of successful imports without errors (target: 95%+)
- **Entity Match Accuracy**: Percentage of correct automatic entity matches (target: 85%+)
- **User Completion Rate**: Percentage of users who complete the full import process (target: 90%+)
- **Processing Speed**: Average time to process 1000 transactions (target: <30 seconds)
- **Error Resolution**: Percentage of validation errors users can fix (target: 95%+)

## Timeline Summary

**Phase 1 (Weeks 1-2)**: File Upload Infrastructure - Components, server actions, basic validation

**Phase 2 (Weeks 2-3)**: File Format Processors - CSV, Excel, QIF, OFX parsing with robust error handling

**Phase 3 (Weeks 3-4)**: Entity Matching - Intelligent payee/category matching with fuzzy logic

**Phase 4 (Weeks 4-5)**: Import Orchestration - Service integration, progress tracking, batch processing

**Phase 5 (Weeks 5-6)**: UI Integration - Wizard interface, preview tables, mapping tools

**Total Estimated Timeline**: 5-6 weeks

This comprehensive import system transforms the budget application from manual entry-focused to supporting seamless migration from existing financial tools and bank exports, significantly lowering the barrier to adoption while maintaining data quality and user control.