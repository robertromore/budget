---
title: Transaction Table
description: View and manage account transactions
related: [transaction-toolbar, transaction-selection, transaction-filters]
---

# Transaction Table

The transaction table displays all transactions for the selected account with powerful inline editing, filtering, and sorting capabilities.

## Table Columns

| Column | Description | Editable |
|--------|-------------|----------|
| **Select** | Checkbox for bulk operations | - |
| **Expand** | Expand grouped rows | - |
| **ID** | Unique transaction identifier | No |
| **Date** | When the transaction occurred | Yes |
| **Payee** | Merchant, vendor, or person | Yes |
| **Notes** | Optional memo or description | Yes |
| **Transfer** | Transfer indicator icon | No |
| **Category** | Budget category assignment | Yes |
| **Budget** | Budget allocation | No |
| **Amount** | Transaction value | Yes |
| **Balance** | Running account balance | No |
| **Status** | Pending/Cleared/Reconciled | Yes |
| **Actions** | Row action menu | - |

## Inline Editing

Most cells can be edited directly:

1. Click any editable cell
2. Modify the value
3. Click outside or press [[Enter]] to save
4. Press [[Escape]] to cancel

## Sorting

- Click any column header to sort
- Click again to reverse direction
- Sort indicator shows current direction
- Some columns (Balance, Notes) disable sorting

## Filtering

Access filters from the toolbar:

- **Date** - Filter by date range
- **Payee** - Filter by merchant
- **Category** - Filter by budget category
- **Amount** - Filter by value range
- **Status** - Filter by transaction state

## Row Selection

- Click checkboxes to select rows
- Header checkbox selects all on page
- [[Shift]]+Click for range selection
- Selected rows enable bulk actions

## Scheduled Transactions

Scheduled transactions appear with:

- Calendar styling
- Read-only fields
- Click status to edit schedule

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| [[Ctrl+F]] | Focus search/filter |
| [[Space]] | Toggle row selection |
| [[Enter]] | Edit focused cell |
| [[Escape]] | Cancel edit / Clear filters |
| [[Arrow Keys]] | Navigate cells |

## Tips

- Use column visibility to show only what you need
- Combine filters for precise searches
- Bulk operations save time on imports
- Running balance helps reconciliation
- Export filtered results for reports
