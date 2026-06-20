# SpaceFlo — Backend Implementation Blueprint
## Phase-by-Phase Development Guide
### Pyramid Backstage Challenge | JunctionX Tirana 2026

> This document is the authoritative implementation guide for the Python/FastAPI backend
> running on `localhost:8080`. Every phase must be completed and verified before the next
> begins. The contracts exposed at the end of each phase are what the Vue.js frontend,
> Agentic AI subsystem, and Three.js bridge will depend on — do not change them without
> updating the downstream blueprints.

---

## Phase Map & Dependency Chain

```
B1: Foundation
 └─► B2: ORM Models
      └─► B3: Pydantic Schemas
           ├─► B4: Auth & RBAC
           ├─► B5: Venues API
           │    └─► B6: Event Request Lifecycle
           │         ├─► B7: Inventory & Reservations
           │         │    └─► B8: Conflict Detection
           │         │         └─► B9: Quotation Engine
           │         │              └─► B10: Task Generation
           │         └─► B11: WebSocket Infrastructure
           │              └─► B12: Room Layout Sync
           └─► B13: AI Router & Endpoint Hooks
```

Each phase has:
- **Goal** — what it achieves
- **Prerequisites** — phases that must be done first
- **Files** — every file created or modified
- **Implementation** — full code for each file
- **Endpoints Produced** — the exact API surface added
- **Phase Gate** — verification checklist before moving on
- **Contracts Exposed** — the JSON shapes downstream systems depend on

---

## Global Conventions

Throughout all phases:

- All IDs are UUID v4 strings
- All timestamps are ISO 8601 with timezone (`2026-07-15T09:00:00+00:00`)
- All money values are `number` (float) in EUR
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity
- All list endpoints support `?limit=20&offset=0` pagination unless stated otherwise
- All mutating endpoints return the full updated object
- Error responses always follow: `{"detail": "human-readable message"}`

---

## Phase B1: Project Foundation & Infrastructure

### Goal
Bootstrap a running FastAPI application with database connection, CORS, configuration
loading from `.env`, Alembic migrations, and a health check. At the end of this phase
`uvicorn` starts cleanly and `GET /health` returns `200`.

### Prerequisites
None. This is the first phase.

### Files Created

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   └── database.py
├── alembic/
│   ├── env.py
│   └── versions/              (empty, auto-populated)
├── alembic.ini
├── requirements.txt
├── .env.example
└── run.py
```

---

### `requirements.txt`

```
fastapi==0.111.0
uvicorn[standard]==0.30.1
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
alembic==1.13.1
pydantic==2.7.1
pydantic-settings==2.3.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
httpx==0.27.0
openai==1.30.1
supabase==2.4.5
pillow==10.3.0
python-dotenv==1.0.1
email-validator==2.1.1
```

---

### `app/config.py`

All settings are read from the `.env` file (located at the project root, one level above
`backend/`). Pydantic-settings validates types on startup — if a required variable is
missing, the process exits immediately with a clear error.

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = Field(
        description="asyncpg connection string: postgresql+asyncpg://user:pass@host/db"
    )
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # ── Auth ──────────────────────────────────────────────────────────────────
    SECRET_KEY: str = Field(min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # ── AI (OpenRouter) ───────────────────────────────────────────────────────
    OPENROUTER_API_KEY: str
    AI_MODEL: str = "anthropic/claude-3.5-sonnet"
    AI_TEMPERATURE: float = 0.1
    AI_MAX_TOKENS: int = 4096

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # ── App meta ──────────────────────────────────────────────────────────────
    APP_NAME: str = "SpaceFlo API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
```

---

### `app/database.py`

```python
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,          # detect stale connections
    pool_recycle=3600,           # recycle connections every hour
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


class Base(DeclarativeBase):
    """All ORM models inherit from this."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields an async DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

---

### `app/main.py`

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    # Future: warm up DB connection pool, run startup checks
    print(f"[SpaceFlo] Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    yield
    print("[SpaceFlo] Shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Pyramid of Tirana — Event Operations Platform (JunctionX 2026)",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Health check (no auth, no DB) ─────────────────────────────────────────
    @app.get("/health", tags=["System"])
    async def health():
        return {
            "status": "ok",
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }

    # Routers registered in later phases — placeholder comment:
    # app.include_router(auth_router,   prefix="/api/v1/auth")
    # app.include_router(venue_router,  prefix="/api/v1/venues")
    # ... etc.

    return app


app = create_app()
```

---

### `run.py`

```python
import uvicorn
from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="debug" if settings.DEBUG else "info",
    )
```

---

### `alembic.ini` (key section)

```ini
[alembic]
script_location = alembic
sqlalchemy.url = driver://user:pass@localhost/dbname
; Note: the actual URL is overridden in alembic/env.py from app.config
```

---

### `alembic/env.py`

```python
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
from app.config import settings
from app.database import Base

# Import all models so Alembic can detect them
import app.models  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online():
    import asyncio
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

---

### `.env.example`

```env
# ── Database (Supabase) ────────────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://postgres.PROJECTID:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://PROJECTID.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── Auth ──────────────────────────────────────────────────────────────────
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=generate-a-real-32-char-secret-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ── AI ────────────────────────────────────────────────────────────────────
OPENROUTER_API_KEY=sk-or-v1-your-key-here
AI_MODEL=anthropic/claude-3.5-sonnet
AI_TEMPERATURE=0.1

# ── Dev ───────────────────────────────────────────────────────────────────
DEBUG=true
```

---

### Phase B1 Gate

Before proceeding to B2, verify:

- [ ] `pip install -r requirements.txt` completes without errors
- [ ] `python run.py` starts Uvicorn on port 8080 without errors
- [ ] `curl http://localhost:8080/health` returns `{"status":"ok",...}`
- [ ] `GET http://localhost:8080/docs` opens the Swagger UI in a browser
- [ ] No import errors in any `app/` module

---

## Phase B2: ORM Models

### Goal
Define every SQLAlchemy model. These map directly to the database tables. Alembic
reads them to generate migrations. No business logic here — only column definitions,
relationships, and constraints.

### Prerequisites
Phase B1 complete.

### Files Created

```
app/
├── models/
│   ├── __init__.py
│   ├── user.py
│   ├── venue.py
│   ├── event_request.py
│   ├── asset.py
│   ├── reservation.py
│   ├── quotation.py
│   ├── task.py
│   ├── room_layout.py
│   ├── ai_conversation.py
│   └── activity_log.py
```

---

### `app/models/__init__.py`

Import all models here so Alembic's `env.py` can find them with a single import:

```python
from app.models.user import User
from app.models.venue import Venue
from app.models.event_request import EventRequest
from app.models.asset import Asset, AssetInstance
from app.models.reservation import AssetReservation
from app.models.quotation import Quotation
from app.models.task import Task
from app.models.room_layout import RoomLayout
from app.models.ai_conversation import AiConversation
from app.models.activity_log import ActivityLog

__all__ = [
    "User", "Venue", "EventRequest",
    "Asset", "AssetInstance", "AssetReservation",
    "Quotation", "Task", "RoomLayout",
    "AiConversation", "ActivityLog",
]
```

---

### `app/models/user.py`

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Enum as SAEnum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

USER_ROLES = ("admin", "staff", "client")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        SAEnum(*USER_ROLES, name="user_role"), nullable=False, default="client"
    )
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    organization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

---

### `app/models/venue.py`

```python
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, SmallInteger, Integer, Numeric, Text, Boolean, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

VENUE_STATUSES = ("active", "maintenance", "unavailable")


class Venue(Base):
    __tablename__ = "venues"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    floor: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    capacity_min: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    capacity_max: Mapped[int] = mapped_column(Integer, nullable=False)
    area_sqm: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    amenities: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[str] = mapped_column(
        SAEnum(*VENUE_STATUSES, name="venue_status"), nullable=False, default="active"
    )
    # Matches the roomId used in Three.js world.js (e.g. "blue-box", "orange-box")
    three_d_room_id: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    color_hex: Mapped[str | None] = mapped_column(String(7), nullable=True)
    base_price_per_hour: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )
```

---

### `app/models/event_request.py`

```python
import uuid
from datetime import datetime, date, time, timezone
from sqlalchemy import (
    String, Integer, Text, Date, Time, DateTime,
    ForeignKey, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

REQUEST_STATUSES = (
    "draft", "submitted", "under_review", "quotation_sent",
    "approved", "confirmed", "rejected", "cancelled", "completed"
)


class EventRequest(Base):
    __tablename__ = "event_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    attendee_count: Mapped[int] = mapped_column(Integer, nullable=False)
    venue_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("venues.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(
        SAEnum(*REQUEST_STATUSES, name="request_status"),
        nullable=False, default="submitted", index=True
    )
    special_requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    setup_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    teardown_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    assigned_staff_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Stores the full AI intake analysis JSON
    ai_proposal_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships (lazy-loaded by default)
    client: Mapped["User"] = relationship("User", foreign_keys=[client_id], lazy="select")
    venue: Mapped["Venue"] = relationship("Venue", lazy="select")
    assigned_staff: Mapped["User"] = relationship("User", foreign_keys=[assigned_staff_id], lazy="select")
```

---

### `app/models/asset.py`

```python
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, Text, Boolean, DateTime, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

ASSET_TRACKING_TYPES = ("pool", "instance")
ASSET_STATUSES = ("available", "reserved", "in_use", "maintenance", "missing")


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Allowed categories: seating | tables | av_equipment | staging | lighting | misc
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    tracking_type: Mapped[str] = mapped_column(
        SAEnum(*ASSET_TRACKING_TYPES, name="asset_tracking_type"),
        nullable=False, default="pool"
    )
    total_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    # Matches a key in MODEL_CATALOG in Three.js factories.js
    # Valid values: office_table | office_chair | office_monitor | keyboard_mouse |
    #               simple_table | simple_chair | speaker | microphone_stand |
    #               wall_flat_tv | led_tv | whiteboard
    three_d_item_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
    qr_prefix: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class AssetInstance(Base):
    """Individual tracked instance of an asset (for instance-tracked assets)."""
    __tablename__ = "asset_instances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    qr_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum(*ASSET_STATUSES, name="asset_status"), nullable=False, default="available"
    )
    current_venue_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("venues.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
```

---

### `app/models/reservation.py`

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import Integer, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

RESERVATION_STATUSES = ("pending", "confirmed", "cancelled", "released")


class AssetReservation(Base):
    __tablename__ = "asset_reservations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("event_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    quantity_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_confirmed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Full datetime range including setup and teardown buffers
    reservation_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reservation_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum(*RESERVATION_STATUSES, name="reservation_status"),
        nullable=False, default="pending"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        CheckConstraint("reservation_end > reservation_start", name="chk_reservation_dates"),
    )
```

---

### `app/models/quotation.py`

```python
import uuid
from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy import Numeric, Date, Text, DateTime, ForeignKey, Boolean
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

QUOTATION_STATUSES = ("draft", "sent", "accepted", "rejected", "expired")


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("event_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    # JSON array: [{category, name, qty, unit_price, total}]
    line_items: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, default=Decimal("0.20"))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    valid_until: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum(*QUOTATION_STATUSES, name="quotation_status"),
        nullable=False, default="draft"
    )
    generated_by_ai: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ai_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

---

### `app/models/task.py`

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, SmallInteger, DateTime, ForeignKey, Boolean
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

TASK_TYPES = ("setup", "teardown", "preparation", "logistics", "coordination")
TASK_STATUSES = ("pending", "assigned", "in_progress", "done", "blocked")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("event_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    task_type: Mapped[str] = mapped_column(
        SAEnum(*TASK_TYPES, name="task_type"), nullable=False
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum(*TASK_STATUSES, name="task_status"), nullable=False, default="pending"
    )
    # priority: 1=high, 2=medium, 3=low
    priority: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=2)
    depends_on: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )
    ai_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

---

### `app/models/room_layout.py`

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

LAYOUT_SOURCES = ("manual", "template", "ai_generated")


class RoomLayout(Base):
    """
    A saved snapshot of a room's furniture placement.
    items_json stores the exact format that Three.js furnishing.js expects:
    each item has {modelKey, x, y, z, rotY, type, surfaceY?, wallAxis?, wallCoord?,
                   isPositiveWall?, mountY?, scale?}
    """
    __tablename__ = "room_layouts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    event_request_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("event_requests.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Array of Three.js furniture item objects (see class docstring for schema)
    items_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    source: Mapped[str] = mapped_column(
        SAEnum(*LAYOUT_SOURCES, name="layout_source"), nullable=False, default="manual"
    )
    # The natural language prompt that produced this layout (if ai_generated)
    ai_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Supabase Storage URL of floor plan PNG (optional)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Only one layout per venue should be is_current=True at a time
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
```

---

### `app/models/ai_conversation.py`

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AiConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    event_request_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("event_requests.id", ondelete="SET NULL"), nullable=True
    )
    # "copilot" | "room_designer" | "intake" | "conflict_detector" | "planner"
    agent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Array of {role: "user"|"assistant"|"tool", content: str, timestamp: str}
    messages: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # Extra context passed to the agent (venue_name, request_id, etc.)
    context_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

---

### `app/models/activity_log.py`

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    before_state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    after_state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
```

---

### Running the Initial Migration

After all model files are created:

```bash
cd backend
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head
```

Then seed the database with the Pyramid's venues and initial assets by running the
SQL from the main `BLUEPRINT.md` section 5 in the Supabase SQL Editor.

### Phase B2 Gate

- [ ] `alembic revision --autogenerate` generates a migration with all 10 tables
- [ ] `alembic upgrade head` completes without error
- [ ] Supabase dashboard shows all tables created
- [ ] Seed data inserted: 5 venues, 14 assets visible in Supabase

---

## Phase B3: Pydantic Schemas

### Goal
Define all request bodies and response models using Pydantic v2. These are the
**exact contracts** the frontend TypeScript types and AI tools will be generated from.
Precision here prevents bugs in every downstream system.

### Prerequisites
Phase B2 complete (schemas reference ORM type constants).

### Files Created

```
app/
├── schemas/
│   ├── __init__.py
│   ├── common.py
│   ├── auth.py
│   ├── user.py
│   ├── venue.py
│   ├── event_request.py
│   ├── asset.py
│   ├── reservation.py
│   ├── quotation.py
│   ├── task.py
│   └── room_layout.py
```

---

### `app/schemas/common.py`

