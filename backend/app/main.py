from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.bootstrap import init_database, seed_database
from app.config import settings
from app.routers.ai import router as ai_router
from app.routers.assets import router as assets_router
from app.routers.auth import router as auth_router
from app.routers.quotations import router as quotations_router
from app.routers.requests import router as requests_router
from app.routers.reservations import router as reservations_router
from app.routers.room_layouts import router as layouts_router
from app.routers.tasks import router as tasks_router
from app.routers.venues import router as venues_router
from app.websocket.admin import router as admin_ws_router
from app.websocket.bridge import router as bridge_ws_router
from app.websocket.manager import ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.AUTO_CREATE_TABLES:
        await init_database()
    if settings.AUTO_SEED_DATA:
        await seed_database()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Pyramid of Tirana - SpaceFlow operations backend",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
async def health() -> dict:
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database_driver": "sqlite" if settings.is_sqlite else settings.DATABASE_URL.split(":", 1)[0],
        "openrouter_configured": bool(settings.OPENROUTER_API_KEY),
    }


@app.get("/ws-status", tags=["System"])
async def ws_status() -> dict:
    return {"channels": ws_manager.all_channel_counts()}


prefix = "/api/v1"
app.include_router(auth_router, prefix=f"{prefix}/auth", tags=["Auth"])
app.include_router(venues_router, prefix=f"{prefix}/venues", tags=["Venues"])
app.include_router(requests_router, prefix=f"{prefix}/requests", tags=["Requests"])
app.include_router(assets_router, prefix=f"{prefix}/assets", tags=["Assets"])
app.include_router(reservations_router, prefix=f"{prefix}/reservations", tags=["Reservations"])
app.include_router(quotations_router, prefix=f"{prefix}/quotations", tags=["Quotations"])
app.include_router(tasks_router, prefix=f"{prefix}/tasks", tags=["Tasks"])
app.include_router(layouts_router, prefix=f"{prefix}/layouts", tags=["Layouts"])
app.include_router(ai_router, prefix=f"{prefix}/ai", tags=["AI"])

app.include_router(bridge_ws_router)
app.include_router(admin_ws_router)
