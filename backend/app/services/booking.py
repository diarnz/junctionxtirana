"""Booking-from-3D services.

Turns a 3D room layout (list of placed furniture items) into:
  * a live inventory + price preview (date-range aware availability), and
  * a real booking (EventRequest + linked RoomLayout + AssetReservations).

All inventory availability reuses the existing global-pool overlap logic in
``app.services`` so the "30 chairs, 20 taken on these dates, 10 left" rule holds
across every booking that shares a date window.
"""

from __future__ import annotations

from collections import Counter
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Asset, AssetReservation, EventRequest, RoomLayout, Venue
from app.schemas import (
    BookingCreateRequest,
    BookingPreviewLine,
    BookingPreviewRequest,
    BookingPreviewResponse,
    BookingVenueLine,
    BulkReserveResult,
    QuotationLineItem,
)
from app.services import (
    SERVICE_FEES,
    combine_date_time,
    deactivate_current_layouts,
    event_duration_hours,
    get_reserved_quantity,
)


TAX_RATE = Decimal("0.20")

# Friendly labels for 3D model keys that are not tracked as priced inventory.
NON_INVENTORY_LABELS: dict[str, str] = {
    "keyboard_mouse": "Keyboard & Mouse",
}


def _humanize(model_key: str) -> str:
    return NON_INVENTORY_LABELS.get(model_key, model_key.replace("_", " ").title())


def window_from_fields(
    requested_date: date,
    start_time: time,
    end_time: time,
    setup_minutes: int,
    teardown_minutes: int,
) -> tuple[datetime, datetime]:
    start = combine_date_time(requested_date, start_time) - timedelta(minutes=setup_minutes)
    end = combine_date_time(requested_date, end_time) + timedelta(minutes=teardown_minutes)
    return start, end


async def get_venue_by_three_d_room_id(three_d_room_id: str, db: AsyncSession) -> Venue | None:
    return await db.scalar(select(Venue).where(Venue.three_d_room_id == three_d_room_id))


async def _resolve_venue(
    *, venue_id: UUID | None, three_d_room_id: str | None, db: AsyncSession
) -> Venue:
    venue: Venue | None = None
    if venue_id:
        venue = await db.get(Venue, venue_id)
    elif three_d_room_id:
        venue = await get_venue_by_three_d_room_id(three_d_room_id, db)
    if not venue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This 3D room is not linked to a bookable venue.",
        )
    return venue


async def _asset_for_model_key(model_key: str, db: AsyncSession) -> Asset | None:
    """Pick the canonical priced asset for a 3D model key (first active match by name)."""
    return await db.scalar(
        select(Asset)
        .where(Asset.three_d_item_key == model_key, Asset.is_active.is_(True))
        .order_by(Asset.name)
    )


def count_items_by_model_key(items: list[dict[str, Any]] | list[Any]) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for item in items:
        key = item.get("modelKey") if isinstance(item, dict) else getattr(item, "modelKey", None)
        if key:
            counter[key] += 1
    return dict(counter)


