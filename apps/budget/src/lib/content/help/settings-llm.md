---
title: LLM Provider Settings
description: Configure AI language model providers
related: [settings-ml, intelligence-page-header]
navigateTo: /settings/intelligence/llm
---

# LLM Provider Settings

Configure external AI language model providers to enhance the app's intelligence capabilities.

## Master Toggle

Enable or disable all LLM features. When disabled, only local ML features are used.

## Available Providers

### OpenAI

Access GPT-4 and GPT-3.5 models.
- Industry-leading language understanding
- Requires OpenAI API key
- Usage is billed by OpenAI

### Claude (Anthropic)

Access Claude models from Anthropic.
- Strong reasoning capabilities
- Requires Anthropic API key
- Known for safety and accuracy

### Gemini (Google)

Access Google's Gemini models.
- Good multilingual support
- Requires Google AI API key
- Competitive pricing

### Ollama (Local)

Run open-source models locally.
- No API key required
- Runs on your computer
- Configure custom endpoint URL
- Models: Llama, Mistral, etc.

## Provider Configuration

For each provider:

1. **Enable/Disable** - Toggle the provider on or off
2. **Model Selection** - Choose which model to use
3. **API Key** - Enter your API key (stored securely)
4. **Test Connection** - Verify your configuration works
5. **Set as Default** - Make this the primary provider

## Feature Modes

Configure how LLMs assist with each feature:

### Transaction Parsing

Parse and categorize imported transactions.
- **Disabled** - No LLM assistance
- **Enhance** - LLM improves ML results
- **Override** - LLM takes priority

### Category Suggestion

Suggest categories for new transactions.
- Works with your existing category structure
- Learns from your past assignments

### Anomaly Detection

Explain why transactions are flagged as unusual.
- Provides natural language explanations
- Helps understand spending patterns

### Forecasting

Generate narrative insights about predictions.
- Explains trends in plain language
- Provides context for forecasts

### Payee Matching

Match and canonicalize merchant names.
- Handles complex name variations
- Suggests intelligent groupings

## Tips

- Start with one provider to test
- Ollama is free but requires local setup
- API keys are encrypted at rest
- Test connections before relying on them
- "Enhance" mode combines ML + LLM for best results
