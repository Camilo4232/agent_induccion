import logging
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.session import get_db
from app.db.models import User, RefreshToken, PasswordResetToken
from app.db.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.core.config import settings
from app.core.security import (
    get_current_user, hash_password, verify_password,
    create_access_token, create_refresh_token_value,
    hash_refresh_token, verify_refresh_token,
)
from app.services.auth_service import (
    register_owner, login_user, build_token, get_or_create_demo,
)

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["auth"])


async def _issue_refresh_token(user_id, db: AsyncSession) -> str:
    """Crea y persiste un nuevo refresh token; retorna el valor en texto plano."""
    value = create_refresh_token_value()
    rt = RefreshToken(
        user_id=user_id,
        token_hash=hash_refresh_token(value),
        expires_at=datetime.utcnow() + timedelta(days=settings.jwt_refresh_expire_days),
    )
    db.add(rt)
    return value


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user, business = await register_owner(
        business_name=body.business_name,
        name=body.name,
        email=body.email,
        password=body.password,
        db=db,
    )
    refresh_value = await _issue_refresh_token(user.id, db)
    await db.commit()
    token_resp = build_token(user, business.id)
    token_resp["refresh_token"] = refresh_value
    return token_resp


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await login_user(body.email, body.phone, body.password, db)
    refresh_value = await _issue_refresh_token(user.id, db)
    await db.commit()
    token_resp = build_token(user, user.business_id)
    token_resp["refresh_token"] = refresh_value
    return token_resp


class DemoRequest(BaseModel):
    role: str = "owner"  # 'owner' | 'employee'


@router.post("/demo", response_model=TokenResponse)
async def demo_login(body: DemoRequest, db: AsyncSession = Depends(get_db)):
    """One-click demo login. Creates the demo account if it doesn't exist."""
    role = body.role if body.role in ("owner", "employee") else "owner"
    user, business = await get_or_create_demo(role, db)
    refresh_value = await _issue_refresh_token(user.id, db)
    await db.commit()
    token_resp = build_token(user, business.id)
    token_resp["refresh_token"] = refresh_value
    return token_resp


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=100)


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == UUID(current_user["sub"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contraseña actual incorrecta")

    user.password_hash = hash_password(body.new_password)
    user.must_change_password = False
    await db.commit()
    return {"ok": True}


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh token for new access + refresh tokens."""
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.utcnow(),
        )
    )
    tokens = result.scalars().all()

    matched_token: RefreshToken | None = None
    for rt in tokens:
        if verify_refresh_token(body.refresh_token, rt.token_hash):
            matched_token = rt
            break

    if not matched_token:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

    matched_token.revoked = True

    user_result = await db.execute(select(User).where(User.id == matched_token.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    new_refresh_value = await _issue_refresh_token(user.id, db)
    await db.commit()

    token_resp = build_token(user, user.business_id)
    token_resp["refresh_token"] = new_refresh_value
    return token_resp


@router.post("/logout")
async def logout(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Revoke a refresh token on logout."""
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.revoked == False)
    )
    tokens = result.scalars().all()
    for rt in tokens:
        if verify_refresh_token(body.refresh_token, rt.token_hash):
            rt.revoked = True
            await db.commit()
            return {"ok": True}
    return {"ok": True}  # No revelar si el token existe o no


class ForgotPasswordRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Generate a 6-digit reset code. MVP: devuelve el código en la respuesta (producción enviaría por email/SMS)."""
    if not body.email and not body.phone:
        raise HTTPException(status_code=400, detail="Proporciona email o teléfono")

    if body.email:
        result = await db.execute(select(User).where(User.email == body.email))
    else:
        result = await db.execute(select(User).where(User.phone == body.phone))

    user = result.scalar_one_or_none()
    if not user:
        return {"sent": True, "message": "Si la cuenta existe, recibirás un código de recuperación."}

    code = f"{secrets.randbelow(1000000):06d}"

    reset = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_password(code),
        expires_at=datetime.utcnow() + timedelta(minutes=15),
    )
    db.add(reset)
    await db.commit()

    logger.info("Password reset code for user %s: %s", user.id, code)

    return {
        "sent": True,
        "message": "Si la cuenta existe, recibirás un código de recuperación.",
        "debug_code": code,  # Eliminar en producción
    }


class ResetPasswordRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6, max_length=100)


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Reset password using the 6-digit code."""
    if not body.email and not body.phone:
        raise HTTPException(status_code=400, detail="Proporciona email o teléfono")

    if body.email:
        user_result = await db.execute(select(User).where(User.email == body.email))
    else:
        user_result = await db.execute(select(User).where(User.phone == body.phone))

    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Código inválido o expirado")

    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.utcnow(),
        ).order_by(PasswordResetToken.created_at.desc())
    )
    reset_tokens = result.scalars().all()

    matched = False
    for token in reset_tokens:
        if verify_password(body.code, token.token_hash):
            token.used = True
            matched = True
            break

    if not matched:
        raise HTTPException(status_code=400, detail="Código inválido o expirado")

    user.password_hash = hash_password(body.new_password)
    user.must_change_password = False
    await db.commit()

    return {"ok": True, "message": "Contraseña actualizada exitosamente"}
