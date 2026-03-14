from fastapi import APIRouter, Depends, Request, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.db.session import get_db
from app.db.models import User
from app.db.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import get_current_user, hash_password, verify_password
from app.services.auth_service import (
    register_owner, login_user, build_token, get_or_create_demo,
)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user, business = await register_owner(
        business_name=body.business_name,
        name=body.name,
        email=body.email,
        password=body.password,
        db=db,
    )
    return build_token(user, business.id)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await login_user(body.email, body.phone, body.password, db)
    return build_token(user, user.business_id)


class DemoRequest(BaseModel):
    role: str = "owner"  # 'owner' | 'employee'


@router.post("/demo", response_model=TokenResponse)
async def demo_login(body: DemoRequest, db: AsyncSession = Depends(get_db)):
    """One-click demo login. Creates the demo account if it doesn't exist."""
    role = body.role if body.role in ("owner", "employee") else "owner"
    user, business = await get_or_create_demo(role, db)
    return build_token(user, business.id)


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


