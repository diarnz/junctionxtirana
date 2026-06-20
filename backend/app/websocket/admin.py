from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.manager import ws_manager


router = APIRouter()


@router.websocket("/ws/admin")
async def admin_channel(websocket: WebSocket) -> None:
    await ws_manager.connect(websocket, "admin")
    await ws_manager.send_to_one(
        websocket,
        {
            "type": "CONNECTED",
            "payload": {
                "message": "SpaceFlow admin realtime channel ready",
                "active_3d_connections": ws_manager.connection_count("3d-bridge"),
            },
        },
    )
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "admin")
