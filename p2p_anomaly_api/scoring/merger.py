"""
Logic for merging scores from different models.
"""

import pandas as pd
import numpy as np
import json
import os
from p2p_anomaly_api.core.config import settings

def merge_scores(case_df: pd.DataFrame, if_scores: np.ndarray, lstm_scores_dict: dict) -> pd.DataFrame:
    """
    Merges IF and LSTM scores and computes a hybrid score.
    """
    # 1. Attach scores to case_df
    # Ensure index matches
    results_df = case_df.copy()
    results_df["if_score"] = if_scores
    results_df["lstm_case_score"] = lstm_scores_dict["case_scores"]
    results_df["lstm_structural_score"] = lstm_scores_dict["structural_scores"]
    results_df["lstm_temporal_score"] = lstm_scores_dict["temporal_scores"]

    # 2. Hybrid Score computation
    # In a real app, we'd use stats from artifacts to normalize
    # For now, we use a simple average of normalized scores
    
    if_norm = (results_df["if_score"] - results_df["if_score"].mean()) / (results_df["if_score"].std() + 1e-9)
    lstm_norm = (results_df["lstm_case_score"] - results_df["lstm_case_score"].mean()) / (results_df["lstm_case_score"].std() + 1e-9)
    
    results_df["hybrid_score"] = (if_norm + lstm_norm) / 2.0
    
    return results_df
