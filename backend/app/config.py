from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    """Application settings, loaded from environment or the project-root .env file."""

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg2://sentinel:sentinel@localhost:5432/sentinel"
    redis_url: str = "redis://localhost:6379/0"

    # Anthropic is kept configurable but is no longer the default scorer backend.
    anthropic_api_key: str = ""
    # Risk scoring runs on Google Gemini (free tier). Override with RISK_MODEL.
    gemini_api_key: str = ""
    risk_model: str = "gemini-2.0-flash"

    # PostHog product analytics. Empty key = analytics disabled (the app still runs;
    # emission is skipped with a warning).
    posthog_api_key: str = ""
    posthog_host: str = "https://us.i.posthog.com"

    actions_stream: str = "actions_stream"
    policies_path: Path = BACKEND_DIR / "policies.json"

    # Origins allowed to call the API from a browser (the Next.js dev server).
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()

# Gemini 2.0 Flash list price, USD per token. Also the fallback for models not
# in MODEL_PRICING, and the rate used for action-payload token estimates.
# NOTE: these are Google's published paid-tier list prices. On the free tier the
# actual spend is $0 — the dashboard shows the list-price equivalent so the ROI
# and auto-downgrade numbers stay meaningful.
INPUT_COST_PER_TOKEN = 0.10 / 1_000_000
OUTPUT_COST_PER_TOKEN = 0.40 / 1_000_000

# List prices, USD per token, (input, output) — so scoring cost is computed for
# whichever model the router actually picked. Claude rows kept for older actions
# that were scored before the switch to Gemini.
MODEL_PRICING: dict[str, tuple[float, float]] = {
    "gemini-2.0-flash": (0.10 / 1_000_000, 0.40 / 1_000_000),
    "gemini-2.0-flash-lite": (0.075 / 1_000_000, 0.30 / 1_000_000),
    "gemini-2.5-flash": (0.30 / 1_000_000, 2.50 / 1_000_000),
    "gemini-1.5-flash-8b": (0.0375 / 1_000_000, 0.15 / 1_000_000),
    "claude-haiku-4-5": (1.00 / 1_000_000, 5.00 / 1_000_000),
    "claude-sonnet-4-6": (3.00 / 1_000_000, 15.00 / 1_000_000),
    "claude-sonnet-5": (3.00 / 1_000_000, 15.00 / 1_000_000),
    "claude-opus-4-8": (5.00 / 1_000_000, 25.00 / 1_000_000),
}
