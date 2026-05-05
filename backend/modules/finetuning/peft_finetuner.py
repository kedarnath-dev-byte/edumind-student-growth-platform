"""
@module     PEFTFineTuner
@description Parameter Efficient Fine-Tuning (PEFT) using Prompt Tuning
             for EduMind AI. Trains only a small set of soft prompt
             embedding vectors. The lightest fine-tuning method —
             only hundreds of parameters trained vs billions in full FT.
@author     EduMind AI Engineering
"""

from typing import Any, Dict
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import get_peft_model, PromptTuningConfig, PromptTuningInit, TaskType
from trl import SFTTrainer
from .base_finetuner import BaseFineTuner


class PEFTFineTuner(BaseFineTuner):
    """
    PEFT Prompt Tuning — the lightest fine-tuning method.
    Best for: Ultra low-resource environments.
    Key idea: Only prompt embedding vectors are trained.
    Comparison:
        Full FT     → trains ALL parameters (billions)
        LoRA        → trains ~1-5% parameters
        Prefix      → trains virtual token vectors
        Prompt Tune → trains ONLY prompt embeddings (hundreds)
    """

    def load_model(self) -> None:
        model_name = self.config.get("model_name", "facebook/opt-125m")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        base_model = AutoModelForCausalLM.from_pretrained(model_name)

        prompt_tuning_config = PromptTuningConfig(
            task_type=TaskType.CAUSAL_LM,
            prompt_tuning_init=PromptTuningInit.TEXT,
            num_virtual_tokens=self.config.get("num_virtual_tokens", 8),
            prompt_tuning_init_text=self.config.get(
                "init_text", "Answer the education question below:"
            ),
            tokenizer_name_or_path=model_name,
        )
        self.model = get_peft_model(base_model, prompt_tuning_config)

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
            output_dir=self.config.get("output_dir", "./peft_output"),
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
            "framework": "PEFT Prompt Tuning",
            "train_loss": result.training_loss,
            "steps": result.global_step,
            "virtual_tokens": self.config.get("num_virtual_tokens", 8),
            "trainable_params": trainable,
            "total_params": total,
            "trainable_percent": round(100 * trainable / total, 4),
        }