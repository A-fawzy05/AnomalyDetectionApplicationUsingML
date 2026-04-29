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
    # Initialize result with case_id column and clear index to avoid name collision
    if "case_id" in case_df.columns:
        result = case_df[["case_id"]].copy()
    else:
        # Create a fresh DataFrame with case_id as a column, stripping the index name
        result = pd.DataFrame({"case_id": case_df.index.values})

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
