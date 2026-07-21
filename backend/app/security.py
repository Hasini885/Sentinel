"""Shared-secret guard for the REST API.

The frontend never calls this API from the browser. It calls a Next.js route
handler on its own origin, which checks the user's session and then forwards
the request with this header attached. So the secret lives only on two servers
and is never shipped to a client.

Scope, stated plainly:

  * Guards every route on the /api router — including the mutating ones
    (approve, reject, policies, outcomes, feature settings).
  * Does NOT guard /health, which needs to answer before anything is
    configured, and returns no data.
  * Does NOT guard /ws/actions. Browsers cannot set headers on a WebSocket
    handshake, so a header-based guard is not expressible there. The socket
    broadcasts the same action records the REST API returns, so this is a real
    residual gap, not a technicality — see README.
"""

import hmac

from fastapi import Header, HTTPException, status

from app.config import settings

HEADER_NAME = "X-Sentinel-Key"


def require_api_key(x_sentinel_key: str | None = Header(default=None)) -> None:
    """Reject a request whose shared secret is missing or wrong.

    Declared as a router-level dependency, so no endpoint signature, request
    body, or response shape changes — the guard sits in front of them.
    """
    expected = settings.api_key

    # Unset means the guard is off. An open API is the documented default for a
    # local checkout; the alternative is a fresh clone that cannot start.
    if not expected:
        return

    if x_sentinel_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Missing {HEADER_NAME} header.",
        )

    # compare_digest keeps the comparison time-independent of how many leading
    # characters happen to match, so the response cannot be used to recover the
    # key one byte at a time.
    if not hmac.compare_digest(x_sentinel_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid {HEADER_NAME} header.",
        )
