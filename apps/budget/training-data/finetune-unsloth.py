"""
Fine-tune a Budget Assistant Model using Unsloth

This script uses Unsloth for efficient LoRA fine-tuning of small language models.
Optimized for personal finance and budget management tasks.

Requirements:
    pip install unsloth transformers datasets peft accelerate bitsandbytes

Usage:
    python finetune-unsloth.py --model qwen2.5:3b --epochs 3

After training, export to GGUF for Ollama:
    python -m unsloth.save model_output --quantization q4_k_m
"""

import argparse
import json
from pathlib import Path

# Check for unsloth availability
try:
    from unsloth import FastLanguageModel
    from unsloth.chat_templates import get_chat_template
    UNSLOTH_AVAILABLE = True
except ImportError:
    UNSLOTH_AVAILABLE = False
    print("Warning: Unsloth not installed. Install with: pip install unsloth")

from datasets import Dataset
from transformers import TrainingArguments
from trl import SFTTrainer


# Model configurations optimized for budget tasks
MODEL_CONFIGS = {
    "qwen2.5-3b": {
        "model_name": "unsloth/Qwen2.5-3B-Instruct-bnb-4bit",
        "max_seq_length": 4096,
        "load_in_4bit": True,
    },
    "phi4-mini": {
        "model_name": "unsloth/Phi-4-mini-instruct-bnb-4bit",
        "max_seq_length": 4096,
        "load_in_4bit": True,
    },
    "llama3.2-3b": {
        "model_name": "unsloth/Llama-3.2-3B-Instruct-bnb-4bit",
        "max_seq_length": 4096,
        "load_in_4bit": True,
    },
    "mistral-7b": {
        "model_name": "unsloth/mistral-7b-instruct-v0.3-bnb-4bit",
        "max_seq_length": 8192,
        "load_in_4bit": True,
    },
}

# LoRA configuration for efficient fine-tuning
LORA_CONFIG = {
    "r": 16,  # Rank - higher = more capacity but slower
    "lora_alpha": 16,
    "lora_dropout": 0,
    "target_modules": [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    "bias": "none",
    "use_gradient_checkpointing": "unsloth",
    "random_state": 42,
    "use_rslora": False,
}


def load_training_data(data_path: str) -> Dataset:
    """Load training data from JSONL file."""
    examples = []

    with open(data_path, "r") as f:
        for line in f:
            if line.strip():
                examples.append(json.loads(line))

    print(f"Loaded {len(examples)} training examples")
    return Dataset.from_list(examples)


def format_chat_template(example, tokenizer):
    """Format example using chat template."""
    messages = example["messages"]
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False,
    )
    return {"text": text}


def train(
    model_key: str = "qwen2.5-3b",
    data_path: str = "budget-assistant-latest.jsonl",
    output_dir: str = "budget-assistant-lora",
    epochs: int = 3,
    batch_size: int = 2,
    learning_rate: float = 2e-4,
):
    """Run fine-tuning."""

    if not UNSLOTH_AVAILABLE:
        print("Error: Unsloth is required. Install with: pip install unsloth")
        return

    config = MODEL_CONFIGS.get(model_key)
    if not config:
        print(f"Unknown model: {model_key}")
        print(f"Available: {list(MODEL_CONFIGS.keys())}")
        return

    print(f"\n=== Fine-tuning Budget Assistant ===")
    print(f"Base model: {config['model_name']}")
    print(f"Training data: {data_path}")
    print(f"Output: {output_dir}")
    print(f"Epochs: {epochs}")

    # Load model
    print("\nLoading model...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=config["model_name"],
        max_seq_length=config["max_seq_length"],
        load_in_4bit=config["load_in_4bit"],
        dtype=None,  # Auto-detect
    )

    # Add LoRA adapters
    print("Adding LoRA adapters...")
    model = FastLanguageModel.get_peft_model(model, **LORA_CONFIG)

    # Load and format dataset
    print("Loading training data...")
    dataset = load_training_data(data_path)
    dataset = dataset.map(
        lambda x: format_chat_template(x, tokenizer),
        remove_columns=dataset.column_names,
    )

    # Training arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        gradient_accumulation_steps=4,
        learning_rate=learning_rate,
        warmup_ratio=0.03,
        lr_scheduler_type="cosine",
        logging_steps=10,
        save_steps=100,
        save_total_limit=2,
        fp16=True,
        optim="adamw_8bit",
        weight_decay=0.01,
        seed=42,
    )

    # Create trainer
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=config["max_seq_length"],
        packing=False,
        args=training_args,
    )

    # Train
    print("\nStarting training...")
    trainer.train()

    # Save
    print(f"\nSaving to {output_dir}...")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    print("\n=== Training Complete ===")
    print(f"Model saved to: {output_dir}")
    print("\nTo export for Ollama, run:")
    print(f"  python -m unsloth.save {output_dir} --quantization q4_k_m --output budget-assistant.gguf")
    print("\nThen create Ollama model:")
    print("  ollama create budget-assistant -f Modelfile")


def find_latest_training_file() -> str:
    """Find the most recent training data file."""
    import glob

    # Look for budget-assistant-*.jsonl files
    patterns = [
        "budget-assistant-*.jsonl",
        "personal/personal-*.jsonl",
        "combined.jsonl",
    ]

    for pattern in patterns:
        files = sorted(glob.glob(pattern), reverse=True)
        if files:
            return files[0]

    return "budget-assistant-latest.jsonl"


def main():
    # Find default data file
    default_data = find_latest_training_file()

    parser = argparse.ArgumentParser(description="Fine-tune Budget Assistant")
    parser.add_argument(
        "--model",
        default="qwen2.5-3b",
        choices=list(MODEL_CONFIGS.keys()),
        help="Base model to fine-tune"
    )
    parser.add_argument(
        "--data",
        default=default_data,
        help=f"Path to training data (JSONL). Default: {default_data}"
    )
    parser.add_argument(
        "--output",
        default="budget-assistant-lora",
        help="Output directory for fine-tuned model"
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=3,
        help="Number of training epochs"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=2,
        help="Training batch size"
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=2e-4,
        help="Learning rate"
    )

    args = parser.parse_args()

    train(
        model_key=args.model,
        data_path=args.data,
        output_dir=args.output,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
    )


if __name__ == "__main__":
    main()
