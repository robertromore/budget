# Test Data Files

Sample files for testing the financial import system.

## Files

- `sample-transactions.csv` - Sample CSV with 14 realistic transactions
- Contains various transaction types (income, expenses)
- Includes different payees and categories
- All dates in YYYY-MM-DD format

## Usage

Run the test:
```bash
bun run src/lib/server/import/__tests__/import-test.ts
```

Use in the web UI:
1. Navigate to http://localhost:5173/import
2. Upload `sample-transactions.csv`
3. Select an account
4. Review and confirm import

## Test Coverage

The sample data tests:
- ✓ CSV parsing
- ✓ Date normalization
- ✓ Amount parsing (positive and negative)
- ✓ Payee name cleaning (removes #1234)
- ✓ Category keyword matching
- ✓ Validation (all rows should be valid)
- ✓ Duplicate detection
