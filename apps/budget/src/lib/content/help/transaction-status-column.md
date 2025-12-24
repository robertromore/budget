---
title: Status Column
description: Transaction status indicator
related: [transaction-table, transaction-filters, schedules-tab]
---

# Status Column

The status column shows the current state of each transaction.

## Status Types

| Status | Icon | Description |
|--------|------|-------------|
| **Pending** | Clock | Transaction awaiting clearance |
| **Cleared** | Check | Transaction has processed |
| **Reconciled** | Double-check | Verified against bank statement |
| **Scheduled** | Calendar | Future scheduled transaction |

## Display

- Status shows as an icon badge
- Color-coded for quick recognition
- Click to cycle through statuses

## Inline Editing

Click the status icon to change:
- Cycles: Pending > Cleared > Reconciled > Pending
- Scheduled transactions open the schedule editor
- Changes save automatically

## Scheduled Transactions

When status is "Scheduled":
- Row displays with calendar styling
- Click status to edit the schedule
- Cannot edit transaction data directly
- Shows next occurrence date

## Filtering

Filter by status:
- **Is** - Show only selected statuses
- **Is not** - Exclude selected statuses
- Combine with other filters

## Tips

- Mark transactions as cleared when they appear in your bank
- Reconciled status helps track what you've verified
- Pending transactions don't affect reconciled balance
- Use bulk actions to update multiple statuses at once
