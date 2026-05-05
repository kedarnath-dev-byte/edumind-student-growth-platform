"""
@module     AdapterFineTuner
@description Adapter-based fine-tuning for EduMind AI.
             Inserts small trainable adapter modules between
             frozen transformer layers using PEFT library.
             Base model weights are never modified.
@author     EduMind AI Engineering
"""

from typing import Any, Dict
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import get_peft_model, IA3Config, TaskType
from trl import SFTTrainer
from .base_finetuner import BaseFineTuner


class AdapterFineTuner(BaseFineTuner):
    """
    Adapter Fine-Tuning using PEFT IA3 (Infused Adapter by Inhibiting
    and Amplifying Inner Activations).
    Best for: Multi-task learning — one base model, many adapters.
    Key idea: Swap adapter = switch tasks. Zero base model change.
    """

    def load_model(self) -> None:
        model_name = self.config.get("model_name", "facebook/opt-125m")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        base_model = AutoModelForCausalLM.from_pretrained(model_name)

        adapter_config = IA3Config(
            task_type=TaskType.CAUSAL_LM,
            target_modules=["q_proj", "v_proj", "down_proj"],
            feedforward_modules=["down_proj"],
        )
        self.model = get_peft_model(base_model, adapter_config)

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

    def prepare_dataset(self, data_path: str) -> Any:
        import json
        records = []
        with open(data_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    records.append(json.loads(line))
        return Dataset.from_list(records)

    def train(self, dataset: Any) -> Dict[str, Any]:
        training_args = TrainingArguments(
            output_dir=self.config.get("output_dir", "./adapter_output"),
            num_train_epochs=self.config.get("epochs", 1),
            per_device_train_batch_size=self.config.get("batch_size", 2),
            logging_steps=10,
            save_steps=50,
            report_to="none",
        )
        trainer = SFTTrainer(
            model=self.model,
            args=training_args,
            train_dataset=dataset,
            tokenizer=self.tokenizer,
        )
        result = trainer.train()
        trainable, total = self.model.get_nb_trainable_parameters()
        return {
            "framework": "Adapter (IA3)",
            "train_loss": result.training_loss,
            "steps": result.global_step,
            "trainable_params": trainable,
            "total_params": total,
            "trainable_percent": round(100 * trainable / total, 2),
        }