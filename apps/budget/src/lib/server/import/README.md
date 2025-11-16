# Financial Data Import System

Complete multi-format import system for importing financial transactions from
various sources.

## Features

- **Multi-Format Support**: CSV, Excel (.xlsx, .xls), QIF, OFX/QFX
- **Smart Entity Matching**: Automatic fuzzy matching for payees and
  keyword-based category matching
- **Auto-Creation**: Creates missing payees and categories automatically
- **Validation**: Comprehensive data validation with duplicate detection
- **Error Handling**: Detailed error collection with partial import support

## Quick Start

### 1. Using the Web Interface

Navigate to `/import` to access the import wizard:

1. **Upload** - Drag and drop or select a file
2. **Preview** - Review parsed data
3. **Complete** - Import transactions

### 2. Programmatic Usage

```typescript
import { ImportOrchestrator } from '$lib/server/import/import-orchestrator';

const orchestrator = new ImportOrchestrator();
const result = await orchestrator.processImport(accountId, importRows, {
  allowPartialImport: true,
  createMissingEntities: true,
});

console.log(`Imported ${result.transactionsCreated} transactions`);
```

## Supported File Formats

### CSV Files (.csv, .txt)

```csv
Date,Amount,Payee,Description,Category
2025-01-01,4500.00,ABC Corporation,January Salary,Income
2025-01-02,-89.45,Walmart,Groceries,Groceries
```

**Automatically recognized headers:**

- Date: "Date", "Trans Date", "Transaction Date", "Posted Date"
- Amount: "Amount", "Debit", "Credit", "Transaction Amount"
- Payee: "Payee", "Merchant", "Vendor", "Name"
- Description: "Description", "Memo", "Narrative", "Details"
- Category: "Category", "Type", "Classification"

### Excel Files (.xlsx, .xls)

Standard Excel spreadsheets with headers in the first row.

### QIF Files (.qif)

Quicken Interchange Format with standard transaction codes:

- D = Date
- T = Transaction amount
- P = Payee
- M = Memo
- L = Category
- C = Cleared status
- N = Check number

### OFX/QFX Files (.ofx, .qfx)

Open Financial Exchange format (both XML 2.x and SGML 1.x).

## Entity Matching

### Payee Matching

The system uses fuzzy string matching with confidence scoring:

```typescript
import { PayeeMatcher } from '$lib/server/import/matchers/payee-matcher';

const matcher = new PayeeMatcher();
const match = matcher.findBestMatch('WALMART #1234', existingPayees);

// Result:
// {
//   payee: { id: 1, name: 'Walmart', ... },
//   confidence: 'high',
//   score: 0.92,
//   matchedOn: 'name_substring'
// }
```

**Features:**

- Fuzzy matching using Levenshtein distance
- Automatic name cleaning (removes transaction IDs, prefixes, dates)
- Confidence levels: exact, high, medium, low, none
- Substring matching for bank transaction variations

### Category Matching

Keyword-based matching with 10+ default patterns:

```typescript
import { CategoryMatcher } from '$lib/server/import/matchers/category-matcher';

const matcher = new CategoryMatcher();
const match = matcher.findBestMatch(
  {
    payeeName: 'Walmart',
    description: 'Weekly groceries',
  },
  existingCategories
);

// Result:
// {
//   category: { id: 1, name: 'Groceries', ... },
//   confidence: 'high',
//   score: 0.89,
//   matchedOn: 'payee'
// }
```

**Default Category Patterns:**

- Groceries: walmart, kroger, safeway, whole foods, etc.
- Dining Out: restaurant, starbucks, chipotle, etc.
- Transportation: gas, uber, lyft, parking, etc.
- Utilities: electric, water, internet, phone, etc.
- Healthcare: pharmacy, doctor, hospital, medical, etc.
- Entertainment: netflix, hulu, spotify, movie, etc.
- Shopping: amazon, ebay, mall, clothing, etc.
- Home Improvement: home depot, lowes, hardware, etc.
- Insurance: insurance, policy, premium, etc.
- Auto & Transport: car, mechanic, oil change, etc.

**Custom Patterns:**

```typescript
const matcher = new CategoryMatcher(
  {},
  {
    Coffee: ['starbucks', 'dunkin', 'coffee shop'],
    Subscriptions: ['netflix', 'spotify', 'adobe'],
  }
);
```

## Validation

### Transaction Validator

Comprehensive validation with duplicate detection:

```typescript
import { TransactionValidator } from '$lib/server/import/validators/transaction-validator';

const validator = new TransactionValidator({
  requireDate: true,
  requireAmount: true,
  checkDuplicates: true,
  maxAmountThreshold: 1000000,
  allowFutureDates: true,
});

const validatedRows = validator.validateRows(importRows, existingTransactions);
const summary = validator.getValidationSummary(validatedRows);
```

