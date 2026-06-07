

import numpy as np
import pytest

from scoring.merger import calibrate_thresholds

pytestmark = pytest.mark.unit

def test_calibrate_uses_batch_percentile_when_above_train():
    if_scores = np.arange(100, dtype=float)
    lstm_scores = np.arange(100, dtype=float)
    adaptive_if, adaptive_lstm = calibrate_thresholds(
        if_scores=if_scores, lstm_scores=lstm_scores,
        if_train_threshold=0.0, lstm_train_threshold=0.0,
        target_anomaly_rate=0.05,
    )
    expected = float(np.quantile(if_scores, 0.95))
    assert adaptive_if == pytest.approx(expected)
    assert adaptive_lstm == pytest.approx(expected)

def test_calibrate_respects_higher_training_threshold():
    if_scores = np.arange(100, dtype=float)
    adaptive_if, adaptive_lstm = calibrate_thresholds(
        if_scores=if_scores, lstm_scores=if_scores,
        if_train_threshold=1000.0, lstm_train_threshold=2000.0,
        target_anomaly_rate=0.05,
    )
    assert adaptive_if == 1000.0
    assert adaptive_lstm == 2000.0

@pytest.fixture(scope="module")
def case_matrix(csv_fixture):
    from features.case_features import build_case_features
    from ingestion.csv_ingester import CSVIngester
    df = CSVIngester().ingest(csv_fixture)
    return build_case_features(df)

def test_if_predict_returns_one_score_per_case(case_matrix):
    from models import isolation_forest
    scores = isolation_forest.predict(case_matrix)
    assert scores.shape == (len(case_matrix),)
    assert np.isfinite(scores).all()

def test_if_threshold_and_zscore(case_matrix):
    from models import isolation_forest
    assert isinstance(isolation_forest.get_threshold(), float)
    z = isolation_forest.zscore_if(isolation_forest.predict(case_matrix))
    assert z.shape == (len(case_matrix),)

@pytest.fixture(scope="module")
def lstm_sequences(csv_fixture):
    from features import sequence_features
    from ingestion.csv_ingester import CSVIngester
    from models import lstm_autoencoder
    df = CSVIngester().ingest(csv_fixture)
    df_events = sequence_features.prep_event_features(df)
    encoded = lstm_autoencoder.encode_events(df_events)
    X_seq, case_ids, lengths = lstm_autoencoder.build_sequences(df_events, encoded)
    return X_seq, case_ids, lengths

def test_build_sequences_padding_shape(lstm_sequences):
    from models.lstm_autoencoder import MAX_LEN, ACT_DIM, NUMERIC_COLS
    X_seq, case_ids, lengths = lstm_sequences
    feature_dim = ACT_DIM + len(NUMERIC_COLS)               
    assert X_seq.shape == (len(case_ids), MAX_LEN, feature_dim)
    assert len(lengths) == len(case_ids) == 45

def test_score_sequences_respects_caps(lstm_sequences):
    from models import lstm_autoencoder
    from models.lstm_autoencoder import SCORE_CAPS
    X_seq, case_ids, lengths = lstm_sequences
    scores = lstm_autoencoder.score_sequences(X_seq, lengths, case_ids)
    assert set(["lstm_case_score", "lstm_structural_score", "lstm_temporal_score"]).issubset(scores.columns)
    eps = 1e-6
    assert (scores["lstm_case_score"] <= SCORE_CAPS["case"] + eps).all()
    assert (scores["lstm_structural_score"] <= SCORE_CAPS["structural"] + eps).all()
    assert (scores["lstm_temporal_score"] <= SCORE_CAPS["temporal"] + eps).all()
