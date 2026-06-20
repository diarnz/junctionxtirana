from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_staff
from app.models import User
from app.schemas import QuotationLineItem, QuotationResponse, QuotationUpdateRequest
from app.services import generate_quotation, get_quotation, send_quotation, update_quotation


router = APIRouter()


def _serialize_quotation(quotation) -> QuotationResponse:
    return QuotationResponse(
        id=quotation.id,
        event_request_id=quotation.event_request_id,
        line_items=[QuotationLineItem(**item) for item in quotation.line_items],
        subtotal=quotation.subtotal,
        tax_rate=quotation.tax_rate,
        tax_amount=quotation.tax_amount,
        total_amount=quotation.total_amount,
        valid_until=quotation.valid_until,
        status=quotation.status,
        generated_by_ai=quotation.generated_by_ai,
        ai_notes=quotation.ai_notes,
        admin_notes=quotation.admin_notes,
        sent_at=quotation.sent_at,
        accepted_at=quotation.accepted_at,
        created_at=quotation.created_at,
    )


@router.post("/generate/{request_id}", response_model=QuotationResponse, status_code=201)
async def route_generate_quotation(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
) -> QuotationResponse:
    return _serialize_quotation(await generate_quotation(request_id, db, created_by=current_user.id))


@router.get("/{quotation_id}", response_model=QuotationResponse)
async def route_get_quotation(
    quotation_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> QuotationResponse:
    return _serialize_quotation(await get_quotation(quotation_id, db))


@router.put("/{quotation_id}", response_model=QuotationResponse)
async def route_update_quotation(
    quotation_id: UUID,
    data: QuotationUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff),
) -> QuotationResponse:
    return _serialize_quotation(await update_quotation(quotation_id, data, db))


@router.post("/{quotation_id}/send", response_model=QuotationResponse)
async def route_send_quotation(
    quotation_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff),
) -> QuotationResponse:
    return _serialize_quotation(await send_quotation(quotation_id, db))
