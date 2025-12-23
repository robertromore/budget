"""
Fine-tune a Budget Assistant Model on Apple Silicon using MLX

This script uses MLX-LM for efficient fine-tuning on Mac M1/M2/M3/M4.
Optimized for personal finance and budget management tasks.

Requirements:
    pip install mlx-lm

Usage:
    python finetune-mlx.py --model mlx-community/Qwen2.5-3B-Instruct-4bit --epochs 3

After training, the model can be used directly with MLX or converted for Ollama.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

# Check for MLX availability
try:
    import mlx.core as mx
    MLX_AVAILABLE = True
except ImportError:
    MLX_AVAILABLE = False
    print("MLX not available. Install with: pip install mlx-lm")


# Pre-quantized models optimized for Apple Silicon
MLX_MODELS = {
    "qwen2.5-3b": "mlx-community/Qwen2.5-3B-Instruct-4bit",
    "qwen2.5-7b": "mlx-community/Qwen2.5-7B-Instruct-4bit",
    "llama3.2-3b": "mlx-community/Llama-3.2-3B-Instruct-4bit",
    "phi4-mini": "mlx-community/phi-4-mini-instruct-4bit",
    "mistral-7b": "mlx-community/Mistral-7B-Instruct-v0.3-4bit",
}


def check_mlx_lm():
    """Check if mlx-lm is installed."""
    try:
        import mlx_lm
        return True
    except ImportError:
        return False


def prepare_training_data(input_path: str, output_dir: str, val_split: float = 0.1, min_batch_size: int = 2):
    """Convert JSONL to MLX-LM training format with train/valid split."""
    import random

    examples = []

    with open(input_path, "r") as f:
        for line in f:
            if line.strip():
                data = json.loads(line)
                messages = data.get("messages", [])

                # Convert to MLX-LM format (text field with chat template applied)
                # MLX-LM expects {"text": "..."} format
                text_parts = []
                for msg in messages:
                    role = msg["role"]
                    content = msg["content"]
                    if role == "system":
                        text_parts.append(f"<|im_start|>system\n{content}<|im_end|>")
                    elif role == "user":
                        text_parts.append(f"<|im_start|>user\n{content}<|im_end|>")
                    elif role == "assistant":
                        text_parts.append(f"<|im_start|>assistant\n{content}<|im_end|>")

                examples.append({"text": "\n".join(text_parts)})

    # Shuffle examples
    random.seed(42)
    random.shuffle(examples)

    # Calculate split ensuring both sets have at least min_batch_size examples
    total = len(examples)
    val_size = max(min_batch_size, int(total * val_split))

    # If we don't have enough for both sets, duplicate examples
    if total < min_batch_size * 2:
        print(f"Note: Dataset has only {total} examples, duplicating to meet minimum requirements")
        while len(examples) < min_batch_size * 2:
            examples.extend(examples[:min_batch_size * 2 - len(examples)])
        total = len(examples)
        val_size = min_batch_size

    train_examples = examples[val_size:]
    valid_examples = examples[:val_size]

    # Write train.jsonl
    train_path = Path(output_dir) / "train.jsonl"
    with open(train_path, "w") as f:
        for ex in train_examples:
            f.write(json.dumps(ex) + "\n")

    # Write valid.jsonl
    valid_path = Path(output_dir) / "valid.jsonl"
    with open(valid_path, "w") as f:
        for ex in valid_examples:
            f.write(json.dumps(ex) + "\n")

    print(f"Prepared {len(train_examples)} training + {len(valid_examples)} validation examples")
    return len(train_examples)


def train(
    model_key: str = "qwen2.5-3b",
    data_path: str = "budget-assistant-latest.jsonl",
    output_dir: str = "budget-assistant-mlx",
    epochs: int = 3,
    batch_size: int = 2,
    learning_rate: float = 1e-5,
):
    """Run LoRA fine-tuning using MLX-LM."""

    if not check_mlx_lm():
        print("Error: mlx-lm is required. Install with:")
        print("  pip install mlx-lm")
        sys.exit(1)

    # Get model path
    if model_key in MLX_MODELS:
        model_path = MLX_MODELS[model_key]
    else:
        # Assume it's a direct HuggingFace path
        model_path = model_key

    print(f"\n=== Fine-tuning Budget Assistant on Apple Silicon ===")
    print(f"Base model: {model_path}")
    print(f"Training data: {data_path}")
    print(f"Output: {output_dir}")
    print(f"Epochs: {epochs}")

    # Clean up any previous failed runs
    output_path = Path(output_dir)
    if output_path.exists():
        adapter_config = output_path / "adapter_config.json"
        if not adapter_config.exists():
            print(f"\nNote: Cleaning up incomplete previous run in {output_dir}")
            import shutil
            shutil.rmtree(output_path)

    # Prepare training data directory
    data_dir = Path(output_dir) / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    print("\nPreparing training data...")
    num_examples = prepare_training_data(data_path, str(data_dir))

    if num_examples == 0:
        print("Error: No training examples found")
        sys.exit(1)

    # Adjust batch size if we don't have enough examples
    if num_examples < batch_size:
        batch_size = max(1, num_examples)
        print(f"Note: Adjusted batch size to {batch_size} (dataset has {num_examples} examples)")

    # Calculate iterations (MLX-LM uses iterations, not epochs)
    iters = num_examples * epochs // batch_size

    # Ensure minimum iterations
    if iters < 10:
        iters = 10
        print(f"Note: Adjusted to minimum {iters} iterations")

    # Build MLX-LM command (new format: python -m mlx_lm lora ...)
    # --data should point to the DIRECTORY containing train.jsonl
    # Note: MLX-LM uses default LoRA config (rank=8, alpha=16)
    cmd = [
        sys.executable, "-m", "mlx_lm", "lora",
        "--model", model_path,
        "--train",
        "--data", str(data_dir),
        "--adapter-path", output_dir,
        "--iters", str(iters),
        "--batch-size", str(batch_size),
        "--learning-rate", str(learning_rate),
    ]

    print(f"\nRunning: {' '.join(cmd)}")
    print("\nStarting training...")

    try:
        result = subprocess.run(cmd, check=True, capture_output=False, text=True)
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Training failed with exit code {e.returncode}")
        if e.stdout:
            print(f"stdout: {e.stdout}")
        if e.stderr:
            print(f"stderr: {e.stderr}")
        print("\nTroubleshooting:")
        print("  1. Ensure mlx-lm is installed: pip install mlx-lm")
        print("  2. Check you have enough memory (16GB+ recommended)")
        print("  3. Try a smaller batch size: --batch-size 1")
        print("  4. Try a smaller model: --model phi4-mini")
        sys.exit(1)
    except FileNotFoundError:
        print("\n❌ Python or mlx-lm not found")
        print("Make sure you're in the correct Python environment:")
        print("  source venv/bin/activate")
        print("  pip install mlx-lm")
        sys.exit(1)

    print(f"\n=== Training Complete ===")
    print(f"LoRA adapters saved to: {output_dir}")
    print("\nTo test the model:")
    print(f"  python -m mlx_lm generate --model {model_path} --adapter-path {output_dir} --prompt 'What is my account balance?'")
    print("\nTo fuse adapters into full model:")
    print(f"  python -m mlx_lm fuse --model {model_path} --adapter-path {output_dir} --save-path {output_dir}-fused")
    print("\nTo convert for Ollama, see the documentation.")


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

    parser = argparse.ArgumentParser(
        description="Fine-tune Budget Assistant on Apple Silicon"
    )
    parser.add_argument(
        "--model",
        default="qwen2.5-3b",
        help=f"Base model. Shortcuts: {list(MLX_MODELS.keys())} or HuggingFace path"
    )
    parser.add_argument(
        "--data",
        default=default_data,
        help=f"Path to training data (JSONL). Default: {default_data}"
    )
    parser.add_argument(
        "--output",
        default="budget-assistant-mlx",
        help="Output directory for LoRA adapters"
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
        default=1e-5,
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
