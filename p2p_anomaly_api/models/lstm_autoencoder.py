"""
LSTM Autoencoder model for sequence-level anomaly detection.
"""

import os
import threading
import numpy as np
import tensorflow as tf
from p2p_anomaly_api.models.base_model import BaseModel
from p2p_anomaly_api.core.config import settings
from p2p_anomaly_api.core.exceptions import ModelNotLoadedError


class LSTMAutoencoderModel(BaseModel):
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(LSTMAutoencoderModel, cls).__new__(cls)
                cls._instance.model = None
        return cls._instance

    def load(self, model_dir: str) -> None:
        model_path = os.path.join(model_dir, "lstm_autoencoder.h5")
        
        if not os.path.exists(model_path):
            raise ModelNotLoadedError(f"LSTM Autoencoder model not found at {model_path}")
            
        self.model = tf.keras.models.load_model(model_path)

    def predict(self, X_seq: np.ndarray) -> dict:
        if self.model is None:
            raise ModelNotLoadedError("LSTM Autoencoder model not loaded")
        
        reconstructed = self.model.predict(X_seq)
        
        # Calculate reconstruction error (MSE)
        mse = np.mean(np.power(X_seq - reconstructed, 2), axis=(1, 2))
        
        # Split into structural and temporal for labeling if needed
        # For simplicity, we return a dict with overall case score
        return {
            "case_scores": mse,
            "structural_scores": mse * 0.6, # Mock split
            "temporal_scores": mse * 0.4    # Mock split
        }
