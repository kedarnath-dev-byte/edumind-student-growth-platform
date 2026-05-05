"""
@module     DPOFineTuner
@description Direct Preference Optimization (DPO) for EduMind AI.
             Trains the model using human preference pairs —
             (prompt, chosen_response, rejected_response).
             No reward model needed — more stable than RLHF.
@author     EduMind AI Engineering
"""

from typing import Any, Dict
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from trl import DPOTrainer
from .base_finetuner import BaseFineTuner
import json


class DPOFineTuner(BaseFineTuner):
    """
    DPO Fine-Tuning using TRL's DPOTrainer.
    Best for: Aligning model responses to human preferences.
    Dataset format: {prompt, chosen, rejected} triplets.
    Key idea: Directly optimizes preference without a reward model.
    """

    def load_model(self) -> None:
        model_name = self.config.get("model_name", "facebook/opt-125m")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

    def prepare_dataset(self, data_path: str) -> Any:
        """
        Expects JSONL file with each line containing:
        { "prompt": "...", "chosen": "...", "rejected": "..." }
        """
     
        records = []
        with open(data_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    record = json.loads(line)
                    # Skip lines that are not DPO format
                    if "prompt" in record and "chosen" in record and "rejected" in record:
                        records.append({
                            "prompt": record["prompt"],
                            "chosen": record["chosen"],
                            "rejected": record["rejected"],
                        })
        return Dataset.from_list(records)

    def train(self, dataset: Any) -> Dict[str, Any]:
        training_args = TrainingArguments(
            output_dir=self.config.get("output_dir", "./dpo_output"),
            num_train_epochs=self.config.get("epochs", 1),
            per_device_train_batch_size=self.config.get("batch_size", 2),
            logging_steps=10,
            save_steps=50,
            report_to="none",
        )
        trainer = DPOTrainer(
            model=self.model,
            args=training_args,
            train_dataset=dataset,
            tokenizer=self.tokenizer,
            beta=self.config.get("dpo_beta", 0.1),
        )
        result = trainer.train()
        return {
            "framework": "DPO",
            "train_loss": result.training_loss,
            "steps": result.global_step,
            "beta": self.config.get("dpo_beta", 0.1),
        }