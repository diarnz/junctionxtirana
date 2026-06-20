from __future__ import annotations

import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def enum_col(*values: str, name: str, default: str | None = None) -> Any:
    return mapped_column(
        Enum(*values, name=name, native_enum=False),
        nullable=False,
        default=default,
    )


USER_ROLES = ("admin", "staff", "client")
VENUE_STATUSES = ("active", "maintenance", "unavailable")
REQUEST_STATUSES = (
    "draft",
    "submitted",
    "under_review",
    "quotation_sent",
    "approved",
    "confirmed",
    "rejected",
    "cancelled",
    "completed",
)
ASSET_TRACKING_TYPES = ("pool", "instance")
ASSET_STATUSES = ("available", "reserved", "in_use", "maintenance", "missing")
RESERVATION_STATUSES = ("pending", "confirmed", "cancelled", "released")
QUOTATION_STATUSES = ("draft", "sent", "accepted", "rejected", "expired")
TASK_TYPES = ("setup", "teardown", "preparation", "logistics", "coordination")
TASK_STATUSES = ("pending", "assigned", "in_progress", "done", "blocked")
LAYOUT_SOURCES = ("manual", "template", "ai_generated")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = enum_col(*USER_ROLES, name="user_role", default="client")
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    organization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)


class Venue(Base):
    __tablename__ = "venues"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    floor: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    capacity_min: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    capacity_max: Mapped[int] = mapped_column(Integer, nullable=False)
    area_sqm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    amenities: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = enum_col(*VENUE_STATUSES, name="venue_status", default="active")
    three_d_room_id: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    color_hex: Mapped[str | None] = mapped_column(String(7), nullable=True)
    base_price_per_hour: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)


class EventRequest(Base):
    __tablename__ = "event_requests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(nullable=False)
    end_time: Mapped[time] = mapped_column(nullable=False)
    attendee_count: Mapped[int] = mapped_column(Integer, nullable=False)
    venue_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("venues.id", ondelete="SET NULL"), nullable=True, index=True)
    status: Mapped[str] = enum_col(*REQUEST_STATUSES, name="request_status", default="submitted")
    special_requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    setup_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    teardown_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    assigned_staff_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_proposal_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    client: Mapped[User | None] = relationship("User", foreign_keys=[client_id], lazy="joined")
    venue: Mapped[Venue | None] = relationship("Venue", lazy="joined")
    assigned_staff: Mapped[User | None] = relationship("User", foreign_keys=[assigned_staff_id], lazy="joined")


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    tracking_type: Mapped[str] = enum_col(*ASSET_TRACKING_TYPES, name="asset_tracking_type", default="pool")
    total_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0"))
    three_d_item_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
    qr_prefix: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)


class AssetInstance(Base):
    __tablename__ = "asset_instances"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    qr_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = enum_col(*ASSET_STATUSES, name="asset_status", default="available")
    current_venue_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("venues.id", ondelete="SET NULL"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)


class AssetReservation(Base):
    __tablename__ = "asset_reservations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_request_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("event_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_confirmed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reservation_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reservation_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = enum_col(*RESERVATION_STATUSES, name="reservation_status", default="pending")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    __table_args__ = (
        CheckConstraint("reservation_end > reservation_start", name="chk_reservation_dates"),
    )


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_request_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("event_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    line_items: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, default=Decimal("0.20"))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    valid_until: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = enum_col(*QUOTATION_STATUSES, name="quotation_status", default="draft")
    generated_by_ai: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ai_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_request_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("event_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    task_type: Mapped[str] = enum_col(*TASK_TYPES, name="task_type")
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = enum_col(*TASK_STATUSES, name="task_status", default="pending")
    priority: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=2)
    depends_on: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    ai_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)


class RoomLayout(Base):
    __tablename__ = "room_layouts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False, index=True)
    event_request_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("event_requests.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    items_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    source: Mapped[str] = enum_col(*LAYOUT_SOURCES, name="layout_source", default="manual")
    ai_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)


class AiConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    event_request_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("event_requests.id", ondelete="SET NULL"), nullable=True)
    agent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    messages: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    context_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    before_state: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    after_state: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)


__all__ = [
    "utcnow",
    "USER_ROLES",
    "VENUE_STATUSES",
    "REQUEST_STATUSES",
    "ASSET_TRACKING_TYPES",
    "ASSET_STATUSES",
    "RESERVATION_STATUSES",
    "QUOTATION_STATUSES",
    "TASK_TYPES",
    "TASK_STATUSES",
    "LAYOUT_SOURCES",
    "User",
    "Venue",
    "EventRequest",
    "Asset",
    "AssetInstance",
    "AssetReservation",
    "Quotation",
    "Task",
    "RoomLayout",
    "AiConversation",
    "ActivityLog",
]
