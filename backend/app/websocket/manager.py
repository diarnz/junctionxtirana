from __future__ import annotations

import json
import logging
from collections import defaultdict

from fastapi import WebSocket


logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self) -> None:
        self._channels: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, channel: str) -> None:
        await websocket.accept()
        self._channels[channel].append(websocket)
        logger.info("WebSocket connected to '%s' (%s total)", channel, len(self._channels[channel]))

    def disconnect(self, websocket: WebSocket, channel: str) -> None:
        if websocket in self._channels.get(channel, []):
            self._channels[channel].remove(websocket)
            logger.info("WebSocket disconnected from '%s' (%s remaining)", channel, len(self._channels[channel]))

    async def send_to_one(self, websocket: WebSocket, message: dict) -> None:
        await websocket.send_text(json.dumps(message))

    async def broadcast_to_channel(self, channel: str, message: dict) -> None:
        dead: list[WebSocket] = []
        for websocket in list(self._channels.get(channel, [])):
            try:
                await websocket.send_text(json.dumps(message))
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            self.disconnect(websocket, channel)

    def connection_count(self, channel: str) -> int:
        return len(self._channels.get(channel, []))

    def all_channel_counts(self) -> dict[str, int]:
        return {channel: len(connections) for channel, connections in self._channels.items()}


ws_manager = WebSocketManager()
