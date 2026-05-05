"""
@module     QLoRAFineTuner
@description Quantized LoRA (QLoRA) fine-tuning for EduMind AI.
             Loads base model in 4-bit precision using BitsAndBytes,
             then applies LoRA adapters on top. Enables fine-tuning
             of large models (7B+) on consumer hardware.
@author     EduMind AI Engineering
"""

from typing import Any, Dict
from datasets import Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    BitsAndBytesConfig,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType
from trl import SFTTrainer
from .base_finetuner import BaseFineTuner


class QLoRAFineTuner(BaseFineTuner):
    """
    QLoRA Fine-Tuning using 4-bit quantization + LoRA adapters.
    Best for: Fine-tuning 7B+ models on limited GPU memory.
    Key idea: 4-bit model + LoRA = massive models on small GPUs.
    """

    def load_model(self) -> None:
        model_name = self.config.get("model_name", "facebook/opt-125m")

        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype="float16",
        )

        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        base_model = AutoModelForCausalLM.from_pretrained(
            model_name,
            quantization_config=bnb_config,
            device_map="auto",
        )

        base_model = prepare_model_for_kbit_training(base_model)

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
            output_dir=self.config.get("output_dir", "./qlora_output"),
            num_train_epochs=self.config.get("epochs", 1),
            per_device_train_batch_size=self.config.get("batch_size", 2),
            fp16=True,
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
            "framework": "QLoRA",
            "train_loss": result.training_loss,
            "steps": result.global_step,
            "quantization": "4-bit NF4",
        }