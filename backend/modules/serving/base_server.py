"""
@module     base_server.py
@description Abstract base class for all model serving engines in EduMind AI.
             Defines the contract (load_model, predict, health_check) that every
             serving engine must implement. Follows SOLID Open/Closed Principle —
             open for extension (new servers), closed for modification.
             Serving engines: FastAPI, TorchServe, Triton, BentoML, vLLM.
@author     EduMind AI Engineering
"""

from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseServer(ABC):

    def __init__(self, model_name: str, model_path: str):
        self.model_name = model_name
        self.model_path = model_path
        self.is_loaded = False

    @abstractmethod
    def load_model(self) -> bool:
        pass

    @abstractmethod
    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        pass

    def get_server_info(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "model_path": self.model_path,
            "is_loaded": self.is_loaded,
            "server_type": self.__class__.__name__,
        }