```python
from pydantic import BaseModel
from typing import TypeVar, Generic, List
from uuid import UUID

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    limit: int
    offset: int


class MessageResponse(BaseModel):
    message: str


class IDResponse(BaseModel):
    id: UUID
```

---

### `app/schemas/auth.py`

```python
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = None
    organization: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int          # seconds until expiry
    user: "UserResponse"


# Forward ref resolved after UserResponse is defined in user.py
```

---

### `app/schemas/user.py`

```python
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Literal


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: Literal["admin", "staff", "client"]
    phone: str | None
    organization: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    organization: str | None = None
```

---

### `app/schemas/venue.py`

```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date, time
from decimal import Decimal
from typing import Literal, List


class VenueResponse(BaseModel):
    id: UUID
    name: str
    floor: int
    capacity_min: int
    capacity_max: int
    area_sqm: Decimal | None
    description: str | None
    amenities: List[str]
    status: Literal["active", "maintenance", "unavailable"]
    three_d_room_id: str | None
    color_hex: str | None
    base_price_per_hour: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


class VenueCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    floor: int = Field(ge=-5, le=10)
    capacity_min: int = Field(ge=0, default=0)
    capacity_max: int = Field(gt=0)
    area_sqm: Decimal | None = None
    description: str | None = None
    amenities: List[str] = []
    three_d_room_id: str | None = None
    color_hex: str | None = None
    base_price_per_hour: Decimal = Field(ge=0, default=0)


class VenueUpdateRequest(BaseModel):
    name: str | None = None
    capacity_min: int | None = None
    capacity_max: int | None = None
    area_sqm: Decimal | None = None
    description: str | None = None
    amenities: List[str] | None = None
    status: Literal["active", "maintenance", "unavailable"] | None = None
    base_price_per_hour: Decimal | None = None


class AvailableSlot(BaseModel):
    start: str   # "HH:MM"
    end: str     # "HH:MM"


class OccupiedSlot(BaseModel):
    start: str
    end: str
    event_request_id: UUID
    event_title: str
    attendees: int


class VenueAvailabilityResponse(BaseModel):
    venue_id: UUID
    date: date
    duration_hours: float
    available_slots: List[AvailableSlot]
    occupied_slots: List[OccupiedSlot]
    is_fully_available: bool
```

---

### `app/schemas/event_request.py`

```python
from pydantic import BaseModel, Field, model_validator
from uuid import UUID
from datetime import datetime, date, time
from typing import Literal, List, Any


EventStatus = Literal[
    "draft", "submitted", "under_review", "quotation_sent",
    "approved", "confirmed", "rejected", "cancelled", "completed"
]

EventType = Literal[
    "conference", "workshop", "concert", "exhibition",
    "hackathon", "dinner", "private", "other"
]


class EventRequestCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    event_type: EventType
    description: str | None = None
    requested_date: date
    start_time: time
    end_time: time
    attendee_count: int = Field(gt=0, le=10000)
    venue_id: UUID | None = None
    special_requirements: str | None = None
    setup_time_minutes: int = Field(ge=0, le=480, default=60)
    teardown_time_minutes: int = Field(ge=0, le=480, default=60)

    @model_validator(mode="after")
    def validate_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class EventRequestUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    requested_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    attendee_count: int | None = None
    venue_id: UUID | None = None
    special_requirements: str | None = None
    setup_time_minutes: int | None = None
    teardown_time_minutes: int | None = None


class AssignVenueRequest(BaseModel):
    venue_id: UUID


class RejectRequest(BaseModel):
    reason: str = Field(min_length=5)


class EventRequestSummary(BaseModel):
    """Compact response for list views."""
    id: UUID
    title: str
    event_type: str
    status: EventStatus
    requested_date: date
    start_time: time
    end_time: time
    attendee_count: int
    venue_id: UUID | None
    venue_name: str | None
    client_id: UUID | None
    client_name: str | None
    has_ai_proposal: bool
    has_conflicts: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class EventRequestDetail(BaseModel):
    """Full response including AI proposal and conflicts."""
    id: UUID
    title: str
    event_type: str
    description: str | None
    status: EventStatus
    requested_date: date
    start_time: time
    end_time: time
    attendee_count: int
    setup_time_minutes: int
    teardown_time_minutes: int
    special_requirements: str | None
    venue_id: UUID | None
    venue: "VenueResponse | None"
    client_id: UUID | None
    client: "UserResponse | None"
    assigned_staff_id: UUID | None
    rejection_reason: str | None
    ai_proposal_json: Any | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StatusTransitionResponse(BaseModel):
    id: UUID
    previous_status: EventStatus
    new_status: EventStatus
    message: str
```

---

### `app/schemas/asset.py`

```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Literal


AssetCategory = Literal["seating", "tables", "av_equipment", "staging", "lighting", "misc"]

# Valid Three.js model keys (must match MODEL_CATALOG in Three.js factories.js)
ThreeDItemKey = Literal[
    "office_table", "office_chair", "office_monitor", "keyboard_mouse",
    "simple_table", "simple_chair", "speaker", "microphone_stand",
    "wall_flat_tv", "led_tv", "whiteboard"
]


class AssetResponse(BaseModel):
    id: UUID
    name: str
    category: AssetCategory
    tracking_type: Literal["pool", "instance"]
    total_quantity: int
    description: str | None
    unit_price: Decimal
    three_d_item_key: ThreeDItemKey | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AssetCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    category: AssetCategory
    tracking_type: Literal["pool", "instance"] = "pool"
    total_quantity: int = Field(ge=0)
    description: str | None = None
    unit_price: Decimal = Field(ge=0, default=0)
    three_d_item_key: ThreeDItemKey | None = None


class AssetAvailabilityResponse(BaseModel):
    asset_id: UUID
    asset_name: str
    total_quantity: int
    reserved_quantity: int
    available_quantity: int
    is_available: bool
    reservations_in_window: list[dict]


class AssetSummaryItem(BaseModel):
    asset_id: UUID
    name: str
    category: str
    total_quantity: int
    available_quantity: int
    reserved_quantity: int
    availability_pct: float       # 0.0 to 1.0
    has_conflict_next_7_days: bool


class BulkReserveRequest(BaseModel):
    assets: list[dict]   # [{asset_id: UUID, quantity: int}]


class BulkReserveResponse(BaseModel):
    can_fulfill_all: bool
    results: list[dict]   # per asset: {asset_id, name, requested, confirmed, status, conflict_reason?}
```

---

### `app/schemas/reservation.py`

```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Literal


class ReservationCreate(BaseModel):
    event_request_id: UUID
    asset_id: UUID
    quantity_requested: int = Field(gt=0)
    reservation_start: datetime
    reservation_end: datetime


class ReservationResponse(BaseModel):
    id: UUID
    event_request_id: UUID
    asset_id: UUID
    asset_name: str
    quantity_requested: int
    quantity_confirmed: int
    reservation_start: datetime
    reservation_end: datetime
    status: Literal["pending", "confirmed", "cancelled", "released"]
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
```

---

### `app/schemas/quotation.py`

```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from typing import Literal


class QuotationLineItem(BaseModel):
    category: str
    name: str
    qty: int
    unit_price: Decimal
    total: Decimal


class QuotationResponse(BaseModel):
    id: UUID
    event_request_id: UUID
    line_items: list[QuotationLineItem]
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    valid_until: date
    status: Literal["draft", "sent", "accepted", "rejected", "expired"]
    generated_by_ai: bool
    ai_notes: str | None
    admin_notes: str | None
    sent_at: datetime | None
    accepted_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class QuotationUpdateRequest(BaseModel):
    line_items: list[QuotationLineItem] | None = None
    admin_notes: str | None = None
    tax_rate: Decimal | None = None
```

---

### `app/schemas/task.py`

```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Literal


TaskType = Literal["setup", "teardown", "preparation", "logistics", "coordination"]
TaskStatus = Literal["pending", "assigned", "in_progress", "done", "blocked"]


class TaskResponse(BaseModel):
    id: UUID
    event_request_id: UUID
    event_title: str | None    # joined from event_request
    title: str
    description: str | None
    task_type: TaskType
    assigned_to: UUID | None
    assignee_name: str | None  # joined from users
    due_at: datetime
    completed_at: datetime | None
    status: TaskStatus
    priority: int
    depends_on: UUID | None
    ai_generated: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    assigned_to: UUID | None = None
    due_at: datetime | None = None
    status: TaskStatus | None = None
    priority: int | None = Field(None, ge=1, le=3)
```

---

### `app/schemas/room_layout.py`

```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Literal, Any


class RoomLayoutItem(BaseModel):
    """
    A single furniture item in the Three.js coordinate space.
    This schema exactly mirrors what furnishing.js serializeLayout() produces
    and what applyLayoutFromPlan() consumes.

    Three.js MODEL_CATALOG keys:
      office_table | office_chair | office_monitor | keyboard_mouse |
      simple_table | simple_chair | speaker | microphone_stand |
      wall_flat_tv | led_tv | whiteboard
    """
    modelKey: str             # key from MODEL_CATALOG in factories.js
    x: float                  # room-local X position (meters)
    y: float                  # room-local Y position (meters, 0 = floor)
    z: float                  # room-local Z position (meters)
    rotY: float = 0.0         # Y-axis rotation (radians)
    type: Literal["floor", "wall"] = "floor"
    surfaceY: float | None = None   # floor items only: bottom Y for stacking
    wallAxis: Literal["x", "z"] | None = None  # wall items: which wall axis
    wallCoord: float | None = None             # wall items: coordinate along wall axis
    isPositiveWall: bool | None = None         # wall items: which side
    mountY: float | None = None               # wall items: height on wall
    scale: dict | None = None                  # optional scale override {w?, h?, d?}


class RoomLayoutResponse(BaseModel):
    id: UUID
    venue_id: UUID
    venue_name: str | None
    three_d_room_id: str | None
    event_request_id: UUID | None
    name: str
    items_json: list[RoomLayoutItem]
    item_count: int
    source: Literal["manual", "template", "ai_generated"]
    ai_prompt: str | None
    thumbnail_url: str | None
    is_current: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RoomLayoutCreateRequest(BaseModel):
    venue_id: UUID
    name: str = Field(min_length=2, max_length=255)
    items_json: list[RoomLayoutItem]
    source: Literal["manual", "template", "ai_generated"] = "manual"
    ai_prompt: str | None = None
    event_request_id: UUID | None = None
```

---

### Phase B3 Gate

- [ ] All schema files import cleanly (`python -c "from app.schemas import *"`)
- [ ] FastAPI generates correct OpenAPI spec at `/docs`
- [ ] No circular import errors

---

## Phase B4: Authentication & Authorization

### Goal
Implement JWT-based auth. Users can register (defaults to `client` role), log in,
and get their profile. Protected dependencies enforce role-based access.

### Prerequisites
Phases B1–B3 complete.

### Files Created/Modified

```
app/
├── utils/
│   └── auth.py              (new)
├── services/
│   └── auth_service.py      (new)
├── routers/
│   └── auth.py              (new)
├── dependencies.py          (new)
└── main.py                  (modified: register router)
```

---

### `app/utils/auth.py`

```python
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, role: str, email: str) -> tuple[str, int]:
    """
    Returns (token, expires_in_seconds).
    """
    expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    payload = {
        "sub": user_id,
        "role": role,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, expire_minutes * 60


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
```

---

### `app/services/auth_service.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.auth import RegisterRequest
from app.utils.auth import hash_password, verify_password
from fastapi import HTTPException, status
import uuid


