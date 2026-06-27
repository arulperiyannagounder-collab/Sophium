import hashlib
import secrets
import hmac
from datetime import datetime, timedelta
from typing import Optional, Union, Any
import jwt
from app.core.config import settings

ITERATIONS = 100000

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies password using PBKDF2 HMAC SHA-256 standard library comparison."""
    try:
        parts = hashed_password.split('$')
        if len(parts) != 3:
            return False
        iterations = int(parts[0])
        salt = parts[1]
        hash_val = parts[2]
        
        calc_hash = hashlib.pbkdf2_hmac(
            'sha256', 
            plain_password.encode('utf-8'), 
            salt.encode('utf-8'), 
            iterations
        ).hex()
        return hmac.compare_digest(calc_hash, hash_val)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Generates standard SHA-256 PBKDF2 salt-hashed password string."""
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode('utf-8'), 
        salt.encode('utf-8'), 
        ITERATIONS
    ).hex()
    return f"{ITERATIONS}${salt}${pw_hash}"

def decode_token(token: str) -> Optional[str]:
    try:
        decoded_token = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        return decoded_token["sub"]
    except jwt.PyJWTError:
        return None
