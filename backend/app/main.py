import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.config import settings
from app.security import HEADER_NAME, require_api_key
from app.ws import router as ws_router

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Sentinel", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
    # The shared secret rides in this header, so it has to be allowed through
    # CORS — though in normal operation only the Next.js server sends it.
    allow_headers=["Content-Type", HEADER_NAME],
)

# Attached to the router rather than to each endpoint, so no endpoint
# signature, request body, or response shape changes — the guard sits in front.
app.include_router(router, dependencies=[Depends(require_api_key)])

# Deliberately unguarded: a browser cannot attach headers to a WebSocket
# handshake, so a header-based guard is not expressible here. See
# app/security.py for exactly what that leaves exposed.
app.include_router(ws_router)


@app.on_event("startup")
def announce_guard_state() -> None:
    """Say which mode we started in — silence here would be the dangerous case."""
    if settings.api_key:
        logger.info("API guard enabled: /api/* requires the %s header.", HEADER_NAME)
    else:
        logger.warning(
            "SENTINEL_API_KEY is not set - /api/* is open to anyone who can reach "
            "this port. Fine for local development; set it for anything else."
        )


@app.get("/health")
def health() -> dict[str, str]:
    """Unguarded on purpose: must answer before anything is configured."""
    return {"status": "ok"}
