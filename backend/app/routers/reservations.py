from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_staff
from app.models import User
from app.schemas import BulkReserveRequest, BulkReserveResponse, ReservationResponse
from app.services import bulk_reserve_for_request, get_asset, list_reservations_for_request


router = APIRouter()


@router.get("", response_model=list[ReservationResponse])
async def route_list_reservations(
    request_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ReservationResponse]:
    reservations = await list_reservations_for_request(request_id, db)
    response: list[ReservationResponse] = []
    for reservation in reservations:
        asset = await get_asset(reservation.asset_id, db)
        response.append(
            ReservationResponse(
                id=reservation.id,
                event_request_id=reservation.event_request_id,
                asset_id=reservation.asset_id,
                asset_name=asset.name,
                quantity_requested=reservation.quantity_requested,
                quantity_confirmed=reservation.quantity_confirmed,
                reservation_start=reservation.reservation_start,
                reservation_end=reservation.reservation_end,
                status=reservation.status,
                notes=reservation.notes,
                created_at=reservation.created_at,
            )
        )
    return response


@router.post("/bulk/{request_id}", response_model=BulkReserveResponse)
async def route_bulk_reserve(
    request_id: UUID,
    data: BulkReserveRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff),
) -> BulkReserveResponse:
    return await bulk_reserve_for_request(request_id, data, db)
