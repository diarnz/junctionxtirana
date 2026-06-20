from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import run_agent
from app.database import get_db
from app.dependencies import get_current_user, require_staff
from app.models import AiConversation, User
from app.schemas import AIDesignRoomRequest, AIDetectConflictsRequest, AIChatRequest, AIChatResponse


router = APIRouter()


@router.post("/chat", response_model=AIChatResponse)
async def route_ai_chat(
    data: AIChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AIChatResponse:
    conversation = None
    history: list[dict] = []
    if data.conversation_id:
        conversation = await db.get(AiConversation, data.conversation_id)
        if conversation and conversation.user_id == current_user.id:
            history = conversation.messages

    result = await run_agent(
        agent_type=data.agent_type,
        user_message=data.message,
        context={**data.context, "user_id": str(current_user.id)},
        conversation_history=history,
        db=db,
    )

    new_messages = history + [
        {"role": "user", "content": data.message},
        {"role": "assistant", "content": result["response"]},
    ]

    if conversation:
        conversation.messages = new_messages
        conversation.context_json = {**conversation.context_json, **data.context}
    else:
        conversation = AiConversation(
            user_id=current_user.id,
            agent_type=data.agent_type,
            messages=new_messages,
            context_json=data.context,
        )
        db.add(conversation)

    await db.commit()
    await db.refresh(conversation)

    return AIChatResponse(
        response=result["response"],
        tool_calls_made=result["tool_calls_made"],
        conversation_id=conversation.id,
    )


@router.post("/design-room")
async def route_design_room(
    data: AIDesignRoomRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff),
) -> dict:
    result = await run_agent(
        agent_type="room_designer",
        user_message=data.prompt,
        context={
            "venue_name": data.venue_name,
            "event_request_id": str(data.event_request_id) if data.event_request_id else None,
            "event_date_start": data.event_date_start.isoformat() if data.event_date_start else None,
            "event_date_end": data.event_date_end.isoformat() if data.event_date_end else None,
        },
        db=db,
    )
    return {
        "message": result["response"],
        "tool_calls_made": result["tool_calls_made"],
        "final_context": result["final_context"],
    }


@router.post("/detect-conflicts")
async def route_detect_conflicts(
    data: AIDetectConflictsRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff),
) -> dict:
    result = await run_agent(
        agent_type="conflict_detector",
        user_message="Analyze operational conflicts.",
        context={"request_id": str(data.request_id)},
        db=db,
    )
    return {
        "message": result["response"],
        "tool_calls_made": result["tool_calls_made"],
        "final_context": result["final_context"],
    }


@router.post("/generate-tasks/{request_id}")
async def route_ai_generate_tasks(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff),
) -> dict:
    result = await run_agent(
        agent_type="planner",
        user_message="Generate an operational task plan.",
        context={"request_id": str(request_id)},
        db=db,
    )
    return {
        "message": result["response"],
        "tool_calls_made": result["tool_calls_made"],
        "final_context": result["final_context"],
    }
