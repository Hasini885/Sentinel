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

    # Anthropic and Gemini are kept configurable but are not the default backend.
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    # Risk scoring runs on Groq (free tier), via its OpenAI-compatible endpoint.
    # Override the model with RISK_MODEL.
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    risk_model: str = "llama-3.3-70b-versatile"

    # PostHog product analytics. Empty key = analytics disabled (the app still runs;
    # emission is skipped with a warning).
    posthog_api_key: str = ""
    posthog_host: str = "https://us.i.posthog.com"

    actions_stream: str = "actions_stream"
    policies_path: Path = BACKEND_DIR / "policies.json"

    # Origins allowed to call the API from a browser (the Next.js dev server).
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()

# Llama 3.3 70B (Groq) list price, USD per token. Also the fallback for models
# not in MODEL_PRICING, and the rate used for action-payload token estimates.
# NOTE: these are Groq's published list prices. On the free tier the actual spend
# is $0 — the dashboard shows the list-price equivalent so the ROI and
# auto-downgrade numbers stay meaningful.
INPUT_COST_PER_TOKEN = 0.59 / 1_000_000
OUTPUT_COST_PER_TOKEN = 0.79 / 1_000_000

# List prices, USD per token, (input, output) — so scoring cost is computed for
# whichever model the router actually picked. Gemini/Claude rows kept for older
# actions that were scored before the switch to Groq.
MODEL_PRICING: dict[str, tuple[float, float]] = {
    "llama-3.3-70b-versatile": (0.59 / 1_000_000, 0.79 / 1_000_000),
    "llama-3.1-8b-instant": (0.05 / 1_000_000, 0.08 / 1_000_000),
    "gemini-2.0-flash": (0.10 / 1_000_000, 0.40 / 1_000_000),
    "gemini-2.0-flash-lite": (0.075 / 1_000_000, 0.30 / 1_000_000),
    "claude-haiku-4-5": (1.00 / 1_000_000, 5.00 / 1_000_000),
    "claude-sonnet-4-6": (3.00 / 1_000_000, 15.00 / 1_000_000),
    "claude-sonnet-5": (3.00 / 1_000_000, 15.00 / 1_000_000),
    "claude-opus-4-8": (5.00 / 1_000_000, 25.00 / 1_000_000),
}