**Validation Checks:**

- Required fields (date, amount, optional payee)
- Date format (YYYY-MM-DD) and range validation
- Amount thresholds and numeric validation
- Text field length limits
- Duplicate detection (same date, amount, and payee)

## Testing

Run the test suite:

```bash
bun run src/lib/server/import/__tests__/import-test.ts
```

Test with sample data:

```bash
# Sample CSV file provided in test-data/sample-transactions.csv
# Contains 14 realistic transactions for testing
```

## Architecture

```text
Import Flow:
1. File Upload → File Processor (CSV/Excel/QIF/OFX)
2. Raw Data → Transaction Validator
3. Valid Data → Entity Matchers (Payee/Category)
4. Matched Entities → Import Orchestrator
5. Create Transactions → Database
```

**Key Components:**

- `file-processors/` - Parse different file formats
- `matchers/` - Entity matching with fuzzy logic
- `validators/` - Data validation and duplicate detection
- `import-orchestrator.ts` - Coordinates the entire import process
- `utils.ts` - Shared utilities (date parsing, string similarity, etc.)

## Error Handling

The system collects errors without stopping the import:

```typescript
{
  success: true,
  transactionsCreated: 12,
  errors: [
    {
      row: 5,
      field: 'date',
      message: 'Invalid date format',
    }
  ],
  warnings: [
    {
      row: 8,
      field: 'amount',
      message: 'Amount exceeds threshold',
    }
  ],
  summary: {
    totalRows: 14,
    validRows: 12,
    invalidRows: 2,
    skippedRows: 0,
  }
}
```

## Configuration Options

```typescript
interface ImportOptions {
  allowPartialImport?: boolean; // Continue on errors (default: true)
  createMissingEntities?: boolean; // Auto-create payees/categories (default: true)
}

interface ValidationOptions {
  requireDate?: boolean; // Date is required (default: true)
  requireAmount?: boolean; // Amount is required (default: true)
  requirePayee?: boolean; // Payee is required (default: false)
  checkDuplicates?: boolean; // Detect duplicates (default: true)
  maxAmountThreshold?: number; // Max amount (default: $1M)
  minAmountThreshold?: number; // Min amount (default: $0.01)
  allowFutureDates?: boolean; // Allow future dates (default: true)
  futureMonths?: number; // Max future months (default: 3)
}

interface PayeeMatcherOptions {
  exactThreshold?: number; // Exact match threshold (default: 1.0)
  highThreshold?: number; // High confidence (default: 0.9)
  mediumThreshold?: number; // Medium confidence (default: 0.7)
  createIfNoMatch?: boolean; // Auto-create (default: true)
}

interface CategoryMatcherOptions {
  exactThreshold?: number; // Exact match threshold (default: 1.0)
  highThreshold?: number; // High confidence (default: 0.9)
  mediumThreshold?: number; // Medium confidence (default: 0.7)
  useKeywordPatterns?: boolean; // Use keywords (default: true)
  usePayeeName?: boolean; // Match on payee (default: true)
}
```

## Best Practices

1. **File Preparation**: Ensure CSV files have headers in the first row
2. **Date Format**: Use YYYY-MM-DD for best compatibility
3. **Amount Format**: Use negative numbers for expenses, positive for income
4. **Clean Data**: Remove extra headers, footers, and summary rows
5. **Test First**: Try importing a small sample before bulk imports
6. **Review Matches**: Check the matched payees/categories after import
7. **Backup**: Always backup your data before bulk operations

## Troubleshooting

**Issue**: CSV not parsing correctly

- Check file encoding (UTF-8 recommended)
- Verify headers are in the first row
- Check for special characters in delimiter

**Issue**: Dates not recognized

- Use YYYY-MM-DD format
- Check for Excel serial dates (auto-converted)
- Verify date column is properly mapped

**Issue**: Amounts not calculating correctly

- Remove currency symbols and formatting
- Use negative numbers for expenses
- Check for thousands separators (auto-removed)

**Issue**: Duplicate transactions detected

- This is a safety feature to prevent double imports
- Review flagged duplicates before importing
- Adjust duplicate detection thresholds if needed

## Future Enhancements

- Column mapping UI for custom headers
- Import preview with entity match review
- Real-time progress tracking
- Import history and undo capability
- Batch import for multiple files
- Export functionality

## Support

For issues or questions, please check:

- Test files in `test-data/`
- Example implementations in `__tests__/`
- Type definitions in `$lib/types/import.ts`
