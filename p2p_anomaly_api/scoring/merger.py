
   
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


    batch_if_threshold   = float(np.quantile(if_scores,    1.0 - target_anomaly_rate))
    batch_lstm_threshold = float(np.quantile(lstm_scores,  1.0 - target_anomaly_rate))

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


    if "case_id" in case_df.columns:
        result = case_df.copy()
    else:
                                                                                            
        result = case_df.reset_index(drop=False)

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

    result["if_score"]   = if_scores
    result["if_score_z"] = if_model.zscore_if(if_scores)

    result = result.merge(lstm_scores, on="case_id", how="left")

    result = result.merge(
        phase_summary[["case_id", "missing_3way_steps",
                       "has_pr", "has_po", "has_gr", "has_inv", "has_pay"]],
        on="case_id", how="left"
    )
    result["missing_3way_steps"] = result["missing_3way_steps"].fillna(0)

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