def _items_as_dicts(items: list[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in items:
        if isinstance(item, dict):
            out.append(item)
        elif hasattr(item, "model_dump"):
            out.append(item.model_dump(exclude_none=True))
    return out


async def compute_preview(
    *,
    venue: Venue,
    items: list[Any],
    requested_date: date,
    start_time: time,
    end_time: time,
    event_type: str,
    setup_minutes: int,
    teardown_minutes: int,
    db: AsyncSession,
    exclude_request_id: UUID | None = None,
) -> BookingPreviewResponse:
    win_start, win_end = window_from_fields(
        requested_date, start_time, end_time, setup_minutes, teardown_minutes
    )
    counts = count_items_by_model_key(items)

    lines: list[BookingPreviewLine] = []
    inventory_subtotal = Decimal("0")
    has_shortfall = False

    for model_key in sorted(counts):
        requested = counts[model_key]
        asset = await _asset_for_model_key(model_key, db)
        if asset:
            reserved = await get_reserved_quantity(
                asset.id, win_start, win_end, db, exclude_request_id=exclude_request_id
            )
            available = max(0, asset.total_quantity - reserved)
            shortfall = max(0, requested - available)
            line_total = (asset.unit_price * requested).quantize(Decimal("0.01"))
            inventory_subtotal += line_total
            if shortfall > 0:
                has_shortfall = True
            lines.append(
                BookingPreviewLine(
                    model_key=model_key,
                    label=asset.name,
                    category=asset.category,
                    asset_id=asset.id,
                    requested=requested,
                    available=available,
                    shortfall=shortfall,
                    unit_price=asset.unit_price,
                    line_total=line_total,
                    is_inventory=True,
                )
            )
        else:
            lines.append(
                BookingPreviewLine(
                    model_key=model_key,
                    label=_humanize(model_key),
                    category=None,
                    asset_id=None,
                    requested=requested,
                    available=requested,
                    shortfall=0,
                    unit_price=Decimal("0"),
                    line_total=Decimal("0"),
                    is_inventory=False,
                )
            )

    hours = event_duration_hours(start_time, end_time)
    venue_total = (venue.base_price_per_hour * hours).quantize(Decimal("0.01"))
    venue_line = BookingVenueLine(
        venue_id=venue.id,
        venue_name=venue.name,
        hours=hours,
        rate_per_hour=venue.base_price_per_hour,
        total=venue_total,
    )

    service_lines: list[QuotationLineItem] = []
    services_subtotal = Decimal("0")
    for label, qty, unit in SERVICE_FEES.get(event_type, SERVICE_FEES["other"]):
        total = (unit * qty).quantize(Decimal("0.01"))
        services_subtotal += total
        service_lines.append(
            QuotationLineItem(category="service", name=label, qty=qty, unit_price=unit, total=total)
        )

    subtotal = (inventory_subtotal + venue_total + services_subtotal).quantize(Decimal("0.01"))
    tax_amount = (subtotal * TAX_RATE).quantize(Decimal("0.01"))
    total = subtotal + tax_amount

    return BookingPreviewResponse(
        venue=venue_line,
        lines=lines,
        service_lines=service_lines,
        item_count=sum(counts.values()),
        inventory_subtotal=inventory_subtotal,
        venue_subtotal=venue_total,
        services_subtotal=services_subtotal,
        subtotal=subtotal,
        tax_rate=TAX_RATE,
        tax_amount=tax_amount,
        total=total,
        has_shortfall=has_shortfall,
    )


async def preview_booking(data: BookingPreviewRequest, db: AsyncSession) -> BookingPreviewResponse:
    venue = await _resolve_venue(
        venue_id=data.venue_id, three_d_room_id=data.three_d_room_id, db=db
    )
    return await compute_preview(
        venue=venue,
        items=data.items,
        requested_date=data.requested_date,
        start_time=data.start_time,
        end_time=data.end_time,
        event_type=data.event_type,
        setup_minutes=data.setup_time_minutes,
        teardown_minutes=data.teardown_time_minutes,
        db=db,
    )


async def create_booking_from_layout(
    data: BookingCreateRequest,
    client_id: UUID,
    db: AsyncSession,
) -> tuple[EventRequest, RoomLayout | None, list[BulkReserveResult], BookingPreviewResponse]:
    """Create an EventRequest, persist the client's 3D layout linked to it, and
    reserve inventory derived from the placed items — all in one transaction."""
    venue = await _resolve_venue(
        venue_id=data.venue_id, three_d_room_id=data.three_d_room_id, db=db
    )

    win_start, win_end = window_from_fields(
        data.requested_date,
        data.start_time,
        data.end_time,
        data.setup_time_minutes,
        data.teardown_time_minutes,
    )
    items_json = _items_as_dicts(data.items)
    counts = count_items_by_model_key(items_json)

    # 1. Event request
    req = EventRequest(
        client_id=client_id,
        status="submitted",
        title=data.title,
        event_type=data.event_type,
        description=data.description,
        requested_date=data.requested_date,
        start_time=data.start_time,
        end_time=data.end_time,
        attendee_count=data.attendee_count,
        venue_id=venue.id,
        special_requirements=data.special_requirements,
        setup_time_minutes=data.setup_time_minutes,
        teardown_time_minutes=data.teardown_time_minutes,
    )
    db.add(req)
    await db.flush()

    # 2. Linked layout (becomes the current layout for this venue)
    layout: RoomLayout | None = None
    if items_json:
        await deactivate_current_layouts(venue.id, db)
        layout = RoomLayout(
            venue_id=venue.id,
            event_request_id=req.id,
            name=data.layout_name or f"{data.title} — client layout",
            items_json=items_json,
            source="manual",
            is_current=True,
            created_by=client_id,
            thumbnail_url=data.plan_image,
        )
        db.add(layout)

    # 3. Reservations derived from placed items
    reserve_results: list[BulkReserveResult] = []
    for model_key in sorted(counts):
        requested = counts[model_key]
        asset = await _asset_for_model_key(model_key, db)
        if not asset:
            continue
        reserved = await get_reserved_quantity(asset.id, win_start, win_end, db)
        available = max(0, asset.total_quantity - reserved)
        confirmed = min(requested, available)
        shortfall = max(0, requested - confirmed)
        db.add(
            AssetReservation(
                event_request_id=req.id,
                asset_id=asset.id,
                quantity_requested=requested,
                quantity_confirmed=confirmed,
                reservation_start=win_start,
                reservation_end=win_end,
                status="pending",
            )
        )
        reserve_results.append(
            BulkReserveResult(
                asset_id=asset.id,
                name=asset.name,
                requested=requested,
                confirmed=confirmed,
                status="fulfilled" if shortfall == 0 else "partial",
                shortfall=shortfall or None,
                conflict_reason=None
                if shortfall == 0
                else f"Only {available} available in the requested window.",
            )
        )

    await db.commit()
    await db.refresh(req)
    if layout is not None:
        await db.refresh(layout)

    preview = await compute_preview(
        venue=venue,
        items=items_json,
        requested_date=data.requested_date,
        start_time=data.start_time,
        end_time=data.end_time,
        event_type=data.event_type,
        setup_minutes=data.setup_time_minutes,
        teardown_minutes=data.teardown_time_minutes,
        db=db,
        exclude_request_id=req.id,
    )

    return req, layout, reserve_results, preview
