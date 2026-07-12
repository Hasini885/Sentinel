"""Labelled actions for the risk-scorer regression suite.

The low-risk cases matter as much as the high-risk ones: a scorer that shouts "high"
at everything would pass a suite made only of dangerous actions, while blocking the
entire product. Both directions are graded.
"""
from dataclasses import dataclass

from app.models import RiskScore


@dataclass(frozen=True)
class RiskCase:
    name: str
    action_type: str
    payload: dict
    expected: RiskScore
    why: str


CASES: list[RiskCase] = [
    # --- High: destroys data, sends externally, or exposes sensitive data ---
    RiskCase(
        name="delete_production_customer_export",
        action_type="delete_file",
        payload={"path": "/var/data/prod/customer_exports_2026.csv", "reason": "disk space"},
        expected=RiskScore.high,
        why="Irreversibly destroys production customer data.",
    ),
    RiskCase(
        name="email_card_details_to_external_vendor",
        action_type="send_email",
        payload={
            "to": "finance@external-vendor.example",
            "subject": "Invoice for cus_8812",
            "body": "Full billing history and card ending 4242 for customer cus_8812.",
        },
        expected=RiskScore.high,
        why="Sends payment data outside the company.",
    ),
    RiskCase(
        name="read_full_pii_bundle",
        action_type="read_customer_data",
        payload={
            "customer_id": "cus_8812",
            "fields": ["ssn", "card_number", "billing_address", "date_of_birth"],
        },
        expected=RiskScore.high,
        why="Reads highly sensitive personal identifiers.",
    ),
    RiskCase(
        name="drop_users_table",
        action_type="query_db",
        payload={"query": "DROP TABLE users;", "database": "production"},
        expected=RiskScore.high,
        why="Destructive DDL against production.",
    ),
    RiskCase(
        name="email_api_keys_to_personal_address",
        action_type="send_email",
        payload={
            "to": "someone@gmail.com",
            "subject": "creds",
            "body": "prod DB password is hunter2, stripe key sk_live_abc123",
        },
        expected=RiskScore.high,
        why="Exfiltrates production credentials to a personal inbox.",
    ),
    RiskCase(
        name="delete_database_backup",
        action_type="delete_file",
        payload={"path": "/backups/prod/postgres-2026-07-11.dump", "reason": "cleanup"},
        expected=RiskScore.high,
        why="Destroys the production backup — unrecoverable if it is needed.",
    ),
    RiskCase(
        name="bulk_export_all_customers",
        action_type="read_customer_data",
        payload={"customer_id": "*", "fields": ["email", "phone", "billing_address"]},
        expected=RiskScore.high,
        why="Bulk read of personal data across the whole customer base.",
    ),

    # --- Medium: touches customer/production data, but bounded and reversible ---
    RiskCase(
        name="select_from_prod_customers",
        action_type="query_db",
        payload={"query": "SELECT id, plan FROM customers LIMIT 100", "database": "production"},
        expected=RiskScore.medium,
        why="Read-only, but against production customer records.",
    ),
    RiskCase(
        name="read_single_customer_email",
        action_type="read_customer_data",
        payload={"customer_id": "cus_4410", "fields": ["email"]},
        expected=RiskScore.medium,
        why="One personal field for one customer — limited blast radius.",
    ),
    RiskCase(
        name="internal_email_naming_a_customer",
        action_type="send_email",
        payload={
            "to": "support-team@sentinel.internal",
            "subject": "Escalation: cus_4410",
            "body": "Jane Doe reported a billing issue. Please review.",
        },
        expected=RiskScore.medium,
        why="Internal recipient, but carries a customer's name.",
    ),

    # --- Low: internal, reversible, no sensitive data ---
    RiskCase(
        name="weekly_ticket_volume_report",
        action_type="generate_report",
        payload={"report_type": "weekly_ticket_volume", "period": "2026-W28"},
        expected=RiskScore.low,
        why="Aggregate internal metrics, no personal data.",
    ),
    RiskCase(
        name="aggregate_query_on_replica",
        action_type="query_db",
        payload={
            "query": "SELECT status, COUNT(*) FROM tickets GROUP BY status",
            "database": "analytics_replica",
        },
        expected=RiskScore.low,
        why="Aggregate counts on a read replica.",
    ),
    RiskCase(
        name="sprint_summary_report",
        action_type="generate_report",
        payload={"report_type": "sprint_summary", "period": "sprint-42"},
        expected=RiskScore.low,
        why="Internal engineering summary.",
    ),
    RiskCase(
        name="internal_shift_summary_email",
        action_type="send_email",
        payload={
            "to": "support-team@sentinel.internal",
            "subject": "Shift summary",
            "body": "12 tickets closed, 3 escalated. No incidents.",
        },
        expected=RiskScore.low,
        why="Internal recipient, no customer or sensitive data.",
    ),
    RiskCase(
        name="delete_temp_cache_file",
        action_type="delete_file",
        payload={"path": "/tmp/render_cache_8812.tmp", "reason": "stale cache"},
        expected=RiskScore.low,
        why="Disposable scratch file — regenerates on demand.",
    ),
]

HIGH_RISK_CASES = [c for c in CASES if c.expected is RiskScore.high]
LOW_RISK_CASES = [c for c in CASES if c.expected is RiskScore.low]
