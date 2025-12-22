---
title: Similarity Threshold
description: Set how similar items must be to match
related: [settings-ml, ml-features]
---

# Similarity Threshold

Minimum similarity score required for payee matching.

## Scale

- **0%**: Match everything (not recommended)
- **50%**: Loose matching, more suggestions
- **60%**: Balanced (default)
- **80%**: Strict matching, fewer suggestions
- **100%**: Exact matches only

## How It Works

When comparing payee names:
- Higher threshold = fewer but more accurate matches
- Lower threshold = more matches but potential false positives

## Examples at 60% Threshold

These would match:
- "AMAZON" ↔ "Amazon.com"
- "STARBUCKS #123" ↔ "STARBUCKS COFFEE"

These might not match:
- "TARGET" ↔ "WALMART"

## Tips

- Start with 60% and adjust based on results
- Lower if you're missing obvious duplicates
- Raise if you're getting false matches
