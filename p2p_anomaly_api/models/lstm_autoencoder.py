
   
import json
import logging
import threading
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.preprocessing.sequence import pad_sequences

from core.config import settings

logger = logging.getLogger(__name__)

_lock      = threading.Lock()
_model     = None
_seq_scaler    = None
_vocab         = None
_activity_cols = None
_thresholds    = None
_hybrid_threshold = None
_fusion_stats  = None

SCORE_CAPS = {
    "case":       0.049729,
    "structural": 0.025288,
    "temporal":   0.225021,
}

MAX_LEN    = 10
ACT_DIM    = 41                                              

NUMERIC_COLS = [
    "time_since_last_event_hours", "event_index_norm", "is_off_hours",
    "log_amount", "hour_sin", "hour_cos", "dow_sin", "dow_cos"
]

def create_safe_layer(name, op):
    class SafeLayer(tf.keras.layers.Layer):
        def __init__(self, **kwargs):
            for key in ['axis', 'keepdims', 'y', 'dtype', 'trainable']:
                kwargs.pop(key, None)
            super().__init__(name=kwargs.get('name'))
        def __call__(self, *args, **kwargs):
            if args:
                filtered_args = [args[0]]
                for a in args[1:]:
                    if tf.is_tensor(a) or hasattr(a, 'op'):
                        filtered_args.append(a)
                return super().__call__(*filtered_args, **kwargs)
            return super().__call__(*args, **kwargs)
        def call(self, inputs, *args, **kwargs):
            try: return op(inputs)
            except Exception: return inputs
        @classmethod
        def from_config(cls, config):
            return cls(**config)
    SafeLayer.__name__ = name
    return SafeLayer

def _load():
    global _model, _seq_scaler, _vocab, _activity_cols
    global _thresholds, _hybrid_threshold, _fusion_stats

    if _model is not None:
        return
    with _lock:
        if _model is not None:
            return
        p = Path(settings.MODEL_DIR)

        custom_objects = {
            "NotEqual": create_safe_layer("NotEqual", lambda x: tf.math.not_equal(x, 0)),
            "Any": create_safe_layer("Any", lambda x: tf.math.reduce_any(x, axis=-1)),
            "All": create_safe_layer("All", lambda x: tf.math.reduce_all(x, axis=-1)),
            "LogicalAnd": create_safe_layer("LogicalAnd", lambda x: tf.math.logical_and(x[0], x[1]) if isinstance(x, (list, tuple)) else x),
            "tf": tf
        }

        _model        = tf.keras.models.load_model(
            str(p / "lstm_autoencoder.h5"),
            custom_objects=custom_objects,
            compile=False
        )
        _seq_scaler   = joblib.load(p / "seq_scaler.pkl")
        vocab_data    = json.loads((p / "vocab.json").read_text())
        _vocab        = vocab_data["activities"]
        _activity_cols= vocab_data["activity_cols"]
        _thresholds   = json.loads((p / "lstm_thresholds.json").read_text())
        _hybrid_threshold = json.loads(
            (p / "hybrid_threshold.json").read_text()
        )["threshold"]
        _fusion_stats = json.loads((p / "fusion_stats.json").read_text())

        logger.info(
            f"LSTM loaded — vocab:{len(_vocab)} activities, "
            f"MAX_LEN:{MAX_LEN}, feature_dim:{len(_activity_cols) + len(NUMERIC_COLS)}"
        )

def encode_events(events_df: pd.DataFrame) -> pd.DataFrame:

       
    _load()
    onehot = pd.get_dummies(events_df["activity"].astype(str), prefix="act")
    onehot = onehot.reindex(columns=_activity_cols, fill_value=0)

    numeric_scaled = pd.DataFrame(
        _seq_scaler.transform(events_df[NUMERIC_COLS]),
        columns=NUMERIC_COLS,
        index=events_df.index
    )
    return pd.concat([onehot, numeric_scaled], axis=1)

def build_sequences(
    events_df: pd.DataFrame,
    encoded_df: pd.DataFrame,
    case_id_col: str = "case_id"
) -> tuple[np.ndarray, list, list]:

       
    sequences, case_ids, lengths = [], [], []
    for case_id, g in events_df.groupby(case_id_col):
        g   = g.sort_values("timestamp")
        arr = encoded_df.loc[g.index].to_numpy(dtype=np.float32)
        sequences.append(arr)
        case_ids.append(case_id)
        lengths.append(min(len(arr), MAX_LEN))

    padded = pad_sequences(
        sequences, maxlen=MAX_LEN, dtype="float32",
        padding="pre", truncating="pre", value=0.0
    )
    return padded, case_ids, lengths

