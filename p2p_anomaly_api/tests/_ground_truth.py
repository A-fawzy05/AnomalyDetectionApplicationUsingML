"""
Ground-truth labels for the synthetic evaluation dataset and helpers that turn a
scored/labeled pipeline output into the metrics the evaluation report is built from.

The dataset is produced by ``generate_test_data.py`` and committed as
``p2p-anomaly-test.csv`` / ``ocel2-p2p-anomaly-test.json``. Each case is a purchase
order ``purchase_order:test_N`` and the generator lays the groups out deterministically:

    test_1  .. test_10  -> Normal (no anomaly)
    test_11 .. test_15  -> Price Mismatch
    test_16 .. test_20  -> Three-Way Match Failure
    test_21 .. test_25  -> Maverick Buying
    test_26 .. test_30  -> Temporal Delay
    test_31 .. test_35  -> Duplicate Invoice
    test_36 .. test_40  -> Unauthorized Vendor
    test_41 .. test_45  -> Quantity Variance

These are *injected* anomaly intentions. The detector is rule + ML based, so a case may
legitimately trip more than one flag; the metrics below therefore measure two things:

  * **per-type recall (detection rate)** — of the N cases injected with type T, how many had
    the matching flag raised. This is the most meaningful "did we catch it" number.
  * **primary-type accuracy / confusion** — using the single ``anomaly_type`` the pipeline
    assigns (its priority winner), how often it equals the injected type.

Nothing here asserts; it only computes numbers. The tests decide pass/fail thresholds.
"""

from __future__ import annotations

import json
from collections import OrderedDict

import numpy as np
import pandas as pd

NORMAL = "Normal"

# Canonical anomaly-type label strings, exactly as emitted by scoring/labeler.py.
ANOMALY_TYPES = [
    "Price Mismatch",
    "Three-Way Match Failure",
    "Maverick Buying",
    "Temporal Delay",
    "Duplicate Invoice",
    "Unauthorized Vendor",
    "Quantity Variance",
]

# Map each anomaly-type label to the boolean flag column that represents it.
TYPE_TO_FLAG = {
    "Price Mismatch": "price_mismatch",
    "Three-Way Match Failure": "three_way_match_failure",
    "Maverick Buying": "maverick_buying",
    "Temporal Delay": "temporal_delay",
    "Duplicate Invoice": "duplicate_invoice",
    "Unauthorized Vendor": "unauthorized_vendor",
    "Quantity Variance": "quantity_variance",
}

# Injected ground truth: group label -> inclusive (start, end) of the test_N index.
_GROUPS = [
    (NORMAL, 1, 10),
    ("Price Mismatch", 11, 15),
    ("Three-Way Match Failure", 16, 20),
    ("Maverick Buying", 21, 25),
    ("Temporal Delay", 26, 30),
    ("Duplicate Invoice", 31, 35),
    ("Unauthorized Vendor", 36, 40),
    ("Quantity Variance", 41, 45),
]


def build_ground_truth() -> "OrderedDict[str, str]":
    """Return ``{case_id: injected_type}`` for all 45 synthetic cases."""
    gt: "OrderedDict[str, str]" = OrderedDict()
    for label, start, end in _GROUPS:
        for n in range(start, end + 1):
            gt[f"purchase_order:test_{n}"] = label
    return gt


GROUND_TRUTH = build_ground_truth()


def _safe_div(num: float, den: float) -> float:
    return float(num) / float(den) if den else 0.0


def score_predictions(labeled: pd.DataFrame) -> dict:
    """
    Compute evaluation metrics from a labeled pipeline DataFrame.

    ``labeled`` must contain ``case_id``, ``anomaly_type`` (str or None), and the seven
    boolean/int flag columns named in :data:`TYPE_TO_FLAG`. Cases not present in the
    ground truth are ignored so the helper also works on partial batches.

    Returns a dict with: per_type (recall/precision/f1/support via the matching flag),
    primary (accuracy of the winning anomaly_type), confusion (ground-truth x predicted),
    normal_false_positive_rate, overall detection rate, and counts.
    """
    df = labeled.copy()
    df["case_id"] = df["case_id"].astype(str)
    df = df[df["case_id"].isin(GROUND_TRUTH)].copy()
    df["_truth"] = df["case_id"].map(GROUND_TRUTH)

    # Normalise the primary predicted type into a plain string or NORMAL.
    def _primary(v):
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return NORMAL
        if isinstance(v, (list, tuple)):
            return v[0] if v else NORMAL
        s = str(v).strip()
        return s if s and s.lower() != "nan" else NORMAL

    df["_pred_primary"] = df["anomaly_type"].apply(_primary)

    def _flag(col):
        if col in df.columns:
            return df[col].fillna(0).astype(float) > 0
        return pd.Series(False, index=df.index)

    df["_pred_anomalous"] = df["_pred_primary"] != NORMAL

    # ---- Per-type recall / precision / F1 using the matching flag column ----
    per_type = OrderedDict()
    for t in ANOMALY_TYPES:
        flag = _flag(TYPE_TO_FLAG[t])
        is_truth = df["_truth"] == t
        tp = int((flag & is_truth).sum())
        fp = int((flag & ~is_truth).sum())
        fn = int((~flag & is_truth).sum())
        support = int(is_truth.sum())
        recall = _safe_div(tp, tp + fn)
        precision = _safe_div(tp, tp + fp)
        f1 = _safe_div(2 * precision * recall, precision + recall)
        per_type[t] = {
            "support": support,
            "flagged": int(flag.sum()),
            "true_positive": tp,
            "false_positive": fp,
            "false_negative": fn,
            "recall": round(recall, 4),
            "precision": round(precision, 4),
            "f1": round(f1, 4),
        }

    # ---- Confusion matrix: injected type (rows) x predicted primary (cols) ----
    col_labels = ANOMALY_TYPES + [NORMAL]
    row_labels = [NORMAL] + ANOMALY_TYPES
    confusion = OrderedDict()
    for r in row_labels:
        row = OrderedDict((c, 0) for c in col_labels)
        sub = df[df["_truth"] == r]
        for pred in sub["_pred_primary"]:
            key = pred if pred in row else NORMAL
            row[key] += 1
        confusion[r] = row

    # ---- Headline numbers ----
    anomalous_truth = df[df["_truth"] != NORMAL]
    normal_truth = df[df["_truth"] == NORMAL]
    overall_detection = _safe_div(
        int(anomalous_truth["_pred_anomalous"].sum()), len(anomalous_truth)
    )
    # primary-type exact accuracy over injected anomalies
    primary_correct = int((anomalous_truth["_pred_primary"] == anomalous_truth["_truth"]).sum())
    primary_accuracy = _safe_div(primary_correct, len(anomalous_truth))
    normal_fp_rate = _safe_div(int(normal_truth["_pred_anomalous"].sum()), len(normal_truth))

    return {
        "n_cases_evaluated": int(len(df)),
        "n_anomalous_truth": int(len(anomalous_truth)),
        "n_normal_truth": int(len(normal_truth)),
        "overall_detection_rate": round(overall_detection, 4),
        "primary_type_accuracy": round(primary_accuracy, 4),
        "normal_false_positive_rate": round(normal_fp_rate, 4),
        "per_type": per_type,
        "confusion": confusion,
    }


