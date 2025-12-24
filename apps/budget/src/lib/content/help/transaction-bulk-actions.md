---
title: Bulk Actions
description: Operations on multiple transactions
related: [transaction-table, transaction-selection, transaction-toolbar]
---

# Bulk Actions

Perform operations on multiple selected transactions at once.

## Accessing Bulk Actions

1. Select multiple transactions using checkboxes
2. Action buttons appear in the toolbar
3. Selection count shows how many are selected

## Available Actions

### Bulk Categorize
Assign the same category to all selected:
- Opens category selector
- All selected transactions updated
- Useful after import

### Bulk Delete
Remove all selected transactions:
- Confirmation dialog appears
- Shows count to be deleted
- Cannot be undone

### Bulk Status Change
Update status for all selected:
- Mark as cleared
- Mark as reconciled
- Reset to pending

### Bulk Export
Export selected to file:
- CSV format
- All visible columns
- Includes only selected rows

## Confirmation

Destructive actions require confirmation:
- Delete shows transaction count
- Category change shows affected count
- Cancel available before applying

## Performance

- Large selections may take a moment
- Progress indicator for bulk operations
- Transactions update in batches

## Tips

- Filter first to narrow down transactions
- Review selection count before acting
- Use search + select for targeted updates
- Bulk categorize after CSV imports
- Clear selection after action completes
