"""
Score fusion: combines IF scores and LSTM scores into hybrid_3way_score.
All z-normalization uses training statistics from fusion_stats.json.
"""
import logging
import numpy as np
import pandas as pd

from models import isolation_forest as if_model
from models import lstm_autoencoder as lstm_model

logger = logging.getLogger(__name__)


def calibrate_thresholds(
    if_scores: np.ndarray,
    lstm_scores: np.ndarray,
    if_train_threshold: float,
    lstm_train_threshold: float,
    target_anomaly_rate: float = 0.05,
) -> tuple[float, float]:
    """
    Compute batch-adaptive thresholds.

    Logic:
    - Compute threshold that would flag exactly target_anomaly_rate
      of CURRENT batch as anomalous.
    - Take the MAX of (training threshold, batch threshold).
      This means: never flag more than training would flag on similar data,
      but also never flag less than target_anomaly_rate of any batch.
    - target_anomaly_rate=0.05 means at most 5% of any batch is anomalous.

    Returns:
        (adaptive_if_threshold, adaptive_lstm_threshold)
    """
    # Batch-specific percentile threshold
    batch_if_threshold   = float(np.quantile(if_scores,    1.0 - target_anomaly_rate))
    batch_lstm_threshold = float(np.quantile(lstm_scores,  1.0 - target_anomaly_rate))

    # Take more conservative (higher) threshold
    adaptive_if   = max(if_train_threshold,   batch_if_threshold)
    adaptive_lstm = max(lstm_train_threshold, batch_lstm_threshold)

    logger.info(
        f"Threshold calibration: "
        f"IF train={if_train_threshold:.4f} batch={batch_if_threshold:.4f} → adaptive={adaptive_if:.4f} | "
        f"LSTM train={lstm_train_threshold:.4f} batch={batch_lstm_threshold:.4f} → adaptive={adaptive_lstm:.4f}"
    )
    return adaptive_if, adaptive_lstm


def merge_scores(
    case_df: pd.DataFrame,
    if_scores: np.ndarray,
    lstm_scores: pd.DataFrame,
    phase_summary: pd.DataFrame,
) -> pd.DataFrame:
    """
    Merge IF scores and LSTM scores into a single case-level DataFrame.

    Args:
        case_df:       Case-level feature DataFrame (one row per case_id)
        if_scores:     Raw IF anomaly scores from isolation_forest.predict()
        lstm_scores:   Output of lstm_autoencoder.score_sequences()
        phase_summary: Output of build_phase_summary() with missing_3way_steps

    Returns:
        Merged DataFrame with all scores and flags attached.
    """
    # Initialize result with all case_df columns to preserve vendor, amount, etc.
    if "case_id" in case_df.columns:
        result = case_df.copy()
    else:
        # Create a fresh DataFrame with case_id as a column, preserving all original columns
        result = case_df.reset_index(drop=False)
    
    # Restore vendor and amount data from case_df attributes if available
    if hasattr(case_df, '_vendor_data') and case_df._vendor_data is not None:
        vendor_data = case_df._vendor_data
        if 'case_id' in result.columns and vendor_data.index.name == 'case_id':
            result["vendor"] = vendor_data.reindex(result['case_id']).values
        else:
            result["vendor"] = vendor_data.values

    if hasattr(case_df, '_amount_data') and case_df._amount_data is not None:
        amount_data = case_df._amount_data
        if 'case_id' in result.columns and amount_data.index.name == 'case_id':
            result["amount"] = amount_data.reindex(result['case_id']).values
        else:
            result["amount"] = amount_data.values

    # Re-inject vendor frequency columns — these are NOT in train_columns so they
    # were stripped by reindex in case_features.py; retrieve from saved attributes.
    for attr, col in (
        ('_vendor_case_freq',  'vendor_case_frequency'),
        ('_vendor_batch_freq', 'vendor_batch_frequency'),
    ):
        if hasattr(case_df, attr):
            freq_data = getattr(case_df, attr)
            if 'case_id' in result.columns and freq_data.index.name == 'case_id':
                result[col] = freq_data.reindex(result['case_id']).values
            else:
                result[col] = freq_data.values


    # Attach IF scores and z-normalize using training stats
    result["if_score"]   = if_scores
    result["if_score_z"] = if_model.zscore_if(if_scores)

    # Attach LSTM scores (already capped inside score_sequences)
    result = result.merge(lstm_scores, on="case_id", how="left")

    # Attach phase summary for 3-way match
    result = result.merge(
        phase_summary[["case_id", "missing_3way_steps",
                       "has_pr", "has_po", "has_gr", "has_inv", "has_pay"]],
        on="case_id", how="left"
    )
    result["missing_3way_steps"] = result["missing_3way_steps"].fillna(0)

    # Compute hybrid 3-way match score and flag
    result = lstm_model.compute_hybrid_score(
        case_scores        = result,
        if_scores_z        = result["if_score_z"].values,
        missing_3way_steps = result["missing_3way_steps"].values,
    )

    logger.info(
        f"Scores merged for {len(result)} cases — "
        f"IF anomalies: {(result['if_score'] >= if_model.get_threshold()).sum()}, "
        f"LSTM anomalies: {result.get('lstm_anomaly_label', pd.Series(0)).sum()}"
    )
    return result
