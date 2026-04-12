---
title: Importing Transactions
description: How to import bank data from CSV, OFX, and QFX files
related: [import-page, import-profile-name, import-profile-mappings]
navigateTo: /import
---

The import system supports multiple file formats and intelligently matches payees and categories.

## Supported formats

- **CSV** — Most banks offer CSV exports. Requires column mapping on first import.
- **OFX/QFX** — Quicken-compatible format. Columns are mapped automatically.

## Import workflow

### 1. Upload your file

Drag and drop a file onto the import area or click to browse. The app detects the format automatically.

### 2. Map columns (CSV only)

For CSV files, map your columns to the required fields: date, amount, and payee. The app remembers your mappings for future imports via **import profiles**.

### 3. Review matches

The app matches each transaction's payee to existing payees in your database using fuzzy matching. It also suggests categories based on past transactions with the same payee.

- **Green** — High-confidence match
- **Yellow** — Partial match, review recommended
- **Red** — No match found, will create a new payee

### 4. Handle duplicates

Transactions that appear to already exist in your account are flagged as duplicates and excluded by default. You can override this if needed.

### 5. Confirm and import

Review the final list and click Import. Transactions are created with their matched payees and categories.

## Import profiles

Save your column mappings as an **import profile** for quick re-use. Profiles can auto-detect files by filename pattern and pre-select the target account.

## Tips

- Export from your bank in OFX/QFX format when possible — it requires no column mapping
- Create import profiles for each bank to streamline repeat imports
- Review payee matches carefully on the first import; the app learns from your corrections