async def register_user(data: RegisterRequest, db: AsyncSession) -> User:
    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )
    user = User(
        id=uuid.uuid4(),
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        organization=data.organization,
        role="client",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(email: str, password: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.email == email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    return user


async def get_user_by_id(user_id: str, db: AsyncSession) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
```

---

### `app/dependencies.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.utils.auth import decode_token
from app.models.user import User
from app.services.auth_service import get_user_by_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")
    user = await get_user_by_id(payload["sub"], db)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or deactivated.")
    return user


def require_roles(*roles: str):
    """
    Usage:
        @router.get("/admin-only")
        async def admin_only(user: User = Depends(require_roles("admin"))):
            ...
    """
    async def role_guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of: {', '.join(roles)}."
            )
        return current_user
    return role_guard


# Convenience aliases
require_admin = require_roles("admin")
require_staff = require_roles("admin", "staff")
```

---

### `app/routers/auth.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import register_user, authenticate_user
from app.utils.auth import create_access_token
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await register_user(data, db)
    token, expires_in = create_access_token(str(user.id), user.role, user.email)
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(data.email, data.password, db)
    token, expires_in = create_access_token(str(user.id), user.role, user.email)
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
```

---

### `app/main.py` — Updated to Register Auth Router

Add after the health check definition:

```python
from app.routers.auth import router as auth_router

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
```

---

### Endpoints Produced by Phase B4

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | None | Create account (client role) |
| `POST` | `/api/v1/auth/login` | None | Get access token |
| `GET` | `/api/v1/auth/me` | Bearer | Get current user profile |

### Phase B4 Gate

```bash
# Register
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pyramid.al","password":"Admin1234!","full_name":"Admin User"}'
# Expected: 201 with {access_token, user}

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pyramid.al","password":"Admin1234!"}'
# Expected: 200 with {access_token, token_type, expires_in, user}

# Me (replace TOKEN)
curl http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer TOKEN"
# Expected: 200 with user object

# Wrong password
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pyramid.al","password":"wrong"}'
# Expected: 401
```

Also: manually update the seeded admin user's role to `admin` in Supabase dashboard
since the register endpoint defaults all users to `client`.

---

## Phase B5: Venues API

### Goal
Full CRUD for Pyramid venues plus a real-time availability slot calculator that
considers all approved/confirmed events (including their setup/teardown buffers).

### Prerequisites
Phases B1–B4 complete.

### Files Created

```
app/
├── services/
│   ├── venue_service.py       (new)
│   └── availability_service.py (new)
└── routers/
    └── venues.py              (new)
```

---

### `app/services/venue_service.py`

```python
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.venue import Venue
from app.schemas.venue import VenueCreateRequest, VenueUpdateRequest
from fastapi import HTTPException, status
import uuid


async def list_venues(db: AsyncSession, active_only: bool = True) -> list[Venue]:
    stmt = select(Venue)
    if active_only:
        stmt = stmt.where(Venue.status == "active")
    result = await db.execute(stmt.order_by(Venue.floor, Venue.name))
    return result.scalars().all()


async def get_venue(venue_id: UUID, db: AsyncSession) -> Venue:
    result = await db.execute(select(Venue).where(Venue.id == venue_id))
    venue = result.scalar_one_or_none()
    if not venue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found.")
    return venue


async def create_venue(data: VenueCreateRequest, db: AsyncSession) -> Venue:
    venue = Venue(id=uuid.uuid4(), **data.model_dump())
    db.add(venue)
    await db.commit()
    await db.refresh(venue)
    return venue


async def update_venue(venue_id: UUID, data: VenueUpdateRequest, db: AsyncSession) -> Venue:
    venue = await get_venue(venue_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(venue, field, value)
    await db.commit()
    await db.refresh(venue)
    return venue
```

---

### `app/services/availability_service.py`

```python
from uuid import UUID
from datetime import date, time, datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.event_request import EventRequest
from app.schemas.venue import VenueAvailabilityResponse, AvailableSlot, OccupiedSlot


CONFIRMED_STATUSES = {"approved", "confirmed"}
WORKING_DAY_START = time(7, 0)   # Pyramid opens at 07:00
WORKING_DAY_END = time(23, 0)    # Pyramid closes at 23:00


async def get_venue_availability(
    venue_id: UUID,
    check_date: date,
    duration_hours: float,
    db: AsyncSession,
) -> VenueAvailabilityResponse:
    """
    Returns available time slots for a venue on a given date.
    Accounts for setup_time_minutes before and teardown_time_minutes after each event.
    """
    # Fetch all approved/confirmed events for this venue on this date
    stmt = select(EventRequest).where(
        and_(
            EventRequest.venue_id == venue_id,
            EventRequest.requested_date == check_date,
            EventRequest.status.in_(CONFIRMED_STATUSES),
        )
    )
    result = await db.execute(stmt)
    events = result.scalars().all()

    # Build blocked intervals (as minutes since midnight)
    blocked: list[tuple[int, int, dict]] = []
    for ev in events:
        start_min = ev.start_time.hour * 60 + ev.start_time.minute
        end_min = ev.end_time.hour * 60 + ev.end_time.minute
        # Expand by setup/teardown buffer
        buffered_start = max(0, start_min - ev.setup_time_minutes)
        buffered_end = min(23 * 60, end_min + ev.teardown_time_minutes)
        blocked.append((buffered_start, buffered_end, {
            "event_request_id": ev.id,
            "event_title": ev.title,
            "attendees": ev.attendee_count,
            "start": f"{ev.start_time.hour:02d}:{ev.start_time.minute:02d}",
            "end": f"{ev.end_time.hour:02d}:{ev.end_time.minute:02d}",
        }))
    blocked.sort(key=lambda t: t[0])

    # Compute free slots within working hours
    duration_min = int(duration_hours * 60)
    day_start = WORKING_DAY_START.hour * 60
    day_end = WORKING_DAY_END.hour * 60

    free_slots: list[AvailableSlot] = []
    occupied_slots: list[OccupiedSlot] = []
    cursor = day_start

    for (b_start, b_end, meta) in blocked:
        if cursor < b_start and (b_start - cursor) >= duration_min:
            free_slots.append(AvailableSlot(
                start=_mins_to_str(cursor),
                end=_mins_to_str(b_start),
            ))
        occupied_slots.append(OccupiedSlot(
            start=meta["start"],
            end=meta["end"],
            event_request_id=meta["event_request_id"],
            event_title=meta["event_title"],
            attendees=meta["attendees"],
        ))
        cursor = max(cursor, b_end)

    if cursor < day_end and (day_end - cursor) >= duration_min:
        free_slots.append(AvailableSlot(start=_mins_to_str(cursor), end=_mins_to_str(day_end)))

    return VenueAvailabilityResponse(
        venue_id=venue_id,
        date=check_date,
        duration_hours=duration_hours,
        available_slots=free_slots,
        occupied_slots=occupied_slots,
        is_fully_available=(len(blocked) == 0),
    )


def _mins_to_str(mins: int) -> str:
    h, m = divmod(mins, 60)
    return f"{h:02d}:{m:02d}"
```

---

### `app/routers/venues.py`

```python
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.venue import (
    VenueResponse, VenueCreateRequest, VenueUpdateRequest, VenueAvailabilityResponse
)
from app.services import venue_service, availability_service
from app.dependencies import require_admin
from app.models.user import User

router = APIRouter()


@router.get("", response_model=list[VenueResponse])
async def list_venues(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    venues = await venue_service.list_venues(db, active_only=active_only)
    return [VenueResponse.model_validate(v) for v in venues]


@router.get("/{venue_id}", response_model=VenueResponse)
async def get_venue(venue_id: UUID, db: AsyncSession = Depends(get_db)):
    venue = await venue_service.get_venue(venue_id, db)
    return VenueResponse.model_validate(venue)


@router.get("/{venue_id}/availability", response_model=VenueAvailabilityResponse)
async def get_availability(
    venue_id: UUID,
    check_date: date = Query(..., alias="date"),
    duration_hours: float = Query(2.0),
    db: AsyncSession = Depends(get_db),
):
    return await availability_service.get_venue_availability(venue_id, check_date, duration_hours, db)


@router.post("", response_model=VenueResponse, status_code=201)
async def create_venue(
    data: VenueCreateRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    venue = await venue_service.create_venue(data, db)
    return VenueResponse.model_validate(venue)


@router.put("/{venue_id}", response_model=VenueResponse)
async def update_venue(
    venue_id: UUID,
    data: VenueUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    venue = await venue_service.update_venue(venue_id, data, db)
    return VenueResponse.model_validate(venue)
```

---

### Endpoints Produced by Phase B5

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/venues` | None | List all active venues |
| `GET` | `/api/v1/venues/{id}` | None | Get venue detail |
| `GET` | `/api/v1/venues/{id}/availability?date=&duration_hours=` | None | Available time slots |
| `POST` | `/api/v1/venues` | Admin | Create venue |
| `PUT` | `/api/v1/venues/{id}` | Admin | Update venue |

### Phase B5 Gate

```bash
# List venues (should return 5 seeded venues)
curl http://localhost:8080/api/v1/venues
# Expected: array of 5 venue objects

# Availability for Blue Room on July 15
curl "http://localhost:8080/api/v1/venues/{BLUE_ROOM_ID}/availability?date=2026-07-15&duration_hours=4"
# Expected: {available_slots: [{start:"07:00",end:"23:00"}], occupied_slots:[], is_fully_available:true}
```

---

## Phase B6: Event Request Lifecycle

### Goal
The core of the platform. Clients submit requests, admins review them through a
state machine. Every status transition has explicit business rules and triggers side
effects (AI intake, notifications). Full context endpoint returns everything needed
for the admin detail view in one call.

### Prerequisites
Phases B1–B5 complete.

### Files Created

```
app/
├── services/
│   └── request_service.py    (new)
└── routers/
    └── requests.py           (new)
```

---

### `app/services/request_service.py`

```python
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from app.models.event_request import EventRequest, REQUEST_STATUSES
from app.models.user import User
from app.models.venue import Venue
from app.schemas.event_request import EventRequestCreate, EventRequestUpdate
from fastapi import HTTPException, status
import uuid

# Valid transitions: {current_status: [allowed_next_statuses]}
ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    "draft":           ["submitted", "cancelled"],
    "submitted":       ["under_review", "cancelled"],
    "under_review":    ["quotation_sent", "approved", "rejected", "cancelled"],
    "quotation_sent":  ["approved", "rejected", "cancelled"],
    "approved":        ["confirmed", "cancelled"],
    "confirmed":       ["completed", "cancelled"],
    "rejected":        [],
    "cancelled":       [],
    "completed":       [],
}


async def create_request(
    data: EventRequestCreate,
    client_id: UUID,
    db: AsyncSession,
) -> EventRequest:
    req = EventRequest(
        id=uuid.uuid4(),
        client_id=client_id,
        status="submitted",
        **data.model_dump(),
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


async def get_request(request_id: UUID, db: AsyncSession) -> EventRequest:
    result = await db.execute(select(EventRequest).where(EventRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    return req


async def list_requests(
    db: AsyncSession,
    client_id: UUID | None = None,
    status_filter: str | None = None,
    venue_id: UUID | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[EventRequest], int]:
    stmt = select(EventRequest)
    if client_id:
        stmt = stmt.where(EventRequest.client_id == client_id)
    if status_filter:
        stmt = stmt.where(EventRequest.status == status_filter)
    if venue_id:
        stmt = stmt.where(EventRequest.venue_id == venue_id)

    count_stmt = stmt.with_only_columns(EventRequest.id)
    total = len((await db.execute(count_stmt)).all())

    stmt = stmt.order_by(desc(EventRequest.created_at)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all(), total


async def transition_status(
    request_id: UUID,
    new_status: str,
    actor: User,
    db: AsyncSession,
    reason: str | None = None,
) -> EventRequest:
    req = await get_request(request_id, db)

    allowed = ALLOWED_TRANSITIONS.get(req.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot transition from '{req.status}' to '{new_status}'. "
                   f"Allowed: {allowed}"
        )

    old_status = req.status
    req.status = new_status

    if new_status == "rejected" and reason:
        req.rejection_reason = reason

    await db.commit()
    await db.refresh(req)

    # Side effects are triggered by the router using BackgroundTasks
    # (not here in the service, to keep service layer pure)
    return req


async def update_request(
    request_id: UUID,
    data: EventRequestUpdate,
    actor: User,
    db: AsyncSession,
) -> EventRequest:
    req = await get_request(request_id, db)

    # Clients can only edit their own requests in draft/submitted status
    if actor.role == "client":
        if req.client_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your request.")
        if req.status not in ("draft", "submitted"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Can only edit requests in draft or submitted status."
            )

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(req, field, value)

    await db.commit()
    await db.refresh(req)
    return req


async def assign_venue(request_id: UUID, venue_id: UUID, actor: User, db: AsyncSession) -> EventRequest:
    req = await get_request(request_id, db)
    if req.status not in ("submitted", "under_review"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can only assign venue when request is submitted or under review."
        )
    # Verify venue exists
    v_result = await db.execute(select(Venue).where(Venue.id == venue_id))
    if not v_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found.")

    req.venue_id = venue_id
    if req.status == "submitted":
        req.status = "under_review"
    await db.commit()
    await db.refresh(req)
    return req


async def update_ai_proposal(request_id: UUID, proposal: dict, db: AsyncSession) -> None:
    """Called by the AI intake background task to save the proposal."""
    req = await get_request(request_id, db)
    req.ai_proposal_json = proposal
    await db.commit()


async def get_full_context(request_id: UUID, db: AsyncSession) -> dict:
    """
    Returns all data needed for the admin RequestDetailView in one query.
    Joins venue, client, assigned_staff, quotation, tasks summary.
    """
    from app.models.quotation import Quotation
    from app.models.task import Task
    from sqlalchemy import func

    req = await get_request(request_id, db)

    # Venue
    venue = None
    if req.venue_id:
        v_result = await db.execute(select(Venue).where(Venue.id == req.venue_id))
        venue = v_result.scalar_one_or_none()

    # Client
    client = None
    if req.client_id:
        c_result = await db.execute(select(User).where(User.id == req.client_id))
        client = c_result.scalar_one_or_none()

    # Latest quotation
    q_result = await db.execute(
        select(Quotation)
        .where(Quotation.event_request_id == request_id)
        .order_by(desc(Quotation.created_at))
        .limit(1)
    )
    quotation = q_result.scalar_one_or_none()

    # Tasks summary
    t_result = await db.execute(
        select(Task).where(Task.event_request_id == request_id)
    )
    tasks = t_result.scalars().all()

    return {
        "request": req,
        "venue": venue,
        "client": client,
        "quotation": quotation,
        "tasks": tasks,
        "tasks_total": len(tasks),
        "tasks_done": sum(1 for t in tasks if t.status == "done"),
    }
```

---

### `app/routers/requests.py`

```python
from uuid import UUID
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.event_request import (
    EventRequestCreate, EventRequestUpdate, EventRequestSummary,
    EventRequestDetail, AssignVenueRequest, RejectRequest, StatusTransitionResponse
)
from app.schemas.common import PaginatedResponse
from app.services import request_service
from app.dependencies import get_current_user, require_staff, require_admin
from app.models.user import User

router = APIRouter()


@router.post("", response_model=EventRequestDetail, status_code=201)
async def create_request(
    data: EventRequestCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = await request_service.create_request(data, current_user.id, db)

    # Trigger AI intake analysis asynchronously (non-blocking)
    background_tasks.add_task(_run_ai_intake, req.id)

    # Notify admin channel via WebSocket (non-blocking)
    background_tasks.add_task(_notify_admin_new_request, req.id, req.title)

    context = await request_service.get_full_context(req.id, db)
    return _build_detail_response(context)


@router.get("", response_model=PaginatedResponse[EventRequestSummary])
async def list_requests(
    status: str | None = Query(None),
    venue_id: UUID | None = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Clients see only their own requests
    client_filter = None if current_user.role in ("admin", "staff") else current_user.id
    requests, total = await request_service.list_requests(db, client_filter, status, venue_id, limit, offset)
    items = [_build_summary(r) for r in requests]
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{request_id}", response_model=EventRequestDetail)
async def get_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    context = await request_service.get_full_context(request_id, db)
    req = context["request"]
    if current_user.role == "client" and req.client_id != current_user.id:
        from fastapi import HTTPException, status as http_status
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Not your request.")
    return _build_detail_response(context)


@router.put("/{request_id}", response_model=EventRequestDetail)
async def update_request(
    request_id: UUID,
    data: EventRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await request_service.update_request(request_id, data, current_user, db)
    context = await request_service.get_full_context(request_id, db)
    return _build_detail_response(context)


@router.post("/{request_id}/assign-venue", response_model=StatusTransitionResponse)
async def assign_venue(
    request_id: UUID,
    data: AssignVenueRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    req = await request_service.assign_venue(request_id, data.venue_id, current_user, db)
    return StatusTransitionResponse(
        id=req.id,
        previous_status="submitted",
        new_status=req.status,
        message=f"Venue assigned. Request moved to {req.status}.",
    )


@router.post("/{request_id}/approve", response_model=StatusTransitionResponse)
async def approve_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    req = await request_service.transition_status(request_id, "approved", current_user, db)
    # Confirm all pending reservations and auto-generate task list
    background_tasks.add_task(_confirm_reservations_and_generate_tasks, request_id)
    background_tasks.add_task(_notify_admin_status_change, request_id, "approved")
    return StatusTransitionResponse(
        id=req.id, previous_status="under_review", new_status="approved",
        message="Request approved. Asset reservations confirmed and task list is being generated.",
    )


@router.post("/{request_id}/reject", response_model=StatusTransitionResponse)
async def reject_request(
    request_id: UUID,
    data: RejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    req = await request_service.transition_status(request_id, "rejected", current_user, db, reason=data.reason)
    return StatusTransitionResponse(
        id=req.id, previous_status="under_review", new_status="rejected",
        message="Request rejected.",
    )


@router.post("/{request_id}/complete", response_model=StatusTransitionResponse)
async def complete_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    req = await request_service.transition_status(request_id, "completed", current_user, db)
    return StatusTransitionResponse(
        id=req.id, previous_status="confirmed", new_status="completed",
        message="Event marked as completed.",
    )


# ── Background tasks ──────────────────────────────────────────────────────────

async def _run_ai_intake(request_id: UUID):
    """Triggered after request submission. Runs AI intake agent."""
    from app.database import AsyncSessionLocal
    from app.ai.agent import run_agent
    from app.services.request_service import get_request, update_ai_proposal

    async with AsyncSessionLocal() as db:
        req = await get_request(request_id, db)
        context = {
            "request_id": str(request_id),
            "event_type": req.event_type,
            "attendee_count": req.attendee_count,
            "date": str(req.requested_date),
            "start_time": str(req.start_time),
            "end_time": str(req.end_time),
            "special_requirements": req.special_requirements or "",
        }
        try:
            result = await run_agent("intake", f"Analyze this event request and generate a proposal: {req.title}", context, db=db)
            await update_ai_proposal(request_id, {
                "status": "complete",
                "summary": result["response"],
                "tool_calls": result["tool_calls_made"],
            }, db)
        except Exception as e:
            await update_ai_proposal(request_id, {"status": "error", "error": str(e)}, db)


async def _confirm_reservations_and_generate_tasks(request_id: UUID):
    """After approval: confirm asset reservations and generate task list."""
    from app.database import AsyncSessionLocal
    from app.services.asset_service import confirm_reservations_for_request
    from app.services.task_service import generate_tasks_for_request

    async with AsyncSessionLocal() as db:
        await confirm_reservations_for_request(request_id, db)
        await generate_tasks_for_request(request_id, db)


async def _notify_admin_new_request(request_id: UUID, title: str):
    from app.websocket.manager import ws_manager
    await ws_manager.broadcast_to_channel("admin", {
        "type": "REQUEST_SUBMITTED",
        "payload": {"request_id": str(request_id), "title": title},
    })


async def _notify_admin_status_change(request_id: UUID, new_status: str):
    from app.websocket.manager import ws_manager
    await ws_manager.broadcast_to_channel("admin", {
        "type": "REQUEST_STATUS_CHANGED",
        "payload": {"request_id": str(request_id), "new_status": new_status},
    })


# ── Response builders ─────────────────────────────────────────────────────────

def _build_summary(req: "EventRequest") -> "EventRequestSummary":
    from app.schemas.event_request import EventRequestSummary
    return EventRequestSummary(
        id=req.id,
        title=req.title,
        event_type=req.event_type,
        status=req.status,
        requested_date=req.requested_date,
        start_time=req.start_time,
        end_time=req.end_time,
        attendee_count=req.attendee_count,
        venue_id=req.venue_id,
        venue_name=req.venue.name if req.venue else None,
        client_id=req.client_id,
        client_name=req.client.full_name if req.client else None,
        has_ai_proposal=req.ai_proposal_json is not None,
        has_conflicts=bool(
            req.ai_proposal_json and req.ai_proposal_json.get("conflicts")
        ),
        created_at=req.created_at,
    )


def _build_detail_response(context: dict) -> "EventRequestDetail":
    from app.schemas.event_request import EventRequestDetail
    from app.schemas.venue import VenueResponse
    from app.schemas.user import UserResponse
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
        venue=VenueResponse.model_validate(context["venue"]) if context["venue"] else None,
        client_id=req.client_id,
        client=UserResponse.model_validate(context["client"]) if context["client"] else None,
        assigned_staff_id=req.assigned_staff_id,
        rejection_reason=req.rejection_reason,
        ai_proposal_json=req.ai_proposal_json,
        created_at=req.created_at,
        updated_at=req.updated_at,
    )
```

---

### Endpoints Produced by Phase B6

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/requests` | Bearer | Submit new event request |
| `GET` | `/api/v1/requests` | Bearer | List requests (filtered by role) |
| `GET` | `/api/v1/requests/{id}` | Bearer | Full request detail |
| `PUT` | `/api/v1/requests/{id}` | Bearer | Update request |
| `POST` | `/api/v1/requests/{id}/assign-venue` | Staff | Assign venue |
| `POST` | `/api/v1/requests/{id}/approve` | Staff | Approve request |
| `POST` | `/api/v1/requests/{id}/reject` | Staff | Reject with reason |
| `POST` | `/api/v1/requests/{id}/complete` | Staff | Mark completed |

### Phase B6 Gate

```bash
# Submit a test request (use your client JWT)
curl -X POST http://localhost:8080/api/v1/requests \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AlbTech Summit 2026",
    "event_type": "conference",
    "requested_date": "2026-07-15",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "attendee_count": 180
  }'
# Expected: 201 with full EventRequestDetail, status="submitted"

# Admin approves (use admin JWT, replace IDs)
curl -X POST http://localhost:8080/api/v1/requests/{ID}/assign-venue \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"venue_id": "BLUE_ROOM_UUID"}'
# Expected: status transition to "under_review"

curl -X POST http://localhost:8080/api/v1/requests/{ID}/approve \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Expected: status="approved"
```

---

## Phase B7: Inventory & Asset Management

### Goal
Full asset catalog with pool-based availability calculation, per-request bulk
reservation, and the offering system that tells admins what can actually be provided
when requested quantities exceed available stock.

### Prerequisites
Phase B6 complete.

### Files Created

```
app/
├── services/
│   ├── asset_service.py       (new)
│   └── reservation_service.py (new)
└── routers/
    ├── assets.py              (new)
    └── reservations.py        (new)
```

---

### `app/services/asset_service.py`

```python
from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.asset import Asset
from app.models.reservation import AssetReservation
from app.schemas.asset import AssetAvailabilityResponse, AssetSummaryItem, BulkReserveResponse
from fastapi import HTTPException, status


async def list_assets(
    db: AsyncSession,
    category: str | None = None,
    active_only: bool = True,
) -> list[Asset]:
    stmt = select(Asset)
    if active_only:
        stmt = stmt.where(Asset.is_active == True)
    if category:
        stmt = stmt.where(Asset.category == category)
    result = await db.execute(stmt.order_by(Asset.category, Asset.name))
    return result.scalars().all()


async def get_asset(asset_id: UUID, db: AsyncSession) -> Asset:
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.")
    return asset


async def get_reserved_quantity(
    asset_id: UUID,
    start: datetime,
    end: datetime,
    db: AsyncSession,
    exclude_request_id: UUID | None = None,
) -> int:
    """
    Returns total quantity reserved for an asset within a time window.
    Counts reservations with status in (pending, confirmed).
    Optionally excludes a specific request (for recalculation on update).
    """
    stmt = select(func.coalesce(func.sum(AssetReservation.quantity_confirmed), 0)).where(
        and_(
            AssetReservation.asset_id == asset_id,
            AssetReservation.status.in_(["pending", "confirmed"]),
            AssetReservation.reservation_start < end,
            AssetReservation.reservation_end > start,
        )
    )
    if exclude_request_id:
        stmt = stmt.where(AssetReservation.event_request_id != exclude_request_id)

    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


async def get_asset_availability(
    asset_id: UUID,
    start: datetime,
    end: datetime,
    db: AsyncSession,
) -> AssetAvailabilityResponse:
    asset = await get_asset(asset_id, db)
    reserved = await get_reserved_quantity(asset_id, start, end, db)
    available = max(0, asset.total_quantity - reserved)

    # Fetch reservation details for this window
    stmt = select(AssetReservation).where(
        and_(
            AssetReservation.asset_id == asset_id,
            AssetReservation.status.in_(["pending", "confirmed"]),
            AssetReservation.reservation_start < end,
            AssetReservation.reservation_end > start,
        )
    )
    reservations = (await db.execute(stmt)).scalars().all()
    reservations_info = [
        {
            "event_request_id": str(r.event_request_id),
            "quantity": r.quantity_confirmed,
            "status": r.status,
        }
        for r in reservations
    ]

    return AssetAvailabilityResponse(
        asset_id=asset_id,
        asset_name=asset.name,
        total_quantity=asset.total_quantity,
        reserved_quantity=reserved,
        available_quantity=available,
        is_available=(available > 0),
        reservations_in_window=reservations_info,
    )


async def get_assets_summary(db: AsyncSession) -> list[AssetSummaryItem]:
    """
    Dashboard widget: total vs available for each asset.
    Checks conflicts in the next 7 days.
    """
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    next_7_days_end = now + timedelta(days=7)

    assets = await list_assets(db)
    summary = []
    for asset in assets:
        reserved = await get_reserved_quantity(asset.id, now, next_7_days_end, db)
        available = max(0, asset.total_quantity - reserved)
        summary.append(AssetSummaryItem(
            asset_id=asset.id,
            name=asset.name,
            category=asset.category,
            total_quantity=asset.total_quantity,
            available_quantity=available,
            reserved_quantity=reserved,
            availability_pct=available / asset.total_quantity if asset.total_quantity > 0 else 0.0,
            has_conflict_next_7_days=(reserved > asset.total_quantity),
        ))
    return summary


async def bulk_reserve_for_request(
    request_id: UUID,
    asset_list: list[dict],
    reservation_start: datetime,
    reservation_end: datetime,
    db: AsyncSession,
) -> BulkReserveResponse:
    """
    Creates AssetReservation records for each requested asset.
    For any asset that cannot be fully filled, confirms what CAN be provided
    and flags the shortfall.
    """
    import uuid as uuid_module
    results = []
    can_fulfill_all = True

    for item in asset_list:
        asset_id = UUID(str(item["asset_id"])) if isinstance(item["asset_id"], str) else item["asset_id"]
        requested_qty = item["quantity"]

        asset = await get_asset(asset_id, db)
        reserved = await get_reserved_quantity(asset_id, reservation_start, reservation_end, db)
        available = max(0, asset.total_quantity - reserved)
        confirmed_qty = min(requested_qty, available)

        # Create reservation record regardless of partial fulfillment
        reservation = AssetReservation(
            id=uuid_module.uuid4(),
            event_request_id=request_id,
            asset_id=asset_id,
            quantity_requested=requested_qty,
            quantity_confirmed=confirmed_qty,
            reservation_start=reservation_start,
            reservation_end=reservation_end,
            status="pending",
        )
        db.add(reservation)

        result = {
            "asset_id": str(asset_id),
            "name": asset.name,
            "requested": requested_qty,
            "confirmed": confirmed_qty,
            "status": "fulfilled" if confirmed_qty >= requested_qty else "partial",
        }
        if confirmed_qty < requested_qty:
            can_fulfill_all = False
            result["shortfall"] = requested_qty - confirmed_qty
            result["conflict_reason"] = (
                f"Only {available} of {asset.total_quantity} available "
                f"(already reserved: {reserved})."
            )
        results.append(result)

    await db.commit()
    return BulkReserveResponse(can_fulfill_all=can_fulfill_all, results=results)


async def confirm_reservations_for_request(request_id: UUID, db: AsyncSession) -> None:
    """Move all pending reservations for a request to confirmed status."""
    from sqlalchemy import update
    await db.execute(
        update(AssetReservation)
        .where(
            and_(
                AssetReservation.event_request_id == request_id,
                AssetReservation.status == "pending",
            )
        )
        .values(status="confirmed")
    )
    await db.commit()
```

---

### `app/routers/assets.py`

```python
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.asset import (
    AssetResponse, AssetCreateRequest, AssetAvailabilityResponse,
    AssetSummaryItem, BulkReserveRequest, BulkReserveResponse
)
from app.services import asset_service
from app.dependencies import require_admin, require_staff, get_current_user
from app.models.user import User
import uuid

router = APIRouter()


@router.get("", response_model=list[AssetResponse])
async def list_assets(
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    assets = await asset_service.list_assets(db, category)
    return [AssetResponse.model_validate(a) for a in assets]


@router.get("/summary", response_model=list[AssetSummaryItem])
async def get_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff),
):
    return await asset_service.get_assets_summary(db)


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(asset_id: UUID, db: AsyncSession = Depends(get_db)):
    asset = await asset_service.get_asset(asset_id, db)
    return AssetResponse.model_validate(asset)


@router.get("/{asset_id}/availability", response_model=AssetAvailabilityResponse)
async def get_availability(
    asset_id: UUID,
    start: datetime = Query(...),
    end: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
):
    return await asset_service.get_asset_availability(asset_id, start, end, db)


@router.post("", response_model=AssetResponse, status_code=201)
async def create_asset(
    data: AssetCreateRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    from app.models.asset import Asset
    asset = Asset(id=uuid.uuid4(), **data.model_dump())
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return AssetResponse.model_validate(asset)
```

---

### `app/routers/reservations.py`

```python
from uuid import UUID
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.reservation import ReservationResponse
from app.schemas.asset import BulkReserveRequest, BulkReserveResponse
from app.models.reservation import AssetReservation
from app.services import asset_service, request_service
from app.dependencies import require_staff, get_current_user
from app.models.user import User
from sqlalchemy import select

router = APIRouter()


@router.get("", response_model=list[ReservationResponse])
async def list_reservations(
    request_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AssetReservation).where(AssetReservation.event_request_id == request_id)
    )
    reservations = result.scalars().all()
    # Build joined responses
    out = []
    for r in reservations:
        asset = await asset_service.get_asset(r.asset_id, db)
        out.append(ReservationResponse(
            id=r.id,
            event_request_id=r.event_request_id,
            asset_id=r.asset_id,
            asset_name=asset.name,
            quantity_requested=r.quantity_requested,
            quantity_confirmed=r.quantity_confirmed,
            reservation_start=r.reservation_start,
            reservation_end=r.reservation_end,
            status=r.status,
            notes=r.notes,
            created_at=r.created_at,
        ))
    return out


@router.post("/bulk/{request_id}", response_model=BulkReserveResponse)
async def bulk_reserve(
    request_id: UUID,
    data: BulkReserveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """
    Create asset reservations for an event request.
    Automatically calculates the reservation window from the event
    datetime (including setup/teardown buffers).
    """
    req = await request_service.get_request(request_id, db)
    from datetime import date, time

    def _combine(d: date, t: time) -> datetime:
        return datetime.combine(d, t).replace(tzinfo=timezone.utc)

    setup_delta = timedelta(minutes=req.setup_time_minutes)
    teardown_delta = timedelta(minutes=req.teardown_time_minutes)
    res_start = _combine(req.requested_date, req.start_time) - setup_delta
    res_end = _combine(req.requested_date, req.end_time) + teardown_delta

    return await asset_service.bulk_reserve_for_request(
        request_id, data.assets, res_start, res_end, db
    )
```

---

### Endpoints Produced by Phase B7

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/assets` | None | List all assets (filterable by category) |
| `GET` | `/api/v1/assets/summary` | Staff | Dashboard availability summary |
| `GET` | `/api/v1/assets/{id}` | None | Asset detail |
| `GET` | `/api/v1/assets/{id}/availability?start=&end=` | None | Available qty in window |
| `POST` | `/api/v1/assets` | Admin | Create asset |
| `GET` | `/api/v1/reservations?request_id=` | Bearer | List reservations for request |
| `POST` | `/api/v1/reservations/bulk/{request_id}` | Staff | Bulk reserve assets |

---

## Phase B8: Conflict Detection Engine

### Goal
A service that detects all categories of conflict for a given request and
generates structured, human-readable resolution suggestions. This powers the
"Conflicts" tab in the admin dashboard and the AI Conflict Detection Agent.

### Files Created

```
app/
├── services/
│   └── conflict_service.py    (new)
└── (conflict endpoint added to requests.py)
```

---

### `app/services/conflict_service.py`

```python
from uuid import UUID
from datetime import datetime, timezone, timedelta, date, time
from dataclasses import dataclass, field
from enum import Enum
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.event_request import EventRequest
from app.models.reservation import AssetReservation
from app.models.asset import Asset
from app.models.venue import Venue


class ConflictType(str, Enum):
    VENUE_DOUBLE_BOOKING = "venue_double_booking"
    ASSET_OVER_RESERVATION = "asset_over_reservation"
    SETUP_TEARDOWN_OVERLAP = "setup_teardown_overlap"
    STAFF_DOUBLE_ASSIGNMENT = "staff_double_assignment"


@dataclass
class Conflict:
    type: ConflictType
    severity: str              # "blocking" | "warning"
    description: str
    affected_request_ids: List[UUID] = field(default_factory=list)
    affected_asset_id: UUID | None = None
    asset_name: str | None = None
    available: int | None = None
    requested: int | None = None
    suggestion: str | None = None


async def check_all_conflicts(request_id: UUID, db: AsyncSession) -> list[Conflict]:
    """
    Runs all 4 conflict checks for a given request.
    Returns a list of Conflict objects — empty list means clear.
    """
    req_result = await db.execute(select(EventRequest).where(EventRequest.id == request_id))
    req = req_result.scalar_one_or_none()
    if not req:
        return []

    conflicts: list[Conflict] = []
    conflicts.extend(await _check_venue_double_booking(req, db))
    conflicts.extend(await _check_asset_over_reservation(req, db))
    conflicts.extend(await _check_setup_teardown_overlap(req, db))
    if req.assigned_staff_id:
        conflicts.extend(await _check_staff_double_assignment(req, db))

    return conflicts


async def _check_venue_double_booking(req: EventRequest, db: AsyncSession) -> list[Conflict]:
    """Check if the assigned venue has another approved/confirmed event at the same time."""
    if not req.venue_id:
        return []

    stmt = select(EventRequest).where(
        and_(
            EventRequest.venue_id == req.venue_id,
            EventRequest.id != req.id,
            EventRequest.requested_date == req.requested_date,
            EventRequest.status.in_(["approved", "confirmed"]),
        )
    )
    result = await db.execute(stmt)
    conflicts_found = []
    for other in result.scalars().all():
        # Check time overlap
        if _times_overlap(req.start_time, req.end_time, other.start_time, other.end_time):
            conflicts_found.append(Conflict(
                type=ConflictType.VENUE_DOUBLE_BOOKING,
                severity="blocking",
                description=(
                    f"Venue is already booked for '{other.title}' "
                    f"({other.start_time:%H:%M}–{other.end_time:%H:%M}) on the same day."
                ),
                affected_request_ids=[other.id],
                suggestion=(
                    f"Consider rescheduling to a different time slot, or "
                    f"use an alternative venue. "
                    f"Current event ends at {other.end_time:%H:%M} + {other.teardown_time_minutes}min teardown."
                ),
            ))
    return conflicts_found


async def _check_asset_over_reservation(req: EventRequest, db: AsyncSession) -> list[Conflict]:
    """Check if any asset reservation for this request exceeds available pool."""
    res_result = await db.execute(
        select(AssetReservation).where(
            and_(
                AssetReservation.event_request_id == req.id,
                AssetReservation.status.in_(["pending", "confirmed"]),
            )
        )
    )
    reservations = res_result.scalars().all()
    conflicts_found = []

    for reservation in reservations:
        asset_result = await db.execute(select(Asset).where(Asset.id == reservation.asset_id))
        asset = asset_result.scalar_one_or_none()
        if not asset:
            continue

        # Count all other confirmed reservations for this asset in the same window
        from sqlalchemy import func
        other_reserved_stmt = select(
            func.coalesce(func.sum(AssetReservation.quantity_confirmed), 0)
        ).where(
            and_(
                AssetReservation.asset_id == reservation.asset_id,
                AssetReservation.id != reservation.id,
                AssetReservation.status.in_(["pending", "confirmed"]),
                AssetReservation.reservation_start < reservation.reservation_end,
                AssetReservation.reservation_end > reservation.reservation_start,
            )
        )
        other_reserved = int((await db.execute(other_reserved_stmt)).scalar_one() or 0)
        total_needed = reservation.quantity_confirmed + other_reserved
        available = asset.total_quantity - other_reserved

        if total_needed > asset.total_quantity:
            conflicts_found.append(Conflict(
                type=ConflictType.ASSET_OVER_RESERVATION,
                severity="blocking",
                description=(
                    f"Asset '{asset.name}' is over-reserved: "
                    f"{total_needed} needed across all events, only {asset.total_quantity} total."
                ),
                affected_asset_id=asset.id,
                asset_name=asset.name,
                available=max(0, available),
                requested=reservation.quantity_confirmed,
                suggestion=(
                    f"Only {max(0, available)} {asset.name}(s) available for this window. "
                    f"Consider reducing to {max(0, available)} or arranging external rental."
                ),
            ))

    return conflicts_found


async def _check_setup_teardown_overlap(req: EventRequest, db: AsyncSession) -> list[Conflict]:
    """Check if setup/teardown buffers of this request overlap with another event."""
    if not req.venue_id:
        return []

    def _combine(d: date, t: time, delta_minutes: int, direction: int) -> datetime:
        dt = datetime.combine(d, t)
        return dt + timedelta(minutes=direction * delta_minutes)

    buffered_start = _combine(req.requested_date, req.start_time, req.setup_time_minutes, -1)
    buffered_end = _combine(req.requested_date, req.end_time, req.teardown_time_minutes, 1)

    stmt = select(EventRequest).where(
        and_(
            EventRequest.venue_id == req.venue_id,
            EventRequest.id != req.id,
            EventRequest.requested_date == req.requested_date,
            EventRequest.status.in_(["approved", "confirmed"]),
        )
    )
    result = await db.execute(stmt)
    conflicts_found = []
    for other in result.scalars().all():
        other_start = datetime.combine(other.requested_date, other.start_time)
        other_end = datetime.combine(other.requested_date, other.end_time)
        if buffered_start < other_end and buffered_end > other_start:
            if not _times_overlap(req.start_time, req.end_time, other.start_time, other.end_time):
                # Only a buffer overlap, not a direct booking overlap
                conflicts_found.append(Conflict(
                    type=ConflictType.SETUP_TEARDOWN_OVERLAP,
                    severity="warning",
                    description=(
                        f"Your setup/teardown buffer overlaps with '{other.title}'. "
                        f"This may cause logistical pressure for staff."
                    ),
                    affected_request_ids=[other.id],
                    suggestion=(
                        f"Reduce setup time from {req.setup_time_minutes}min or "
                        f"teardown from {req.teardown_time_minutes}min, "
                        f"or negotiate a gap between events."
                    ),
                ))
    return conflicts_found


async def _check_staff_double_assignment(req: EventRequest, db: AsyncSession) -> list[Conflict]:
    """Check if the assigned staff member is handling another event same day."""
    stmt = select(EventRequest).where(
        and_(
            EventRequest.assigned_staff_id == req.assigned_staff_id,
            EventRequest.id != req.id,
            EventRequest.requested_date == req.requested_date,
            EventRequest.status.in_(["approved", "confirmed"]),
        )
    )
    result = await db.execute(stmt)
    conflicts_found = []
    for other in result.scalars().all():
        conflicts_found.append(Conflict(
            type=ConflictType.STAFF_DOUBLE_ASSIGNMENT,
            severity="warning",
            description=f"Assigned staff is already coordinating '{other.title}' on the same day.",
            affected_request_ids=[other.id],
            suggestion="Assign a different staff member or coordinate a shared schedule.",
        ))
    return conflicts_found


def _times_overlap(start1: time, end1: time, start2: time, end2: time) -> bool:
    return start1 < end2 and end1 > start2


def conflicts_to_dict(conflicts: list[Conflict]) -> list[dict]:
    return [
        {
            "type": c.type.value,
            "severity": c.severity,
            "description": c.description,
            "affected_request_ids": [str(i) for i in c.affected_request_ids],
            "affected_asset_id": str(c.affected_asset_id) if c.affected_asset_id else None,
            "asset_name": c.asset_name,
            "available": c.available,
            "requested": c.requested,
            "suggestion": c.suggestion,
        }
        for c in conflicts
    ]
```

---

### Add Conflict Endpoint to `app/routers/requests.py`

```python
@router.get("/{request_id}/conflicts")
async def get_conflicts(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.conflict_service import check_all_conflicts, conflicts_to_dict
    conflicts = await check_all_conflicts(request_id, db)
    return {
        "request_id": str(request_id),
        "has_blocking_conflicts": any(c.severity == "blocking" for c in conflicts),
        "has_warnings": any(c.severity == "warning" for c in conflicts),
        "conflicts": conflicts_to_dict(conflicts),
    }
```

---

### Phase B8 Gate

Create two requests on the same date and venue and approve the first. Then check
conflicts on the second:

```bash
curl http://localhost:8080/api/v1/requests/{REQUEST_2_ID}/conflicts \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Expected: has_blocking_conflicts=true, type="venue_double_booking"
```

---

## Phase B9: Quotation Engine

### Goal
Auto-generate itemized quotations from approved requests, allow admin editing,
and expose a hook for the AI to refine them. Totals are always recomputed on save.

### Files Created

```
app/
├── services/
│   └── quotation_service.py   (new)
└── routers/
    └── quotations.py          (new)
```

---

### `app/services/quotation_service.py`

```python
from uuid import UUID
from datetime import date, timedelta, datetime, timezone, time
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.quotation import Quotation
from app.models.event_request import EventRequest
from app.models.asset import Asset
from app.models.reservation import AssetReservation
from app.models.venue import Venue
from app.schemas.quotation import QuotationLineItem
import uuid


SERVICE_FEES = {
    "conference":  [("Event Coordination Staff", 2, Decimal("80.00")), ("Setup & Teardown Labor", 4, Decimal("50.00"))],
    "workshop":    [("Workshop Facilitator Support", 1, Decimal("60.00")), ("Setup & Teardown Labor", 2, Decimal("50.00"))],
    "concert":     [("Event Coordination Staff", 3, Decimal("80.00")), ("Setup & Teardown Labor", 6, Decimal("50.00")), ("Sound Engineering", 1, Decimal("200.00"))],
    "hackathon":   [("Technical Staff On-Site", 2, Decimal("70.00")), ("Setup & Teardown Labor", 3, Decimal("50.00"))],
    "exhibition":  [("Exhibition Setup Crew", 4, Decimal("60.00")), ("Event Coordination Staff", 1, Decimal("80.00"))],
    "dinner":      [("Event Coordination Staff", 2, Decimal("80.00")), ("Setup & Teardown Labor", 2, Decimal("50.00"))],
    "private":     [("Event Coordination Staff", 1, Decimal("80.00")), ("Setup & Teardown Labor", 2, Decimal("50.00"))],
    "other":       [("Event Coordination Staff", 1, Decimal("80.00")), ("Setup & Teardown Labor", 2, Decimal("50.00"))],
}


async def generate_quotation(
    request_id: UUID,
    db: AsyncSession,
    created_by: UUID | None = None,
    use_ai: bool = False,
) -> Quotation:
    req_result = await db.execute(select(EventRequest).where(EventRequest.id == request_id))
    req = req_result.scalar_one_or_none()
    if not req:
        raise ValueError("Request not found")

    line_items: list[QuotationLineItem] = []

    # ── 1. Venue cost ──────────────────────────────────────────────────────────
    if req.venue_id:
        venue_result = await db.execute(select(Venue).where(Venue.id == req.venue_id))
        venue = venue_result.scalar_one_or_none()
        if venue:
            hours = _event_duration_hours(req.start_time, req.end_time)
            venue_total = venue.base_price_per_hour * Decimal(str(hours))
            line_items.append(QuotationLineItem(
                category="venue",
                name=f"{venue.name} — {hours:.1f} hours",
                qty=1,
                unit_price=venue_total,
                total=venue_total,
            ))

    # ── 2. Asset/equipment costs ────────────────────────────────────────────────
    res_result = await db.execute(
        select(AssetReservation).where(
            AssetReservation.event_request_id == request_id,
            AssetReservation.status.in_(["pending", "confirmed"]),
        )
    )
    for reservation in res_result.scalars().all():
        asset_result = await db.execute(select(Asset).where(Asset.id == reservation.asset_id))
        asset = asset_result.scalar_one_or_none()
        if asset and reservation.quantity_confirmed > 0:
            item_total = asset.unit_price * reservation.quantity_confirmed
            line_items.append(QuotationLineItem(
                category=asset.category,
                name=asset.name,
                qty=reservation.quantity_confirmed,
                unit_price=asset.unit_price,
                total=item_total,
            ))

    # ── 3. Service fees (based on event type) ──────────────────────────────────
    fees = SERVICE_FEES.get(req.event_type, SERVICE_FEES["other"])
    for fee_name, qty, unit_price in fees:
        line_items.append(QuotationLineItem(
            category="service",
            name=fee_name,
            qty=qty,
            unit_price=unit_price,
            total=unit_price * qty,
        ))

    # ── Compute totals ─────────────────────────────────────────────────────────
    subtotal = sum(item.total for item in line_items)
    tax_rate = Decimal("0.20")
    tax_amount = (subtotal * tax_rate).quantize(Decimal("0.01"))
    total_amount = subtotal + tax_amount

    quotation = Quotation(
        id=uuid.uuid4(),
        event_request_id=request_id,
        line_items=[item.model_dump(mode="json") for item in line_items],
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        total_amount=total_amount,
        valid_until=date.today() + timedelta(days=14),
        status="draft",
        generated_by_ai=use_ai,
        created_by=created_by,
    )
    db.add(quotation)
    await db.commit()
    await db.refresh(quotation)
    return quotation


def _event_duration_hours(start: time, end: time) -> float:
    start_min = start.hour * 60 + start.minute
    end_min = end.hour * 60 + end.minute
    return (end_min - start_min) / 60


async def recalculate_totals(quotation: Quotation, db: AsyncSession) -> Quotation:
    """Recompute subtotal, tax, total after line items are edited."""
    from decimal import Decimal
    items = quotation.line_items  # list of dicts
    subtotal = sum(Decimal(str(item["total"])) for item in items)
    tax_amount = (subtotal * quotation.tax_rate).quantize(Decimal("0.01"))
    quotation.subtotal = subtotal
    quotation.tax_amount = tax_amount
    quotation.total_amount = subtotal + tax_amount
    await db.commit()
    await db.refresh(quotation)
    return quotation
```

---

### `app/routers/quotations.py`

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.quotation import QuotationResponse, QuotationUpdateRequest
from app.services import quotation_service
from app.models.quotation import Quotation
from app.dependencies import require_staff, get_current_user
from app.models.user import User
from datetime import datetime, timezone

router = APIRouter()


@router.post("/generate/{request_id}", response_model=QuotationResponse, status_code=201)
async def generate_quotation(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    quotation = await quotation_service.generate_quotation(request_id, db, created_by=current_user.id)
    return _to_response(quotation)


@router.get("/{quotation_id}", response_model=QuotationResponse)
async def get_quotation(
    quotation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).where(Quotation.id == quotation_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")
    return _to_response(q)


@router.put("/{quotation_id}", response_model=QuotationResponse)
async def update_quotation(
    quotation_id: UUID,
    data: QuotationUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    result = await db.execute(select(Quotation).where(Quotation.id == quotation_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")
    if data.line_items is not None:
        q.line_items = [item.model_dump(mode="json") for item in data.line_items]
    if data.admin_notes is not None:
        q.admin_notes = data.admin_notes
    if data.tax_rate is not None:
        q.tax_rate = data.tax_rate
    await quotation_service.recalculate_totals(q, db)
    return _to_response(q)


@router.post("/{quotation_id}/send", response_model=QuotationResponse)
async def send_quotation(
    quotation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    result = await db.execute(select(Quotation).where(Quotation.id == quotation_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")
    q.status = "sent"
    q.sent_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(q)
    return _to_response(q)


def _to_response(q: Quotation) -> QuotationResponse:
    from app.schemas.quotation import QuotationLineItem
    return QuotationResponse(
        id=q.id,
        event_request_id=q.event_request_id,
        line_items=[QuotationLineItem(**item) for item in q.line_items],
        subtotal=q.subtotal,
        tax_rate=q.tax_rate,
        tax_amount=q.tax_amount,
        total_amount=q.total_amount,
        valid_until=q.valid_until,
        status=q.status,
        generated_by_ai=q.generated_by_ai,
        ai_notes=q.ai_notes,
        admin_notes=q.admin_notes,
        sent_at=q.sent_at,
        accepted_at=q.accepted_at,
        created_at=q.created_at,
    )
```

---

### Endpoints Produced by Phase B9

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/quotations/generate/{request_id}` | Staff | Auto-generate quotation |
| `GET` | `/api/v1/quotations/{id}` | Bearer | Get quotation |
| `PUT` | `/api/v1/quotations/{id}` | Staff | Update line items |
| `POST` | `/api/v1/quotations/{id}/send` | Staff | Mark as sent |

---

## Phase B10: Task & Operational Planning

### Goal
Auto-generate task lists for approved events, organized by type (preparation/
setup/teardown/logistics), with sensible due times relative to the event and default
priorities. Staff can update and complete tasks.

### Files Created

```
app/
├── services/
│   └── task_service.py        (new)
└── routers/
    └── tasks.py               (new)
```

---

### `app/services/task_service.py`

```python
from uuid import UUID, uuid4
from datetime import datetime, date, time, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.task import Task
from app.models.event_request import EventRequest


def _dt(d: date, t: time, delta_minutes: int = 0) -> datetime:
    return datetime.combine(d, t, tzinfo=timezone.utc) + timedelta(minutes=delta_minutes)


TASK_TEMPLATES: dict[str, list[dict]] = {
    "conference": [
        # Preparation (days before)
        {"title": "Confirm final attendee count with client", "type": "preparation", "priority": 1, "offset_from_start_hours": -72},
        {"title": "Verify all AV equipment (projector, mics, screens)", "type": "preparation", "priority": 1, "offset_from_start_hours": -48},
        {"title": "Prepare event signage and directional materials", "type": "preparation", "priority": 2, "offset_from_start_hours": -48},
        {"title": "Confirm catering/refreshment order", "type": "logistics", "priority": 2, "offset_from_start_hours": -48},
        # Setup (morning of)
        {"title": "Deliver and arrange chairs per floor plan", "type": "setup", "priority": 1, "offset_from_start_hours": -2},
        {"title": "Set up tables per approved layout", "type": "setup", "priority": 1, "offset_from_start_hours": -2},
        {"title": "Configure AV system and test all connections", "type": "setup", "priority": 1, "offset_from_start_hours": -1},
        {"title": "Install directional signage at entrance and corridors", "type": "setup", "priority": 2, "offset_from_start_hours": -1},
        {"title": "Set up registration/welcome table at entrance", "type": "setup", "priority": 2, "offset_from_start_hours": -0.5},
        # Teardown
        {"title": "Collect and return all chairs to storage", "type": "teardown", "priority": 1, "offset_from_end_hours": 1},
        {"title": "Break down and return all tables", "type": "teardown", "priority": 1, "offset_from_end_hours": 1},
        {"title": "Pack and return AV equipment to storage room", "type": "teardown", "priority": 2, "offset_from_end_hours": 2},
        {"title": "Remove signage and restore venue to neutral state", "type": "teardown", "priority": 2, "offset_from_end_hours": 2},
        {"title": "Final walkthrough and damage/inventory report", "type": "coordination", "priority": 2, "offset_from_end_hours": 2.5},
    ],
    "workshop": [
        {"title": "Prepare workshop materials and handouts", "type": "preparation", "priority": 1, "offset_from_start_hours": -48},
        {"title": "Test all laptops/PCs assigned to the room", "type": "preparation", "priority": 1, "offset_from_start_hours": -24},
        {"title": "Set up desks in workshop configuration", "type": "setup", "priority": 1, "offset_from_start_hours": -1.5},
        {"title": "Configure whiteboard and AV screen", "type": "setup", "priority": 1, "offset_from_start_hours": -1},
        {"title": "Clear and restore room after workshop", "type": "teardown", "priority": 1, "offset_from_end_hours": 1},
        {"title": "Collect equipment and store in designated area", "type": "teardown", "priority": 2, "offset_from_end_hours": 1.5},
    ],
    "hackathon": [
        {"title": "Confirm team count and assign pod positions", "type": "preparation", "priority": 1, "offset_from_start_hours": -48},
        {"title": "Test all PCs and ensure network connectivity", "type": "preparation", "priority": 1, "offset_from_start_hours": -24},
        {"title": "Set up hackathon pods (tables + chairs + PCs per team)", "type": "setup", "priority": 1, "offset_from_start_hours": -2},
        {"title": "Place whiteboards and label team areas", "type": "setup", "priority": 2, "offset_from_start_hours": -1},
        {"title": "Install power strips at each pod", "type": "setup", "priority": 1, "offset_from_start_hours": -1},
        {"title": "Collect all equipment post-hackathon", "type": "teardown", "priority": 1, "offset_from_end_hours": 2},
        {"title": "Return PCs and peripherals to IT storage", "type": "teardown", "priority": 1, "offset_from_end_hours": 3},
    ],
    "concert": [
        {"title": "Confirm stage panel setup and dimensions", "type": "preparation", "priority": 1, "offset_from_start_hours": -72},
        {"title": "Sound check with performers", "type": "preparation", "priority": 1, "offset_from_start_hours": -4},
        {"title": "Assemble stage panels", "type": "setup", "priority": 1, "offset_from_start_hours": -4},
        {"title": "Configure PA system and lighting rig", "type": "setup", "priority": 1, "offset_from_start_hours": -3},
        {"title": "Set up audience seating per capacity", "type": "setup", "priority": 1, "offset_from_start_hours": -2},
        {"title": "Post-concert venue restoration", "type": "teardown", "priority": 1, "offset_from_end_hours": 2},
        {"title": "Disassemble and store stage panels", "type": "teardown", "priority": 1, "offset_from_end_hours": 3},
    ],
}

# Default template for event types not explicitly listed
DEFAULT_TEMPLATE = TASK_TEMPLATES["conference"]


async def generate_tasks_for_request(
    request_id: UUID,
    db: AsyncSession,
    ai_generated: bool = False,
) -> list[Task]:
    req_result = await db.execute(select(EventRequest).where(EventRequest.id == request_id))
    req = req_result.scalar_one_or_none()
    if not req:
        return []

    # Delete any existing auto-generated tasks for this request
    from sqlalchemy import delete
    await db.execute(
        delete(Task).where(
            Task.event_request_id == request_id,
            Task.ai_generated == False,
        )
    )

    template = TASK_TEMPLATES.get(req.event_type, DEFAULT_TEMPLATE)
    event_start = _dt(req.requested_date, req.start_time)
    event_end = _dt(req.requested_date, req.end_time)

    tasks = []
    for tmpl in template:
        if "offset_from_start_hours" in tmpl:
            due_at = event_start + timedelta(hours=tmpl["offset_from_start_hours"])
        else:
            due_at = event_end + timedelta(hours=tmpl["offset_from_end_hours"])

        task = Task(
            id=uuid4(),
            event_request_id=request_id,
            title=tmpl["title"],
            task_type=tmpl["type"],
            due_at=due_at,
            priority=tmpl["priority"],
            status="pending",
            ai_generated=ai_generated,
        )
        db.add(task)
        tasks.append(task)

    await db.commit()
    return tasks


async def get_tasks_for_request(request_id: UUID, db: AsyncSession) -> list[Task]:
    result = await db.execute(
        select(Task)
        .where(Task.event_request_id == request_id)
        .order_by(Task.due_at, Task.priority)
    )
    return result.scalars().all()
```

---

### `app/routers/tasks.py`

```python
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.schemas.task import TaskResponse, TaskUpdateRequest
from app.services import task_service
from app.models.task import Task
from app.models.event_request import EventRequest
from app.dependencies import require_staff, get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/generate/{request_id}", response_model=list[TaskResponse], status_code=201)
async def generate_tasks(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    tasks = await task_service.generate_tasks_for_request(request_id, db)
    return [_to_response(t, db) for t in tasks]


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    request_id: UUID | None = Query(None),
    assigned_to: UUID | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Task)
    if request_id:
        stmt = stmt.where(Task.event_request_id == request_id)
    if assigned_to:
        stmt = stmt.where(Task.assigned_to == assigned_to)
    if status:
        stmt = stmt.where(Task.status == status)
    result = await db.execute(stmt.order_by(Task.due_at, Task.priority))
    return [_to_response(t, db) for t in result.scalars().all()]


@router.get("/my-tasks", response_model=list[TaskResponse])
async def my_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task)
        .where(and_(Task.assigned_to == current_user.id, Task.status != "done"))
        .order_by(Task.due_at)
    )
    return [_to_response(t, db) for t in result.scalars().all()]


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException, status as http_status
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Task not found.")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return _to_response(task, db)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException, status as http_status
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Task not found.")
    task.status = "done"
    task.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(task)
    return _to_response(task, db)


def _to_response(task: Task, db=None) -> TaskResponse:
    return TaskResponse(
        id=task.id,
        event_request_id=task.event_request_id,
        event_title=None,
        title=task.title,
        description=task.description,
        task_type=task.task_type,
        assigned_to=task.assigned_to,
        assignee_name=None,
        due_at=task.due_at,
        completed_at=task.completed_at,
        status=task.status,
        priority=task.priority,
        depends_on=task.depends_on,
        ai_generated=task.ai_generated,
        created_at=task.created_at,
    )
```

---

### Endpoints Produced by Phase B10

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/tasks/generate/{request_id}` | Staff | Generate task list |
| `GET` | `/api/v1/tasks?request_id=&assigned_to=&status=` | Bearer | List tasks |
| `GET` | `/api/v1/tasks/my-tasks` | Bearer | Current user's tasks |
| `PUT` | `/api/v1/tasks/{id}` | Bearer | Update task |
| `POST` | `/api/v1/tasks/{id}/complete` | Bearer | Mark task done |

---

## Phase B11: WebSocket Infrastructure

### Goal
Establish two persistent WebSocket channels. The `3d-bridge` channel is the link
between the Python AI agent and the Three.js app. The `admin` channel streams
real-time operational events to the Vue.js admin dashboard.

### Files Created

```
app/
├── websocket/
│   ├── __init__.py
│   ├── manager.py             (new)
│   ├── bridge.py              (new)
│   └── admin.py               (new)
└── main.py                    (modified: mount WS routers)
```

---

### `app/websocket/manager.py`

```python
from collections import defaultdict
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages named channels of WebSocket connections.
    Thread-safe for async usage in FastAPI.
    """

    def __init__(self):
        self._channels: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        self._channels[channel].append(websocket)
        logger.info(f"[WS] New connection on '{channel}'. Total: {len(self._channels[channel])}")

    def disconnect(self, websocket: WebSocket, channel: str):
        conns = self._channels.get(channel, [])
        if websocket in conns:
            conns.remove(websocket)
        logger.info(f"[WS] Disconnected from '{channel}'. Remaining: {len(conns)}")

    async def broadcast_to_channel(self, channel: str, message: dict):
        """Broadcast to all connections on a channel. Removes dead connections."""
        dead = []
        for ws in list(self._channels.get(channel, [])):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, channel)

    async def send_to_one(self, websocket: WebSocket, message: dict):
        await websocket.send_text(json.dumps(message))

    def connection_count(self, channel: str) -> int:
        return len(self._channels.get(channel, []))

    def all_channel_counts(self) -> dict[str, int]:
        return {ch: len(conns) for ch, conns in self._channels.items()}


# Singleton instance — imported by all components that need to broadcast
ws_manager = WebSocketManager()
```

---

### `app/websocket/bridge.py`

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import ws_manager
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/3d-bridge")
async def three_d_bridge_endpoint(websocket: WebSocket):
    """
    WebSocket channel for the Three.js 3D app.

    The Three.js bridge.js connects here on startup and reconnects automatically
    if the connection drops.

    Downstream messages (Python → Three.js):
      APPLY_LAYOUT  | ADD_ITEM | REMOVE_ITEM | CLEAR_ROOM | NAVIGATE_TO_ROOM | HIGHLIGHT_ITEM

    Upstream messages (Three.js → Python):
      LAYOUT_SAVED  | ROOM_ENTERED | ROOM_EXITED | ITEM_PLACED | ITEM_REMOVED | REQUEST_LAYOUT
    """
    await ws_manager.connect(websocket, "3d-bridge")
    logger.info("[Bridge] Three.js app connected")

    try:
        # Greeting
        await ws_manager.send_to_one(websocket, {
            "type": "CONNECTED",
            "payload": {
                "message": "SpaceFlo 3D Bridge ready",
                "version": "1.0",
                "ws_connections": ws_manager.connection_count("3d-bridge"),
            }
        })

        while True:
            try:
                raw = await websocket.receive_text()
                msg = json.loads(raw)
                await _handle_upstream(msg, websocket)
            except json.JSONDecodeError:
                logger.warning("[Bridge] Received non-JSON message")

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "3d-bridge")
        logger.info("[Bridge] Three.js app disconnected")


async def _handle_upstream(msg: dict, websocket: WebSocket):
    """Process messages coming FROM Three.js TO the Python backend."""
    msg_type = msg.get("type")
    payload = msg.get("payload", {})

    if msg_type == "LAYOUT_SAVED":
        # User manually saved a layout — persist to DB
        from app.database import AsyncSessionLocal
        from app.services.room_layout_service import sync_layout_from_3d
        async with AsyncSessionLocal() as db:
            await sync_layout_from_3d(payload.get("roomId"), payload.get("items", []), db)

    elif msg_type == "REQUEST_LAYOUT":
        # Three.js is asking for the current DB layout for a room
        room_id = payload.get("roomId")
        if room_id:
            from app.database import AsyncSessionLocal
            from app.services.room_layout_service import get_current_layout
            async with AsyncSessionLocal() as db:
                layout = await get_current_layout(room_id, db)
            if layout:
                await ws_manager.send_to_one(websocket, {
                    "type": "APPLY_LAYOUT",
                    "payload": {
                        "roomId": room_id,
                        "items": layout.items_json,
                        "source": "db_sync",
                        "layout_name": layout.name,
                    }
                })

    elif msg_type == "ROOM_ENTERED":
        # Notify admin channel that someone is viewing this room
        await ws_manager.broadcast_to_channel("admin", {
            "type": "USER_VIEWING_ROOM",
            "payload": payload,
        })

    elif msg_type == "ITEM_PLACED":
        # Optional: log item placements for analytics
        logger.debug(f"[Bridge] Item placed in room {payload.get('roomId')}: {payload.get('type')}")
```

---

### `app/websocket/admin.py`

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import ws_manager
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/admin")
async def admin_channel_endpoint(websocket: WebSocket):
    """
    Real-time notification channel for the Vue.js admin dashboard.
    The frontend connects here on login and listens for server-pushed events.

    Events pushed by the backend:
      REQUEST_SUBMITTED       — new booking request came in
      REQUEST_STATUS_CHANGED  — any request status transition
      CONFLICT_DETECTED       — AI found a conflict
      ASSET_LOW_STOCK         — an asset falls below 20% availability
      USER_VIEWING_ROOM       — someone entered a room in the 3D app
      LAYOUT_AI_APPLIED       — AI pushed a new layout to a room
    """
    await ws_manager.connect(websocket, "admin")
    logger.info("[Admin WS] Admin client connected")

    try:
        await ws_manager.send_to_one(websocket, {
            "type": "CONNECTED",
            "payload": {
                "message": "SpaceFlo Admin Channel ready",
                "active_3d_connections": ws_manager.connection_count("3d-bridge"),
            }
        })

        # Keep connection alive — just handle pings
        while True:
            try:
                await websocket.receive_text()
                # Client can send "PING" — no-op (keep-alive)
            except Exception:
                break

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "admin")
        logger.info("[Admin WS] Admin client disconnected")
```

---

### `app/main.py` — Add WebSocket Mounts

```python
from app.websocket.bridge import router as ws_bridge_router
from app.websocket.admin import router as ws_admin_router

app.include_router(ws_bridge_router)
app.include_router(ws_admin_router)
```

---

### Phase B11 Gate

```javascript
// Test from browser console (paste into any browser tab)
const ws = new WebSocket('ws://localhost:8080/ws/3d-bridge');
ws.onopen = () => console.log('Connected');
ws.onmessage = e => console.log('Received:', JSON.parse(e.data));
// Expected: {type:"CONNECTED", payload:{message:"SpaceFlo 3D Bridge ready",...}}

const wsAdmin = new WebSocket('ws://localhost:8080/ws/admin');
wsAdmin.onopen = () => console.log('Admin connected');
wsAdmin.onmessage = e => console.log('Admin received:', JSON.parse(e.data));
// Expected: {type:"CONNECTED", payload:{message:"SpaceFlo Admin Channel ready",...}}
```

---

## Phase B12: Room Layout Sync Service

### Goal
Persist Three.js room layouts to the database (two-way sync) and serve them back.
This makes 3D room states part of the platform's event data — layouts can be
attached to specific event requests and retrieved by the Vue.js frontend.

### Files Created

```
app/
├── services/
│   └── room_layout_service.py (new)
└── routers/
    └── room_layouts.py        (new)
```

---

### `app/services/room_layout_service.py`

```python
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.room_layout import RoomLayout
from app.models.venue import Venue
from fastapi import HTTPException, status


async def get_current_layout(three_d_room_id: str, db: AsyncSession) -> RoomLayout | None:
    """
    Get the currently active layout for a room (by Three.js room ID).
    Called by the WebSocket bridge when Three.js sends REQUEST_LAYOUT.
    """
    stmt = (
        select(RoomLayout)
        .join(Venue, RoomLayout.venue_id == Venue.id)
        .where(
            Venue.three_d_room_id == three_d_room_id,
            RoomLayout.is_current == True,
        )
        .order_by(RoomLayout.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def sync_layout_from_3d(
    three_d_room_id: str,
    items: list,
    db: AsyncSession,
    name: str = "Manual Save",
) -> RoomLayout | None:
    """
    Called when Three.js sends LAYOUT_SAVED upstream.
    Finds the venue by three_d_room_id, sets all existing layouts for that
    venue to is_current=False, then creates a new current layout.
    """
    # Find venue
    v_result = await db.execute(
        select(Venue).where(Venue.three_d_room_id == three_d_room_id)
    )
    venue = v_result.scalar_one_or_none()
    if not venue:
        return None  # Unknown room ID — silently ignore

    # Deactivate old current layouts
    await db.execute(
        update(RoomLayout)
        .where(RoomLayout.venue_id == venue.id, RoomLayout.is_current == True)
        .values(is_current=False)
    )

    layout = RoomLayout(
        id=uuid4(),
        venue_id=venue.id,
        name=name,
        items_json=items,
        source="manual",
        is_current=True,
    )
    db.add(layout)
    await db.commit()
    await db.refresh(layout)
    return layout


async def save_ai_layout(
    three_d_room_id: str,
    items: list,
    ai_prompt: str,
    layout_name: str,
    event_request_id: UUID | None,
    db: AsyncSession,
) -> RoomLayout | None:
    """
    Called by the AI Room Design Agent after generating a layout.
    Saves as ai_generated source and marks as current.
    """
    v_result = await db.execute(
        select(Venue).where(Venue.three_d_room_id == three_d_room_id)
    )
    venue = v_result.scalar_one_or_none()
    if not venue:
        return None

    await db.execute(
        update(RoomLayout)
        .where(RoomLayout.venue_id == venue.id, RoomLayout.is_current == True)
        .values(is_current=False)
    )

    layout = RoomLayout(
        id=uuid4(),
        venue_id=venue.id,
        event_request_id=event_request_id,
        name=layout_name,
        items_json=items,
        source="ai_generated",
        ai_prompt=ai_prompt,
        is_current=True,
    )
    db.add(layout)
    await db.commit()
    await db.refresh(layout)
    return layout


async def list_layouts_for_venue(venue_id: UUID, db: AsyncSession) -> list[RoomLayout]:
    result = await db.execute(
        select(RoomLayout)
        .where(RoomLayout.venue_id == venue_id)
        .order_by(RoomLayout.created_at.desc())
    )
    return result.scalars().all()
```

---

### `app/routers/room_layouts.py`

```python
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.room_layout import RoomLayoutResponse, RoomLayoutCreateRequest
from app.services import room_layout_service
from app.dependencies import require_staff, get_current_user
from app.models.user import User
from app.models.venue import Venue
from sqlalchemy import select

router = APIRouter()


@router.get("", response_model=list[RoomLayoutResponse])
async def list_layouts(
    venue_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    layouts = await room_layout_service.list_layouts_for_venue(venue_id, db)
    return [await _to_response(l, db) for l in layouts]


@router.get("/current", response_model=RoomLayoutResponse | None)
async def get_current_layout(
    three_d_room_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    layout = await room_layout_service.get_current_layout(three_d_room_id, db)
    if not layout:
        return None
    return await _to_response(layout, db)


async def _to_response(layout, db: AsyncSession) -> RoomLayoutResponse:
    from app.schemas.room_layout import RoomLayoutResponse, RoomLayoutItem
    venue = None
    three_d_room_id = None
    if layout.venue_id:
        v_result = await db.execute(select(Venue).where(Venue.id == layout.venue_id))
        venue = v_result.scalar_one_or_none()
        three_d_room_id = venue.three_d_room_id if venue else None
    return RoomLayoutResponse(
        id=layout.id,
        venue_id=layout.venue_id,
        venue_name=venue.name if venue else None,
        three_d_room_id=three_d_room_id,
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
```

---

### Endpoints Produced by Phase B12

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/layouts?venue_id=` | Bearer | List layout history for a venue |
| `GET` | `/api/v1/layouts/current?three_d_room_id=` | None | Get current layout for a 3D room |

---

## Phase B13: AI Router & Endpoint Hooks

### Goal
Expose the REST endpoints that Vue.js frontend calls to trigger AI agents.
The actual agent logic lives in `app/ai/` (covered in the Agentic AI blueprint).
This phase connects the router layer to the agent layer.

### Files Created

```
app/
├── ai/
│   ├── __init__.py
│   ├── agent.py               (stub — full AI blueprint covers this)
│   └── prompts.py             (stub)
└── routers/
    └── ai.py                  (new)
```

---

### `app/ai/agent.py` (Stub for Phase B13)

```python
async def run_agent(
    agent_type: str,
    user_message: str,
    context: dict,
    conversation_history: list[dict] | None = None,
    db=None,
) -> dict:
    """
    Stub. Full implementation in the Agentic AI blueprint.
    Returns a mock response for testing the endpoint layer.
    """
    return {
        "response": f"[Agent '{agent_type}' stub] Received: {user_message}",
        "tool_calls_made": [],
        "final_context": context,
    }
```

---

### `app/routers/ai.py`

```python
from uuid import UUID
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.ai.agent import run_agent
from app.dependencies import get_current_user, require_staff
from app.models.user import User
from app.models.ai_conversation import AiConversation
from sqlalchemy import select
import uuid

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    agent_type: str = "copilot"
    context: dict = {}
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    response: str
    tool_calls_made: list
    conversation_id: str


class DesignRoomRequest(BaseModel):
    venue_name: str
    prompt: str
    event_request_id: str | None = None
    event_date_start: str | None = None
    event_date_end: str | None = None


class DetectConflictsRequest(BaseModel):
    request_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    General-purpose AI chat endpoint.
    Continues a conversation if conversation_id is provided.
    Creates a new conversation otherwise.
    """
    history = []
    conversation_id = data.conversation_id

    # Load conversation history if continuing
    if conversation_id:
        result = await db.execute(
            select(AiConversation).where(AiConversation.id == UUID(conversation_id))
        )
        conv = result.scalar_one_or_none()
        if conv:
            history = conv.messages

    context = {**data.context, "user_id": str(current_user.id), "user_role": current_user.role}
    result = await run_agent(data.agent_type, data.message, context, history, db)

    # Persist conversation
    updated_messages = history + [
        {"role": "user", "content": data.message},
        {"role": "assistant", "content": result["response"]},
    ]

    if conversation_id:
        from sqlalchemy import update
        await db.execute(
            update(AiConversation)
            .where(AiConversation.id == UUID(conversation_id))
            .values(messages=updated_messages)
        )
    else:
        conv = AiConversation(
            id=uuid.uuid4(),
            user_id=current_user.id,
            agent_type=data.agent_type,
            messages=updated_messages,
            context_json=data.context,
        )
        db.add(conv)
        conversation_id = str(conv.id)

    await db.commit()

    return ChatResponse(
        response=result["response"],
        tool_calls_made=result["tool_calls_made"],
        conversation_id=conversation_id,
    )


@router.post("/design-room")
async def design_room(
    data: DesignRoomRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """
    Triggers the Room Design Agent.
    The agent generates a layout and pushes it to the Three.js app via WebSocket.
    """
    context = {
        "venue_name": data.venue_name,
        "user_prompt": data.prompt,
        "event_request_id": data.event_request_id,
        "event_date_start": data.event_date_start,
        "event_date_end": data.event_date_end,
    }
    result = await run_agent("room_designer", data.prompt, context, db=db)
    return {
        "message": result["response"],
        "tool_calls_made": result["tool_calls_made"],
    }


@router.post("/detect-conflicts")
async def detect_conflicts(
    data: DetectConflictsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """Runs the conflict detection agent and returns structured conflict report."""
    from app.services.conflict_service import check_all_conflicts, conflicts_to_dict
    conflicts = await check_all_conflicts(UUID(data.request_id), db)

    # Also trigger AI for resolution suggestions
    context = {"request_id": data.request_id, "conflicts": conflicts_to_dict(conflicts)}
    ai_result = await run_agent("conflict_detector", "Analyze these conflicts and suggest resolutions.", context, db=db)

    return {
        "has_blocking_conflicts": any(c.severity == "blocking" for c in conflicts),
        "has_warnings": any(c.severity == "warning" for c in conflicts),
        "conflicts": conflicts_to_dict(conflicts),
        "ai_analysis": ai_result["response"],
    }


@router.post("/generate-tasks/{request_id}")
async def ai_generate_tasks(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """AI-enhanced task list generation for an approved request."""
    from app.services.task_service import generate_tasks_for_request
    from app.schemas.task import TaskResponse
    tasks = await generate_tasks_for_request(request_id, db, ai_generated=True)
    return {
        "tasks_created": len(tasks),
        "message": f"Generated {len(tasks)} tasks for the event.",
    }
```

---

### Endpoints Produced by Phase B13

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/ai/chat` | Bearer | General AI copilot chat |
| `POST` | `/api/v1/ai/design-room` | Staff | Trigger Room Design Agent |
| `POST` | `/api/v1/ai/detect-conflicts` | Staff | Run conflict detection + AI analysis |
| `POST` | `/api/v1/ai/generate-tasks/{request_id}` | Staff | AI-enhanced task generation |

---

## Final `app/main.py` — All Routers Registered

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[SpaceFlo] Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    yield
    print("[SpaceFlo] Shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Pyramid of Tirana — Event Operations Platform",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Health ──────────────────────────────────────────────────────────────
    @app.get("/health", tags=["System"])
    async def health():
        return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}

    @app.get("/ws-status", tags=["System"])
    async def ws_status():
        from app.websocket.manager import ws_manager
        return {"channels": ws_manager.all_channel_counts()}

    # ── REST Routers ────────────────────────────────────────────────────────
    from app.routers.auth import router as auth_router
    from app.routers.venues import router as venues_router
    from app.routers.requests import router as requests_router
    from app.routers.assets import router as assets_router
    from app.routers.reservations import router as reservations_router
    from app.routers.quotations import router as quotations_router
    from app.routers.tasks import router as tasks_router
    from app.routers.room_layouts import router as layouts_router
    from app.routers.ai import router as ai_router

    prefix = "/api/v1"
    app.include_router(auth_router,         prefix=f"{prefix}/auth",         tags=["Auth"])
    app.include_router(venues_router,       prefix=f"{prefix}/venues",       tags=["Venues"])
    app.include_router(requests_router,     prefix=f"{prefix}/requests",     tags=["Event Requests"])
    app.include_router(assets_router,       prefix=f"{prefix}/assets",       tags=["Assets"])
    app.include_router(reservations_router, prefix=f"{prefix}/reservations", tags=["Reservations"])
    app.include_router(quotations_router,   prefix=f"{prefix}/quotations",   tags=["Quotations"])
    app.include_router(tasks_router,        prefix=f"{prefix}/tasks",        tags=["Tasks"])
    app.include_router(layouts_router,      prefix=f"{prefix}/layouts",      tags=["Room Layouts"])
    app.include_router(ai_router,           prefix=f"{prefix}/ai",           tags=["AI"])

    # ── WebSocket Routers ───────────────────────────────────────────────────
    from app.websocket.bridge import router as ws_bridge_router
    from app.websocket.admin import router as ws_admin_router
    app.include_router(ws_bridge_router)
    app.include_router(ws_admin_router)

    return app


app = create_app()
```

---

## Complete Endpoint Index

| Method | Path | Auth | Phase |
|--------|------|------|-------|
| `GET` | `/health` | None | B1 |
| `GET` | `/ws-status` | None | B11 |
| `POST` | `/api/v1/auth/register` | None | B4 |
| `POST` | `/api/v1/auth/login` | None | B4 |
| `GET` | `/api/v1/auth/me` | Bearer | B4 |
| `GET` | `/api/v1/venues` | None | B5 |
| `GET` | `/api/v1/venues/{id}` | None | B5 |
| `GET` | `/api/v1/venues/{id}/availability` | None | B5 |
| `POST` | `/api/v1/venues` | Admin | B5 |
| `PUT` | `/api/v1/venues/{id}` | Admin | B5 |
| `POST` | `/api/v1/requests` | Bearer | B6 |
| `GET` | `/api/v1/requests` | Bearer | B6 |
| `GET` | `/api/v1/requests/{id}` | Bearer | B6 |
| `PUT` | `/api/v1/requests/{id}` | Bearer | B6 |
| `POST` | `/api/v1/requests/{id}/assign-venue` | Staff | B6 |
| `POST` | `/api/v1/requests/{id}/approve` | Staff | B6 |
| `POST` | `/api/v1/requests/{id}/reject` | Staff | B6 |
| `POST` | `/api/v1/requests/{id}/complete` | Staff | B6 |
| `GET` | `/api/v1/requests/{id}/conflicts` | Bearer | B8 |
| `GET` | `/api/v1/assets` | None | B7 |
| `GET` | `/api/v1/assets/summary` | Staff | B7 |
| `GET` | `/api/v1/assets/{id}` | None | B7 |
| `GET` | `/api/v1/assets/{id}/availability` | None | B7 |
| `POST` | `/api/v1/assets` | Admin | B7 |
| `GET` | `/api/v1/reservations` | Bearer | B7 |
| `POST` | `/api/v1/reservations/bulk/{request_id}` | Staff | B7 |
| `POST` | `/api/v1/quotations/generate/{request_id}` | Staff | B9 |
| `GET` | `/api/v1/quotations/{id}` | Bearer | B9 |
| `PUT` | `/api/v1/quotations/{id}` | Staff | B9 |
| `POST` | `/api/v1/quotations/{id}/send` | Staff | B9 |
| `POST` | `/api/v1/tasks/generate/{request_id}` | Staff | B10 |
| `GET` | `/api/v1/tasks` | Bearer | B10 |
| `GET` | `/api/v1/tasks/my-tasks` | Bearer | B10 |
| `PUT` | `/api/v1/tasks/{id}` | Bearer | B10 |
| `POST` | `/api/v1/tasks/{id}/complete` | Bearer | B10 |
| `GET` | `/api/v1/layouts` | Bearer | B12 |
| `GET` | `/api/v1/layouts/current` | None | B12 |
| `POST` | `/api/v1/ai/chat` | Bearer | B13 |
| `POST` | `/api/v1/ai/design-room` | Staff | B13 |
| `POST` | `/api/v1/ai/detect-conflicts` | Staff | B13 |
| `POST` | `/api/v1/ai/generate-tasks/{request_id}` | Staff | B13 |
| `WS` | `/ws/3d-bridge` | None | B11 |
| `WS` | `/ws/admin` | None | B11 |

---

## Cross-Phase Data Contract Reference

These are the exact JSON shapes that the Vue.js frontend and Three.js bridge
will depend on. Do not change field names without updating downstream blueprints.

### Three.js Layout Item (Critical)

This is the **exact** format `furnishing.js` uses for `serializeLayout()` and
`applyLayoutFromPlan()`. The AI agent must generate items in this exact shape.

```json
// Floor item
{
  "modelKey": "simple_chair",
  "x": -2.5,
  "y": 0.0,
  "z": 1.2,
  "rotY": 3.14159,
  "type": "floor",
  "surfaceY": 0.0
}

// Wall item (TV)
{
  "modelKey": "wall_flat_tv",
  "x": 0.0,
  "y": 1.5,
  "z": -5.8,
  "rotY": 0.0,
  "type": "wall",
  "wallAxis": "z",
  "wallCoord": -5.8,
  "isPositiveWall": false,
  "mountY": 1.5
}

// Stacked item (monitor on table) — note: surfaceY matters here
{
  "modelKey": "office_monitor",
  "x": -2.5,
  "y": 0.72,
  "z": -0.32,
  "rotY": 0.0,
  "type": "floor",
  "surfaceY": 0.72
}
```

### Valid `modelKey` Values

From `MODEL_CATALOG` in `tumo_3d_model/src/factories.js`:

| Key | Label | Placement |
|-----|-------|-----------|
| `office_table` | Office Table | floor |
| `office_chair` | Office Chair | floor |
| `office_monitor` | Monitor | floor (stackable) |
| `keyboard_mouse` | Keyboard & Mouse | floor (stackable) |
| `simple_table` | Simple Table | floor |
| `simple_chair` | Simple Chair | floor |
| `speaker` | Speaker | floor |
| `microphone_stand` | Mic Stand | floor |
| `wall_flat_tv` | Wall TV | **wall** |
| `led_tv` | LED TV | floor |
| `whiteboard` | Whiteboard | floor |

### WebSocket Message Envelope

```json
{
  "type": "MESSAGE_TYPE_STRING",
  "payload": { ... }
}
```

### All WebSocket Message Types

**Python → Three.js (downstream)**

| `type` | `payload` fields |
|--------|-----------------|
| `CONNECTED` | `message`, `version`, `ws_connections` |
| `APPLY_LAYOUT` | `roomId`, `items[]`, `source`, `layout_name` |
| `ADD_ITEM` | `roomId`, `modelKey`, `x`, `y`, `z`, `rotY`, `type` |
| `REMOVE_ITEM` | `roomId`, `itemIndex` |
| `CLEAR_ROOM` | `roomId` |
| `NAVIGATE_TO_ROOM` | `roomId` |
| `HIGHLIGHT_ITEM` | `roomId`, `itemIndex`, `color`, `duration_ms` |

**Three.js → Python (upstream)**

| `type` | `payload` fields |
|--------|-----------------|
| `LAYOUT_SAVED` | `roomId`, `items[]` |
| `ROOM_ENTERED` | `roomId` |
| `ROOM_EXITED` | `roomId` |
| `ITEM_PLACED` | `roomId`, `modelKey`, `x`, `y`, `z` |
| `REQUEST_LAYOUT` | `roomId` |

**Python → Vue.js Admin (downstream)**

| `type` | `payload` fields |
|--------|-----------------|
| `CONNECTED` | `message`, `active_3d_connections` |
| `REQUEST_SUBMITTED` | `request_id`, `title` |
| `REQUEST_STATUS_CHANGED` | `request_id`, `new_status` |
| `CONFLICT_DETECTED` | `request_id`, `conflict_count` |
| `LAYOUT_AI_APPLIED` | `room_id`, `layout_id`, `item_count` |
| `USER_VIEWING_ROOM` | `roomId` |

---

## Integration Test: Full Happy-Path Scenario

Run these commands in order after all phases are complete to verify the entire
backend pipeline works end-to-end.

```bash
BASE="http://localhost:8080/api/v1"

# 1. Register client
CLIENT=$(curl -sX POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"client@test.al","password":"Test1234!","full_name":"Test Client"}')
CLIENT_TOKEN=$(echo $CLIENT | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Get Blue Room ID
BLUE_ID=$(curl -s $BASE/venues | python3 -c \
  "import sys,json; venues=json.load(sys.stdin); print(next(v['id'] for v in venues if 'Blue' in v['name']))")

# 3. Check venue availability
curl -s "$BASE/venues/$BLUE_ID/availability?date=2026-07-15&duration_hours=8"
# Expected: is_fully_available=true

# 4. Submit event request (triggers AI intake background task)
REQUEST=$(curl -sX POST $BASE/requests \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\":\"AlbTech Summit 2026\",
    \"event_type\":\"conference\",
    \"requested_date\":\"2026-07-15\",
    \"start_time\":\"09:00:00\",
    \"end_time\":\"18:00:00\",
    \"attendee_count\":180,
    \"special_requirements\":\"Need stage and 3 wireless mics\"
  }")
REQUEST_ID=$(echo $REQUEST | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Request ID: $REQUEST_ID"

# 5. Admin login
ADMIN=$(curl -sX POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pyramid.al","password":"Admin1234!"}')
ADMIN_TOKEN=$(echo $ADMIN | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 6. Assign venue
curl -sX POST $BASE/requests/$REQUEST_ID/assign-venue \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"venue_id\":\"$BLUE_ID\"}"
# Expected: status="under_review"

# 7. Bulk reserve assets
CHAIR_ID=$(curl -s $BASE/assets | python3 -c \
  "import sys,json; assets=json.load(sys.stdin); print(next(a['id'] for a in assets if 'Chair (Standard)' in a['name']))")
curl -sX POST $BASE/reservations/bulk/$REQUEST_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"assets\":[{\"asset_id\":\"$CHAIR_ID\",\"quantity\":180}]}"
# Expected: can_fulfill_all=true

# 8. Check conflicts (should be none)
curl -s $BASE/requests/$REQUEST_ID/conflicts \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: has_blocking_conflicts=false

# 9. Generate quotation
QUOTATION=$(curl -sX POST $BASE/quotations/generate/$REQUEST_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "Quotation total: $(echo $QUOTATION | python3 -c "import sys,json; print(json.load(sys.stdin)['total_amount'])")"

# 10. Approve request (triggers task generation)
curl -sX POST $BASE/requests/$REQUEST_ID/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 11. Check tasks (should be 14 tasks)
sleep 1  # allow background task to complete
TASKS=$(curl -s "$BASE/tasks?request_id=$REQUEST_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "Tasks created: $(echo $TASKS | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")"

# 12. Test AI chat (stub response)
curl -sX POST $BASE/ai/chat \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What rooms are available on July 15?","agent_type":"copilot"}'

echo "All integration tests complete."
```

---

*Backend Implementation Blueprint — SpaceFlo / JunctionX Tirana 2026*
*All phases produce the contracts consumed by: Vue.js Frontend Blueprint (F-phases),*
*Agentic AI Blueprint (A-phases), and Three.js Bridge modifications.*