def render_markdown(metrics: dict, severity_counts: dict | None = None) -> str:
    """Render the metrics dict as a Markdown report fragment for the evaluation write-up."""
    lines: list[str] = []
    lines.append("# P2P Anomaly Detection — Evaluation Metrics")
    lines.append("")
    lines.append(f"_Generated from the latest detection-quality test run._")
    lines.append("")
    lines.append("## Headline")
    lines.append("")
    lines.append("| Metric | Value |")
    lines.append("|---|---|")
    lines.append(f"| Cases evaluated | {metrics['n_cases_evaluated']} |")
    lines.append(f"| Injected anomalies | {metrics['n_anomalous_truth']} |")
    lines.append(f"| Normal cases | {metrics['n_normal_truth']} |")
    lines.append(f"| **Overall detection rate (recall)** | **{metrics['overall_detection_rate']:.1%}** |")
    lines.append(f"| Primary-type exact accuracy | {metrics['primary_type_accuracy']:.1%} |")
    lines.append(f"| Normal false-positive rate | {metrics['normal_false_positive_rate']:.1%} |")
    lines.append("")

    lines.append("## Per-anomaly-type detection (via matching flag)")
    lines.append("")
    lines.append("| Anomaly type | Support | Recall | Precision | F1 | TP | FP | FN |")
    lines.append("|---|---|---|---|---|---|---|---|")
    for t, m in metrics["per_type"].items():
        lines.append(
            f"| {t} | {m['support']} | {m['recall']:.0%} | {m['precision']:.0%} | "
            f"{m['f1']:.2f} | {m['true_positive']} | {m['false_positive']} | {m['false_negative']} |"
        )
    lines.append("")

    lines.append("## Confusion matrix (rows = injected, cols = predicted primary type)")
    lines.append("")
    cols = ANOMALY_TYPES + [NORMAL]
    short = {
        "Price Mismatch": "Price",
        "Three-Way Match Failure": "3Way",
        "Maverick Buying": "Mav",
        "Temporal Delay": "Temp",
        "Duplicate Invoice": "Dup",
        "Unauthorized Vendor": "Vend",
        "Quantity Variance": "Qty",
        NORMAL: "Normal",
    }
    header = "| injected \\ pred | " + " | ".join(short[c] for c in cols) + " |"
    lines.append(header)
    lines.append("|" + "---|" * (len(cols) + 1))
    for r, row in metrics["confusion"].items():
        lines.append(f"| {short[r]} | " + " | ".join(str(row[c]) for c in cols) + " |")
    lines.append("")

    if severity_counts:
        lines.append("## Severity distribution (all cases)")
        lines.append("")
        lines.append("| Severity | Count |")
        lines.append("|---|---|")
        for level in ("Critical", "High", "Medium", "Low"):
            lines.append(f"| {level} | {severity_counts.get(level, 0)} |")
        lines.append("")

    return "\n".join(lines)


def write_artifacts(metrics: dict, out_dir, severity_counts: dict | None = None) -> dict:
    """Persist ``_last_run_metrics.md`` and ``.json`` next to the detection test."""
    import os

    os.makedirs(out_dir, exist_ok=True)
    md_path = os.path.join(out_dir, "_last_run_metrics.md")
    json_path = os.path.join(out_dir, "_last_run_metrics.json")
    payload = dict(metrics)
    if severity_counts:
        payload["severity_counts"] = severity_counts
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(render_markdown(metrics, severity_counts))
    return {"markdown": md_path, "json": json_path}
