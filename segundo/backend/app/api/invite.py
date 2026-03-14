from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sql_delete
from uuid import UUID

from app.db.session import get_db
from app.db.models import User
from app.db.schemas import InviteRequest, InviteResponse, TeamMemberOut
from app.core.security import require_owner
from app.services.auth_service import create_employee, send_invite_message
from app.services.business_service import get_business_name

router = APIRouter(tags=["invite"])


@router.post("/invite", response_model=InviteResponse)
async def invite_employee(
    body: InviteRequest,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    user, temp_password = await create_employee(business_id, body.phone, body.name, db, body.custom_password)

    business_name = await get_business_name(business_id, db)
    message_sent = send_invite_message(body.phone, body.name, temp_password, business_name)

    return InviteResponse(
        invited=True,
        temp_password=temp_password,
        message=f"Empleado {body.name} creado exitosamente.",
        message_sent=message_sent,
    )


@router.get("/team", response_model=list[TeamMemberOut])
async def list_team(
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    result = await db.execute(
        select(User)
        .where(User.business_id == business_id, User.role == "employee")
        .order_by(User.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/team/{user_id}")
async def remove_employee(
    user_id: UUID,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    result = await db.execute(
        select(User).where(User.id == user_id, User.business_id == business_id, User.role == "employee")
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    await db.delete(employee)
    await db.commit()
    return {"deleted": True, "message": f"Empleado {employee.name} eliminado."}
