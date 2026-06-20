from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.database import AsyncSessionLocal
from app.services import get_current_layout, sync_layout_from_3d
from app.websocket.manager import ws_manager


router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/3d-bridge")
async def three_d_bridge(websocket: WebSocket) -> None:
    await ws_manager.connect(websocket, "3d-bridge")
    await ws_manager.send_to_one(
        websocket,
        {
            "type": "CONNECTED",
            "payload": {
                "message": "SpaceFlo 3D Bridge ready",
                "version": "1.0.0",
                "connections": ws_manager.connection_count("3d-bridge"),
            },
        },
    )
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Ignoring invalid JSON from 3D bridge")
                continue
            await _handle_upstream_message(message, websocket)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "3d-bridge")


async def _handle_upstream_message(message: dict, websocket: WebSocket) -> None:
    msg_type = message.get("type")
    payload = message.get("payload", {})

    if msg_type == "LAYOUT_SAVED":
        room_id = payload.get("roomId")
        items = payload.get("items", [])
        if room_id:
            async with AsyncSessionLocal() as db:
                await sync_layout_from_3d(room_id, items, db)
            await ws_manager.broadcast_to_channel(
                "admin",
                {
                    "type": "LAYOUT_SAVED",
                    "payload": {"roomId": room_id, "item_count": len(items)},
                },
            )
        return

    if msg_type == "REQUEST_LAYOUT":
        room_id = payload.get("roomId")
        if room_id:
            async with AsyncSessionLocal() as db:
                layout = await get_current_layout(room_id, db)
            if layout:
                await ws_manager.send_to_one(
                    websocket,
                    {
                        "type": "APPLY_LAYOUT",
                        "payload": {
                            "roomId": room_id,
                            "items": layout.items_json,
                            "source": "db_sync",
                            "layout_name": layout.name,
                        },
                    },
                )
        return

    if msg_type == "ROOM_ENTERED":
        await ws_manager.broadcast_to_channel("admin", {"type": "USER_VIEWING_ROOM", "payload": payload})
