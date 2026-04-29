"""
Isolation Forest model wrapper.
Inference pipeline: raw (2117) → scaler → var_selector (1827) → IsolationForest
PCA is disabled — see artifacts/pca_config.json.
"""
import json
import logging
import threading
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from core.config import settings

logger = logging.getLogger(__name__)

_lock  = threading.Lock()
_model = None   # IsolationForest
_scaler       = None
_var_selector = None
_threshold    = None
_score_stats  = None


def _load():
    global _model, _scaler, _var_selector, _threshold, _score_stats
    if _model is not None:
        return
    with _lock:
        if _model is not None:
            return
        p = Path(settings.MODEL_DIR)

        _scaler       = joblib.load(p / "scaler.pkl")
        _var_selector = joblib.load(p / "var_selector.pkl")
        _model        = joblib.load(p / "if_model.pkl")
        _threshold    = json.loads((p / "if_threshold.json").read_text())["threshold"]
        _score_stats  = json.loads((p / "if_score_stats.json").read_text())

        # Validate pipeline dimensions are consistent
        assert _scaler.n_features_in_ == _var_selector.n_features_in_, (
            f"scaler expects {_scaler.n_features_in_} features but "
            f"var_selector expects {_var_selector.n_features_in_}"
        )
        n_kept = int(_var_selector.get_support().sum())
        logger.info(
            f"IF loaded — scaler:{_scaler.n_features_in_} cols → "
            f"var_selector:{n_kept} cols → IsolationForest"
        )


def predict(X: pd.DataFrame) -> np.ndarray:
    """
    Returns anomaly scores for each case.
    Positive score = anomalous. Negative score = normal.
    Score > threshold means the case is flagged as anomalous.
    """
    _load()
    X_scaled = _scaler.transform(X)           # (n, 2117)
    X_vt     = _var_selector.transform(X_scaled)  # (n, 1827)
    scores   = -_model.decision_function(X_vt)    # (n,)  positive = anomalous
    return scores


def predict_with_labels(X: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Returns (scores, binary_labels) where label=1 means anomalous."""
    scores = predict(X)
    labels = (scores >= _threshold).astype(int)
    return scores, labels


def get_threshold() -> float:
    _load()
    return _threshold


def get_score_stats() -> dict:
    _load()
    return _score_stats


def zscore_if(scores: np.ndarray) -> np.ndarray:
    """Z-normalize IF scores using training mean/std for hybrid fusion."""
    _load()
    mu  = _score_stats["mean"]
    std = _score_stats["std"] or 1.0
    return (scores - mu) / std


class IsolationForestModel:
    """Compatibility class for health check and startup."""
    def __init__(self):
        _load()
    def load(self, model_dir: str = None):
        _load()
    @property
    def model(self):
        return _model
    def predict(self, X):
        return predict(X)
