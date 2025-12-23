# Fine-Tuning a Budget Assistant Model

This guide explains how to create a specialized, smaller AI model for the budget app that runs efficiently on local hardware.

## Overview

Instead of using a large general-purpose model, you can fine-tune a smaller model (3B-7B parameters) specifically for budget management tasks. Benefits:

- **Smaller size**: 2-4GB vs 30GB+ for large models
- **Faster responses**: Optimized for your specific use case
- **Lower resource usage**: Runs on modest hardware
- **Better accuracy**: Trained on budget-specific conversations
- **Privacy**: Runs entirely locally

## Quick Start (No Fine-Tuning)

The fastest way to get a specialized budget assistant is to create a custom Ollama model with a specialized system prompt:

```bash
# Navigate to training-data directory
cd apps/budget/training-data

# Create custom model from base Qwen 2.5
ollama create budget-assistant -f Modelfile.base

# Test it
ollama run budget-assistant "What can you help me with?"
```

Then select "budget-assistant" as your Ollama model in Settings > Intelligence > LLM.

## Full Fine-Tuning Pipeline

For best results, fine-tune a model on budget-specific conversations:

### 1. Generate Training Data

```bash
# From apps/budget directory
npx tsx src/lib/server/ai/fine-tuning/export-dataset.ts
```

This creates training files in `training-data/`:

- `budget-assistant-YYYY-MM-DD.jsonl` - For most fine-tuning tools
- `budget-assistant-YYYY-MM-DD-alpaca.json` - For LLaMA-Factory
- `budget-assistant-YYYY-MM-DD-full.json` - Full dataset with metadata

### 2. Fine-Tune the Model

Choose your platform:

#### Option A: Apple Silicon (M1/M2/M3/M4)

Uses MLX for native Apple Silicon acceleration.

**Requirements:**

- Mac with Apple Silicon (M1 or newer)
- 16GB+ unified memory recommended
- Python 3.10+

**Setup:**

```bash
# Create Python environment
python -m venv venv
source venv/bin/activate

# Install MLX-LM
pip install mlx-lm
```

**Train:**

```bash
cd apps/budget/training-data

# The script auto-detects the latest training file
python finetune-mlx.py --model qwen2.5-3b --epochs 3

# Or specify a file explicitly
python finetune-mlx.py \
  --model qwen2.5-3b \
  --data budget-assistant-2025-12-23.jsonl \
  --epochs 3 \
  --output budget-assistant-mlx
```

Available models for Apple Silicon:

- `qwen2.5-3b` - Best balance of speed and quality (recommended)
- `llama3.2-3b` - Good alternative
- `phi4-mini` - Smallest, fastest
- `qwen2.5-7b` - Higher quality, needs 16GB+ RAM
- `mistral-7b` - Highest quality, needs 32GB+ RAM

#### Option B: NVIDIA GPU (Linux/Windows)

Uses Unsloth for efficient CUDA-based training.

**Requirements:**

- NVIDIA GPU with 8GB+ VRAM
- Python 3.10+
- CUDA 11.8+

**Setup:**

```bash
# Create Python environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install unsloth transformers datasets peft accelerate bitsandbytes
```

**Train:**

```bash
cd apps/budget/training-data

# The script auto-detects the latest training file
python finetune-unsloth.py --model qwen2.5-3b --epochs 3

# Or specify a file explicitly
python finetune-unsloth.py \
  --model qwen2.5-3b \
  --data budget-assistant-2025-12-23.jsonl \
  --epochs 3 \
  --output budget-assistant-lora
```

Available models for NVIDIA:

- `qwen2.5-3b` - Best balance of speed and quality (recommended)
- `phi4-mini` - Smallest, fastest
- `llama3.2-3b` - Good alternative
- `mistral-7b` - Highest quality but larger

### 3. Export to GGUF

Convert the fine-tuned model to GGUF format for Ollama:

#### From Apple Silicon (MLX)

```bash
# First, fuse the LoRA adapters into the base model
python -m mlx_lm fuse \
  --model mlx-community/Qwen2.5-3B-Instruct-4bit \
  --adapter-path budget-assistant-mlx \
  --save-path budget-assistant-fused

# Then convert to GGUF using llama.cpp
# (requires llama.cpp installed: brew install llama.cpp)
python -m mlx_lm convert \
  --hf-path budget-assistant-fused \
  --mlx-path budget-assistant-gguf \
  -q
```

#### From NVIDIA (Unsloth)

```bash
# Export with 4-bit quantization (smallest)
python -m unsloth.save budget-assistant-lora \
  --quantization q4_k_m \
  --output budget-assistant.gguf
```

