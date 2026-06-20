from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, get_db
from app.dependencies import get_current_user, require_staff
from app.models import User
from app.schemas import (
    AssignVenueRequest,
    EventRequestCreate,
    EventRequestDetail,
    EventRequestSummary,
    EventRequestUpdate,
    PaginatedResponse,
    RejectRequest,
    StatusTransitionResponse,
    UserResponse,
    VenueResponse,
)
from app.services import (
    assign_venue,
    build_request_summary,
    check_conflicts,
    conflicts_to_dict,
    confirm_reservations_for_request,
    create_request,
    generate_tasks_for_request,
    get_request,
    get_request_context,
    list_requests,
    transition_request_status,
    update_ai_proposal,
    update_request,
)


router = APIRouter()


def _build_detail(context: dict) -> EventRequestDetail:
    req = context["request"]
    return EventRequestDetail(
        id=req.id,
        title=req.title,
        event_type=req.event_type,
        description=req.description,
        status=req.status,
        requested_date=req.requested_date,
        start_time=req.start_time,
        end_time=req.end_time,
        attendee_count=req.attendee_count,
        setup_time_minutes=req.setup_time_minutes,
        teardown_time_minutes=req.teardown_time_minutes,
        special_requirements=req.special_requirements,
        venue_id=req.venue_id,
        venue=VenueResponse.model_validate(req.venue) if req.venue else None,
        client_id=req.client_id,
        client=UserResponse.model_validate(req.client) if req.client else None,
        assigned_staff_id=req.assigned_staff_id,
        rejection_reason=req.rejection_reason,
        ai_proposal_json={
            **(req.ai_proposal_json or {}),
            "conflicts": conflicts_to_dict(context["conflicts"]),
        }
        if (req.ai_proposal_json or context["conflicts"])
        else None,
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


@router.post("", response_model=EventRequestDetail, status_code=201)
async def route_create_request(
    data: EventRequestCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventRequestDetail:
    req = await create_request(data, current_user.id, db)
    background_tasks.add_task(_run_intake_agent, req.id)
    background_tasks.add_task(_notify_request_submitted, req.id, req.title)
    return _build_detail(await get_request_context(req.id, db))


@router.get("", response_model=PaginatedResponse[EventRequestSummary])
async def route_list_requests(
    status_filter: str | None = Query(None, alias="status"),
    venue_id: UUID | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[EventRequestSummary]:
    rows, total = await list_requests(
        db,
        current_user=current_user,
        status_filter=status_filter,
        venue_id=venue_id,
        limit=limit,
        offset=offset,
    )
    return PaginatedResponse(
        items=[build_request_summary(req) for req in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{request_id}", response_model=EventRequestDetail)
async def route_get_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventRequestDetail:
    req = await get_request(request_id, db)
    if current_user.role == "client" and req.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your request.")
    return _build_detail(await get_request_context(request_id, db))


@router.put("/{request_id}", response_model=EventRequestDetail)
async def route_update_request(
    request_id: UUID,
    data: EventRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventRequestDetail:
    await update_request(request_id, data, current_user, db)
    return _build_detail(await get_request_context(request_id, db))


@router.post("/{request_id}/assign-venue", response_model=StatusTransitionResponse)
async def route_assign_venue(
    request_id: UUID,
    data: AssignVenueRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff),
) -> StatusTransitionResponse:
    req = await assign_venue(request_id, data.venue_id, db)
    return StatusTransitionResponse(
        id=req.id,
        previous_status="submitted",
        new_status=req.status,
        message=f"Venue assigned to {req.title}.",
    )


@router.post("/{request_id}/approve", response_model=StatusTransitionResponse)
async def route_approve_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff),
) -> StatusTransitionResponse:
    previous_status, req = await transition_request_status(request_id, "approved", db=db)
    background_tasks.add_task(_post_approval_workflow, request_id)
    background_tasks.add_task(_notify_status_change, request_id, "approved")
    return StatusTransitionResponse(
        id=req.id,
        previous_status=previous_status,
        new_status=req.status,
        message="Request approved and operational workflow started.",
    )


@router.post("/{request_id}/reject", response_model=StatusTransitionResponse)
async def route_reject_request(
    request_id: UUID,
    data: RejectRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff),
) -> StatusTransitionResponse:
    previous_status, req = await transition_request_status(request_id, "rejected", reason=data.reason, db=db)
    return StatusTransitionResponse(
        id=req.id,
        previous_status=previous_status,
        new_status=req.status,
        message="Request rejected.",
    )


@router.post("/{request_id}/complete", response_model=StatusTransitionResponse)
async def route_complete_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff),
) -> StatusTransitionResponse:
    previous_status, req = await transition_request_status(request_id, "completed", db=db)
    return StatusTransitionResponse(
        id=req.id,
        previous_status=previous_status,
        new_status=req.status,
        message="Request marked as completed.",
    )


@router.get("/{request_id}/conflicts")
async def route_get_conflicts(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    req = await get_request(request_id, db)
    if current_user.role == "client" and req.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your request.")
    conflicts = await check_conflicts(request_id, db)
    return {
        "request_id": str(request_id),
        "has_blocking_conflicts": any(c.severity == "blocking" for c in conflicts),
        "has_warnings": any(c.severity == "warning" for c in conflicts),
        "conflicts": conflicts_to_dict(conflicts),
    }


async def _run_intake_agent(request_id: UUID) -> None:
    from app.ai import run_agent

    async with AsyncSessionLocal() as db:
        req = await get_request(request_id, db)
        context = {
            "request_id": str(req.id),
            "event_type": req.event_type,
            "attendee_count": req.attendee_count,
            "requested_date": str(req.requested_date),
            "start_time": str(req.start_time),
            "end_time": str(req.end_time),
            "special_requirements": req.special_requirements or "",
        }
        result = await run_agent(
            agent_type="intake",
            user_message=f"Analyze request '{req.title}' and propose the best venue, assets, and initial quotation summary.",
            context=context,
            db=db,
        )
        conflicts = await check_conflicts(req.id, db)
        await update_ai_proposal(
            req.id,
            {
                "status": "complete",
                "summary": result["response"],
                "tool_calls": result["tool_calls_made"],
                "conflicts": conflicts_to_dict(conflicts),
            },
            db,
        )


async def _post_approval_workflow(request_id: UUID) -> None:
    async with AsyncSessionLocal() as db:
        await confirm_reservations_for_request(request_id, db)
        await generate_tasks_for_request(request_id, db)


async def _notify_request_submitted(request_id: UUID, title: str) -> None:
    from app.websocket.manager import ws_manager

    await ws_manager.broadcast_to_channel(
        "admin",
        {"type": "REQUEST_SUBMITTED", "payload": {"request_id": str(request_id), "title": title}},
    )


async def _notify_status_change(request_id: UUID, new_status: str) -> None:
    from app.websocket.manager import ws_manager

    await ws_manager.broadcast_to_channel(
        "admin",
        {"type": "REQUEST_STATUS_CHANGED", "payload": {"request_id": str(request_id), "new_status": new_status}},
    )
