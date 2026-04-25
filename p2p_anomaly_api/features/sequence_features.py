"""
Sequence feature engineering for LSTM Autoencoder.
"""

import pandas as pd
import numpy as np
import json
import os
import joblib
from p2p_anomaly_api.core.config import settings


def build_sequences(df: pd.DataFrame, max_len: int = 10) -> np.ndarray:
    """
    Builds padded sequence tensors for LSTM model.
    """
    # 1. Load activity vocabulary
    vocab_path = os.path.join(settings.MODEL_DIR, "vocab.json")
    if os.path.exists(vocab_path):
        with open(vocab_path, 'r') as f:
            vocab = json.load(f)
    else:
        # Fallback: create from unique activities in df
        unique_acts = df["activity"].unique()
        vocab = {act: i + 1 for i, act in enumerate(unique_acts)}
        vocab["PADDING"] = 0

    # 2. Sort and group
    df_sorted = df.sort_values(["case_id", "timestamp"])
    
    sequences = []
    case_ids = df_sorted["case_id"].unique()
    
    # Simple numerical features to include in sequence
    # In a real app, this would be more comprehensive
    df_sorted["amount_norm"] = df_sorted["amount"] / (df_sorted["amount"].max() + 1e-9)
    df_sorted["quantity_norm"] = df_sorted["quantity"] / (df_sorted["quantity"].max() + 1e-9)

    for cid in case_ids:
        case_events = df_sorted[df_sorted["case_id"] == cid].tail(max_len)
        
        seq_data = []
        for _, row in case_events.iterrows():
            # Activity one-hot or index
            act_idx = vocab.get(row["activity"], 0)
            # Combine with numericals
            event_vec = [act_idx, row["amount_norm"], row["quantity_norm"]]
            seq_data.append(event_vec)
        
        # Padding
        while len(seq_data) < max_len:
            seq_data.insert(0, [0.0] * 3) # Pad at the beginning
            
        sequences.append(seq_data)
        
    return np.array(sequences)
