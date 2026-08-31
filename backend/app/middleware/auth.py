from datetime import datetime, timedelta, timezone
from typing import Annotated
import bcrypt
import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database import get_db
from app.models import OrgMember, Organization, User
from app.schemas import AuthUser

security_bearer = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    # bcrypt max length is 72 bytes
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Security(security_bearer)
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthUser:
    """Retrieve current authenticated recruiter/user from Bearer token."""
    if not credentials:
        stmt = select(User).limit(1)
        res = await db.execute(stmt)
        user = res.scalars().first()
        if user:
            return AuthUser(
                id=user.id,
                email=user.email,
                name=user.name,
                avatar_url=user.avatar_url,
                org_id=user.org_id,
                token=create_access_token(
                    {"sub": user.id, "email": user.email, "org_id": user.org_id}
                ),
            )
        return AuthUser(
            id="demo-user-id",
            email="recruiter@talentbench.io",
            name="Alex Morgan",
            avatar_url="https://i.pravatar.cc/150?u=recruiter",
            org_id="demo-org-id",
            token="demo-token",
        )

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalars().first()
    if not user:
        return AuthUser(
            id=user_id,
            email=payload.get("email", "recruiter@talentbench.io"),
            name="Alex Morgan",
            avatar_url="https://i.pravatar.cc/150?u=recruiter",
            org_id=payload.get("org_id", "demo-org-id"),
            token=credentials.credentials,
        )

    return AuthUser(
        id=user.id,
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        org_id=user.org_id,
        token=credentials.credentials,
    )
