from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select, func

from app.database import AsyncSessionLocal, Base, engine
from app.models import Asset, User, Venue
from app.utils.auth import hash_password


VENUE_SEED = [
    {
        "name": "Blue Room",
        "floor": 0,
        "capacity_min": 10,
        "capacity_max": 200,
        "area_sqm": Decimal("450.00"),
        "description": "Large event hall on ground floor, ideal for conferences, exhibitions, and performances.",
        "amenities": ["WiFi", "AV Screen", "Power", "Flexible Seating"],
        "three_d_room_id": "blue-box",
        "color_hex": "#3da9f5",
        "base_price_per_hour": Decimal("250.00"),
    },
    {
        "name": "Orange Room",
        "floor": 0,
        "capacity_min": 10,
        "capacity_max": 150,
        "area_sqm": Decimal("320.00"),
        "description": "Versatile multi-purpose space on ground floor, main entrance-adjacent.",
        "amenities": ["WiFi", "Projector", "Power", "Natural Flow"],
        "three_d_room_id": "orange-box",
        "color_hex": "#ff6400",
        "base_price_per_hour": Decimal("200.00"),
    },
    {
        "name": "Green Room",
        "floor": -1,
        "capacity_min": 10,
        "capacity_max": 120,
        "area_sqm": Decimal("280.00"),
        "description": "Underground event space, suited for screenings, workshops, and performances.",
        "amenities": ["WiFi", "AV", "Acoustics"],
        "three_d_room_id": "lime-green-box",
        "color_hex": "#2ec98a",
        "base_price_per_hour": Decimal("180.00"),
    },
    {
        "name": "Yellow Room",
        "floor": -1,
        "capacity_min": 5,
        "capacity_max": 80,
        "area_sqm": Decimal("160.00"),
        "description": "Intimate underground space, ideal for workshops, training, and small meetings.",
        "amenities": ["WiFi", "Whiteboard", "Flexible Layout"],
        "three_d_room_id": "dark-green-box",
        "color_hex": "#f5a623",
        "base_price_per_hour": Decimal("120.00"),
    },
    {
        "name": "Main Corridor & Entrance",
        "floor": 0,
        "capacity_min": 20,
        "capacity_max": 500,
        "area_sqm": Decimal("800.00"),
        "description": "The iconic entrance hall and connecting corridors used for receptions and spillover activity.",
        "amenities": ["Power", "Flow Space", "Exhibition"],
        "three_d_room_id": None,
        "color_hex": "#7a9bb5",
        "base_price_per_hour": Decimal("300.00"),
    },
]


ASSET_SEED = [
    {"name": "Chair (Standard)", "category": "seating", "tracking_type": "pool", "total_quantity": 300, "unit_price": Decimal("2.00"), "three_d_item_key": "simple_chair"},
    {"name": "Chair (Executive)", "category": "seating", "tracking_type": "pool", "total_quantity": 50, "unit_price": Decimal("5.00"), "three_d_item_key": "office_chair"},
    {"name": "Round Table (6-person)", "category": "tables", "tracking_type": "pool", "total_quantity": 60, "unit_price": Decimal("15.00"), "three_d_item_key": "simple_table"},
    {"name": "Rectangular Table", "category": "tables", "tracking_type": "pool", "total_quantity": 80, "unit_price": Decimal("12.00"), "three_d_item_key": "office_table"},
    {"name": "Standing Desk", "category": "tables", "tracking_type": "pool", "total_quantity": 20, "unit_price": Decimal("10.00"), "three_d_item_key": "office_table"},
    {"name": "Projector Screen", "category": "av_equipment", "tracking_type": "pool", "total_quantity": 10, "unit_price": Decimal("30.00"), "three_d_item_key": "wall_flat_tv"},
    {"name": "TV Display (65\")", "category": "av_equipment", "tracking_type": "pool", "total_quantity": 15, "unit_price": Decimal("25.00"), "three_d_item_key": "led_tv"},
    {"name": "Microphone (wireless)", "category": "av_equipment", "tracking_type": "pool", "total_quantity": 30, "unit_price": Decimal("10.00"), "three_d_item_key": "microphone_stand"},
    {"name": "Laptop/PC", "category": "av_equipment", "tracking_type": "pool", "total_quantity": 40, "unit_price": Decimal("20.00"), "three_d_item_key": "office_monitor"},
    {"name": "Whiteboard", "category": "misc", "tracking_type": "pool", "total_quantity": 25, "unit_price": Decimal("8.00"), "three_d_item_key": "whiteboard"},
    {"name": "Stage Panel (1m²)", "category": "staging", "tracking_type": "pool", "total_quantity": 100, "unit_price": Decimal("5.00"), "three_d_item_key": None},
    {"name": "LED Lighting Rig", "category": "lighting", "tracking_type": "pool", "total_quantity": 8, "unit_price": Decimal("40.00"), "three_d_item_key": "speaker"},
    {"name": "Standing Podium", "category": "misc", "tracking_type": "pool", "total_quantity": 10, "unit_price": Decimal("12.00"), "three_d_item_key": None},
    {"name": "Power Strip (8-port)", "category": "misc", "tracking_type": "pool", "total_quantity": 50, "unit_price": Decimal("3.00"), "three_d_item_key": None},
]


DEV_USERS = [
    {
        "email": "admin@spaceflo.dev",
        "full_name": "SpaceFlo Admin",
        "role": "admin",
        "password": "Admin1234!",
        "organization": "SpaceFlo",
    },
    {
        "email": "staff@spaceflo.dev",
        "full_name": "SpaceFlo Staff",
        "role": "staff",
        "password": "Staff1234!",
        "organization": "SpaceFlo",
    },
]


async def init_database() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_database() -> None:
    async with AsyncSessionLocal() as session:
        admin_count = await session.scalar(select(func.count(User.id)).where(User.role == "admin"))
        if not admin_count:
            for payload in DEV_USERS:
                session.add(
                    User(
                        email=payload["email"],
                        hashed_password=hash_password(payload["password"]),
                        full_name=payload["full_name"],
                        role=payload["role"],
                        organization=payload["organization"],
                        is_active=True,
                    )
                )

        venue_count = await session.scalar(select(func.count(Venue.id)))
        if not venue_count:
            for payload in VENUE_SEED:
                session.add(Venue(**payload))

        asset_count = await session.scalar(select(func.count(Asset.id)))
        if not asset_count:
            for payload in ASSET_SEED:
                session.add(Asset(**payload))

        await session.commit()
