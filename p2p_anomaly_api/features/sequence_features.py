"""
Event-level and sequence-level feature engineering for LSTM Autoencoder.
"""
import numpy as np
import pandas as pd

def prep_event_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineers event-level features required by the LSTM Autoencoder.
    Adds: time_since_last_event_hours, event_index_norm, is_off_hours,
          log_amount, hour_sin, hour_cos, dow_sin, dow_cos.
    """
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df = df.sort_values(["case_id", "timestamp"])

    # 1. time_since_last_event_hours
    df["time_since_last_event_hours"] = (
        df.groupby("case_id")["timestamp"]
        .diff()
        .dt.total_seconds()
        .fillna(0) / 3600.0
    )

    # 2. event_index_norm (within case)
    df["event_index"] = df.groupby("case_id").cumcount()
    # Normalize by typical MAX_LEN=10
    df["event_index_norm"] = df["event_index"] / 10.0

    # 3. is_off_hours
    def _is_off(ts):
        return 1 if (ts.hour < 8 or ts.hour >= 18 or ts.dayofweek >= 5) else 0
    df["is_off_hours"] = df["timestamp"].apply(_is_off).astype("int8")

    # 4. log_amount
    df["log_amount"] = np.log1p(pd.to_numeric(df["amount"], errors="coerce").fillna(0))

    # 5. Cyclical Time Features
    hour = df["timestamp"].dt.hour
    dow  = df["timestamp"].dt.dayofweek
    
    df["hour_sin"] = np.sin(2 * np.pi * hour / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24.0)
    df["dow_sin"]  = np.sin(2 * np.pi * dow / 7.0)
    df["dow_cos"]  = np.cos(2 * np.pi * dow / 7.0)

    return df
