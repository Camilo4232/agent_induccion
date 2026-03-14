import os
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.db.models import User, Business
from app.core.security import hash_password, verify_password, create_access_token
from fastapi import HTTPException, status

DEMO_OWNER_EMAIL = "demo@segundo.app"
DEMO_OWNER_PASSWORD = os.getenv("DEMO_OWNER_PASSWORD", secrets.token_urlsafe(16))
DEMO_EMPLOYEE_PHONE = "+5200000000000"
DEMO_EMPLOYEE_PASSWORD = os.getenv("DEMO_EMPLOYEE_PASSWORD", secrets.token_urlsafe(16))
DEMO_BUSINESS_NAME = "Tienda Demo — Segundo"


async def register_owner(business_name: str, name: str, email: str, password: str, db: AsyncSession):
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    business = Business(name=business_name)
    db.add(business)
    await db.flush()

    user = User(
        business_id=business.id,
        email=email,
        password_hash=hash_password(password),
        role="owner",
        name=name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user, business


async def login_user(email: str | None, phone: str | None, password: str, db: AsyncSession):
    if not email and not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ingresa tu teléfono o email")

    if phone:
        result = await db.execute(select(User).where(User.phone == phone))
    else:
        result = await db.execute(select(User).where(User.email == email))

    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    return user


async def create_employee(business_id, phone: str, name: str, db: AsyncSession, custom_password: str | None = None) -> tuple[User, str]:
    existing = await db.execute(select(User).where(User.phone == phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Este teléfono ya está registrado")

    temp_password = custom_password if custom_password else secrets.token_urlsafe(10)
    user = User(
        business_id=business_id,
        phone=phone,
        password_hash=hash_password(temp_password),
        role="employee",
        name=name,
        must_change_password=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user, temp_password


def send_invite_message(phone: str, name: str, temp_password: str, business_name: str) -> bool:
    """
    Envía WhatsApp (primero) con fallback a SMS usando Twilio.
    TODO: Activar cuando tengas cuenta Twilio.

    from twilio.rest import Client
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token  = os.getenv("TWILIO_AUTH_TOKEN")
    client = Client(account_sid, auth_token)

    msg = (
        f"Hola {name} 👋\n"
        f"Tu acceso a *{business_name}* está listo.\n\n"
        f"Teléfono: {phone}\n"
        f"Contraseña temporal: {temp_password}\n\n"
        f"Entra en segundo.app/login\n"
        f"Te pedirá crear tu propia contraseña."
    )

    # Intenta WhatsApp primero
    try:
        client.messages.create(
            from_=f"whatsapp:{os.getenv('TWILIO_WHATSAPP_NUMBER')}",
            to=f"whatsapp:{phone}",
            body=msg,
        )
        return True
    except Exception:
        pass  # fallback a SMS

    # Fallback SMS
    try:
        client.messages.create(
            from_=os.getenv("TWILIO_PHONE_NUMBER"),
            to=phone,
            body=msg,
        )
        return True
    except Exception:
        return False
    """
    return False  # desactivado hasta configurar Twilio


async def get_or_create_demo(role: str, db: AsyncSession):
    """
    Returns (user, business) for the demo account.
    Creates them if they don't exist yet.
    role: 'owner' | 'employee'
    """
    if role == "owner":
        result = await db.execute(select(User).where(User.email == DEMO_OWNER_EMAIL))
    else:
        result = await db.execute(select(User).where(User.phone == DEMO_EMPLOYEE_PHONE))

    user = result.scalar_one_or_none()

    if user:
        biz_result = await db.execute(select(Business).where(Business.id == user.business_id))
        business = biz_result.scalar_one_or_none()
        return user, business

    # Busca el dueño demo para compartir el mismo negocio
    owner_result = await db.execute(select(User).where(User.email == DEMO_OWNER_EMAIL))
    owner = owner_result.scalar_one_or_none()

    if owner:
        business_id = owner.business_id
        biz_result = await db.execute(select(Business).where(Business.id == business_id))
        business = biz_result.scalar_one_or_none()
    else:
        business = Business(name=DEMO_BUSINESS_NAME)
        db.add(business)
        await db.flush()
        business_id = business.id

    if role == "owner":
        user = User(
            business_id=business_id,
            email=DEMO_OWNER_EMAIL,
            password_hash=hash_password(DEMO_OWNER_PASSWORD),
            role="owner",
            name="Demo Dueño",
        )
    else:
        user = User(
            business_id=business_id,
            phone=DEMO_EMPLOYEE_PHONE,
            password_hash=hash_password(DEMO_EMPLOYEE_PASSWORD),
            role="employee",
            name="Demo Empleado",
        )

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user, business


def build_token(user: User, business_id) -> dict:
    token = create_access_token({
        "sub": str(user.id),
        "email": user.email or "",
        "role": user.role,
        "business_id": str(business_id),
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "business_id": str(business_id),
        "user_id": str(user.id),
        "must_change_password": bool(getattr(user, "must_change_password", False)),
    }
