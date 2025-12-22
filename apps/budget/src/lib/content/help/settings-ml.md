---
title: Machine Learning Settings
description: Configure AI-powered features and intelligence
related: [settings-llm, intelligence-page-header, ml-insights]
navigateTo: /settings/intelligence
---

# Machine Learning Settings

Configure the built-in machine learning features that provide intelligent insights about your finances.

## Master Toggle

Enable or disable all ML features at once. When disabled, no ML processing occurs and the app runs in manual mode only.

## ML Features

### Forecasting

Predicts future cash flow based on your historical spending patterns.
- Uses time-series analysis
- Considers recurring transactions
- Provides confidence intervals

### Anomaly Detection

Identifies unusual transactions that don't match your normal spending patterns.
- Flags unexpected amounts
- Detects irregular timing
- Helps catch fraud or errors

### Similarity Matching

Intelligently matches and groups similar payees and merchants.
- Handles variations in merchant names
- Suggests duplicates
- Improves categorization accuracy

### User Behavior

Learns from your actions to provide personalized recommendations.
- Tracks category assignments
- Learns spending habits
- Improves suggestions over time

## ML Configuration

### Anomaly Detection Sensitivity

Controls how strict anomaly detection is:
- **Low** - Only flag major anomalies
- **Medium** - Balanced detection
- **High** - Flag minor variations

### Default Forecast Horizon

Set how far ahead to predict (7-365 days). Longer horizons have less certainty.

### Similarity Threshold

Set how similar items must be to be grouped (0-100%). Higher values require closer matches.

## Contact Enrichment (Web Search)

Enable web search to automatically find business contact information for payees.

### Search Providers

- **DuckDuckGo** - Free, no setup required
- **Brave Search** - 2,000 free queries/month, needs API key
- **Ollama Web Search** - Cloud-based, needs API key

## Intelligence Input Mode

Controls the AI input overlay that appears on forms.

- **Auto** - System chooses best approach
- **ML Only** - Use only machine learning
- **LLM Only** - Use only language models

## Tips

- Start with default settings and adjust based on results
- Lower similarity thresholds find more duplicates but may have false positives
- Web search enrichment requires internet connectivity
