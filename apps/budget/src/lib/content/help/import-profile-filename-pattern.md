---
title: Filename Pattern
description: Auto-match files to import profiles
related: [settings-import-profiles, import-page]
---

# Filename Pattern

An optional pattern to automatically match files to this profile.

## How It Works

When you import a file, the app checks if the filename matches any profile patterns. Matching profiles are suggested automatically.

## Pattern Syntax

Use `*` as a wildcard to match any characters.

## Examples

| Pattern | Matches |
|---------|---------|
| `chase_*.csv` | chase_2024.csv, chase_statement.csv |
| `*amex*.csv` | my_amex_card.csv, amex_gold.csv |
| `statement_*.csv` | statement_jan.csv, statement_2024.csv |

## Tips

- Patterns are case-insensitive
- Leave empty to match manually
- Check your bank's download filename format
- Multiple profiles can match the same file
