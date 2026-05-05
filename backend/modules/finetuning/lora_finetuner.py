"""
@module     LoRAFineTuner
@description Low-Rank Adaptation (LoRA) fine-tuning for EduMind AI.
             Freezes base model weights and trains only small adapter
             matrices — drastically reducing memory and compute cost.
@author     EduMind AI Engineering
"""

from typing import Any, Dict
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import LoraConfig, get_peft_model, TaskType
from trl import SFTTrainer
from .base_finetuner import BaseFineTuner


class LoRAFineTuner(BaseFineTuner):
    """
    LoRA Fine-Tuning using PEFT + TRL.
    Best for: Fine-tuning large models on limited GPU memory.
    Key idea: Only 1-5% of parameters are trained.
    """

    def load_model(self) -> None:
        model_name = self.config.get("model_name", "facebook/opt-125m")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        base_model = AutoModelForCausalLM.from_pretrained(model_name)

        lora_config = LoraConfig(
            task_type=TaskType.CAUSAL_LM,
            r=self.config.get("lora_r", 8),
            lora_alpha=self.config.get("lora_alpha", 32),
            lora_dropout=self.config.get("lora_dropout", 0.1),
            target_modules=["q_proj", "v_proj"],
        )
        self.model = get_peft_model(base_model, lora_config)

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
            output_dir=self.config.get("output_dir", "./lora_output"),
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
            "framework": "LoRA",
            "train_loss": result.training_loss,
            "steps": result.global_step,
            "trainable_params": trainable,
            "total_params": total,
            "trainable_percent": round(100 * trainable / total, 2),
        }