INFERENCE_BATCH_SIZE = 256                                

def score_sequences(
    X_seq: np.ndarray,
    lengths: list,
    case_ids: list
) -> pd.DataFrame:

       
    _load()
    all_preds = []
    n = len(case_ids)

    for start in range(0, n, INFERENCE_BATCH_SIZE):
        end   = min(start + INFERENCE_BATCH_SIZE, n)
        chunk = X_seq[start:end]
        all_preds.append(_model.predict(chunk, verbose=0))

    preds = np.concatenate(all_preds, axis=0)
    rows  = []

    for i, case_id in enumerate(case_ids):
        L      = min(lengths[i], X_seq.shape[1])
        x_true = X_seq[i, -L:, :]
        x_pred = preds[i,  -L:, :]

        err_all    = np.mean((x_true - x_pred) ** 2, axis=1)
        err_struct = np.mean((x_true[:, :ACT_DIM] - x_pred[:, :ACT_DIM]) ** 2, axis=1)
        err_temp   = np.mean((x_true[:, ACT_DIM:] - x_pred[:, ACT_DIM:]) ** 2, axis=1)

        case_score   = float(min(np.mean(err_all),    SCORE_CAPS["case"]))
        struct_score = float(min(np.mean(err_struct),  SCORE_CAPS["structural"]))
        temp_score   = float(min(np.mean(err_temp),    SCORE_CAPS["temporal"]))

        rows.append({
            "case_id":               case_id,
            "lstm_case_score":       case_score,
            "lstm_structural_score": struct_score,
            "lstm_temporal_score":   temp_score,
            "max_event_error":       float(np.max(err_all)),
            "case_length":           int(L),
        })

    return pd.DataFrame(rows)

def assign_flags(case_scores: pd.DataFrame) -> pd.DataFrame:

       
    _load()
    cs = case_scores.copy()

    cs["lstm_anomaly_label"] = (
        cs["lstm_case_score"] >= _thresholds["case"]
    ).astype("int8")

    cs["maverick_buying_flag"] = (
        (cs["lstm_structural_score"] >= _thresholds["structural"] * 1.5) &
        (cs["case_length"] <= 2)
    ).astype("int8")

    cs["temporal_delay_flag"] = (
        cs["lstm_temporal_score"] >= _thresholds["temporal"]
    ).astype("int8")

    return cs

def compute_hybrid_score(
    case_scores: pd.DataFrame,
    if_scores_z: np.ndarray,
    missing_3way_steps: np.ndarray
) -> pd.DataFrame:

       
    _load()
    cs = case_scores.copy()

    lstm_mu  = _fusion_stats["lstm_case_mean"]
    lstm_std = _fusion_stats["lstm_case_std"] or 1.0
    temp_mu  = _fusion_stats["lstm_temp_mean"]
    temp_std = _fusion_stats["lstm_temp_std"] or 1.0

    lstm_z = (cs["lstm_case_score"]      - lstm_mu) / lstm_std
    temp_z = (cs["lstm_temporal_score"]  - temp_mu) / temp_std

    cs["hybrid_3way_score"] = (
        lstm_z
        + pd.Series(if_scores_z, index=cs.index).fillna(0)
        + pd.Series(missing_3way_steps, index=cs.index).fillna(0)
        + temp_z
    ) / 4.0

    cs["three_way_match_flag"] = (
        cs["hybrid_3way_score"] >= _hybrid_threshold
    ).astype("int8")

    return cs

def get_thresholds() -> dict:
    _load()
    return _thresholds

def get_fusion_stats() -> dict:
    _load()
    return _fusion_stats

class LSTMAutoencoderModel:
                                                           
    def __init__(self):
        _load()
    def load(self, model_dir: str = None):
        _load()
    @property
    def model(self):
        return _model
    def predict(self, X_seq):
        return {"case_scores": score_sequences(X_seq, [X_seq.shape[1]]*len(X_seq), ["dummy"]*len(X_seq))["lstm_case_score"].values}
