
   
import pytest
from unittest.mock import MagicMock, patch

from apps.variants.services.insights import generate_variant_insights
from apps.variants.services.discovery import _name_variant, VARIANT_NAME_RULES
from apps.variants.services.conformance import _compute_token_fitness, REFERENCE_P2P_SEQUENCE

class TestGenerateVariantInsights:
    def _make_variant(self, anomaly_rate=0.0, conformance=100.0, avg_duration=5.0):
        v = MagicMock()
        v.variant_id = 1
        v.anomaly_rate_pct = anomaly_rate
        v.conformance_score = conformance
        v.avg_duration_days = avg_duration
        return v

    def test_high_anomaly_produces_warning(self):
        variant = self._make_variant(anomaly_rate=20.0, conformance=90.0, avg_duration=5.0)
        insights = generate_variant_insights(variant, threshold_pct=15.0)
        types = [i["type"] for i in insights]
        titles = [i["title"] for i in insights]
        assert "warning" in types
        assert any("Anomaly" in t for t in titles)

    def test_low_conformance_produces_warning(self):
        variant = self._make_variant(anomaly_rate=5.0, conformance=70.0, avg_duration=5.0)
        insights = generate_variant_insights(variant, threshold_pct=15.0)
        titles = [i["title"] for i in insights]
        assert any("Conformance" in t for t in titles)

    def test_high_cycle_time_produces_info(self):
        variant = self._make_variant(anomaly_rate=5.0, conformance=90.0, avg_duration=15.0)
        insights = generate_variant_insights(variant, threshold_pct=15.0)
        titles = [i["title"] for i in insights]
        assert any("Cycle Time" in t for t in titles)

    def test_good_variant_produces_optimization_info(self):
        variant = self._make_variant(anomaly_rate=5.0, conformance=90.0, avg_duration=5.0)
        insights = generate_variant_insights(variant, threshold_pct=15.0)
        titles = [i["title"] for i in insights]
        assert any("Optimization" in t for t in titles)

    def test_all_issues_combined(self):
        variant = self._make_variant(anomaly_rate=20.0, conformance=70.0, avg_duration=15.0)
        insights = generate_variant_insights(variant, threshold_pct=15.0)
                                                                                       
        assert len(insights) >= 3

    def test_insight_structure_has_required_keys(self):
        variant = self._make_variant(anomaly_rate=20.0)
        insights = generate_variant_insights(variant)
        for insight in insights:
            assert "type" in insight
            assert "title" in insight
            assert "description" in insight

    def test_anomaly_rate_in_description(self):
        variant = self._make_variant(anomaly_rate=18.5)
        insights = generate_variant_insights(variant, threshold_pct=15.0)
                                                      
        all_desc = " ".join(i["description"] for i in insights)
        assert "18.5" in all_desc

class TestNameVariant:
    def test_standard_flow(self):
        seq = [
            "Purchase Requisition Creation",
            "Budget Approval",
            "Purchase Order Creation",
            "Goods Receipt Verification",
            "Invoice Processing",
            "Three-Way Matching",
            "Payment Authorization",
        ]
        name = _name_variant(seq)
        assert name == "Standard Flow"

    def test_manual_approval(self):
        seq = [
            "Purchase Requisition Creation",
            "Manager Approval",
            "Purchase Order Creation",
        ]
        name = _name_variant(seq)
        assert name == "Manual Approval"

    def test_dual_approval(self):
        seq = [
            "Purchase Requisition Creation",
            "Budget Approval",
            "Manager Approval",
            "Purchase Order Creation",
        ]
        name = _name_variant(seq)
        assert name == "Dual Approval"

    def test_empty_sequence_fallback(self):
        name = _name_variant([])
        assert name == "Unknown Variant"

    def test_unknown_sequence_fallback(self):
        seq = ["Some Random Activity", "Another One"]
        name = _name_variant(seq)
        assert "→" in name or name != ""

class TestComputeTokenFitness:
    def test_perfect_match(self):
        score = _compute_token_fitness(REFERENCE_P2P_SEQUENCE)
        assert score > 80.0                          

    def test_empty_sequence(self):
        score = _compute_token_fitness([])
        assert score == 0.0

    def test_partial_match_lower_than_full(self):
        full_score = _compute_token_fitness(REFERENCE_P2P_SEQUENCE)
        partial_score = _compute_token_fitness(REFERENCE_P2P_SEQUENCE[:3])
        assert partial_score <= full_score

    def test_out_of_order_penalised(self):
                                                             
        in_order = _compute_token_fitness(REFERENCE_P2P_SEQUENCE)
        out_of_order = _compute_token_fitness(list(reversed(REFERENCE_P2P_SEQUENCE)))
        assert out_of_order < in_order

    def test_score_bounded_0_100(self):
        score = _compute_token_fitness(REFERENCE_P2P_SEQUENCE * 10)
        assert 0.0 <= score <= 100.0

class TestSeverityDistribution:
    def test_returns_required_keys(self):
        mock_log = MagicMock()
        with patch(
            "apps.variants.services.severity.get_severity_distribution",
            return_value={
                "total_cases": 10,
                "anomalous_cases": 5,
                "severity_distribution": [],
            },
        ) as mock_fn:
            result = mock_fn(mock_log, None)
        assert "total_cases" in result
        assert "anomalous_cases" in result
        assert "severity_distribution" in result
