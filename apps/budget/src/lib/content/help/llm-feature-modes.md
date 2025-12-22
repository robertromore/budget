---
title: LLM Feature Modes
description: Configure how LLM works with each feature
related: [settings-llm, llm-providers]
---

# Feature Modes

Control how language models interact with each ML feature.

## Mode Options

### Disabled
LLM is not used for this feature. Only ML processing.

### Enhance
LLM works alongside ML to improve results.
- ML provides fast initial results
- LLM refines and enriches them
- Best of both worlds

### Override
LLM takes priority over ML.
- Uses LLM as primary source
- Falls back to ML if LLM fails
- More accurate but slower

## Features

### Transaction Parsing
Parse and categorize imported transactions.
- Extract payee names from descriptions
- Suggest appropriate categories

### Category Suggestion
Suggest categories for new transactions.
- Uses your existing category structure
- Learns from past assignments

### Anomaly Detection
Explain why transactions are flagged.
- Natural language explanations
- Context about spending patterns

### Forecasting
Generate narrative insights about predictions.
- Plain language trend explanations
- Context for forecasts

### Payee Matching
Match and group merchant names.
- Handle complex variations
- Suggest intelligent groupings

## Tips

- "Enhance" mode provides the best balance
- "Override" is best for complex text parsing
- Each feature can use a different provider
