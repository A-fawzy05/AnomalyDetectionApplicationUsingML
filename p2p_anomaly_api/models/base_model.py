"""
Base class for ML models.
"""

from abc import ABC, abstractmethod
from typing import Any


class BaseModel(ABC):
    @abstractmethod
    def load(self, model_path: str) -> None:
        pass

    @abstractmethod
    def predict(self, data: Any) -> Any:
        pass

