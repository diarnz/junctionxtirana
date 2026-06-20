from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Venue
from app.schemas import RoomLayoutItem, RoomLayoutResponse
from app.services import get_current_layout, list_layouts_for_venue


router = APIRouter()


def _serialize_layout(layout, venue: Venue | None) -> RoomLayoutResponse:
    return RoomLayoutResponse(
        id=layout.id,
        venue_id=layout.venue_id,
        venue_name=venue.name if venue else None,
        three_d_room_id=venue.three_d_room_id if venue else None,
        event_request_id=layout.event_request_id,
        name=layout.name,
        items_json=[RoomLayoutItem(**item) for item in layout.items_json],
        item_count=len(layout.items_json),
        source=layout.source,
        ai_prompt=layout.ai_prompt,
        thumbnail_url=layout.thumbnail_url,
        is_current=layout.is_current,
        created_at=layout.created_at,
    )


@router.get("", response_model=list[RoomLayoutResponse])
async def route_list_layouts(
    venue_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
) -> list[RoomLayoutResponse]:
    venue = await db.get(Venue, venue_id)
    layouts = await list_layouts_for_venue(venue_id, db)
    return [_serialize_layout(layout, venue) for layout in layouts]


@router.get("/current", response_model=RoomLayoutResponse | None)
async def route_get_current_layout(
    three_d_room_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> RoomLayoutResponse | None:
    layout = await get_current_layout(three_d_room_id, db)
    if not layout:
        return None
    venue = await db.get(Venue, layout.venue_id)
    return _serialize_layout(layout, venue)
