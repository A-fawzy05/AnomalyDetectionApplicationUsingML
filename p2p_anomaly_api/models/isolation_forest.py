"""
Isolation Forest model for case-level anomaly detection.
"""

import joblib
import os
import threading
from typing import Optional
import numpy as np
from p2p_anomaly_api.models.base_model import BaseModel
from p2p_anomaly_api.core.config import settings
from p2p_anomaly_api.core.exceptions import ModelNotLoadedError


class IsolationForestModel(BaseModel):
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(IsolationForestModel, cls).__new__(cls)
                cls._instance.model = None
                cls._instance.scaler = None
        return cls._instance

    def load(self, model_dir: str) -> None:
        model_path = os.path.join(model_dir, "if_model.pkl")
        scaler_path = os.path.join(model_dir, "scaler.pkl")
        
        if not os.path.exists(model_path):
            raise ModelNotLoadedError(f"Isolation Forest model not found at {model_path}")
            
        self.model = joblib.load(model_path)
        if os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)

    def predict(self, X: np.ndarray) -> np.ndarray:
        if self.model is None:
            raise ModelNotLoadedError("Isolation Forest model not loaded")
        
        # Isolation Forest decision_function returns anomaly scores
        # Lower scores are more anomalous. We negate it to have higher = more anomalous
        scores = -self.model.decision_function(X)
        return scores
