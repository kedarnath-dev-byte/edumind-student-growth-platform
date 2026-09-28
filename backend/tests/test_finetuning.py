"""
@module     test_finetuning
@description Unit tests for all 8 fine-tuning frameworks in EduMind AI.
             Tests factory pattern, framework instantiation, dataset loading,
             and summary output. Training calls are skipped (requires GPU).
@author     EduMind AI Engineering
"""

import pytest
import os

# Fine-tuning frameworks need optional ML deps (datasets/transformers).
# Skip collection when absent so Log/revision CI stays green on slim installs.
pytest.importorskip("datasets")

from modules.finetuning.finetuning_factory import FineTunerFactory

# Path to sample training data
DATA_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "modules",
    "finetuning",
    "data",
    "sample_train.jsonl",
)

BASE_CONFIG = {
    "model_name": "facebook/opt-125m",
    "epochs": 1,
    "batch_size": 2,
}


# ── Factory Tests ────────────────────────────────────────────────

class TestFineTunerFactory:

    def test_list_frameworks_returns_eight(self):
        frameworks = FineTunerFactory.list_frameworks()
        assert len(frameworks) == 8

    def test_list_frameworks_contains_all(self):
        frameworks = FineTunerFactory.list_frameworks()
        expected = ["sft", "lora", "qlora", "dpo", "adapter",
                    "prefix_tuning", "rlhf", "peft"]
        for name in expected:
            assert name in frameworks

    def test_invalid_framework_raises_value_error(self):
        with pytest.raises(ValueError, match="Unknown framework"):
            FineTunerFactory.get("invalid_framework", BASE_CONFIG)

    def test_factory_returns_correct_type(self):
        from modules.finetuning.base_finetuner import BaseFineTuner
        tuner = FineTunerFactory.get("sft", BASE_CONFIG)
        assert isinstance(tuner, BaseFineTuner)


# ── Summary Tests (no model loading needed) ──────────────────────

class TestFineTunerSummary:

    @pytest.mark.parametrize("framework", [
        "sft", "lora", "qlora", "dpo",
        "adapter", "prefix_tuning", "rlhf", "peft"
    ])
    def test_summary_contains_framework_name(self, framework):
        tuner = FineTunerFactory.get(framework, BASE_CONFIG)
        summary = tuner.summary()
        assert "framework" in summary
        assert "config" in summary
        assert "model_loaded" in summary
        assert summary["model_loaded"] is False

    @pytest.mark.parametrize("framework", [
        "sft", "lora", "qlora", "dpo",
        "adapter", "prefix_tuning", "rlhf", "peft"
    ])
    def test_get_framework_name_not_empty(self, framework):
        tuner = FineTunerFactory.get(framework, BASE_CONFIG)
        assert len(tuner.get_framework_name()) > 0


# ── Dataset Loading Tests ─────────────────────────────────────────

class TestDatasetLoading:

    def test_sft_prepare_dataset(self):
        tuner = FineTunerFactory.get("sft", BASE_CONFIG)
        dataset = tuner.prepare_dataset(DATA_PATH)
        assert len(dataset) > 0

    def test_lora_prepare_dataset(self):
        tuner = FineTunerFactory.get("lora", BASE_CONFIG)
        dataset = tuner.prepare_dataset(DATA_PATH)
        assert len(dataset) > 0

    def test_qlora_prepare_dataset(self):
        tuner = FineTunerFactory.get("qlora", BASE_CONFIG)
        dataset = tuner.prepare_dataset(DATA_PATH)
        assert len(dataset) > 0

    def test_dpo_prepare_dataset(self):
        tuner = FineTunerFactory.get("dpo", BASE_CONFIG)
        dataset = tuner.prepare_dataset(DATA_PATH)
        assert len(dataset) > 0

    def test_adapter_prepare_dataset(self):
        tuner = FineTunerFactory.get("adapter", BASE_CONFIG)
        dataset = tuner.prepare_dataset(DATA_PATH)
        assert len(dataset) > 0

    def test_prefix_tuning_prepare_dataset(self):
        tuner = FineTunerFactory.get("prefix_tuning", BASE_CONFIG)
        dataset = tuner.prepare_dataset(DATA_PATH)
        assert len(dataset) > 0

    def test_peft_prepare_dataset(self):
        tuner = FineTunerFactory.get("peft", BASE_CONFIG)
        dataset = tuner.prepare_dataset(DATA_PATH)
        assert len(dataset) > 0

