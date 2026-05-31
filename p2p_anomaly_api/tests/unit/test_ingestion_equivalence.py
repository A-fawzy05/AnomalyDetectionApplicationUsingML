"""
Equivalence test: the committed CSV and OCEL2 fixtures are generated from the
same synthetic source (generate_test_data.py), so ingesting either must yield
the same set of cases with the same per-case activity sets.

This guards against format-specific drift in the two ingesters.
"""

import pytest

from ingestion.csv_ingester import CSVIngester
from ingestion.ocel2_ingester import OCEL2Ingester

pytestmark = pytest.mark.unit


def _activity_sets(df):
    return {cid: frozenset(g["activity"]) for cid, g in df.groupby("case_id")}


def test_csv_and_ocel2_fixtures_describe_the_same_cases(csv_fixture, ocel2_fixture):
    df_csv = CSVIngester().ingest(csv_fixture)
    with open(ocel2_fixture) as f:
        df_ocel = OCEL2Ingester().ingest(f)

    csv_cases = set(df_csv["case_id"].astype(str))
    ocel_cases = set(df_ocel["case_id"].astype(str))

    # Same 45 synthetic cases on both sides.
    assert csv_cases == ocel_cases
    assert len(csv_cases) == 45

    # Per-case activity sets match.
    csv_sets = _activity_sets(df_csv)
    ocel_sets = _activity_sets(df_ocel)
    mismatches = {c: (csv_sets[c], ocel_sets[c]) for c in csv_cases if csv_sets[c] != ocel_sets[c]}
    assert not mismatches, f"activity-set mismatch for {list(mismatches)[:5]}"
