"""
@module     RLHFFineTuner
@description Reinforcement Learning from Human Feedback (RLHF)
             for EduMind AI. Implements PPO-based training loop
             using TRL's PPOTrainer. Requires a reward model to
             score generated responses during training.
@author     EduMind AI Engineering
"""

from typing import Any, Dict
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from trl import PPOTrainer, PPOConfig, AutoModelForCausalLMWithValueHead
from .base_finetuner import BaseFineTuner
import torch


class RLHFFineTuner(BaseFineTuner):
    """
    RLHF Fine-Tuning using PPO (Proximal Policy Optimization).
    Best for: Aligning model to human values and preferences.
    Key idea: Model gets rewarded for generating good responses.
    Pipeline: SFT model → reward scoring → PPO policy update.
    """

    def load_model(self) -> None:
        model_name = self.config.get("model_name", "facebook/opt-125m")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLMWithValueHead.from_pretrained(model_name)

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        # Load reward model (can be same small model for demo purposes)
        reward_model_name = self.config.get("reward_model", model_name)
        self.reward_pipeline = pipeline(
            "text-classification",
            model=reward_model_name,
            tokenizer=reward_model_name,
            device=0 if torch.cuda.is_available() else -1,
        )

    def prepare_dataset(self, data_path: str) -> Any:
        """
        Expects JSONL file with each line containing:
        { "query": "..." }
        """
        import json
        records = []
        with open(data_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    record = json.loads(line)
                    records.append({"query": record["query"]})
        return Dataset.from_list(records)

    def train(self, dataset: Any) -> Dict[str, Any]:
        ppo_config = PPOConfig(
            model_name=self.config.get("model_name", "facebook/opt-125m"),
            learning_rate=self.config.get("learning_rate", 1.41e-5),
            batch_size=self.config.get("batch_size", 2),
            mini_batch_size=self.config.get("mini_batch_size", 1),
            log_with=None,
        )
        ppo_trainer = PPOTrainer(
            config=ppo_config,
            model=self.model,
            tokenizer=self.tokenizer,
            dataset=dataset,
        )

        total_reward = 0.0
        steps = 0

        for batch in ppo_trainer.dataloader:
            query_tensors = [
                self.tokenizer.encode(q, return_tensors="pt").squeeze()
                for q in batch["query"]
            ]
            # Generate responses
            response_tensors = ppo_trainer.generate(
                query_tensors,
                max_new_tokens=self.config.get("max_new_tokens", 50),
            )
            responses = [
                self.tokenizer.decode(r.squeeze(), skip_special_tokens=True)
                for r in response_tensors
            ]
            # Score with reward model
            rewards = [
                torch.tensor(
                    self.reward_pipeline(r)[0]["score"]
                )
                for r in responses
            ]
            # PPO update step
            stats = ppo_trainer.step(query_tensors, response_tensors, rewards)
            total_reward += sum(r.item() for r in rewards)
            steps += 1

        return {
            "framework": "RLHF (PPO)",
            "steps": steps,
            "average_reward": round(total_reward / max(steps, 1), 4),
        }