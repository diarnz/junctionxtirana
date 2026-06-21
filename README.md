# SpaceFlow — Pyramid of Tirana

SpaceFlow is a venue booking and operations platform for the **Pyramid of Tirana** campus. It combines a modern web app with an interactive **3D room designer** so clients can explore spaces, plan layouts, and submit bookings—while staff manage requests, inventory, tasks, and live operations from an admin dashboard.

---

## Features

| Area | What it does |
|------|----------------|
| **Public site** | Browse venues, learn how booking works, open the 3D campus |
| **Client portal** | Submit event requests, track status, view AI summaries |
| **3D world** | Orbit the campus, enter rooms, furnish layouts, preview pricing, book |
| **Admin dashboard** | Requests, calendar, inventory, tasks, quotations, live WebSocket updates |
| **AI assistant** | Staff-side agent for layout suggestions, inventory, and workflow help (OpenRouter) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (http://localhost:5173)              │
│  Vue 3 SPA · Pinia · Vue Router · Supabase auth · FullCalendar   │
└───────────────┬─────────────────────────────┬─────────────────────┘
                │ REST + WebSocket            │ iframe / postMessage
                ▼                             ▼
┌───────────────────────────┐   ┌─────────────────────────────────┐
│  Backend API  :8082       │   │  3D Viewer  :3000               │
│  FastAPI · SQLAlchemy     │◄──│  Three.js · Express static       │
│  Alembic · WebSockets     │   │  Floor plan editor · Booking UI  │
└───────────────────────────┘   └─────────────────────────────────┘
```

| Service | Port | Stack | Entry |
|---------|------|-------|-------|
| Frontend | **5173** | Vue 3, Vite, TypeScript | `frontend/` |
| Backend API | **8082** | FastAPI, SQLAlchemy | `backend/` |
| 3D viewer | **3000** | Three.js, Express | `tumo_3d_model/` |

---

## Prerequisites

- **Node.js** 18+ (frontend + 3D viewer)
- **Python** 3.11+ (backend)
- **npm** (or compatible package manager)

Optional for full functionality:

- **Supabase** project — Google sign-in and client auth
- **OpenRouter API key** — AI agent and 3D layout reranking

---

## Quick start (Windows)

From the repository root:

```powershell
.\start.ps1
```

Or double-click `start.bat`. This launches all three services in separate terminal windows.

Then open:

- **App:** http://localhost:5173  
- **API docs:** http://localhost:8082/docs  
- **3D viewer (standalone):** http://localhost:3000  

Wait a few seconds after startup before loading the frontend.

---

## Manual setup

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python run.py
```

The API listens on **http://localhost:8082** by default.

On first run, with `AUTO_CREATE_TABLES=true` and `AUTO_SEED_DATA=true`, the database is created and seeded with venues, inventory, and demo staff accounts.

### 2. Frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Update `frontend/.env` so the API points at the backend:

```env
VITE_API_BASE_URL=http://localhost:8082/api/v1
VITE_WS_URL=ws://localhost:8082
VITE_THREE_D_URL=http://localhost:3000
```

Optional Supabase keys for Google sign-in:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 3D viewer

```powershell
cd tumo_3d_model
npm install
npm start
```

The viewer loads environment variables from the repo root `.env` when present (e.g. `OPENROUTER_API_KEY` for AI layout rerank).

---

## Demo accounts

Seeded automatically when `AUTO_SEED_DATA=true`:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@spaceflow.dev` | `Admin1234!` |
| Staff | `staff@spaceflow.dev` | `Staff1234!` |

**Clients** should register through the app or use **Google sign-in** (requires Supabase configuration).

---

## Project structure

```
junctionxtirana/
├── backend/           # FastAPI REST API, WebSockets, AI agent, database
├── frontend/          # Vue 3 SPA (public, client, admin)
├── tumo_3d_model/     # Three.js campus + room furnishing + booking UI
├── start.ps1          # Start all services (Windows)
├── start.bat          # Wrapper for start.ps1
├── BLUEPRINT.md       # Detailed system design notes
├── BACKEND_BLUEPRINT.md
├── FRONTEND_BLUEPRINT.md
└── AI_BLUEPRINT.md
```

---

## Key workflows

### Client booking

1. Sign in or register at `/login`
2. Browse venues or open the **3D designer** from the home page
3. Enter a room, choose a layout (templates, build, or AI)
4. Open **Book it** → review layout → enter event details → calculate price → submit

### Staff operations

1. Sign in with a staff demo account
2. Open **Admin** → dashboard, requests, calendar, inventory, tasks
3. Review AI proposals, approve or adjust bookings, manage assets in real time

### 3D ↔ backend sync

The 3D viewer connects to the backend via WebSocket (`bridge.js`) and REST booking endpoints. When embedded in the frontend iframe, auth token and API host are passed through URL params or `postMessage`.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection (optional; SQLite used if empty) |
| `SECRET_KEY` | JWT signing |
| `SUPABASE_*` | Supabase auth integration |
| `OPENROUTER_API_KEY` | AI model access |
| `ALLOWED_ORIGINS` | CORS — include `http://localhost:5173` and `http://localhost:3000` |
| `AUTO_CREATE_TABLES` | Create schema on startup |
| `AUTO_SEED_DATA` | Seed venues, assets, demo users |

See `backend/.env.example` for the full list.

### Frontend (`frontend/.env`)

See `frontend/.env.example`. Ensure API and WebSocket URLs use port **8082**, not 8080.

---

## Development

```powershell
# Backend type-check / run
cd backend && python run.py

# Frontend dev server with HMR
cd frontend && npm run dev

# Frontend production build
cd frontend && npm run build

# 3D viewer
cd tumo_3d_model && npm start
```

**Health check:** `GET http://localhost:8082/health`

---

## Bookable 3D rooms

| Venue (backend) | 3D room ID |
|-----------------|------------|
| Blue Room | `blue-box` |
| Orange Room | `orange-box` |
| Green Room | `lime-green-box` |
| Yellow Room | `dark-green-box` |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port already in use | Run `start.ps1` (clears 8082, 5173, 3000) or stop the process manually |
| Frontend can't reach API | Check `VITE_API_BASE_URL` uses port **8082** |
| 3D "Home" link wrong | Embedded viewer uses referrer; standalone defaults to `http://localhost:5173` |
| Google login fails | Configure `VITE_SUPABASE_*` in frontend and Supabase keys in backend |
| AI features disabled | Set `OPENROUTER_API_KEY` in root or backend `.env` |

---

## License

Private / hackathon project — Pyramid of Tirana × SpaceFlow.
