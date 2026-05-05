"""
@module     SFTFineTuner
@description Supervised Fine-Tuning (SFT) implementation for EduMind AI.
             Trains the model on labeled question-answer pairs using
             HuggingFace Transformers and TRL's SFTTrainer.
@author     EduMind AI Engineering
"""

from typing import Any, Dict
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from trl import SFTTrainer
from .base_finetuner import BaseFineTuner


class SFTFineTuner(BaseFineTuner):
    """
    Supervised Fine-Tuning using TRL's SFTTrainer.
    Best for: Teaching the model a specific Q&A format.
    """

    def load_model(self) -> None:
        model_name = self.config.get("model_name", "facebook/opt-125m")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
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
            output_dir=self.config.get("output_dir", "./sft_output"),
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
        return {
            "framework": "SFT",
            "train_loss": result.training_loss,
            "steps": result.global_step,
        }
    