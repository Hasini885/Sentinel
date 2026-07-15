"""Simulates a customer-support bot, with every tool call governed by Sentinel.

Run from the backend/ directory:  python simulate_support_bot.py

Each function below is a tool the support bot can call. The bodies are stand-ins
for real integrations (Zendesk, Stripe, your CRM, your auth provider) — Sentinel
governs *whether the call is allowed*, not what's inside it. Swap the bodies for
your real API calls and this becomes a live governance layer for your bot.
"""
import logging

from app.interceptor import ActionBlocked, intercept_action

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

AGENT = "support-copilot"


@intercept_action(agent_name=AGENT, action_type="search_knowledge_base")
def search_knowledge_base(*, query: str, scope: str) -> str:
    # -> your docs/vector search
    return f"Found 3 articles for '{query}' in {scope}"


@intercept_action(agent_name=AGENT, action_type="reply_to_ticket")
def reply_to_ticket(*, ticket_id: str, message: str) -> str:
    # -> Zendesk / Intercom / Front API
    return f"Replied to {ticket_id} ({len(message)} chars)"


@intercept_action(agent_name=AGENT, action_type="access_customer_profile")
def access_customer_profile(*, customer_id: str, fields: list[str]) -> str:
    # -> your CRM / customer DB
    return f"Read {len(fields)} fields for {customer_id}"


@intercept_action(agent_name=AGENT, action_type="issue_refund")
def issue_refund(*, customer_id: str, amount_usd: float, reason: str) -> str:
    # -> Stripe / payment provider
    return f"Refunded ${amount_usd:.2f} to {customer_id}"


@intercept_action(agent_name=AGENT, action_type="send_password_reset_link")
def send_password_reset_link(*, email: str, channel: str) -> str:
    # -> your auth provider (Auth0, Cognito, custom)
    return f"Password reset link sent to {email} via {channel}"


@intercept_action(agent_name=AGENT, action_type="cancel_subscription")
def cancel_subscription(*, customer_id: str, plan: str, immediate: bool) -> str:
    # -> billing system
    return f"Cancelled {plan} for {customer_id} (immediate={immediate})"


def attempt(label: str, fn, **payload) -> None:
    print(f"\n--- {label} ---")
    try:
        result = fn(**payload)
        print(f"EXECUTED: {result}")
    except ActionBlocked as blocked:
        action = blocked.action
        print(f"{action.status.value.upper()}: {action.risk_reason}")
        print(f"   risk={action.risk_score.value}  feature={action.feature_tag}")


def main() -> None:
    # Low: read-only lookup in the public help center.
    attempt(
        "1. Look up a help article",
        search_knowledge_base,
        query="how do I reset two-factor authentication",
        scope="public_help_center",
    )

    # Low: a routine, non-sensitive reply to a customer ticket.
    attempt(
        "2. Reply to a how-to ticket",
        reply_to_ticket,
        ticket_id="TICK-4471",
        message="You can reset 2FA under Settings > Security > Reset authenticator. "
        "Let me know if you get stuck!",
    )

    # Medium/high: pulls a customer's personal + billing data.
    attempt(
        "3. Open a customer's profile",
        access_customer_profile,
        customer_id="cus_8812",
        fields=["email", "phone", "billing_address", "card_last4", "plan"],
    )

    # High: moves money. Policy holds refunds for a human.
    attempt(
        "4. Issue a refund",
        issue_refund,
        customer_id="cus_8812",
        amount_usd=89.00,
        reason="duplicate charge on annual renewal",
    )

    # Medium/high: account-security action — a reset link is an account-takeover vector.
    attempt(
        "5. Send a password reset link",
        send_password_reset_link,
        email="jordan@customer.example",
        channel="email",
    )

    # High: irreversible revenue loss. Policy blocks the bot from doing this alone.
    attempt(
        "6. Cancel a subscription immediately",
        cancel_subscription,
        customer_id="cus_8812",
        plan="annual_pro",
        immediate=True,
    )


if __name__ == "__main__":
    main()
