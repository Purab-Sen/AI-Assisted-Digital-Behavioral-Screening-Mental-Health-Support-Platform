import base64
import hashlib
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def _derive_key(secret: str) -> bytes:
    """Derive a 32-byte URL-safe base64-encoded key for Fernet from a secret string."""
    h = hashlib.sha256(secret.encode('utf-8')).digest()
    return base64.urlsafe_b64encode(h)


def get_fernet() -> Fernet:
    key = _derive_key(settings.SECRET_KEY or "")
    return Fernet(key)


def encrypt_text(plain: str) -> str:
    f = get_fernet()
    token = f.encrypt(plain.encode('utf-8'))
    return token.decode('utf-8')


def decrypt_text(token: Optional[str]) -> Optional[str]:
    if token is None:
        return None
    f = get_fernet()
    try:
        plain = f.decrypt(token.encode('utf-8'))
        return plain.decode('utf-8')
    except InvalidToken:
        # If token is invalid, return original string to avoid breaking reads
        return token
