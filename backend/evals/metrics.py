import re

from deepeval.metrics import BaseMetric
from deepeval.test_case import LLMTestCase

from app.models import RiskScore
from app.policy import RISK_ORDER

SNAKE_CASE = re.compile(r"^[a-z][a-z0-9_]*$")


class RiskSeverityMetric(BaseMetric):
    """Grades the scorer's risk level against the labelled one, asymmetrically.

    The two failure directions are not equally bad. Under-scoring is a governance
    breach — a dangerous action slips past the policy engine and executes. Over-scoring
    is merely annoying — a safe action gets held for a human. So:

        exact match          -> 1.0   pass
        one level too severe -> 0.5   pass (safe, but flag it)
        two levels too severe-> 0.0   fail (low graded high = the product is unusable)
        any under-score      -> 0.0   fail (the dangerous direction)

    Threshold 0.5 lets safe over-scoring through and fails everything else.
    """

    def __init__(self, threshold: float = 0.5):
        self.threshold = threshold

    def measure(self, test_case: LLMTestCase) -> float:
        predicted = RiskScore(test_case.actual_output)
        expected = RiskScore(test_case.expected_output)
        delta = RISK_ORDER[predicted] - RISK_ORDER[expected]

        if delta == 0:
            self.score = 1.0
            self.reason = f"Correctly scored {expected.value}."
        elif delta < 0:
            self.score = 0.0
            self.reason = (
                f"UNDER-SCORED: graded {predicted.value} but this is {expected.value}. "
                f"The policy engine would have let it through."
            )
        elif delta == 1:
            self.score = 0.5
            self.reason = (
                f"Over-scored one level ({expected.value} -> {predicted.value}). "
                f"Safe, but it will create needless approval work."
            )
        else:
            self.score = 0.0
            self.reason = (
                f"OVER-SCORED two levels ({expected.value} -> {predicted.value}). "
                f"Blocking routine work this hard makes the product unusable."
            )

        self.success = self.score >= self.threshold
        return self.score

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success

    @property
    def __name__(self) -> str:
        return "Risk Severity"


class FeatureTagFormatMetric(BaseMetric):
    """The feature tag is what every ROI aggregation groups by, so a malformed or
    missing tag silently corrupts the cost analytics rather than erroring loudly."""

    def __init__(self, threshold: float = 1.0):
        self.threshold = threshold

    def measure(self, test_case: LLMTestCase) -> float:
        tag = (test_case.actual_output or "").strip()

        if not tag:
            self.score, self.reason = 0.0, "Empty feature tag."
        elif tag == "unknown":
            self.score, self.reason = 0.0, "Fell back to 'unknown' — no feature attributed."
        elif not SNAKE_CASE.match(tag):
            self.score, self.reason = 0.0, f"{tag!r} is not snake_case."
        else:
            self.score, self.reason = 1.0, f"Tagged {tag!r}."

        self.success = self.score >= self.threshold
        return self.score

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success

    @property
    def __name__(self) -> str:
        return "Feature Tag Format"
