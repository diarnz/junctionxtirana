# SpaceFlo — Full System Blueprint
## JunctionX Tirana 2026 | Pyramid Backstage Challenge (AADF)

---

## Table of Contents

1. [Vision & Project Scope](#1-vision--project-scope)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Service Map & Ports](#3-service-map--ports)
4. [Technology Stack Decisions](#4-technology-stack-decisions)
5. [Database Schema (PostgreSQL / Supabase)](#5-database-schema-postgresql--supabase)
6. [Part I — Backend: Python / FastAPI (Port 8080)](#part-i--backend-python--fastapi-port-8080)
   - [Phase B1: Project Skeleton & Configuration](#phase-b1-project-skeleton--configuration)
   - [Phase B2: Authentication & Role-Based Access Control](#phase-b2-authentication--role-based-access-control)
   - [Phase B3: Venues & Spaces API](#phase-b3-venues--spaces-api)
   - [Phase B4: Event Request Lifecycle API](#phase-b4-event-request-lifecycle-api)
   - [Phase B5: Inventory & Asset Management API](#phase-b5-inventory--asset-management-api)
   - [Phase B6: Availability Engine & Conflict Detection](#phase-b6-availability-engine--conflict-detection)
   - [Phase B7: Quotation Engine](#phase-b7-quotation-engine)
   - [Phase B8: Task & Operational Plan Generation](#phase-b8-task--operational-plan-generation)
7. [Part II — Agentic AI (Python, OpenRouter)](#part-ii--agentic-ai-python-openrouter)
   - [Phase A1: Agent Architecture & Tool Registry](#phase-a1-agent-architecture--tool-registry)
   - [Phase A2: Room Design Agent (3D Integration)](#phase-a2-room-design-agent-3d-integration)
   - [Phase A3: Request Intake & Proposal Agent](#phase-a3-request-intake--proposal-agent)
   - [Phase A4: Conflict Detection Agent](#phase-a4-conflict-detection-agent)
   - [Phase A5: Operational Planning Agent](#phase-a5-operational-planning-agent)
8. [Part III — 3D Visualization Bridge (Three.js ↔ Python)](#part-iii--3d-visualization-bridge-threejs--python)
   - [Phase V1: Python WebSocket Server](#phase-v1-python-websocket-server)
   - [Phase V2: Three.js Bridge Client](#phase-v2-threejs-bridge-client)
   - [Phase V3: Command Protocol Specification](#phase-v3-command-protocol-specification)
   - [Phase V4: Layout Persistence Sync](#phase-v4-layout-persistence-sync)
9. [Part IV — Frontend: Vue.js / Vite (Port 5173)](#part-iv--frontend-vuejs--vite-port-5173)
   - [Phase F1: Project Setup & Design System](#phase-f1-project-setup--design-system)
   - [Phase F2: Public Booking Portal](#phase-f2-public-booking-portal)
   - [Phase F3: Authentication Flow](#phase-f3-authentication-flow)
   - [Phase F4: Admin Dashboard — Requests & Pipeline](#phase-f4-admin-dashboard--requests--pipeline)
   - [Phase F5: Admin Dashboard — Inventory](#phase-f5-admin-dashboard--inventory)
   - [Phase F6: Admin Dashboard — Calendar & Scheduling](#phase-f6-admin-dashboard--calendar--scheduling)
   - [Phase F7: Admin Dashboard — Quotations](#phase-f7-admin-dashboard--quotations)
   - [Phase F8: Admin Dashboard — Task Lists & Operations](#phase-f8-admin-dashboard--task-lists--operations)
   - [Phase F9: 3D Visualization Tab](#phase-f9-3d-visualization-tab)
   - [Phase F10: AI Copilot Chat Interface](#phase-f10-ai-copilot-chat-interface)
10. [API Contract Reference](#10-api-contract-reference)
11. [Environment & Configuration](#11-environment--configuration)
12. [Demo Scenario Walkthrough](#12-demo-scenario-walkthrough)

---

## 1. Vision & Project Scope

SpaceFlo transforms the Pyramid of Tirana's operational back-office from fragmented emails and spreadsheets into a unified digital platform. The system has three defining pillars that, combined, make it unique among the 27 teams in this challenge:

**Pillar 1 — Smart Event Operations Hub**
A client submits an event request. The platform immediately checks which of the Pyramid's four main spaces (Blue, Orange, Green, Yellow on floors 0 and -1, plus corridors and transitional areas) can host it, runs a conflict check across all venues and dates simultaneously, and generates a structured quotation. The admin reviews, optionally adjusts the offering (e.g., if 100 chairs are requested but only 80 are available, the system suggests an offering with 80 chairs plus a rental quote for 20), and approves. The approved request auto-generates a detailed setup and teardown task list with assignees and deadlines.

**Pillar 2 — Live Inventory & Asset Tracking**
Every operational asset (chairs, tables, microphones, projectors, PCs, whiteboards, screens, stage panels) is catalogued with pool quantities. As requests are confirmed, assets are reserved and deducted from the available pool. Staff can scan QR codes to mark assets as deployed or returned. The system alerts immediately when any event's asset requirements cannot be met by available stock.

**Pillar 3 — AI-Driven 3D Room Designer**
An agentic AI, integrated with the live Three.js 3D model of the Pyramid, accepts natural language prompts ("Set up the Blue Room for a 40-person conference with a central stage and AV screen") and autonomously configures the 3D environment: it checks the available furniture inventory, calculates optimal placements, and pushes them to the running Three.js app in real time via a WebSocket bridge. This means the admin or client can visually preview exactly how the room will look, all without manually placing a single item.

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                              │
│                                                                     │
│  ┌──────────────────────────────────┐   ┌─────────────────────┐   │
│  │  Vue.js SPA — Port 5173          │   │  Three.js 3D App    │   │
│  │  (Vite dev / Nginx prod)         │   │  Port 3000          │   │
│  │                                  │   │  (Express static)   │   │
│  │  ┌────────────┐ ┌─────────────┐ │   │                     │   │
│  │  │ Public     │ │ Admin       │ │   │  ┌───────────────┐  │   │
│  │  │ Booking    │ │ Dashboard   │ │   │  │ bridge.js     │  │   │
│  │  │ Portal     │ │             │ │   │  │ WebSocket     │  │   │
│  │  └────────────┘ └──────┬──────┘ │   │  │ Client        │  │   │
│  │                         │        │   │  └───────┬───────┘  │   │
│  │  ┌──────────────────────┤        │   │          │           │   │
│  │  │ AI Copilot Chat Panel│        │   └──────────┼───────────┘   │
│  │  └──────────────────────┘        │              │               │
│  └──────────────────────────────────┘              │               │
│            │  REST/HTTP                             │ WebSocket     │
└────────────┼───────────────────────────────────────┼───────────────┘
             │                                        │
             ▼                                        │
┌─────────────────────────────────────────────────────────────────────┐
│                    Python / FastAPI — Port 8080                     │
│                                                                     │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────────┐ │
│  │ REST Routers │  │ WebSocket     │  │ Agentic AI               │ │
│  │              │  │ Manager       │  │                          │ │
│  │ /auth        │  │               │  │ ┌──────────────────────┐ │ │
│  │ /venues      │  │ /ws/3d-bridge │◄─┼─│ Agent Orchestrator   │ │ │
│  │ /requests    │  │ /ws/admin     │  │ │ (OpenRouter LLM)     │ │ │
│  │ /assets      │  │               │  │ └──────────────────────┘ │ │
│  │ /reservations│  └───────────────┘  │ ┌──────────────────────┐ │ │
│  │ /quotations  │                     │ │ Tools:               │ │ │
│  │ /tasks       │                     │ │ - check_availability  │ │ │
│  │ /layouts     │                     │ │ - design_room_layout  │ │ │
│  │ /ai          │                     │ │ - generate_quotation  │ │ │
│  └──────────────┘                     │ │ - list_assets         │ │ │
│                                       │ │ - create_task_list    │ │ │
│  ┌──────────────┐                     │ │ - push_layout_to_3d   │ │ │
│  │ Services     │                     │ └──────────────────────┘ │ │
│  │ Layer        │                     └──────────────────────────┘ │
│  └──────┬───────┘                                                  │
│         │                                                           │
└─────────┼───────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│               Supabase / PostgreSQL (Cloud)                        │
│                                                                     │
│  users │ venues │ event_requests │ assets │ asset_reservations     │
│  quotations │ tasks │ room_layouts │ ai_conversations              │
└─────────────────────────────────────────────────────────────────────┘
```

**Data & Event Flow Summary:**

1. Client fills out booking form on Vue.js SPA → `POST /api/requests` on Python backend
2. Backend saves request and triggers AI Request Intake Agent
3. AI agent runs availability check, generates quotation, sends proposal back
4. Admin reviews in dashboard, can trigger "Design Room" → AI Room Design Agent activates
5. Room Design Agent generates a furniture layout JSON, calls `push_layout_to_3d` tool
6. Python backend pushes layout via WebSocket to Three.js app
7. Three.js `bridge.js` receives the command, calls `applyLayoutFromJSON()` in `furnishing.js`
8. Admin and client see the room configured in real time in the 3D viewer
9. Admin approves → assets are reserved in DB → task list auto-generated

---

## 3. Service Map & Ports

| Service | Port | Stack | Entry Point |
|---------|------|-------|-------------|
| Three.js 3D Visualization | `3000` | Node.js / Express / Three.js | `tumo_3d_model/server.js` |
| Vue.js Frontend SPA | `5173` | Vue 3 / Vite | `frontend/src/main.ts` |
| Python API + AI Backend | `8080` | FastAPI / Uvicorn | `backend/run.py` |
| PostgreSQL (Supabase) | `5432` (cloud) | PostgreSQL 15 | Supabase Dashboard |

**CORS configuration on the Python backend** must allow origins `http://localhost:5173` and `http://localhost:3000`.

**The Three.js app** is kept as a self-contained module (vanilla JS, existing implementation). It is extended by adding `src/bridge.js` which connects as a WebSocket **client** to the Python backend. No other changes to the Three.js app internals are needed.

**The Vue.js SPA** communicates with the Python backend via REST for all data operations and via a Pinia store-managed WebSocket for real-time admin updates. It embeds the Three.js app in an `<iframe>` on the 3D Visualization tab.

---

## 4. Technology Stack Decisions

### Backend
| Concern | Choice | Reason |
|---------|--------|--------|
| Framework | FastAPI | Native async, auto-generated OpenAPI docs, WebSocket support, Pydantic validation |
| ASGI server | Uvicorn (with Gunicorn for prod) | FastAPI native, supports WebSockets |
| ORM | SQLAlchemy 2.0 (async) | Type-safe, supports async Postgres, works alongside Supabase |
| DB driver | asyncpg | Best async PostgreSQL driver for Python |
| Migrations | Alembic | Works with SQLAlchemy, version-controlled schema |
| Auth | python-jose (JWT) + passlib (bcrypt) | Supabase-compatible JWT tokens, secure passwords |
| HTTP client | httpx | Async-native, used for OpenRouter API calls |
| AI LLM | OpenRouter (openai-compatible SDK) | Already in .env, supports Claude/GPT/Gemini via single API |
| Agent model | `anthropic/claude-3.5-sonnet` via OpenRouter | Best tool-calling performance for structured JSON output |
| Supabase client | `supabase-py` | For auth management, storage, realtime if needed |

### Frontend
| Concern | Choice | Reason |
|---------|--------|--------|
| Framework | Vue 3 (Composition API) | Requested; excellent reactivity, smaller bundle than React |
| Build tool | Vite | Fast HMR, native ES modules, easy env config |
| Router | Vue Router 4 | Official, supports nested routes needed for dashboard |
| State | Pinia | Official Vue state library, TypeScript-first, devtools |
| HTTP | Axios with interceptors | Simple, supports request/response interceptors for auth tokens |
| Styling | Custom CSS with SpaceFlo design tokens | Matches the provided color pack; no heavy CSS framework needed |
| UI helpers | @headlessui/vue | Accessible modals, dropdowns, transitions |
| Icons | heroicons (SVG inline) | Clean, consistent, framework-agnostic |
| Charts | Chart.js + vue-chartjs | Inventory stats, booking trends |
| Calendar | FullCalendar (@fullcalendar/vue3) | Venue availability view with event overlays |
| Forms | VeeValidate + Yup | Form validation for booking requests |
| Notifications | Custom toast system (Pinia-based) | Lightweight, matches SpaceFlo style |
| Language | TypeScript | Type safety for the API contract layer |

### Database
| Concern | Choice |
|---------|--------|
| Engine | PostgreSQL 15 (via Supabase) |
| Hosting | Supabase (free tier sufficient for hackathon) |
| Realtime | Supabase Realtime (optional for live admin notifications) |
| Storage | Supabase Storage (for floor plan PNG exports) |

---

## 5. Database Schema (PostgreSQL / Supabase)

The full schema as executable SQL. Run via Alembic migrations in production; can be pasted into Supabase SQL Editor for rapid hackathon setup.

```sql
-- ============================================================
-- EXTENSION
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'client');
CREATE TYPE request_status AS ENUM (
    'draft', 'submitted', 'under_review', 'quotation_sent',
    'approved', 'confirmed', 'rejected', 'cancelled', 'completed'
);
CREATE TYPE asset_tracking_type AS ENUM ('pool', 'instance');
CREATE TYPE asset_status AS ENUM ('available', 'reserved', 'in_use', 'maintenance', 'missing');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'cancelled', 'released');
CREATE TYPE task_type AS ENUM ('setup', 'teardown', 'preparation', 'logistics', 'coordination');
CREATE TYPE task_status AS ENUM ('pending', 'assigned', 'in_progress', 'done', 'blocked');
CREATE TYPE quotation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
CREATE TYPE venue_status AS ENUM ('active', 'maintenance', 'unavailable');
CREATE TYPE layout_source AS ENUM ('manual', 'template', 'ai_generated');

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),           -- null for OAuth users
    full_name     VARCHAR(255) NOT NULL,
    role          user_role NOT NULL DEFAULT 'client',
    phone         VARCHAR(50),
    organization  VARCHAR(255),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VENUES (Pyramid spaces)
-- ============================================================
CREATE TABLE venues (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,          -- e.g. "Blue Room"
    floor           SMALLINT NOT NULL,              -- -1, 0, 1, 3
    capacity_min    INTEGER NOT NULL DEFAULT 0,
    capacity_max    INTEGER NOT NULL,               -- maximum persons
    area_sqm        DECIMAL(8,2),
    description     TEXT,
    amenities       JSONB NOT NULL DEFAULT '[]',    -- ["WiFi","Projector","AC"]
    status          venue_status NOT NULL DEFAULT 'active',
    three_d_room_id VARCHAR(100),                   -- matches room ID in Three.js world
    color_hex       VARCHAR(7),                     -- visual color for UI
    base_price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data for Pyramid of Tirana spaces
INSERT INTO venues (name, floor, capacity_min, capacity_max, area_sqm, description, three_d_room_id, color_hex, base_price_per_hour) VALUES
('Blue Room',   0,   10, 200, 450.0, 'Large event hall on ground floor, ideal for conferences, exhibitions, and performances.', 'blue-box',   '#3da9f5', 250.00),
('Orange Room', 0,   10, 150, 320.0, 'Versatile multi-purpose space on ground floor, main entrance-adjacent.', 'orange-box', '#ff6400', 200.00),
('Green Room',  -1,  10, 120, 280.0, 'Underground event space, excellent acoustics, suited for performances and screenings.', 'lime-green-box', '#2ec98a', 180.00),
('Yellow Room', -1,  5,  80,  160.0, 'Intimate underground space, ideal for workshops, training, and small meetings.', 'dark-green-box', '#f5a623', 120.00),
('Main Corridor & Entrance', 0, 20, 500, 800.0, 'The iconic entrance hall and connecting corridors. Used for exhibitions and receptions.', NULL, '#7a9bb5', 300.00);

-- ============================================================
-- EVENT REQUESTS
-- ============================================================
CREATE TABLE event_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    event_type      VARCHAR(100) NOT NULL,          -- "conference","concert","workshop","exhibition","hackathon"
    description     TEXT,
    requested_date  DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    attendee_count  INTEGER NOT NULL,
    venue_id        UUID REFERENCES venues(id) ON DELETE SET NULL,
    status          request_status NOT NULL DEFAULT 'submitted',
    special_requirements TEXT,
    setup_time_minutes   INTEGER NOT NULL DEFAULT 60,
    teardown_time_minutes INTEGER NOT NULL DEFAULT 60,
    assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason  TEXT,
    ai_proposal_json  JSONB,                        -- stored AI-generated intake analysis
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_requests_date ON event_requests(requested_date);
CREATE INDEX idx_event_requests_status ON event_requests(status);
CREATE INDEX idx_event_requests_venue ON event_requests(venue_id);

-- ============================================================
-- ASSETS (Inventory catalog)
-- ============================================================
CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(100) NOT NULL,          -- "seating","tables","av_equipment","staging","lighting","misc"
    tracking_type   asset_tracking_type NOT NULL DEFAULT 'pool',
    total_quantity  INTEGER NOT NULL DEFAULT 0,     -- for pool assets
    description     TEXT,
    unit_price      DECIMAL(10,2) NOT NULL DEFAULT 0, -- cost to include in quotation per unit
    three_d_item_key VARCHAR(100),                  -- matches furniture key in Three.js catalog
    qr_prefix       VARCHAR(50),                    -- for instance-tracked assets
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data for Pyramid assets
INSERT INTO assets (name, category, tracking_type, total_quantity, unit_price, three_d_item_key) VALUES
('Chair (Standard)',      'seating',      'pool', 300,  2.00,  'chair'),
('Chair (Executive)',     'seating',      'pool', 50,   5.00,  NULL),
('Round Table (6-person)','tables',       'pool', 60,   15.00, 'table'),
('Rectangular Table',     'tables',       'pool', 80,   12.00, 'desk'),
('Standing Desk',         'tables',       'pool', 20,   10.00, 'standing-desk'),
('Projector Screen',      'av_equipment', 'pool', 10,   30.00, 'monitor'),
('TV Display (65")',       'av_equipment', 'pool', 15,   25.00, 'tv'),
('Microphone (wireless)', 'av_equipment', 'pool', 30,   10.00, NULL),
('Laptop/PC',             'av_equipment', 'pool', 40,   20.00, 'pc'),
('Whiteboard',            'misc',         'pool', 25,   8.00,  'whiteboard'),
('Stage Panel (1m²)',      'staging',      'pool', 100,  5.00,  NULL),
('LED Lighting Rig',      'lighting',     'pool', 8,    40.00, NULL),
('Standing Podium',       'misc',         'pool', 10,   12.00, NULL),
('Power Strip (8-port)',   'misc',         'pool', 50,   3.00,  NULL);

-- ============================================================
-- ASSET INSTANCES (for instance-tracked assets with QR codes)
-- ============================================================
CREATE TABLE asset_instances (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    qr_code         VARCHAR(100) UNIQUE NOT NULL,
    serial_number   VARCHAR(100),
    status          asset_status NOT NULL DEFAULT 'available',
    current_venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    notes           TEXT,
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ASSET RESERVATIONS
-- ============================================================
CREATE TABLE asset_reservations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_request_id UUID NOT NULL REFERENCES event_requests(id) ON DELETE CASCADE,
    asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    quantity_requested INTEGER NOT NULL,
    quantity_confirmed INTEGER NOT NULL DEFAULT 0,
    reservation_start TIMESTAMPTZ NOT NULL,
    reservation_end   TIMESTAMPTZ NOT NULL,
    status          reservation_status NOT NULL DEFAULT 'pending',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_reservation_dates CHECK (reservation_end > reservation_start)
);

CREATE INDEX idx_asset_reservations_dates ON asset_reservations(reservation_start, reservation_end);
CREATE INDEX idx_asset_reservations_asset ON asset_reservations(asset_id);

-- ============================================================
-- QUOTATIONS
-- ============================================================
CREATE TABLE quotations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_request_id UUID NOT NULL REFERENCES event_requests(id) ON DELETE CASCADE,
    line_items      JSONB NOT NULL DEFAULT '[]',    -- [{name, qty, unit_price, total, category}]
    subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate        DECIMAL(5,4) NOT NULL DEFAULT 0.20,
    tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
    valid_until     DATE NOT NULL,
    status          quotation_status NOT NULL DEFAULT 'draft',
    generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
    ai_notes        TEXT,
    admin_notes     TEXT,
    sent_at         TIMESTAMPTZ,
    accepted_at     TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TASKS (Setup / Teardown / Operational)
-- ============================================================
CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_request_id UUID NOT NULL REFERENCES event_requests(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    task_type       task_type NOT NULL,
    assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
    due_at          TIMESTAMPTZ NOT NULL,
    completed_at    TIMESTAMPTZ,
    status          task_status NOT NULL DEFAULT 'pending',
    priority        SMALLINT NOT NULL DEFAULT 2,    -- 1=high, 2=medium, 3=low
    depends_on      UUID REFERENCES tasks(id),      -- task dependency chain
    ai_generated    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_event ON tasks(event_request_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_due ON tasks(due_at);

-- ============================================================
-- ROOM LAYOUTS (3D Visualization saved states)
-- ============================================================
CREATE TABLE room_layouts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id        UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    event_request_id UUID REFERENCES event_requests(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,
    items_json      JSONB NOT NULL DEFAULT '[]',    -- Three.js furniture item array
    source          layout_source NOT NULL DEFAULT 'manual',
    ai_prompt       TEXT,                           -- the prompt that generated this layout
    thumbnail_url   TEXT,                           -- Supabase Storage URL of PNG export
    is_current      BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_room_layouts_venue ON room_layouts(venue_id);

-- ============================================================
-- AI CONVERSATIONS (for chat history / context)
-- ============================================================
CREATE TABLE ai_conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    event_request_id UUID REFERENCES event_requests(id) ON DELETE SET NULL,
    messages        JSONB NOT NULL DEFAULT '[]',    -- [{role, content, timestamp}]
    agent_type      VARCHAR(50) NOT NULL,           -- 'copilot','room_designer','intake'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT / ACTIVITY LOG
-- ============================================================
CREATE TABLE activity_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type     VARCHAR(100) NOT NULL,          -- 'event_request','quotation','task'
    entity_id       UUID NOT NULL,
    action          VARCHAR(100) NOT NULL,          -- 'created','updated','approved','rejected'
    before_state    JSONB,
    after_state     JSONB,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_requests_updated_at BEFORE UPDATE ON event_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Part I — Backend: Python / FastAPI (Port 8080)

### Phase B1: Project Skeleton & Configuration

**Goal**: Establish the complete file structure, dependency management, configuration system, and a running FastAPI server that connects to Supabase.

#### Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app factory, CORS, router registration
│   ├── config.py                # Pydantic Settings — reads from .env
│   ├── database.py              # SQLAlchemy async engine + session factory
│   ├── dependencies.py          # FastAPI dependency injection (db session, current user)
│   │
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── venue.py
│   │   ├── event_request.py
│   │   ├── asset.py
│   │   ├── reservation.py
│   │   ├── quotation.py
│   │   ├── task.py
│   │   └── room_layout.py
│   │
│   ├── schemas/                 # Pydantic request/response models
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── venue.py
│   │   ├── event_request.py
│   │   ├── asset.py
│   │   ├── reservation.py
│   │   ├── quotation.py
│   │   ├── task.py
│   │   ├── room_layout.py
│   │   └── common.py            # Pagination, responses
│   │
│   ├── routers/                 # FastAPI APIRouter per domain
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── venues.py
│   │   ├── requests.py
│   │   ├── assets.py
│   │   ├── reservations.py
│   │   ├── quotations.py
│   │   ├── tasks.py
│   │   ├── room_layouts.py
│   │   └── ai.py
│   │
│   ├── services/                # Business logic layer (no FastAPI deps here)
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── venue_service.py
│   │   ├── request_service.py
│   │   ├── asset_service.py
│   │   ├── availability_service.py
│   │   ├── conflict_service.py
│   │   ├── quotation_service.py
│   │   ├── task_service.py
│   │   └── room_layout_service.py
│   │
│   ├── ai/                      # Agentic AI subsystem
│   │   ├── __init__.py
│   │   ├── agent.py             # Agent orchestrator — tool-calling loop
│   │   ├── prompts.py           # System prompts for each agent type
│   │   └── tools/
│   │       ├── __init__.py
│   │       ├── venue_tools.py
│   │       ├── inventory_tools.py
│   │       ├── layout_tools.py
│   │       ├── quotation_tools.py
│   │       └── task_tools.py
│   │
│   ├── websocket/               # WebSocket infrastructure
│   │   ├── __init__.py
│   │   ├── manager.py           # Connection registry
│   │   ├── bridge.py            # 3D bridge message handlers
│   │   └── admin.py             # Admin live notification channel
│   │
│   └── utils/
│       ├── __init__.py
│       ├── auth.py              # JWT encode/decode
│       ├── pagination.py
│       └── conflict_checker.py
│
├── alembic/
│   ├── env.py
│   └── versions/
│
├── alembic.ini
├── requirements.txt
├── .env.example
└── run.py                       # uvicorn entry point
```

#### `requirements.txt`

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

#### `app/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str                    # asyncpg URL: postgresql+asyncpg://...
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Auth
    SECRET_KEY: str                      # Random 32+ char string for JWT signing
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # AI
    OPENROUTER_API_KEY: str
    AI_MODEL: str = "anthropic/claude-3.5-sonnet"
    AI_TEMPERATURE: float = 0.1

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",   # Vue.js
        "http://localhost:3000",   # Three.js
    ]

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

settings = Settings()
```

#### `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, venues, requests, assets, reservations, quotations, tasks, room_layouts, ai
from app.websocket.bridge import router as ws_bridge_router
from app.websocket.admin import router as ws_admin_router

def create_app() -> FastAPI:
    app = FastAPI(
        title="SpaceFlo API",
        description="Pyramid of Tirana — Event Operations Platform",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # REST routers
    prefix = "/api/v1"
    app.include_router(auth.router,          prefix=f"{prefix}/auth",         tags=["Auth"])
    app.include_router(venues.router,        prefix=f"{prefix}/venues",       tags=["Venues"])
    app.include_router(requests.router,      prefix=f"{prefix}/requests",     tags=["Event Requests"])
    app.include_router(assets.router,        prefix=f"{prefix}/assets",       tags=["Assets"])
    app.include_router(reservations.router,  prefix=f"{prefix}/reservations", tags=["Reservations"])
    app.include_router(quotations.router,    prefix=f"{prefix}/quotations",   tags=["Quotations"])
    app.include_router(tasks.router,         prefix=f"{prefix}/tasks",        tags=["Tasks"])
    app.include_router(room_layouts.router,  prefix=f"{prefix}/layouts",      tags=["Room Layouts"])
    app.include_router(ai.router,            prefix=f"{prefix}/ai",           tags=["AI"])

    # WebSocket routers
    app.include_router(ws_bridge_router)   # /ws/3d-bridge
    app.include_router(ws_admin_router)    # /ws/admin

    return app

app = create_app()
```

#### `app/database.py`

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_size=10, max_overflow=20)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

#### `run.py`

```python
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info",
    )
```

---

### Phase B2: Authentication & Role-Based Access Control

**Goal**: JWT-based authentication with three roles — `admin`, `staff`, `client`. All secure endpoints require a valid Bearer token. Role guards protect admin/staff routes.

#### Auth Flow

```
POST /api/v1/auth/register    → create user (defaults to 'client' role)
POST /api/v1/auth/login       → returns {access_token, token_type, user}
GET  /api/v1/auth/me          → returns current user from token
POST /api/v1/auth/refresh     → refresh token
```

#### JWT Structure

Payload includes: `sub` (user UUID), `role`, `email`, `exp`. The secret is the `SECRET_KEY` from settings.

#### `app/utils/auth.py`

```python
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
```

#### `app/dependencies.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.utils.auth import decode_token
from app.models.user import User
from sqlalchemy import select

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def require_roles(*roles: str):
    async def guard(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return guard

require_admin = require_roles("admin")
require_staff = require_roles("admin", "staff")
```

---

### Phase B3: Venues & Spaces API

**Goal**: Full CRUD for Pyramid venues. Includes real-time availability status derived from confirmed reservations on a given date/time range.

#### Endpoints

```
GET    /api/v1/venues                   → list all venues (public)
GET    /api/v1/venues/{id}              → venue detail + amenities
GET    /api/v1/venues/{id}/availability → available slots for a date range
GET    /api/v1/venues/{id}/layout       → current saved 3D layout
POST   /api/v1/venues                   → create venue (admin)
PUT    /api/v1/venues/{id}              → update venue (admin)
DELETE /api/v1/venues/{id}              → soft-delete / deactivate (admin)
```

#### Availability Endpoint Detail

`GET /api/v1/venues/{id}/availability?date=2026-07-15&duration_hours=4`

Response:
```json
{
  "venue_id": "uuid",
  "date": "2026-07-15",
  "available_slots": [
    {"start": "08:00", "end": "12:00"},
    {"start": "14:00", "end": "18:00"}
  ],
  "occupied_slots": [
    {"start": "12:00", "end": "14:00", "event_title": "Corporate Workshop", "attendees": 45}
  ],
  "is_fully_available": false
}
```

The service computes this by querying all confirmed/approved `event_requests` for the venue on that date, accounting for `setup_time_minutes` and `teardown_time_minutes` as buffers.

---

### Phase B4: Event Request Lifecycle API

**Goal**: The core pipeline — from client submission through admin review, offering, confirmation, and completion. Each status transition triggers side effects (AI intake, conflict check, asset reservation, notification).

#### Endpoints

```
POST   /api/v1/requests                     → submit new request (client/public)
GET    /api/v1/requests                     → list requests (admin/staff: all; client: own)
GET    /api/v1/requests/{id}                → request detail with full context
PUT    /api/v1/requests/{id}                → update (client: draft only; admin/staff: any)
POST   /api/v1/requests/{id}/submit         → client submits draft
POST   /api/v1/requests/{id}/assign-venue   → admin assigns/changes venue
POST   /api/v1/requests/{id}/approve        → admin approves (triggers asset reservation + task gen)
POST   /api/v1/requests/{id}/reject         → admin rejects with reason
POST   /api/v1/requests/{id}/complete       → mark completed after event
GET    /api/v1/requests/{id}/conflicts      → list all detected conflicts
GET    /api/v1/requests/{id}/assets         → list required vs available assets
```

#### Request Status State Machine

```
draft ──► submitted ──► under_review ──► quotation_sent ──► approved ──► confirmed ──► completed
                                    └──────────────────────────────────► rejected
                                                                    └────► cancelled
```

When status transitions to `approved`:
1. All `asset_reservations` for this request become `confirmed`
2. Task generation service auto-creates setup/teardown/prep tasks
3. WebSocket message sent to admin channel: `{type: "REQUEST_APPROVED", payload: {requestId}}`

When status transitions to `submitted`:
1. AI Intake Agent is triggered asynchronously to analyze request and generate initial proposal
2. Conflict check runs automatically
3. Best-fit venue is suggested if none specified

#### `app/services/request_service.py` — Key methods

- `async def create_request(data: RequestCreate, client_id: UUID, db: AsyncSession) -> EventRequest`
- `async def transition_status(request_id: UUID, new_status: str, actor: User, db: AsyncSession, reason: str = None) -> EventRequest` — validates allowed transitions, runs side effects
- `async def get_with_full_context(request_id: UUID, db: AsyncSession) -> dict` — returns request + venue + assets + quotation + tasks + conflicts in one response

---

### Phase B5: Inventory & Asset Management API

**Goal**: Full catalog of operational assets, with pool quantity tracking, per-event reservation management, and real-time availability calculation.

#### Endpoints

```
GET    /api/v1/assets                          → list all assets (filterable by category)
GET    /api/v1/assets/{id}                     → asset detail
GET    /api/v1/assets/{id}/availability        → available qty for a date range
POST   /api/v1/assets                          → create asset (admin)
PUT    /api/v1/assets/{id}                     → update asset (admin)
GET    /api/v1/assets/categories               → list distinct categories
GET    /api/v1/assets/summary                  → total vs reserved quantities (dashboard widget)

POST   /api/v1/reservations                    → create asset reservation for a request
GET    /api/v1/reservations?request_id=uuid    → list reservations for a request
PUT    /api/v1/reservations/{id}               → update quantity / status
DELETE /api/v1/reservations/{id}               → cancel reservation (returns to pool)
```

#### Asset Availability Calculation

`GET /api/v1/assets/{id}/availability?start=2026-07-15T08:00:00&end=2026-07-15T20:00:00`

Logic:
```
available_qty = total_quantity - SUM(quantity_confirmed)
               WHERE reservation_status IN ('pending', 'confirmed')
               AND reservation_start < end_param
               AND reservation_end > start_param
```

Response:
```json
{
  "asset_id": "uuid",
  "asset_name": "Chair (Standard)",
  "total_quantity": 300,
  "reserved_quantity": 120,
  "available_quantity": 180,
  "reservations_in_window": [
    {"event_request_id": "uuid", "event_title": "Tech Summit", "quantity": 120}
  ]
}
```

#### Bulk Reservation Creation

When a request is submitted, a helper endpoint allows creating all asset reservations at once:

`POST /api/v1/requests/{id}/reserve-assets`

Body:
```json
{
  "assets": [
    {"asset_id": "uuid", "quantity": 150},
    {"asset_id": "uuid", "quantity": 5}
  ]
}
```

This runs an availability check for each asset and returns a conflict report if any cannot be fully satisfied, along with what is available.

---

### Phase B6: Availability Engine & Conflict Detection

**Goal**: A dedicated service layer that can detect and report all categories of conflict — venue double-booking, asset over-reservation, and simultaneous events exceeding shared resource budgets.

#### `app/services/conflict_service.py`

```python
from dataclasses import dataclass
from enum import Enum
from typing import List
from uuid import UUID

class ConflictType(str, Enum):
    VENUE_DOUBLE_BOOKING = "venue_double_booking"
    ASSET_OVER_RESERVATION = "asset_over_reservation"
    SETUP_TEARDOWN_OVERLAP = "setup_teardown_overlap"
    STAFF_DOUBLE_ASSIGNMENT = "staff_double_assignment"

@dataclass
class Conflict:
    type: ConflictType
    severity: str          # "blocking" | "warning"
    description: str
    affected_request_ids: List[UUID]
    affected_asset_id: UUID | None
    available: int | None
    requested: int | None

async def check_all_conflicts(request_id: UUID, db: AsyncSession) -> List[Conflict]:
    """
    Runs all conflict checks for a given request.
    Returns a list of Conflict objects. Empty list means no conflicts.
    
    Checks performed:
    1. Venue availability (including setup/teardown buffers of other events)
    2. All requested assets vs available pool quantities
    3. Staff assignment conflicts (if staff member is assigned to another event same day)
    """
    ...
```

The conflict check runs automatically in three situations:
1. When a request is submitted (async background task)
2. When an admin calls `GET /api/v1/requests/{id}/conflicts`
3. When the AI Conflict Detection Agent runs

Conflicts are stored on the request as part of `ai_proposal_json.conflicts` and also surfaced via the dedicated endpoint.

#### Offering System

When asset conflicts are detected, the backend generates an "offering" — what it CAN provide vs what was requested:

```json
{
  "can_fulfill": false,
  "conflicts": [
    {
      "type": "asset_over_reservation",
      "asset_name": "Chair (Standard)",
      "requested": 200,
      "available": 140,
      "suggestion": "We can provide 140 standard chairs. Would you like to supplement with 60 executive chairs (€5/day each) or arrange external rental?"
    }
  ],
  "modified_offering": {
    "chairs_standard": 140,
    "chairs_executive": 60,
    "price_delta": 180
  }
}
```

---

### Phase B7: Quotation Engine

**Goal**: Automatically generate professional, itemized quotations from a confirmed request's venue, asset reservations, and service requirements. Support AI-assisted generation and admin manual editing.

#### Endpoints

```
POST   /api/v1/quotations/generate/{request_id}   → auto-generate from request (admin/staff)
GET    /api/v1/quotations/{id}                     → quotation detail
PUT    /api/v1/quotations/{id}                     → update line items / notes
POST   /api/v1/quotations/{id}/send                → mark as sent to client
POST   /api/v1/quotations/{id}/accept              → client/admin marks accepted
GET    /api/v1/quotations/{id}/pdf                 → generate PDF (optional: use HTML template)
```

#### Quotation Line Item Schema

```json
[
  {"category": "venue",    "name": "Blue Room — 8 hours",          "qty": 1,   "unit_price": 250.00, "total": 2000.00},
  {"category": "seating",  "name": "Chair (Standard)",             "qty": 150, "unit_price": 2.00,   "total": 300.00},
  {"category": "tables",   "name": "Round Table (6-person)",       "qty": 25,  "unit_price": 15.00,  "total": 375.00},
  {"category": "av",       "name": "TV Display (65\")",            "qty": 2,   "unit_price": 25.00,  "total": 50.00},
  {"category": "service",  "name": "Setup & Teardown Labor",       "qty": 4,   "unit_price": 50.00,  "total": 200.00},
  {"category": "service",  "name": "Event Coordination Staff",     "qty": 2,   "unit_price": 80.00,  "total": 160.00}
]
```

#### `app/services/quotation_service.py`

```python
async def generate_quotation(request_id: UUID, db: AsyncSession, use_ai: bool = False) -> Quotation:
    """
    Auto-generates a quotation from:
    1. Venue base price × event duration hours
    2. All confirmed asset_reservations × unit_price × event duration days
    3. Standard service fees (setup labor, coordination) based on attendee count
    4. If use_ai=True: calls AI Quotation Agent to refine and add notes
    """
    ...
```

---

### Phase B8: Task & Operational Plan Generation

**Goal**: After an event request is approved, automatically generate a structured task list with types (setup, teardown, preparation, logistics), priorities, dependencies, and suggested assignees.

#### Endpoints

```
POST   /api/v1/tasks/generate/{request_id}    → auto-generate task list (admin/staff)
GET    /api/v1/tasks?request_id=uuid          → list tasks for a request
PUT    /api/v1/tasks/{id}                     → update task (assign, reschedule, complete)
POST   /api/v1/tasks/{id}/complete            → mark task done
GET    /api/v1/tasks/my-tasks                 → tasks assigned to current user
GET    /api/v1/tasks/overdue                  → overdue tasks (admin/staff dashboard widget)
```

#### Auto-Generated Task Templates

When a request is approved, `task_service.generate_for_request()` creates tasks based on event type. Example for a 200-person conference in the Blue Room:

```
PREPARATION (3 days before):
  [HIGH] Confirm final attendee count and seating arrangement with client
  [HIGH] Verify AV equipment functionality (projectors, mics, screens)
  [MED]  Order catering/refreshments if required
  [MED]  Print event signage and directional materials

SETUP (day before + morning of):
  [HIGH] Deliver and arrange 200 chairs in conference layout         → due: event_date - 2h
  [HIGH] Set up 25 round tables per approved floor plan              → due: event_date - 2h
  [HIGH] Configure AV system: 2x TVs, PA system, laptop connections  → due: event_date - 1h
  [MED]  Install directional signage at entrance and corridors       → due: event_date - 1h
  [LOW]  Set up registration table at entrance                       → due: event_date - 30m

TEARDOWN (after event):
  [HIGH] Collect and stack all 200 chairs → storage room B          → due: event_end + 1h
  [HIGH] Break down and store all tables                            → due: event_end + 1h
  [MED]  Pack and return AV equipment to storage                    → due: event_end + 2h
  [LOW]  Final venue walkthrough and damage report                  → due: event_end + 2h
```

The templates are configurable per event type and venue size. The AI Task Agent (Phase A5) further refines these based on specific request details.

---

## Part II — Agentic AI (Python, OpenRouter)

### Phase A1: Agent Architecture & Tool Registry

**Goal**: A single, unified agent orchestrator that can run in multiple specialized modes. Uses OpenRouter's tool-calling API (OpenAI-compatible) with a custom tool execution loop, without heavy framework dependencies.

#### Agent Architecture Pattern

The agent uses a **ReAct-style tool-calling loop**:

```
User Prompt
     │
     ▼
Build messages array:
  [system_prompt, user_message, ...conversation_history]
     │
     ▼
Call OpenRouter with tools=ALL_TOOLS_FOR_THIS_AGENT
     │
     ▼
Response has tool_calls? ──YES──► Execute tool(s) in parallel
     │                               │
     │                               ▼
     │                        Append tool results to messages
     │                               │
     └──────────────◄────────────────┘
           │
           NO (text response)
           │
           ▼
      Return final text to caller
```

#### `app/ai/agent.py`

```python
import json
import httpx
from typing import Any
from app.config import settings
from app.ai.tools import get_tools_for_agent, execute_tool

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

async def run_agent(
    agent_type: str,
    user_message: str,
    context: dict,
    conversation_history: list[dict] = None,
    db=None,
) -> dict:
    """
    Runs one full agent turn for the given agent_type.
    
    agent_type: 'intake' | 'room_designer' | 'conflict_detector' | 'planner' | 'copilot'
    context: domain-specific context dict (e.g., {request_id, venue_id, event_type, ...})
    Returns: {response: str, tool_calls_made: list, final_context: dict}
    """
    from app.ai.prompts import get_system_prompt
    
    system_prompt = get_system_prompt(agent_type, context)
    tools = get_tools_for_agent(agent_type)
    
    messages = [{"role": "system", "content": system_prompt}]
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": user_message})
    
    tool_calls_made = []
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for _ in range(10):  # max 10 iterations to prevent infinite loops
            response = await client.post(
                f"{OPENROUTER_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "HTTP-Referer": "http://localhost:8080",
                    "X-Title": "SpaceFlo",
                },
                json={
                    "model": settings.AI_MODEL,
                    "messages": messages,
                    "tools": tools,
                    "tool_choice": "auto",
                    "temperature": settings.AI_TEMPERATURE,
                },
            )
            response.raise_for_status()
            data = response.json()
            choice = data["choices"][0]
            message = choice["message"]
            
            if choice["finish_reason"] == "tool_calls" and message.get("tool_calls"):
                messages.append(message)
                tool_results = []
                for tc in message["tool_calls"]:
                    fn_name = tc["function"]["name"]
                    fn_args = json.loads(tc["function"]["arguments"])
                    result = await execute_tool(fn_name, fn_args, context, db)
                    tool_calls_made.append({"tool": fn_name, "args": fn_args, "result": result})
                    tool_results.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": json.dumps(result),
                    })
                messages.extend(tool_results)
            else:
                # Final text response
                return {
                    "response": message["content"],
                    "tool_calls_made": tool_calls_made,
                    "final_context": context,
                }
    
    return {"response": "Agent reached maximum iterations.", "tool_calls_made": tool_calls_made, "final_context": context}
```

#### `app/ai/tools/__init__.py` — Tool Registry

```python
from .venue_tools import VENUE_TOOLS, execute_venue_tool
from .inventory_tools import INVENTORY_TOOLS, execute_inventory_tool
from .layout_tools import LAYOUT_TOOLS, execute_layout_tool
from .quotation_tools import QUOTATION_TOOLS, execute_quotation_tool
from .task_tools import TASK_TOOLS, execute_task_tool

TOOL_SETS = {
    "intake":            VENUE_TOOLS + INVENTORY_TOOLS + QUOTATION_TOOLS,
    "room_designer":     INVENTORY_TOOLS + LAYOUT_TOOLS,
    "conflict_detector": VENUE_TOOLS + INVENTORY_TOOLS,
    "planner":           INVENTORY_TOOLS + TASK_TOOLS,
    "copilot":           VENUE_TOOLS + INVENTORY_TOOLS + LAYOUT_TOOLS + QUOTATION_TOOLS + TASK_TOOLS,
}

EXECUTORS = {
    **{t["function"]["name"]: execute_venue_tool     for t in VENUE_TOOLS},
    **{t["function"]["name"]: execute_inventory_tool for t in INVENTORY_TOOLS},
    **{t["function"]["name"]: execute_layout_tool    for t in LAYOUT_TOOLS},
    **{t["function"]["name"]: execute_quotation_tool for t in QUOTATION_TOOLS},
    **{t["function"]["name"]: execute_task_tool      for t in TASK_TOOLS},
}

def get_tools_for_agent(agent_type: str) -> list:
    return TOOL_SETS.get(agent_type, [])

async def execute_tool(name: str, args: dict, context: dict, db) -> Any:
    executor = EXECUTORS.get(name)
    if not executor:
        return {"error": f"Unknown tool: {name}"}
    return await executor(args, context, db)
```

---

### Phase A2: Room Design Agent (3D Integration)

**Goal**: The most visually impressive part of SpaceFlo. The agent receives a natural language prompt describing a desired room configuration, queries the inventory, calculates a valid furniture layout, and pushes it live to the Three.js 3D app via WebSocket.

#### `app/ai/tools/layout_tools.py` — Full Definition

```python
from app.websocket.manager import ws_manager

LAYOUT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_venue_dimensions",
            "description": "Get the floor area, dimensions (width, depth, height in meters), and 3D room ID of a venue.",
            "parameters": {
                "type": "object",
                "properties": {
                    "venue_name": {"type": "string", "description": "Name of the venue (e.g. 'Blue Room')"}
                },
                "required": ["venue_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_available_furniture",
            "description": "Get list of furniture types available in the 3D model catalog and their current stock count.",
            "parameters": {
                "type": "object",
                "properties": {
                    "event_date_start": {"type": "string", "format": "date-time"},
                    "event_date_end":   {"type": "string", "format": "date-time"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_room_layout",
            "description": "Generate an optimized furniture layout for a room given event type, attendees, and preferences. Returns a JSON array of item placements.",
            "parameters": {
                "type": "object",
                "properties": {
                    "venue_name":     {"type": "string"},
                    "event_type":     {"type": "string", "enum": ["conference","workshop","concert","exhibition","hackathon","dinner","classroom"]},
                    "attendee_count": {"type": "integer"},
                    "preferences":    {"type": "string", "description": "Free-text style preferences, e.g. 'central stage, U-shape seating, AV screen at front'"},
                    "items":          {
                        "type": "array",
                        "description": "Specific furniture items to include",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string", "description": "furniture type key matching Three.js catalog: chair|table|desk|tv|whiteboard|pc|monitor|standing-desk"},
                                "quantity": {"type": "integer"}
                            }
                        }
                    }
                },
                "required": ["venue_name", "event_type", "attendee_count"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "push_layout_to_3d",
            "description": "Push a furniture layout to the live Three.js 3D visualization. This will immediately reconfigure the room in the 3D app.",
            "parameters": {
                "type": "object",
                "properties": {
                    "three_d_room_id": {"type": "string", "description": "The room ID in the Three.js world (e.g. 'blue-box')"},
                    "layout_items":    {
                        "type": "array",
                        "description": "Array of furniture placements",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type":        {"type": "string"},
                                "position":    {"type": "object", "properties": {"x": {"type": "number"}, "y": {"type": "number"}, "z": {"type": "number"}}},
                                "rotation":    {"type": "number", "description": "Y-axis rotation in radians"},
                                "wall_mounted": {"type": "boolean"},
                                "stacked_on":  {"type": "string", "description": "Parent item ID if stacked"}
                            },
                            "required": ["type", "position"]
                        }
                    },
                    "save_to_db":      {"type": "boolean", "default": True},
                    "layout_name":     {"type": "string"}
                },
                "required": ["three_d_room_id", "layout_items"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "clear_room_layout",
            "description": "Clear all furniture from a room in the 3D visualization.",
            "parameters": {
                "type": "object",
                "properties": {
                    "three_d_room_id": {"type": "string"}
                },
                "required": ["three_d_room_id"]
            }
        }
    }
]

async def execute_layout_tool(name: str, args: dict, context: dict, db) -> dict:
    if name == "get_venue_dimensions":
        return await _get_venue_dimensions(args, db)
    if name == "get_available_furniture":
        return await _get_available_furniture(args, db)
    if name == "generate_room_layout":
        return await _generate_room_layout(args, context)
    if name == "push_layout_to_3d":
        return await _push_layout_to_3d(args, context, db)
    if name == "clear_room_layout":
        return await _clear_room_layout(args)
    return {"error": f"Unknown layout tool: {name}"}

async def _push_layout_to_3d(args: dict, context: dict, db) -> dict:
    """
    Sends the APPLY_LAYOUT WebSocket command to all connected 3D clients.
    Also optionally saves the layout to the room_layouts table.
    """
    room_id = args["three_d_room_id"]
    items = args["layout_items"]
    
    # Broadcast to all connected Three.js clients
    await ws_manager.broadcast_to_channel("3d-bridge", {
        "type": "APPLY_LAYOUT",
        "payload": {
            "roomId": room_id,
            "items": items,
            "source": "ai_agent",
            "layout_name": args.get("layout_name", "AI Generated Layout"),
        }
    })
    
    # Save to DB if requested
    if args.get("save_to_db", True) and db:
        from app.services.room_layout_service import save_layout
        layout = await save_layout(
            venue_three_d_id=room_id,
            items=items,
            source="ai_generated",
            ai_prompt=context.get("user_prompt"),
            name=args.get("layout_name", "AI Generated Layout"),
            db=db,
        )
        return {"success": True, "room_id": room_id, "items_placed": len(items), "layout_id": str(layout.id)}
    
    return {"success": True, "room_id": room_id, "items_placed": len(items)}

async def _generate_room_layout(args: dict, context: dict) -> dict:
    """
    Computes spatial positions for furniture items given room dimensions and layout style.
    
    Layout algorithm:
    - For 'conference': rows of chairs facing a stage, tables at front
    - For 'workshop': clusters of 4-6 chairs around round tables
    - For 'classroom': rows of desks facing whiteboard
    - For 'hackathon': clusters of desks with PCs, whiteboards on walls
    - For 'exhibition': clear central corridor, tables/displays along walls
    
    Returns items array with computed x,y,z positions within the room bounds.
    Room origin is center of floor. Y=0 is floor level.
    """
    # This function uses geometric calculations — no LLM needed
    # The LLM called this tool; this function returns the structured layout
    # Implementation uses room dimensions to tile furniture with spacing rules
    ...
```

#### Room Design Agent System Prompt

```python
# app/ai/prompts.py (room_designer section)
ROOM_DESIGNER_PROMPT = """
You are SpaceFlo's 3D Room Design Agent for the Pyramid of Tirana.
Your role is to configure rooms in the live 3D visualization based on natural language descriptions.

When given a request to design a room:
1. ALWAYS start by calling get_venue_dimensions to know the room size
2. Call get_available_furniture to see what items are in stock for the event dates
3. Call generate_room_layout with the appropriate parameters to compute positions
4. Call push_layout_to_3d with the generated layout to update the 3D visualization in real time
5. Respond with a brief confirmation of what was placed and any limitations

Available room IDs in the Three.js 3D model:
- "blue-box"      → Blue Room (Floor 0, ~450m²)
- "orange-box"    → Orange Room (Floor 0, ~320m²)
- "lime-green-box" → Green Room (Floor -1, ~280m²)
- "dark-green-box" → Yellow Room (Floor -1, ~160m²)

Furniture type keys for Three.js catalog: chair, table, desk, tv, whiteboard, pc, monitor, standing-desk

The 3D coordinate system: X is room width (left-right), Z is room depth (front-back), Y is height.
Room center is (0, 0, 0) at floor level (Y=0).
Standard spacing: chairs 0.8m apart, tables 1.5m apart, walking aisles minimum 1.2m wide.

Always confirm what you placed and mention if any items couldn't be placed due to inventory limits.
Be efficient — don't ask for clarification if the request has enough info to act.
"""
```

#### AI Route — Room Design

```
POST /api/v1/ai/design-room
Body: {
  "venue_name": "Blue Room",
  "prompt": "Set up for a 60-person tech conference with theater seating, a stage at the front with a TV, and a registration table near the entrance",
  "event_request_id": "uuid (optional)",
  "event_date_start": "2026-07-15T09:00:00",
  "event_date_end": "2026-07-15T18:00:00"
}
Response: {
  "message": "I've configured the Blue Room for a 60-person tech conference...",
  "layout_id": "uuid",
  "items_placed": 73,
  "tool_calls": [...]
}
```

---

### Phase A3: Request Intake & Proposal Agent

**Goal**: When a client submits a request, this agent runs automatically to analyze it, find the best-fit venue, check availability and inventory, and generate an initial structured proposal — all before a human admin even looks at it.

#### Trigger

After `POST /api/v1/requests` is called (when status transitions to `submitted`), a FastAPI background task runs:

```python
from fastapi import BackgroundTasks

@router.post("/requests")
async def create_request(data: RequestCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    request = await request_service.create_request(data, db)
    background_tasks.add_task(run_intake_agent, request.id, db)
    return request

async def run_intake_agent(request_id: UUID, db: AsyncSession):
    request = await request_service.get(request_id, db)
    context = {
        "request_id": str(request_id),
        "event_type": request.event_type,
        "attendee_count": request.attendee_count,
        "date": str(request.requested_date),
        "start_time": str(request.start_time),
        "end_time": str(request.end_time),
        "special_requirements": request.special_requirements,
    }
    result = await run_agent("intake", f"Analyze this event request and generate a proposal: {request.title}", context, db=db)
    # Store result in request.ai_proposal_json
    await request_service.update_ai_proposal(request_id, result, db)
```

#### Intake Agent Tools

The intake agent has access to:
- `list_available_venues(date, start_time, end_time, min_capacity)` → returns venues that are free for the time window
- `check_asset_availability(asset_names, quantities, date_start, date_end)` → checks if required assets can be provided
- `estimate_quotation(venue_id, duration_hours, attendee_count, event_type)` → returns estimated cost breakdown
- `detect_conflicts(venue_id, date, start_time, end_time)` → checks for conflicts
- `suggest_venue(event_type, attendee_count, preferences)` → recommends best-fit venue

The agent's output (stored in `ai_proposal_json`) has this structure:

```json
{
  "recommended_venue": {"id": "uuid", "name": "Blue Room", "confidence": 0.92, "reason": "..."},
  "availability_check": {"is_available": true, "conflicts": []},
  "asset_check": {"can_fulfill": true, "items": [{"name": "Chair", "requested": 150, "available": 180}]},
  "estimated_quotation": {"total": 3200.00, "breakdown": [...]},
  "flags": ["High attendee count — confirm setup time buffer", "Request mentions AV needs not in standard package"],
  "suggested_actions": ["Assign Blue Room", "Generate formal quotation", "Schedule site walk-through"],
  "agent_summary": "This is a feasible conference request..."
}
```

---

### Phase A4: Conflict Detection Agent

**Goal**: On-demand or automatic conflict analysis that goes beyond simple date overlap — considers resource sharing across multiple simultaneous events, staff availability, and logistical bottlenecks.

#### Endpoints

```
POST /api/v1/ai/detect-conflicts
Body: {"request_id": "uuid"}
Response: {
  "has_blocking_conflicts": false,
  "conflicts": [...],
  "warnings": [...],
  "resolution_suggestions": [...]
}
```

#### Conflict Categories Checked

1. **Venue double-booking**: Same venue, overlapping datetime (including setup/teardown buffers)
2. **Asset over-reservation**: Sum of reserved quantities exceeds total pool for any asset in any overlapping event
3. **Shared asset bottleneck**: When two large events on the same day both need many chairs — the agent predicts morning-of logistics stress even if numbers technically add up
4. **Staff assignment conflict**: Same staff member assigned to overlapping events
5. **Setup/teardown collision**: Event A's teardown overlaps Event B's setup in the same space

The agent calls the `conflict_service.check_all_conflicts()` service and then uses LLM reasoning to generate human-readable resolution suggestions.

---

### Phase A5: Operational Planning Agent

**Goal**: Given an approved event request, generate a detailed, time-ordered operational task list with suggested assignees, priorities, and dependencies. Updates the tasks table.

#### Endpoints

```
POST /api/v1/ai/generate-tasks/{request_id}
Response: {
  "tasks_created": 12,
  "tasks": [...],
  "agent_notes": "Based on 200 attendees in the Blue Room, I've prioritized..."
}
```

#### Agent Tools

- `get_staff_list()` → returns available staff members and their typical roles
- `get_venue_setup_requirements(venue_id, event_type, attendee_count)` → returns typical setup requirements for this configuration
- `get_asset_delivery_requirements(reservation_ids)` → list of assets to move, their current location, destination
- `create_task(event_request_id, title, type, assigned_to, due_at, priority, depends_on)` → creates a task in DB
- `get_existing_tasks(request_id)` → list existing tasks to avoid duplication

---

## Part III — 3D Visualization Bridge (Three.js ↔ Python)

### Phase V1: Python WebSocket Server

**Goal**: FastAPI WebSocket endpoint that the Three.js app connects to as a client. Acts as a broadcast channel — Python backend (particularly the AI agent) pushes room layout commands; the Three.js app receives and executes them.

#### `app/websocket/manager.py`

```python
from collections import defaultdict
from fastapi import WebSocket
import json

class WebSocketManager:
    def __init__(self):
        # channel_name → list of WebSocket connections
        self._channels: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        self._channels[channel].append(websocket)
        print(f"[WS] Client connected to channel '{channel}'. Total: {len(self._channels[channel])}")

    async def disconnect(self, websocket: WebSocket, channel: str):
        if websocket in self._channels[channel]:
            self._channels[channel].remove(websocket)

    async def broadcast_to_channel(self, channel: str, message: dict):
        dead = []
        for ws in self._channels.get(channel, []):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws, channel)

    async def send_to_one(self, websocket: WebSocket, message: dict):
        await websocket.send_text(json.dumps(message))

    def connection_count(self, channel: str) -> int:
        return len(self._channels.get(channel, []))

ws_manager = WebSocketManager()
```

#### `app/websocket/bridge.py` — 3D Bridge WebSocket Route

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import ws_manager
import json

router = APIRouter()

@router.websocket("/ws/3d-bridge")
async def three_d_bridge(websocket: WebSocket):
    """
    WebSocket channel for the Three.js 3D visualization app.
    The Three.js app connects here on startup.
    The Python backend (AI agent) broadcasts layout commands to this channel.
    The Three.js app can also send messages upstream (e.g., layout saved, item selected).
    """
    await ws_manager.connect(websocket, "3d-bridge")
    try:
        # Send welcome/sync message
        await ws_manager.send_to_one(websocket, {
            "type": "CONNECTED",
            "payload": {"message": "SpaceFlo 3D Bridge connected", "version": "1.0"}
        })
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            await handle_upstream_message(msg, websocket)
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, "3d-bridge")

async def handle_upstream_message(msg: dict, websocket: WebSocket):
    """
    Handle messages coming FROM the Three.js app TO the Python backend.
    """
    msg_type = msg.get("type")
    payload = msg.get("payload", {})
    
    if msg_type == "LAYOUT_SAVED":
        # Three.js app saved a layout — persist to DB
        from app.services.room_layout_service import sync_layout_from_3d
        await sync_layout_from_3d(payload["roomId"], payload["items"])
    
    elif msg_type == "ROOM_ENTERED":
        # User entered a room — broadcast to admin channel for live view
        await ws_manager.broadcast_to_channel("admin", {
            "type": "USER_VIEWING_ROOM",
            "payload": payload
        })
    
    elif msg_type == "REQUEST_LAYOUT":
        # Three.js app is asking for the last saved layout for a room
        from app.services.room_layout_service import get_current_layout
        layout = await get_current_layout(payload["roomId"])
        if layout:
            await ws_manager.send_to_one(websocket, {
                "type": "APPLY_LAYOUT",
                "payload": {"roomId": payload["roomId"], "items": layout.items_json, "source": "db_sync"}
            })
```

#### `app/websocket/admin.py` — Admin Realtime Channel

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import ws_manager
import json

router = APIRouter()

@router.websocket("/ws/admin")
async def admin_channel(websocket: WebSocket):
    """
    Real-time notifications for admin dashboard.
    Events: new request submitted, request status changed, conflict detected,
    asset nearly depleted, layout updated by AI.
    """
    await ws_manager.connect(websocket, "admin")
    try:
        while True:
            await websocket.receive_text()  # keep-alive ping handling
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, "admin")
```

---

### Phase V2: Three.js Bridge Client

**Goal**: A new `src/bridge.js` module added to the existing `tumo_3d_model` project. It connects to the Python WebSocket server, listens for commands, and calls existing functions in `furnishing.js` to execute them.

#### `tumo_3d_model/src/bridge.js` — New File

```javascript
/**
 * SpaceFlo Bridge — WebSocket client connecting the Three.js 3D app
 * to the Python backend for real-time AI-driven room configuration.
 */

export class SpaceFloBridge {
    constructor() {
        this.ws = null;
        this.reconnectDelay = 3000;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 20;
        this._handlers = new Map();
        this._connected = false;
    }

    connect(url = 'ws://localhost:8080/ws/3d-bridge') {
        try {
            this.ws = new WebSocket(url);

            this.ws.addEventListener('open', () => {
                console.log('[SpaceFlo Bridge] Connected to backend');
                this._connected = true;
                this.reconnectAttempts = 0;
                this._emit('connected');
            });

            this.ws.addEventListener('message', (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this._handleIncoming(msg);
                } catch (e) {
                    console.warn('[SpaceFlo Bridge] Failed to parse message:', e);
                }
            });

            this.ws.addEventListener('close', () => {
                this._connected = false;
                console.log('[SpaceFlo Bridge] Disconnected — will attempt reconnect');
                this._emit('disconnected');
                this._scheduleReconnect(url);
            });

            this.ws.addEventListener('error', (err) => {
                // Silently handle — backend may not be running
                console.debug('[SpaceFlo Bridge] WebSocket error (backend may be offline)');
            });
        } catch (e) {
            this._scheduleReconnect(url);
        }
    }

    _scheduleReconnect(url) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
        this.reconnectAttempts++;
        setTimeout(() => this.connect(url), this.reconnectDelay);
    }

    _handleIncoming(msg) {
        const { type, payload } = msg;
        switch (type) {
            case 'CONNECTED':
                // Request current layout from DB on initial connect
                this.send('REQUEST_LAYOUT', { roomId: window._currentRoomId });
                break;
            case 'APPLY_LAYOUT':
                this._emit('applyLayout', payload);
                break;
            case 'ADD_ITEM':
                this._emit('addItem', payload);
                break;
            case 'REMOVE_ITEM':
                this._emit('removeItem', payload);
                break;
            case 'CLEAR_ROOM':
                this._emit('clearRoom', payload);
                break;
            case 'HIGHLIGHT_ITEM':
                this._emit('highlightItem', payload);
                break;
        }
    }

    send(type, payload = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
        }
    }

    on(event, handler) {
        this._handlers.set(event, handler);
        return this;  // fluent API
    }

    _emit(event, data) {
        const handler = this._handlers.get(event);
        if (handler) handler(data);
    }

    get isConnected() { return this._connected; }
}

export const bridge = new SpaceFloBridge();
```

#### Modifications to `tumo_3d_model/src/main.js`

Add at the top of the file:

```javascript
import { bridge } from './bridge.js';

// Initialize bridge connection (non-blocking — backend may not be running)
bridge.connect();

// When AI agent sends a layout, apply it to the current room
bridge.on('applyLayout', ({ roomId, items, layout_name }) => {
    console.log(`[Bridge] Applying AI layout "${layout_name}" to room: ${roomId}`);
    if (window._currentRoomId === roomId) {
        applyLayoutFromJSON(roomId, items);
    }
});

bridge.on('clearRoom', ({ roomId }) => {
    if (window._currentRoomId === roomId) {
        clearRoomFurniture(roomId);
    }
});
```

#### Required additions to `tumo_3d_model/src/furnishing.js`

Expose two new public functions that `bridge.js` can call:

```javascript
/**
 * Apply a layout from JSON (from AI agent or DB sync).
 * Clears existing furniture and places all items from the spec.
 * @param {string} roomId - The room ID (e.g. 'blue-box')
 * @param {Array} items - Array of {type, position: {x,y,z}, rotation, wallMounted}
 */
export function applyLayoutFromJSON(roomId, items) {
    clearRoomFurniture(roomId);  // remove current items
    for (const item of items) {
        placeFurnitureItem(roomId, item.type, item.position, item.rotation ?? 0, item.wallMounted ?? false);
    }
    saveLayoutToStorage(roomId);
    // Notify bridge that layout was applied
    import('./bridge.js').then(({ bridge }) => {
        bridge.send('LAYOUT_SAVED', { roomId, items });
    });
}

/**
 * Clear all furniture from a room.
 */
export function clearRoomFurniture(roomId) {
    // ... existing clear logic, extracted into named export
}
```

---

### Phase V3: Command Protocol Specification

All WebSocket messages between Python backend and Three.js app follow this envelope:

```json
{
  "type": "COMMAND_TYPE",
  "payload": { ... }
}
```

#### Python → Three.js (Downstream Commands)

| Type | Payload | Effect |
|------|---------|--------|
| `APPLY_LAYOUT` | `{roomId, items[], source, layout_name}` | Clears room, places all items from array |
| `ADD_ITEM` | `{roomId, type, position, rotation, wallMounted}` | Adds single item without clearing |
| `REMOVE_ITEM` | `{roomId, itemId}` | Removes a specific item by ID |
| `CLEAR_ROOM` | `{roomId}` | Removes all furniture from a room |
| `HIGHLIGHT_ITEM` | `{roomId, itemId, color, duration_ms}` | Visually highlights an item (e.g., for inventory check) |
| `NAVIGATE_TO_ROOM` | `{roomId}` | Tells the 3D camera to fly to a specific room |
| `CONNECTED` | `{message, version}` | Sent on new WebSocket connection |

#### Three.js → Python (Upstream Events)

| Type | Payload | Meaning |
|------|---------|---------|
| `LAYOUT_SAVED` | `{roomId, items[]}` | User manually saved a layout; sync to DB |
| `ROOM_ENTERED` | `{roomId, userId?}` | User navigated inside a room |
| `ROOM_EXITED` | `{roomId}` | User left a room |
| `ITEM_PLACED` | `{roomId, type, position}` | User manually placed an item |
| `ITEM_REMOVED` | `{roomId, itemId}` | User removed an item |
| `REQUEST_LAYOUT` | `{roomId}` | Request current saved layout from DB |

#### `items[]` Schema (Shared Format)

```json
[
  {
    "id": "chair_0",
    "type": "chair",
    "position": {"x": -2.5, "y": 0, "z": 1.2},
    "rotation": 3.14159,
    "wallMounted": false,
    "stackedOn": null
  },
  {
    "id": "tv_0",
    "type": "tv",
    "position": {"x": 0, "y": 1.5, "z": -5.8},
    "rotation": 0,
    "wallMounted": true
  }
]
```

---

### Phase V4: Layout Persistence Sync

**Goal**: The Three.js app currently saves layouts to `localStorage`. After the bridge is connected, the app should use the Python backend as the primary persistence layer, with `localStorage` as a fallback.

#### Sync Strategy

1. On app startup, if bridge is connected: `bridge.send('REQUEST_LAYOUT', {roomId})` for each room
2. Python backend responds with `APPLY_LAYOUT` containing the DB-saved layout
3. When user manually saves in Three.js: `bridge.send('LAYOUT_SAVED', {roomId, items})` → Python saves to `room_layouts` table
4. If bridge is not connected: fall back to `localStorage` (existing behavior unchanged)

This ensures zero breakage of the existing Three.js app if the Python backend is not running.

#### `app/services/room_layout_service.py`

```python
from sqlalchemy import select, update
from app.models.room_layout import RoomLayout
from app.database import AsyncSessionLocal

async def get_current_layout(three_d_room_id: str) -> RoomLayout | None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(RoomLayout)
            .join(RoomLayout.venue)
            .where(Venue.three_d_room_id == three_d_room_id, RoomLayout.is_current == True)
            .order_by(RoomLayout.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

async def sync_layout_from_3d(three_d_room_id: str, items: list) -> None:
    async with AsyncSessionLocal() as db:
        # Find venue by 3D room ID
        venue = await db.execute(select(Venue).where(Venue.three_d_room_id == three_d_room_id))
        venue = venue.scalar_one_or_none()
        if not venue:
            return
        # Set all existing layouts for this venue to not-current
        await db.execute(update(RoomLayout).where(RoomLayout.venue_id == venue.id).values(is_current=False))
        # Create new current layout
        layout = RoomLayout(
            venue_id=venue.id,
            name="Manual Save",
            items_json=items,
            source="manual",
            is_current=True,
        )
        db.add(layout)
        await db.commit()
```

---

## Part IV — Frontend: Vue.js / Vite (Port 5173)

### Phase F1: Project Setup & Design System

**Goal**: Bootstrap the Vue 3 + Vite + TypeScript project, install all dependencies, set up routing, Pinia store, Axios, and implement the SpaceFlo design system as CSS custom properties.

#### Project Creation

```bash
npm create vite@latest spaceflo-frontend -- --template vue-ts
cd spaceflo-frontend
npm install vue-router@4 pinia axios @headlessui/vue @vueuse/core
npm install vee-validate yup
npm install chart.js vue-chartjs
npm install @fullcalendar/core @fullcalendar/vue3 @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
```

#### Directory Structure

```
frontend/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts               # Vue Router config
│   ├── stores/
│   │   ├── auth.ts                # User session, token
│   │   ├── requests.ts            # Event requests list + active request
│   │   ├── assets.ts              # Inventory state
│   │   ├── notifications.ts       # Toast notifications
│   │   ├── websocket.ts           # Admin WebSocket connection
│   │   └── ai.ts                  # AI chat conversation
│   ├── api/
│   │   ├── client.ts              # Axios instance + interceptors
│   │   ├── auth.ts
│   │   ├── venues.ts
│   │   ├── requests.ts
│   │   ├── assets.ts
│   │   ├── quotations.ts
│   │   ├── tasks.ts
│   │   ├── layouts.ts
│   │   └── ai.ts
│   ├── views/
│   │   ├── public/
│   │   │   ├── HomeView.vue       # Landing page
│   │   │   ├── VenuesView.vue     # Venue browser
│   │   │   ├── VenueDetailView.vue
│   │   │   └── BookingView.vue    # Booking form
│   │   ├── auth/
│   │   │   ├── LoginView.vue
│   │   │   └── RegisterView.vue
│   │   └── admin/
│   │       ├── DashboardView.vue  # Overview widgets
│   │       ├── RequestsView.vue   # Request pipeline
│   │       ├── RequestDetailView.vue
│   │       ├── InventoryView.vue
│   │       ├── CalendarView.vue
│   │       ├── QuotationsView.vue
│   │       ├── TasksView.vue
│   │       └── VisualizationView.vue  # 3D iframe tab
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppNav.vue
│   │   │   ├── AdminSidebar.vue
│   │   │   └── AdminLayout.vue
│   │   ├── ui/
│   │   │   ├── SpBadge.vue
│   │   │   ├── SpButton.vue
│   │   │   ├── SpCard.vue
│   │   │   ├── SpInput.vue
│   │   │   ├── SpSelect.vue
│   │   │   ├── SpModal.vue
│   │   │   ├── SpToast.vue
│   │   │   ├── SpTooltip.vue
│   │   │   └── SpLoadingSpinner.vue
│   │   ├── requests/
│   │   │   ├── RequestCard.vue
│   │   │   ├── RequestStatusBadge.vue
│   │   │   ├── RequestTimeline.vue
│   │   │   ├── ConflictAlert.vue
│   │   │   └── AssetRequirementList.vue
│   │   ├── inventory/
│   │   │   ├── AssetCard.vue
│   │   │   ├── AssetAvailabilityBar.vue
│   │   │   └── ReservationList.vue
│   │   ├── quotations/
│   │   │   ├── QuotationLineItems.vue
│   │   │   └── QuotationSummary.vue
│   │   ├── tasks/
│   │   │   ├── TaskCard.vue
│   │   │   └── TaskTimeline.vue
│   │   ├── ai/
│   │   │   ├── AiChatPanel.vue
│   │   │   ├── AiMessage.vue
│   │   │   └── AiTypingIndicator.vue
│   │   └── visualization/
│   │       └── ThreeDFrame.vue    # iframe wrapper for port 3000
│   ├── composables/
│   │   ├── useAuth.ts
│   │   ├── useRequests.ts
│   │   ├── useAssets.ts
│   │   ├── useWebSocket.ts
│   │   ├── useAiChat.ts
│   │   └── useToast.ts
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces matching API schemas
│   └── assets/
│       ├── styles/
│       │   ├── tokens.css         # SpaceFlo CSS custom properties
│       │   ├── base.css           # Reset + typography
│       │   ├── components.css     # Shared component styles
│       │   └── utilities.css      # Utility classes
│       └── icons/
├── index.html
├── vite.config.ts
└── tsconfig.json
```

#### `src/assets/styles/tokens.css` — SpaceFlo Design Tokens

```css
:root {
  /* Backgrounds */
  --bg-primary:         #ffffff;
  --bg-secondary:       #f4f9fd;
  --bg-tertiary:        #e8f2fb;
  --surface:            #ffffff;
  --surface-hover:      #f0f7fc;

  /* Borders */
  --border:             #d4e5f2;
  --border-light:       #e6eff7;

  /* Navigation */
  --nav-bg:             rgba(255, 255, 255, 0.85);
  --nav-border:         rgba(212, 229, 242, 0.6);

  /* Hero */
  --hero-gradient-start: #ffffff;
  --hero-gradient-end:   #cce8f8;

  /* Accent (primary brand color — Pyramid blue) */
  --accent:             #3da9f5;
  --accent-hover:       #2b96e0;
  --accent-light:       #e0f0fd;
  --accent-dark:        #1a7cc7;

  /* Text */
  --text-primary:       #12263a;
  --text-secondary:     #4a6a85;
  --text-tertiary:      #7a9bb5;
  --text-on-accent:     #ffffff;

  /* Status */
  --success:            #2ec98a;
  --success-light:      #e4f9f0;
  --warning:            #f5a623;
  --warning-light:      #fef4e0;
  --error:              #f04848;
  --error-light:        #fde8e8;

  /* Shadows */
  --shadow-sm:          0 1px 3px rgba(18, 38, 58, 0.05);
  --shadow-md:          0 4px 12px rgba(18, 38, 58, 0.08);
  --shadow-lg:          0 8px 32px rgba(18, 38, 58, 0.12);
  --overlay:            rgba(18, 38, 58, 0.35);

  /* Gradients */
  --gradient-blue:      #95ccf0;
  --gradient-mid:       #cce8f8;

  /* Typography */
  --font-sans:          'Inter', system-ui, -apple-system, sans-serif;
  --text-xs:            0.75rem;
  --text-sm:            0.875rem;
  --text-base:          1rem;
  --text-lg:            1.125rem;
  --text-xl:            1.25rem;
  --text-2xl:           1.5rem;
  --text-3xl:           1.875rem;
  --text-4xl:           2.25rem;

  /* Spacing */
  --space-1: 0.25rem;  --space-2: 0.5rem;  --space-3: 0.75rem;
  --space-4: 1rem;     --space-5: 1.25rem; --space-6: 1.5rem;
  --space-8: 2rem;     --space-10: 2.5rem; --space-12: 3rem;
  --space-16: 4rem;

  /* Border radius */
  --radius-sm:  0.375rem;
  --radius-md:  0.5rem;
  --radius-lg:  0.75rem;
  --radius-xl:  1rem;
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}
```

#### `src/api/client.ts`

```typescript
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

export const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      auth.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

### Phase F2: Public Booking Portal

**Goal**: The client-facing side of SpaceFlo. Clean, modern, and trustworthy. Three main pages: Landing (hero, venue overview, how-it-works), Venues Browser, and the Booking Form.

#### `HomeView.vue` — Sections

1. **Hero** — full-width gradient background (white→`#cce8f8`), headline "Book your event at the Pyramid of Tirana", subtitle, two CTAs: "Browse Venues" and "Submit Request"
2. **Venues Grid** — cards for each of the 5 Pyramid spaces, each showing name, capacity range, floor, color accent, and "Check Availability" button
3. **How It Works** — 4-step horizontal flow: Submit Request → AI Analysis → Get Quotation → Confirm & Plan
4. **Stats Bar** — "400+ events hosted", "5 unique spaces", "5,000+ satisfied guests"
5. **Footer** — Pyramid of Tirana branding, SpaceFlo platform link

#### `BookingView.vue` — Multi-Step Form

The booking form is a 3-step wizard:

**Step 1 — Event Details**
- Event title (required)
- Event type (dropdown: Conference, Workshop, Concert, Exhibition, Hackathon, Dinner, Other)
- Number of attendees (number input with real-time venue suggestion)
- Date (date picker — shows available venues for that date)
- Start time / End time (time range picker)
- Brief description (textarea)

**Step 2 — Space & Requirements**
- Venue selection (shows all venues with availability indicator for chosen date)
- Clicking a venue shows a preview with capacity info and amenities
- Special requirements (textarea)
- Equipment checklist (quick-select: microphone, projector, whiteboard, stage, AV system)

**Step 3 — Contact & Submit**
- Full name, email, phone, organization
- If logged in: pre-filled from profile
- Summary card showing all details
- "Submit Request" button

On submission, the form calls `POST /api/v1/requests`. The user is immediately redirected to a confirmation page showing: "Your request has been submitted. Our AI is analyzing it now. You'll receive a proposal within a few minutes."

---

### Phase F3: Authentication Flow

**Goal**: JWT-based login/register for clients and admins. Token stored in `localStorage` via Pinia persist plugin. Route guards protect admin routes.

#### Routes

```typescript
// router/index.ts
const routes = [
  { path: '/', component: HomeView },
  { path: '/venues', component: VenuesView },
  { path: '/venues/:id', component: VenueDetailView },
  { path: '/book', component: BookingView },
  { path: '/login', component: LoginView },
  { path: '/register', component: RegisterView },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresRole: ['admin', 'staff'] },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', component: DashboardView },
      { path: 'requests', component: RequestsView },
      { path: 'requests/:id', component: RequestDetailView },
      { path: 'inventory', component: InventoryView },
      { path: 'calendar', component: CalendarView },
      { path: 'quotations', component: QuotationsView },
      { path: 'tasks', component: TasksView },
      { path: 'visualization', component: VisualizationView },
    ]
  }
]
```

---

### Phase F4: Admin Dashboard — Requests & Pipeline

**Goal**: The core admin workflow. See all incoming requests, their current status, AI proposal summaries, conflicts, and take actions (assign venue, approve, reject, generate quotation).

#### `RequestsView.vue` — Layout

- **Top bar**: Filter tabs (All | Submitted | Under Review | Approved | Completed), search input, date range filter, "Export CSV" button
- **Request cards** in a scrollable list, each showing:
  - Status badge (color-coded: submitted=blue, under_review=yellow, approved=green, rejected=red)
  - Event title, type badge, attendee count
  - Client name and organization
  - Requested date and venue name
  - AI proposal indicator (green checkmark if AI has analyzed it, red if conflict detected)
  - Action buttons: "Review", "Quick Approve", "Assign Venue"
- Real-time update: when admin WebSocket receives `REQUEST_SUBMITTED` event, a toast appears and the new request slides into the top of the list

#### `RequestDetailView.vue` — Full Pipeline View

A rich single-request view with tabs:

**Tab 1 — Overview**
- Request metadata (all fields)
- Status timeline (shows each status transition with timestamp and actor)
- AI Proposal card: shows `ai_proposal_json` with recommended venue, flags, suggested actions
- Conflict alerts (if any conflicts detected, shown as red alert cards with resolution suggestions)

**Tab 2 — Venue & Assets**
- Assigned venue with availability bar for the requested date
- Asset requirements table: each row shows Asset Name, Requested Qty, Available Qty, Status (fulfilled/partial/unavailable)
- "Auto-Reserve All Assets" button
- If partial conflict: shows the offering system — "We have 80 chairs available. Add 20 executive chairs (€100 extra)?" with accept/modify options

**Tab 3 — Quotation**
- Current quotation with line items table (editable)
- Add/remove line items
- Discount field, tax summary
- "Regenerate with AI" button → calls `POST /api/v1/ai/refine-quotation`
- "Send to Client" button

**Tab 4 — Tasks**
- List of auto-generated tasks or empty state with "Generate Task List" button
- Each task shows type badge, title, assigned staff, due time, status
- Inline assignment and status update
- Drag to reorder (nice-to-have)

**Tab 5 — 3D Room**
- `ThreeDFrame.vue` component: `<iframe>` pointing to `http://localhost:3000` with a URL parameter `?room=blue-box` to auto-navigate to the assigned venue's room
- "AI Design Room" button opens the AI Chat Panel in room_designer mode
- The AI Copilot can then be used to redesign the room for this specific event

---

### Phase F5: Admin Dashboard — Inventory

**Goal**: Complete visibility into all operational assets — what exists, how many are available right now, what's reserved for upcoming events, and alerts for near-depletion.

#### `InventoryView.vue` — Layout

- **Stats row** (4 widgets): Total Assets, Currently Available, Reserved This Week, Items in Maintenance
- **Category tabs**: All | Seating | Tables | AV Equipment | Staging | Misc
- **Asset grid**: card per asset type showing:
  - Name, category badge
  - Large number: available / total (e.g., "180 / 300")
  - Progress bar: green if >50% available, yellow if 20-50%, red if <20%
  - "View Reservations" expands inline reservation list
  - "Edit Stock" button (admin only) for total_quantity updates
- **Upcoming Conflicts panel** (right sidebar): assets with reservations that will cause shortfalls in the next 14 days
- **Quick Add Asset** button: opens modal form for adding new asset types

#### `AssetAvailabilityBar.vue`

A reusable component showing a color-coded bar for any asset:

```
Chairs (Standard)    ████████████░░░░  180/300 available
```

Color thresholds: green > 60%, yellow 30-60%, red < 30%.

---

### Phase F6: Admin Dashboard — Calendar & Scheduling

**Goal**: A full calendar view showing all confirmed/approved events across all venues, with color-coded venue tracks, conflict indicators, and quick actions.

#### `CalendarView.vue`

Uses `@fullcalendar/vue3` with `timegrid` plugin:

- **View modes**: Month, Week (default), Day
- **Venue filter**: checkboxes for each venue (color-coded: Blue Room = `#3da9f5`, Orange = `#ff6400`, Green = `#2ec98a`, Yellow = `#f5a623`)
- **Events** rendered as color blocks with event title and attendee count
- **Hover**: shows tooltip with event title, client, status, key assets
- **Click**: navigates to `RequestDetailView`
- **Conflict indicators**: events with detected conflicts have a red border
- **Drag-to-reschedule** (nice-to-have for hackathon): update request date on drop

---

### Phase F7: Admin Dashboard — Quotations

**Goal**: List and manage all generated quotations. Filter by status, send to clients, track acceptance.

#### `QuotationsView.vue`

- Table view: Request Title | Client | Date | Total Amount | Status | Actions
- Status filter: Draft | Sent | Accepted | Rejected | Expired
- "Generate Missing" button: creates quotations for all approved requests that don't have one
- Click a row → expands inline QuotationLineItems editor
- "Send" / "Download PDF" actions per row

---

### Phase F8: Admin Dashboard — Task Lists & Operations

**Goal**: Operational task management for setup and teardown teams. Staff see only their own assigned tasks; admins see all.

#### `TasksView.vue` — Layout

- **Top**: filter by event, assignee, status, task type, overdue toggle
- **Kanban board** (4 columns): Pending | In Progress | Blocked | Done
- Task cards show: type icon (wrench for setup, refresh for teardown), title, event name, assignee avatar, due time, priority indicator
- Drag cards between columns to update status
- Click card → modal with full details and inline edit

#### `TaskCard.vue`

```
┌──────────────────────────────────┐
│ 🔧 SETUP  ● HIGH                │
│ Arrange 150 chairs — Blue Room  │
│ Jul 15, 08:00  →  Assigned: Ana │
└──────────────────────────────────┘
```

---

### Phase F9: 3D Visualization Tab

**Goal**: Embed the Three.js 3D app inside the admin dashboard so admins can see and interact with the 3D Pyramid without leaving the SpaceFlo platform.

#### `VisualizationView.vue`

```vue
<template>
  <div class="visualization-view">
    <div class="viz-header">
      <h2>3D Pyramid View</h2>
      <div class="viz-controls">
        <SpSelect v-model="selectedVenueId" :options="venues" placeholder="Navigate to room..." @change="navigateToRoom" />
        <SpButton variant="accent" @click="openAiDesigner">AI Design Room</SpButton>
        <a :href="`http://localhost:3000`" target="_blank" class="fullscreen-link">Open Fullscreen ↗</a>
      </div>
    </div>
    <div class="viz-frame-container">
      <ThreeDFrame :room-id="selectedRoomId" @layout-saved="onLayoutSaved" />
    </div>
    <AiChatPanel v-if="showAiPanel" mode="room_designer" :venue="selectedVenue" @close="showAiPanel = false" />
  </div>
</template>
```

#### `ThreeDFrame.vue`

```vue
<template>
  <iframe
    ref="frame"
    :src="`http://localhost:3000${roomParam}`"
    class="three-d-iframe"
    allow="fullscreen"
    @load="onFrameLoad"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{ roomId?: string }>();
const frame = ref<HTMLIFrameElement>();

const roomParam = computed(() =>
  props.roomId ? `?autoRoom=${props.roomId}` : ''
);

// Listen for postMessage from the Three.js iframe
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:3000') return;
  // Handle events from 3D app (layout saved, item selected, etc.)
  emit('layoutSaved', event.data);
});

// Send commands to iframe
function sendCommand(type: string, payload: object) {
  frame.value?.contentWindow?.postMessage({ type, payload }, 'http://localhost:3000');
}

defineExpose({ sendCommand });
</script>
```

The Three.js app needs one small addition to `main.js` to handle `postMessage` from parent window:

```javascript
window.addEventListener('message', (event) => {
    if (event.origin !== 'http://localhost:5173') return;
    const { type, payload } = event.data;
    if (type === 'NAVIGATE_TO_ROOM') navigateToRoom(payload.roomId);
    if (type === 'APPLY_LAYOUT') applyLayoutFromJSON(payload.roomId, payload.items);
});
```

---

### Phase F10: AI Copilot Chat Interface

**Goal**: A sliding panel available throughout the admin dashboard. Staff can chat with the AI copilot to get suggestions, design rooms, check availability, or draft quotations — all through natural language.

#### `AiChatPanel.vue`

- Slides in from the right side (fixed overlay panel, 420px wide)
- Accessible via floating "AI" button in admin layout
- Context-aware: if opened from `RequestDetailView`, the conversation is pre-seeded with request context
- If opened from `VisualizationView`, the panel is in `room_designer` mode

**Chat interface:**
- Message thread (alternating user/AI bubbles)
- Typing indicator with animated dots
- Quick-action chips below input: "Design room for this event", "Check conflicts", "Generate quotation", "Create task list"
- The AI responses may include structured cards (a mini quotation summary, a task list preview, a "Apply to 3D" button for layout suggestions)

#### `stores/ai.ts`

```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';

export const useAiStore = defineStore('ai', () => {
  const messages = ref<AiMessage[]>([]);
  const isLoading = ref(false);
  const conversationId = ref<string | null>(null);

  async function sendMessage(content: string, mode: string = 'copilot', context: object = {}) {
    messages.value.push({ role: 'user', content, timestamp: new Date() });
    isLoading.value = true;
    try {
      const res = await api.post('/ai/chat', {
        message: content,
        agent_type: mode,
        context,
        conversation_id: conversationId.value,
      });
      messages.value.push({ role: 'assistant', content: res.data.response, timestamp: new Date(), toolCalls: res.data.tool_calls_made });
      conversationId.value = res.data.conversation_id;
    } finally {
      isLoading.value = false;
    }
  }

  return { messages, isLoading, sendMessage, conversationId };
});
```

#### `/api/v1/ai/chat` Endpoint

```
POST /api/v1/ai/chat
Body: {
  "message": "Design the Blue Room for a 40-person workshop",
  "agent_type": "room_designer",
  "context": {"venue_name": "Blue Room", "event_request_id": "uuid"},
  "conversation_id": "uuid (optional — for continuing a conversation)"
}
Response: {
  "response": "I've set up the Blue Room with 8 round tables of 5 seats each...",
  "tool_calls_made": [...],
  "conversation_id": "uuid"
}
```

---

## 10. API Contract Reference

### Summary of All Endpoints

```
AUTH
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login
  GET    /api/v1/auth/me
  POST   /api/v1/auth/refresh

VENUES
  GET    /api/v1/venues
  GET    /api/v1/venues/{id}
  GET    /api/v1/venues/{id}/availability?date=&duration_hours=
  GET    /api/v1/venues/{id}/layout
  POST   /api/v1/venues                           [admin]
  PUT    /api/v1/venues/{id}                      [admin]

EVENT REQUESTS
  POST   /api/v1/requests
  GET    /api/v1/requests                         [admin/staff: all; client: own]
  GET    /api/v1/requests/{id}
  PUT    /api/v1/requests/{id}
  POST   /api/v1/requests/{id}/submit
  POST   /api/v1/requests/{id}/assign-venue       [admin/staff]
  POST   /api/v1/requests/{id}/approve            [admin]
  POST   /api/v1/requests/{id}/reject             [admin]
  POST   /api/v1/requests/{id}/complete           [admin/staff]
  GET    /api/v1/requests/{id}/conflicts
  GET    /api/v1/requests/{id}/assets
  POST   /api/v1/requests/{id}/reserve-assets     [admin/staff]

ASSETS & INVENTORY
  GET    /api/v1/assets
  GET    /api/v1/assets/{id}
  GET    /api/v1/assets/{id}/availability?start=&end=
  GET    /api/v1/assets/categories
  GET    /api/v1/assets/summary
  POST   /api/v1/assets                           [admin]
  PUT    /api/v1/assets/{id}                      [admin]

RESERVATIONS
  POST   /api/v1/reservations
  GET    /api/v1/reservations?request_id=
  PUT    /api/v1/reservations/{id}
  DELETE /api/v1/reservations/{id}

QUOTATIONS
  POST   /api/v1/quotations/generate/{request_id} [admin/staff]
  GET    /api/v1/quotations/{id}
  PUT    /api/v1/quotations/{id}                  [admin/staff]
  POST   /api/v1/quotations/{id}/send             [admin/staff]
  POST   /api/v1/quotations/{id}/accept

TASKS
  POST   /api/v1/tasks/generate/{request_id}      [admin/staff]
  GET    /api/v1/tasks?request_id=
  PUT    /api/v1/tasks/{id}
  POST   /api/v1/tasks/{id}/complete
  GET    /api/v1/tasks/my-tasks
  GET    /api/v1/tasks/overdue

ROOM LAYOUTS
  GET    /api/v1/layouts?venue_id=
  GET    /api/v1/layouts/{id}
  POST   /api/v1/layouts                          (auto-created by bridge/AI)
  DELETE /api/v1/layouts/{id}                     [admin]

AI
  POST   /api/v1/ai/chat
  POST   /api/v1/ai/design-room
  POST   /api/v1/ai/detect-conflicts
  POST   /api/v1/ai/generate-tasks/{request_id}
  POST   /api/v1/ai/refine-quotation/{quotation_id}

WEBSOCKET
  WS     /ws/3d-bridge        (Three.js app client)
  WS     /ws/admin            (Vue.js admin dashboard)
```

---

## 11. Environment & Configuration

#### `backend/.env.example`

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Auth
SECRET_KEY=your-random-32-char-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI (OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-...
AI_MODEL=anthropic/claude-3.5-sonnet
AI_TEMPERATURE=0.1

# CORS
ALLOWED_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

#### `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080
VITE_THREE_D_URL=http://localhost:3000
```

#### `tumo_3d_model/.env` (existing + additions)

```env
OPENROUTER_API_KEY=sk-or-v1-...
AI_IMAGE_GENERATION_MODEL=nvidia/llama-nemotron-rerank-vl-1b-v2:free
SPACEFLO_BACKEND_WS=ws://localhost:8080/ws/3d-bridge
SPACEFLO_BACKEND_API=http://localhost:8080/api/v1
```

---

## 12. Demo Scenario Walkthrough

This is the full story for the 5-minute hackathon demo. Every step is real functionality.

**Setup**: Python backend running on 8080, Three.js on 3000, Vue.js on 5173. Supabase connected.

---

**Step 1 — Client Submits a Request (2 min)**

Open `http://localhost:5173`. Navigate to "Book a Space." Fill the form:
- "AlbTech Annual Summit 2026" | Conference | 180 attendees | July 20 | 09:00–18:00
- Select "Blue Room" (shows availability: available ✓)
- Special requirements: "Need stage, central projection screen, 180 chairs in theater style, 3 wireless microphones, coffee break tables along the walls"

Click "Submit Request." Confirmation screen shows: "Your request is being analyzed by our AI."

---

**Step 2 — AI Intake Agent Runs (30 sec)**

Switch to `http://localhost:5173/admin/requests`. A live toast notification pops up: "New request submitted — AlbTech Annual Summit 2026."

The request card shows a spinner while AI analysis runs. After ~10 seconds, it updates: AI badge turns green with "Proposal Ready."

Click the request card. The Overview tab shows the AI proposal:
- "Recommended venue: Blue Room (92% match — capacity fits, dates available)"
- Asset check: "180 chairs ✓, 5 microphones ✗ (only 3 available — offering: 3 wireless + 2 wired)"
- Estimated quotation: €3,840

---

**Step 3 — Conflict Detection (30 sec)**

The Conflicts tab shows: "1 warning detected — Asset over-reservation: Microphone (wireless). 180-person event on July 20 conflicts with a workshop also requesting 5 microphones. You have 30 total; the workshop needs 5. Offering: 3 wireless microphones for this event, confirm availability of 2 wired microphones."

Admin clicks "Accept Offering" — the reservation is updated.

---

**Step 4 — Generate & Send Quotation (30 sec)**

Quotation tab → click "Generate with AI." The quotation appears with full itemized breakdown. Admin adds a 10% discount. Clicks "Send to Client." Status updates to "Quotation Sent."

---

**Step 5 — AI Designs the Room in 3D (1 min)**

Admin navigates to the "3D Visualization" tab. The Three.js iframe loads showing the Pyramid. Admin opens the AI Chat panel and types:

"Set up the Blue Room for a 180-person conference with theater seating facing a central stage, a 65-inch TV on the stage, 3 microphone stands, and coffee break tables along the side walls."

The AI Copilot responds in the chat while simultaneously:
1. Querying venue dimensions
2. Checking available inventory for July 20
3. Computing the layout (180 chairs in 18 rows × 10, 1 TV wall-mounted at front, 3 standing podiums, 8 side tables)
4. Pushing `APPLY_LAYOUT` via WebSocket to the Three.js app

**Live on screen**: the 3D Blue Room reconfigures in real time — chairs appear in theater rows, the TV mounts on the front wall, tables line the sides. The judge can see the room transform.

AI responds: "Done! I've set up the Blue Room for your conference. Placed 180 chairs in 18 rows, wall-mounted one 65\" TV at the front, 3 wireless microphone stands near the stage area, and 8 coffee break tables along the side walls. All items confirmed available for July 20."

---

**Step 6 — Approve and Generate Task List (30 sec)**

Admin clicks "Approve Request." Status → Approved. Asset reservations are confirmed.

Click "Generate Task List." 14 tasks appear across Preparation / Setup / Teardown categories, each with a default assignee from staff, a due time relative to the event, and priority.

---

**Step 7 — Show the Calendar (15 sec)**

Navigate to Calendar. July 20 shows the AlbTech Summit as a blue block in the Blue Room track. The event is now in the operational system.

---

**End of Demo**: The judge has seen — in under 5 minutes — a complete end-to-end flow from booking request to AI-designed 3D room to approved operational plan with tasks. No spreadsheets. No emails. No phone calls.

---

*Blueprint authored by SpaceFlo Team — JunctionX Tirana 2026*
*Three.js 3D: `localhost:3000` | Vue.js Frontend: `localhost:5173` | Python Backend: `localhost:8080`*
