import json
from dataclasses import dataclass
from pathlib import Path

from app.config import settings
from app.models import ActionStatus, RiskScore

# Risk levels are ordered so a rule can say "medium or above breaches".
RISK_ORDER = {RiskScore.low: 0, RiskScore.medium: 1, RiskScore.high: 2}

ON_BREACH_STATUS = {
    "block": ActionStatus.blocked,
    "require_approval": ActionStatus.pending_approval,
}


@dataclass(frozen=True)
class Decision:
    status: ActionStatus
    rule: dict | None


def load_policies(path: str | Path | None = None) -> list[dict]:
    policies_path = Path(path) if path else settings.policies_path
    with policies_path.open(encoding="utf-8") as f:
        return json.load(f)


def evaluate(action_type: str, risk: RiskScore, policies: list[dict]) -> Decision:
    """Return the action's status. A rule breaches when risk >= its threshold."""
    for rule in policies:
        if rule["action_type"] != action_type:
            continue

        threshold = RiskScore(rule["risk_threshold"])
        if RISK_ORDER[risk] < RISK_ORDER[threshold]:
            continue

        on_breach = rule["on_breach"]
        if on_breach not in ON_BREACH_STATUS:
            raise ValueError(
                f"Unknown on_breach {on_breach!r} for action_type {action_type!r}"
            )
        return Decision(status=ON_BREACH_STATUS[on_breach], rule=rule)

    return Decision(status=ActionStatus.executed, rule=None)
