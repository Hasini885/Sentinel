import enum

# The cheapest model we would route a low-value feature to.
DOWNGRADE_TARGET_MODEL = "claude-haiku-4-5"

# A feature's cost is "high" if it sits in the top quartile of per-feature spend.
COST_PERCENTILE_THRESHOLD = 0.75

# Below this share of judged actions being valuable, a feature isn't earning its spend.
LOW_VALUE_RATE = 0.5

# Don't call a feature low-value off one or two data points.
MIN_JUDGED_ACTIONS = 3


class Outcome(str, enum.Enum):
    """Human judgement of whether an action's result was actually worth something."""

    valuable = "valuable"
    not_valuable = "not_valuable"
    unclear = "unclear"


# Dollar value we credit one valuable action, per feature. Deliberately a flat lookup
# for now — real value attribution comes later.
DEFAULT_OUTCOME_VALUE_USD = 1.0
FEATURE_OUTCOME_VALUE_USD: dict[str, float] = {
    "support_autoreply": 2.50,
    "billing_reconciliation": 5.00,
    "weekly_reporting": 0.50,
    "customer_lookup": 1.00,
}


def outcome_value_for(feature_tag: str) -> float:
    return FEATURE_OUTCOME_VALUE_USD.get(feature_tag, DEFAULT_OUTCOME_VALUE_USD)


def roi_score(feature_tag: str, valuable_count: int, total_cost_usd: float) -> float | None:
    """roi_score = outcome_value / cost. None when the feature has cost us nothing yet."""
    if total_cost_usd <= 0:
        return None
    total_value = valuable_count * outcome_value_for(feature_tag)
    return total_value / total_cost_usd


def cost_percentile(feature_cost: float, all_costs: list[float]) -> float:
    """Share of features this one costs at least as much as. 1.0 = most expensive."""
    if not all_costs:
        return 0.0
    at_or_below = sum(1 for c in all_costs if c <= feature_cost)
    return at_or_below / len(all_costs)


def value_rate(valuable_count: int, judged_count: int) -> float | None:
    """Share of judged actions that were valuable. None when nothing has been judged."""
    if judged_count <= 0:
        return None
    return valuable_count / judged_count


def downgrade_suggestion(
    feature_tag: str,
    feature_cost: float,
    all_costs: list[float],
    valuable_count: int,
    judged_count: int,
) -> dict:
    """Flag features that burn tokens in the top quartile without delivering value."""
    pct = cost_percentile(feature_cost, all_costs)
    rate = value_rate(valuable_count, judged_count)

    expensive = pct >= COST_PERCENTILE_THRESHOLD
    enough_evidence = judged_count >= MIN_JUDGED_ACTIONS
    low_value = rate is not None and rate < LOW_VALUE_RATE

    suggest = expensive and enough_evidence and low_value

    if suggest:
        reason = (
            f"{feature_tag} is in the top {int((1 - COST_PERCENTILE_THRESHOLD) * 100)}% "
            f"of features by cost (${feature_cost:.4f}) but only "
            f"{rate:.0%} of its {judged_count} judged actions were valuable."
        )
    elif not expensive:
        reason = f"{feature_tag} is not among the most expensive features (cost percentile {pct:.0%})."
    elif not enough_evidence:
        reason = (
            f"{feature_tag} is expensive, but only {judged_count} of its actions have been "
            f"judged — need at least {MIN_JUDGED_ACTIONS} before calling it low-value."
        )
    else:
        reason = (
            f"{feature_tag} is expensive but {rate:.0%} of its judged actions were valuable, "
            f"which justifies the spend."
        )

    return {
        "feature_tag": feature_tag,
        "suggest_downgrade": suggest,
        "suggested_model": DOWNGRADE_TARGET_MODEL if suggest else None,
        "reason": reason,
        "total_cost_usd": round(feature_cost, 8),
        "cost_percentile": round(pct, 4),
        "value_rate": round(rate, 4) if rate is not None else None,
        "judged_actions": judged_count,
        "valuable_actions": valuable_count,
        "roi_score": roi_score(feature_tag, valuable_count, feature_cost),
    }
