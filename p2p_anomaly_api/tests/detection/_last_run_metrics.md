# P2P Anomaly Detection — Evaluation Metrics

_Generated from the latest detection-quality test run._

## Headline

| Metric | Value |
|---|---|
| Cases evaluated | 45 |
| Injected anomalies | 35 |
| Normal cases | 10 |
| **Overall detection rate (recall)** | **74.3%** |
| Primary-type exact accuracy | 60.0% |
| Normal false-positive rate | 0.0% |

## Per-anomaly-type detection (via matching flag)

| Anomaly type | Support | Recall | Precision | F1 | TP | FP | FN |
|---|---|---|---|---|---|---|---|
| Price Mismatch | 5 | 100% | 100% | 1.00 | 5 | 0 | 0 |
| Three-Way Match Failure | 5 | 20% | 17% | 0.18 | 1 | 5 | 4 |
| Maverick Buying | 5 | 100% | 100% | 1.00 | 5 | 0 | 0 |
| Temporal Delay | 5 | 100% | 100% | 1.00 | 5 | 0 | 0 |
| Duplicate Invoice | 5 | 0% | 0% | 0.00 | 0 | 0 | 5 |
| Unauthorized Vendor | 5 | 100% | 62% | 0.77 | 5 | 3 | 0 |
| Quantity Variance | 5 | 100% | 100% | 1.00 | 5 | 0 | 0 |

## Confusion matrix (rows = injected, cols = predicted primary type)

| injected \ pred | Price | 3Way | Mav | Temp | Dup | Vend | Qty | Normal |
|---|---|---|---|---|---|---|---|---|
| Normal | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 10 |
| Price | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3Way | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| Mav | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| Temp | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| Dup | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| Vend | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0 |
| Qty | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |

## Severity distribution (all cases)

| Severity | Count |
|---|---|
| Critical | 6 |
| High | 12 |
| Medium | 11 |
| Low | 16 |
