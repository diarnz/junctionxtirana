from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import (
    BookingCreateRequest,
    BookingCreateResponse,
    BookingPreviewRequest,
    BookingPreviewResponse,
)
from app.services import get_request_context
from app.services.booking import create_booking_from_layout, preview_booking
from app.routers.requests import (
    _build_detail,
    _notify_request_submitted,
    _run_intake_agent,
)


router = APIRouter()


@router.post("/preview", response_model=BookingPreviewResponse)
async def route_preview_booking(
    data: BookingPreviewRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> BookingPreviewResponse:
    """Live inventory availability + price estimate for a 3D layout on given dates."""
    return await preview_booking(data, db)


@router.post("", response_model=BookingCreateResponse, status_code=201)
async def route_create_booking(
    data: BookingCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingCreateResponse:
    """Book a venue directly from the 3D world: creates the request, links the
    client's customized layout, and reserves inventory from the placed items."""
    req, layout, reservations, preview = await create_booking_from_layout(
        data, current_user.id, db
    )
    background_tasks.add_task(_run_intake_agent, req.id)
    background_tasks.add_task(_notify_request_submitted, req.id, req.title)
    detail = _build_detail(await get_request_context(req.id, db))
    return BookingCreateResponse(
        request=detail,
        layout_id=layout.id if layout else None,
        reservations=reservations,
        preview=preview,
    )
