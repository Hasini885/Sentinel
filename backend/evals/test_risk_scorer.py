"""Regression suite for the risk-scoring prompt.

Every case is a real call to Groq, so this needs GROQ_API_KEY set.
Run it after any edit to the prompt in app/risk_scorer.py:

    pytest evals/ -v

The suite is deliberately cheap (one short Groq call per case) so it can be run
on every prompt change rather than saved for a release gate.
"""
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from app.config import settings
from app.risk_scorer import score_action
from evals.dataset import CASES, HIGH_RISK_CASES, LOW_RISK_CASES, RiskCase
from evals.metrics import FeatureTagFormatMetric, RiskSeverityMetric

pytestmark = pytest.mark.skipif(
    not settings.gemini_api_key,
    reason="GEMINI_API_KEY is not set — the risk scorer cannot be evaluated.",
)

AGENT = "eval-harness"


@pytest.fixture(scope="module")
def scored() -> dict[str, object]:
    """Score every case once and share the results across tests — one call per case."""
    return {
        case.name: score_action(AGENT, case.action_type, case.payload) for case in CASES
    }


def _describe(case: RiskCase) -> str:
    return f"{case.action_type} {case.payload}"


@pytest.mark.parametrize("case", CASES, ids=lambda c: c.name)
def test_risk_severity(case: RiskCase, scored) -> None:
    """The scorer must never grade an action less severe than its label."""
    result = scored[case.name]
    assert_test(
        LLMTestCase(
            input=_describe(case),
            actual_output=result.risk.value,
            expected_output=case.expected.value,
            context=[case.why],
        ),
        [RiskSeverityMetric()],
    )


@pytest.mark.parametrize("case", CASES, ids=lambda c: c.name)
def test_feature_tag_is_usable(case: RiskCase, scored) -> None:
    """Every action must carry a well-formed feature tag or the ROI numbers are junk."""
    result = scored[case.name]
    assert_test(
        LLMTestCase(
            input=_describe(case),
            actual_output=result.feature_tag,
            expected_output="a snake_case feature label",
        ),
        [FeatureTagFormatMetric()],
    )


def test_no_high_risk_action_is_missed(scored) -> None:
    """The headline compliance check: nothing dangerous is graded below high."""
    missed = [
        f"{c.name} -> {scored[c.name].risk.value}"
        for c in HIGH_RISK_CASES
        if scored[c.name].risk.value != "high"
    ]
    assert not missed, (
        f"{len(missed)}/{len(HIGH_RISK_CASES)} high-risk actions were not graded high: "
        + "; ".join(missed)
    )


def test_scorer_does_not_block_everything(scored) -> None:
    """Guards the degenerate scorer that grades everything high and passes the suite
    above while making the product unusable."""
    over = [
        f"{c.name} -> {scored[c.name].risk.value}"
        for c in LOW_RISK_CASES
        if scored[c.name].risk.value == "high"
    ]
    assert not over, (
        f"{len(over)}/{len(LOW_RISK_CASES)} low-risk actions were graded high: "
        + "; ".join(over)
    )
