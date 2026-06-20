from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin, require_staff
from app.models import User
from app.schemas import AssetAvailabilityResponse, AssetCreateRequest, AssetResponse, AssetSummaryItem
from app.services import create_asset, get_asset, get_asset_availability, get_assets_summary, list_assets


router = APIRouter()


@router.get("", response_model=list[AssetResponse])
async def route_list_assets(
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[AssetResponse]:
    return [AssetResponse.model_validate(asset) for asset in await list_assets(db, category=category)]


@router.get("/summary", response_model=list[AssetSummaryItem])
async def route_get_assets_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff),
) -> list[AssetSummaryItem]:
    return await get_assets_summary(db)


@router.get("/{asset_id}", response_model=AssetResponse)
async def route_get_asset(asset_id: UUID, db: AsyncSession = Depends(get_db)) -> AssetResponse:
    return AssetResponse.model_validate(await get_asset(asset_id, db))


@router.get("/{asset_id}/availability", response_model=AssetAvailabilityResponse)
async def route_get_asset_availability(
    asset_id: UUID,
    start: datetime = Query(...),
    end: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
) -> AssetAvailabilityResponse:
    return await get_asset_availability(asset_id, start, end, db)


@router.post("", response_model=AssetResponse, status_code=201)
async def route_create_asset(
    data: AssetCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> AssetResponse:
    return AssetResponse.model_validate(await create_asset(data, db))