Quantization options:

- `q4_k_m` - 4-bit, ~2GB, good quality (recommended)
- `q5_k_m` - 5-bit, ~2.5GB, better quality
- `q8_0` - 8-bit, ~4GB, best quality

### 4. Create Ollama Model

```bash
# Update Modelfile to point to your GGUF
ollama create budget-assistant -f Modelfile

# Test
ollama run budget-assistant "What's my checking balance?"
```

### 5. Use in the App

1. Go to Settings > Intelligence > LLM
2. Enable Ollama provider
3. Select "budget-assistant" from the model list
4. Set as default provider

## Expanding the Training Data

### Use Your Personal Financial Data

Generate training examples from your actual accounts, transactions, and budgets:

```bash
# Generate personalized training data
bun run src/lib/server/ai/fine-tuning/export-real-data.ts

# For a specific workspace
bun run src/lib/server/ai/fine-tuning/export-real-data.ts --workspace 2
```

This creates files in `training-data/personal/`:

- `personal-YYYY-MM-DD.jsonl` - Training data from your finances
- `personal-YYYY-MM-DD-full.json` - Full dataset with metadata

**What it includes:**

- Your actual account names and balances
- Real spending by category and payee
- Your budget allocations and progress
- Recent transaction patterns

**Combine with synthetic data for best results:**

```bash
cat training-data/budget-assistant-*.jsonl training-data/personal/*.jsonl > training-data/combined.jsonl
```

> ⚠️ **Privacy Warning**: Personal training data contains your financial information. The `training-data/personal/` folder is gitignored by default. Never share these files or upload a model trained on them.

### Add Real Conversations

Export conversations from your chat history for even better personalization:

```typescript
// In a server route or script
import { db } from "$lib/server/db";
import { chatHistory } from "$lib/schema";

const conversations = await db.select().from(chatHistory);

// Convert to training format
const examples = conversations.map(conv => ({
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: conv.userMessage },
    { role: "assistant", content: conv.assistantResponse }
  ],
  category: categorize(conv),
  source: "real",
  quality: conv.userRating || 3
}));
```

### Generate Synthetic Examples

Extend the generator with more examples:

```typescript
// In generator.ts
function generateMoreExamples(): TrainingExample[] {
  // Add variations of common queries
  const variations = [
    "How much did I spend on {category}?",
    "What's my {category} spending?",
    "Show me {category} expenses",
    "{category} total for this month",
  ];

  // Generate with different categories
  return CATEGORIES.flatMap(cat =>
    variations.map(template => createExample(template.replace("{category}", cat)))
  );
}
```

### Use LLM for Data Augmentation

Use a larger model to generate training examples:

```typescript
const prompt = `Generate 5 realistic user questions about personal finance budgeting.
Each should be something a user might ask a budget tracking app.
Include questions about: spending analysis, budget creation, transaction search, and savings advice.
Format: JSON array of {question, expectedBehavior}`;

const response = await generateText({ model, prompt });
// Convert to training examples
```

## Model Comparison

| Model | Size | Speed | Quality | RAM (Apple) | VRAM (NVIDIA) |
|-------|------|-------|---------|-------------|---------------|
| Phi-4 Mini | 2.5GB | Fastest | Good | 8GB | 6GB |
| Qwen 2.5 3B | 2.8GB | Fast | Better | 8GB | 8GB |
| Llama 3.2 3B | 2.5GB | Fast | Good | 8GB | 6GB |
| Qwen 2.5 7B | 5GB | Medium | Best | 16GB | 12GB |
| Mistral 7B | 5GB | Medium | Best | 16GB | 12GB |

## Troubleshooting

### Out of Memory During Training

**Apple Silicon:**

- Reduce batch size: `--batch-size 2` or `--batch-size 1`
- Use a smaller model (phi4-mini or qwen2.5-3b)
- Close other apps to free unified memory

**NVIDIA:**

- Reduce batch size: `--batch-size 1`
- Use gradient checkpointing (enabled by default)
- Try a smaller base model

### Poor Quality Responses

- Add more training examples (aim for 200+)
- Increase epochs: `--epochs 5`
- Use higher quality base model
- Review training data for errors

### Model Not Using Tools

- Ensure the model supports tool calling
- Check the Modelfile template matches the model's chat format
- Add more tool-calling examples to training data

## Resources

- [Unsloth Documentation](https://github.com/unslothai/unsloth)
- [Ollama Modelfile Reference](https://github.com/ollama/ollama/blob/main/docs/modelfile.md)
- [LoRA Paper](https://arxiv.org/abs/2106.09685)
- [GGUF Format](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)
