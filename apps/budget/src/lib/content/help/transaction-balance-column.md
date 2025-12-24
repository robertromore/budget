---
title: Balance Column
description: Running account balance
related: [transaction-table, transaction-amount-column, account-page-header]
---

# Balance Column

The balance column shows the running account balance after each transaction.

## How It Works

- Calculated from the account's starting balance
- Each transaction adjusts the running total
- Sorted chronologically when calculating
- Updates automatically when transactions change

## Display

- Shows currency-formatted balance
- Dash (—) for pending calculations
- Grouped rows may show aggregated balance

## Behavior

- **Read-only** - Cannot be edited directly
- **Calculated** - Based on transaction amounts and dates
- **Dynamic** - Updates when amounts or dates change

## Sorting

- Balance column sorting is disabled
- Use date sorting for chronological order
- Balance represents point-in-time state

## Visibility

- Can be hidden via View Options
- Useful when analyzing spending patterns
- Hide to reduce visual clutter

## Tips

- Balance reflects all transactions up to that point
- Check balance after imports for accuracy
- Large discrepancies may indicate missing transactions
- Reconcile periodically with bank statements
