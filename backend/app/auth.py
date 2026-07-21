"""Password hashing and user lookup.

Kept apart from api.py so the hashing details live in one place. bcrypt is used
directly rather than through passlib: passlib's bcrypt backend trips a noisy
version-detection warning against bcrypt 4.x, and the direct API is small enough
that the wrapper buys nothing.
"""

import bcrypt
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User

# bcrypt hashes at most the first 72 bytes of a password and raises on longer
# input in recent versions. We cap well below that at the schema layer; this
# constant documents the hard limit for anyone who changes that.
BCRYPT_MAX_BYTES = 72


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    """Return a bcrypt hash. Truncates the password to bcrypt's 72-byte limit so
    an over-long input hashes deterministically instead of raising."""
    payload = password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(payload, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    payload = password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    try:
        return bcrypt.checkpw(payload, password_hash.encode("utf-8"))
    except ValueError:
        # A malformed stored hash should read as "wrong password", never crash.
        return False


def get_user_by_email(db: Session, email: str) -> User | None:
    # Compare lower-cased on both sides so casing never splits an account.
    return db.scalar(select(User).where(func.lower(User.email) == normalize_email(email)))


def create_user(db: Session, name: str, email: str, password: str) -> User:
    user = User(
        email=normalize_email(email),
        name=name.strip() or "there",
        password_hash=hash_password(password),
    )
    db.add(user)
    db.flush()  # populate user.id without ending the caller's transaction
    return user


# A comparison against this runs when no user is found, so a missing account and
# a wrong password take similar time and the response can't be used to discover
# which emails are registered.
_DUMMY_HASH = bcrypt.hashpw(b"timing-equalizer", bcrypt.gensalt()).decode("utf-8")


def authenticate(db: Session, email: str, password: str) -> User | None:
    """Return the user when the credentials match, else None."""
    user = get_user_by_email(db, email)
    if user is None:
        verify_password(password, _DUMMY_HASH)
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
