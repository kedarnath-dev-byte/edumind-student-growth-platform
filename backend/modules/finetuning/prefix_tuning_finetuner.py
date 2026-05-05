"""
@module     PrefixTuningFineTuner
@description Prefix Tuning fine-tuning for EduMind AI.
             Prepends trainable continuous vectors (virtual tokens)
             to the input sequence. Base model is fully frozen.
             Only the prefix parameters are trained.
@author     EduMind AI Engineering
"""

from typing import Any, Dict
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import get_peft_model, PrefixTuningConfig, TaskType
from trl import SFTTrainer
from .base_finetuner import BaseFineTuner


class PrefixTuningFineTuner(BaseFineTuner):
    """
    Prefix Tuning using PEFT library.
    Best for: Steering model behaviour without touching weights.
    Key idea: Train a soft prompt prefix — not the model itself.
    Very parameter-efficient: only prefix vectors are trained.
    """

    def load_model(self) -> None:
        model_name = self.config.get("model_name", "facebook/opt-125m")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        base_model = AutoModelForCausalLM.from_pretrained(model_name)

        prefix_config = PrefixTuningConfig(
            task_type=TaskType.CAUSAL_LM,
            num_virtual_tokens=self.config.get("num_virtual_tokens", 20),
            encoder_hidden_size=self.config.get("encoder_hidden_size", 128),
        )
        self.model = get_peft_model(base_model, prefix_config)

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
            output_dir=self.config.get("output_dir", "./prefix_output"),
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
            "framework": "Prefix Tuning",
            "train_loss": result.training_loss,
            "steps": result.global_step,
            "virtual_tokens": self.config.get("num_virtual_tokens", 20),
            "trainable_params": trainable,
            "total_params": total,
            "trainable_percent": round(100 * trainable / total, 2),
        }