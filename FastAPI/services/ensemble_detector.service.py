import numpy as np
import torch

class EnsembleDetector:
    def __init__(self, lstm_model, if_model, alpha=0.5):
        self.lstm = lstm_model # Loaded from .pt
        self.iforest = if_model # Loaded from .pkl
        self.alpha = alpha # Weighting factor

    def calculate_anomaly_score(self, event_sequence, event_features):
        # 1. LSTM Reconstruction Error
        # Formula: $L(x, \hat{x}) = \frac{1}{n} \sum_{i=1}^{n} (x_i - \hat{x}_i)^2$
        reconstructed = self.lstm(event_sequence)
        mse_loss = torch.mean((event_sequence - reconstructed) ** 2).item()
        
        # 2. Isolation Forest Score
        if_score = self.iforest.decision_function([event_features])[0]
        
        # 3. Ensemble (Normalized)
        # We normalize both to a 0-1 range where 1 is highly anomalous
        combined_score = (self.alpha * mse_loss) + ((1 - self.alpha) * abs(if_score))
        return combined_score