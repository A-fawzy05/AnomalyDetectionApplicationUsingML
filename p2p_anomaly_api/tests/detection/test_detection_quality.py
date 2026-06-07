

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _ground_truth as gt              

pytestmark = pytest.mark.detection

MIN_OVERALL_DETECTION = 0.60                                                
MAX_NORMAL_FP_RATE = 0.40                                      
MIN_TYPES_WITH_ANY_DETECTION = 5                                         

def _run_pipeline(csv_path):
                                                                               
    from api.v1.endpoints.analyze import build_phase_summary
    from features import sequence_features
    from features.case_features import build_case_features
    from ingestion.csv_ingester import CSVIngester
    from models import isolation_forest, lstm_autoencoder
    from scoring.labeler import apply_labels
    from scoring.merger import calibrate_thresholds, merge_scores

    df = CSVIngester().ingest(csv_path)

    X_case = build_case_features(df)
    df_events = sequence_features.prep_event_features(df)
    encoded = lstm_autoencoder.encode_events(df_events)
    X_seq, case_ids, lengths = lstm_autoencoder.build_sequences(df_events, encoded)

    if_scores, _ = isolation_forest.predict_with_labels(X_case)
    lstm_scores = lstm_autoencoder.score_sequences(X_seq, lengths, case_ids)
    lstm_scores = lstm_autoencoder.assign_flags(lstm_scores)

    phase_summary = build_phase_summary(df)
    merged = merge_scores(X_case, if_scores, lstm_scores, phase_summary)

    adaptive_if, adaptive_lstm = calibrate_thresholds(
        if_scores=if_scores,
        lstm_scores=lstm_scores["lstm_case_score"].values,
        if_train_threshold=isolation_forest.get_threshold(),
        lstm_train_threshold=lstm_autoencoder.get_thresholds()["case"],
        target_anomaly_rate=0.05,
    )
    labeled = apply_labels(merged, df, if_threshold=adaptive_if, lstm_threshold=adaptive_lstm)
    return labeled

@pytest.fixture(scope="module")
def evaluation(csv_fixture):
    labeled = _run_pipeline(csv_fixture)
    metrics = gt.score_predictions(labeled)
    sev_counts = labeled["severity_label"].value_counts().to_dict()
    artifacts = gt.write_artifacts(metrics, gt_out_dir(), severity_counts=sev_counts)
                                                       
    print("\n" + gt.render_markdown(metrics, sev_counts))
    print(f"\n[detection] metrics written to: {artifacts['markdown']}")
    return metrics, sev_counts, artifacts

def gt_out_dir():
    return os.path.dirname(os.path.abspath(__file__))

def test_dataset_has_expected_support(evaluation):
    metrics, _, _ = evaluation
    assert metrics["n_cases_evaluated"] == 45
    assert metrics["n_anomalous_truth"] == 35
    assert metrics["n_normal_truth"] == 10
    for t, m in metrics["per_type"].items():
        assert m["support"] == 5, f"{t} should have 5 injected cases"

def test_metrics_artifact_written(evaluation):
    _, _, artifacts = evaluation
    assert os.path.exists(artifacts["markdown"])
    assert os.path.exists(artifacts["json"])

def test_overall_detection_rate_meets_floor(evaluation):
    metrics, _, _ = evaluation
    assert metrics["overall_detection_rate"] >= MIN_OVERALL_DETECTION, (
        f"overall detection {metrics['overall_detection_rate']:.1%} "
        f"< floor {MIN_OVERALL_DETECTION:.0%} — see _last_run_metrics.md"
    )

def test_normal_false_positive_rate_within_ceiling(evaluation):
    metrics, _, _ = evaluation
    assert metrics["normal_false_positive_rate"] <= MAX_NORMAL_FP_RATE, (
        f"normal FP rate {metrics['normal_false_positive_rate']:.1%} "
        f"> ceiling {MAX_NORMAL_FP_RATE:.0%} — see _last_run_metrics.md"
    )

def test_most_anomaly_types_detected(evaluation):
    metrics, _, _ = evaluation
    detected = [t for t, m in metrics["per_type"].items() if m["recall"] > 0]
    assert len(detected) >= MIN_TYPES_WITH_ANY_DETECTION, (
        f"only {len(detected)}/7 types detected: {detected}"
    )
