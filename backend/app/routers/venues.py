from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models import User
from app.schemas import (
    VenueAvailabilityResponse,
    VenueCreateRequest,
    VenueResponse,
    VenueUpdateRequest,
)
from app.services import create_venue, get_venue, get_venue_availability, list_venues, update_venue


router = APIRouter()


@router.get("", response_model=list[VenueResponse])
async def route_list_venues(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
) -> list[VenueResponse]:
    return [VenueResponse.model_validate(v) for v in await list_venues(db, active_only=active_only)]


@router.get("/{venue_id}", response_model=VenueResponse)
async def route_get_venue(venue_id: UUID, db: AsyncSession = Depends(get_db)) -> VenueResponse:
    return VenueResponse.model_validate(await get_venue(venue_id, db))


@router.get("/{venue_id}/availability", response_model=VenueAvailabilityResponse)
async def route_get_venue_availability(
    venue_id: UUID,
    check_date: date = Query(..., alias="date"),
    duration_hours: float = Query(2.0, gt=0),
    db: AsyncSession = Depends(get_db),
) -> VenueAvailabilityResponse:
    return await get_venue_availability(venue_id, check_date, duration_hours, db)


@router.post("", response_model=VenueResponse, status_code=201)
async def route_create_venue(
    data: VenueCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> VenueResponse:
    return VenueResponse.model_validate(await create_venue(data, db))


@router.put("/{venue_id}", response_model=VenueResponse)
async def route_update_venue(
    venue_id: UUID,
    data: VenueUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> VenueResponse:
    return VenueResponse.model_validate(await update_venue(venue_id, data, db))
