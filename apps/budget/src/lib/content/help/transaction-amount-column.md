---
title: Amount Column
description: Transaction value with inline editing
related: [transaction-table, transaction-amount-field, transaction-filters]
---

# Amount Column

The amount column shows the monetary value of each transaction.

## Display Format

- Follows your currency settings
- Negative amounts (expenses) typically show in red
- Positive amounts (income) typically show in green
- Format: $1,234.56 (customizable in Display settings)

## Sign Convention

- **Negative** (-$50.00) = Expenses, payments, withdrawals
- **Positive** ($50.00) = Income, deposits, refunds

## Inline Editing

Click any amount cell to edit:
1. A numeric input appears
2. Type the new value
3. Press [[Enter]] or click outside to save
4. Press [[Escape]] to cancel

## Keyboard Shortcuts (in cell)

- [[Up Arrow]] - Increase by $1
- [[Down Arrow]] - Decrease by $1
- [[Shift+Up Arrow]] - Increase by $10
- [[Shift+Down Arrow]] - Decrease by $10

## Filtering

Filter by amount:
- Greater than a value
- Less than a value
- Between a range
- Exact amount match

## Sorting

- Click header to sort by amount
- Ascending: Largest expenses first
- Descending: Largest income first

## Aggregation

When rows are grouped:
- Shows sum of grouped transactions
- Subtotals update dynamically
- Helps identify spending patterns

## Tips

- Currency formatting follows Display settings
- Decimal places are configurable
- Paste amounts from spreadsheets
- Scheduled transaction amounts cannot be edited inline
