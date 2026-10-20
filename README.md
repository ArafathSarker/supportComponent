# Plug-and-Play IoT Support & Visiting Component

A full-stack, modular, plug-and-play **Support Ticket & Factory Visiting Management Component** designed for IoT solutions, SCADA platforms, and enterprise software.

Built with **FastAPI (Python)**, **PostgreSQL**, **React (Vite + TypeScript)**, **WebSockets**, and **Docker / Docker Compose**.

---

## 🌟 Key Features

### 1. Two-Role Architecture
- **🏢 Company Admin (Client / Factory Owner)**:
  - Raise support tickets with affected IoT solution/system, problem category, urgency level, detailed description, and photo/video evidence.
  - View real-time active and resolved ticket metrics.
  - **Live Chat via WebSocket**: Chat directly with Solution Provider / Super Admin in real-time.
  - **Exclusive Close Authority**: *Only the company owner / consumer can close a ticket.*
  - **Visiting Report**: Review and **acknowledge** incoming on-site visits scheduled by the solution provider (confirm gate pass, specify escorts).
- **🛠️ Super Admin (Solution Provider / Support Lead)**:
  - Monitor all tickets across client facilities.
  - Update ticket statuses (`Under Review`, `In Progress`, `Pending Customer Close`).
  - *Strict Rule Enforcement*: Super Admin cannot close tickets until the client marks them resolved.
  - **Visiting Log / Dispatch**: Schedule factory visits for engineers, specifying target machine, safety PPE, scheduled time, and purpose.
  - Log post-visit service summaries and field findings.

### 2. Real-Time WebSocket Communication
- Live bidirectional chat per ticket room (`/ws/tickets/{ticket_id}`).
- Typing indicators and instant event broadcasting.
- Global notification stream (`/ws/notifications`) for instantaneous dashboard list refreshes.

### 3. Plug-and-Play Design
- **Frontend**: Self-contained React component (`src/components/support/SupportModule.tsx`) that can be dropped into any React or Next.js app with 1 line of code.
- **Backend**: Modular FastAPI routers (`tickets.py`, `visiting.py`, `chat_ws.py`, `upload.py`) that mount under any FastAPI application.

---

## 🚀 Quick Start with Docker & Docker Compose

Run the entire stack (PostgreSQL + FastAPI Backend + Vite React Frontend) with a single command:

```bash
docker compose up --build
```

- **Frontend App**: [http://localhost:3000](http://localhost:3000) (or `http://localhost:5173` in local dev)
- **FastAPI API & Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL**: Port `5432`

---

## 💻 Standalone Local Setup (Without Docker)

### Backend (Python FastAPI)

```bash
cd backend

# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment (optional, defaults to SQLite fallback if Postgres is offline)
cp .env.example .env

# 4. Run database tests
PYTHONPATH=. pytest tests

# 5. Start FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (Vite React + TypeScript)

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Vite dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔌 How to Plug & Play into an Existing Project

### 1. In your Frontend (React / Vite / Next.js)

Copy the `frontend/src/components/support/` folder into your project's components directory:

```tsx
import React, { useState } from 'react';
import { SupportModule, UserRole } from './components/support';

export function MyDashboard() {
  const [currentRole, setCurrentRole] = useState<UserRole>('company_admin');

  return (
    <div className="dashboard-content">
      <SupportModule
        role={currentRole}
        currentUser={{
          id: 'user-001',
          name: 'Arafath',
          role: currentRole,
          company_name: 'CSI Smart Tech Ltd'
        }}
        apiUrl="http://localhost:8000/api"
        wsUrl="ws://localhost:8000/ws"
        onRoleChange={(newRole) => setCurrentRole(newRole)}
      />
    </div>
  );
}
```

### 2. In your Backend (FastAPI)

Mount the routers in your existing `main.py`:

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers import tickets, visiting, chat_ws, upload

app = FastAPI()

# Mount support routers
app.include_router(tickets.router, prefix="/api")
app.include_router(visiting.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(chat_ws.router)

# Mount uploads directory for photo/video evidence
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
```

---

## 📋 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tickets` | List tickets with filters (`role`, `status`, `urgency`, `search`) |
| `GET` | `/api/tickets/stats` | Active, in-progress, and closed ticket counts |
| `POST` | `/api/tickets` | Create a new support ticket |
| `GET` | `/api/tickets/{id}` | Get ticket details, messages & attachments |
| `PATCH` | `/api/tickets/{id}/status` | Update status (*Super Admin cannot close*) |
| `POST` | `/api/tickets/{id}/close` | Company Admin closes ticket with feedback |
| `POST` | `/api/tickets/{id}/reopen` | Reopen resolved ticket |
| `POST` | `/api/tickets/{id}/messages` | Post a chat message |
| `WS` | `/ws/tickets/{id}` | Real-time WebSocket bidirectional chat |
| `WS` | `/ws/notifications` | Global event notifications |
| `GET` | `/api/visiting` | List visiting reports / logs |
| `POST` | `/api/visiting` | Super Admin schedules a factory visit |
| `POST` | `/api/visiting/{id}/acknowledge` | Company Admin acknowledges visit |
| `POST` | `/api/visiting/{id}/complete` | Super Admin logs post-visit service summary |
| `POST` | `/api/upload` | Upload photos/videos evidence |

---

## 🎨 Theme & UI Aesthetics

Designed with a sleek dark-mode glassmorphic interface matching enterprise SCADA and industrial IoT dashboards:
- Dark slate/obsidian palette (`#0B0F19`, `#111827`, `#1F293D`)
- Blue & Indigo accents (`#3B82F6`, `#6366F1`)
- Color-coded urgency levels (Low: Emerald, Medium: Amber, High: Orange, Critical: Crimson)
- Real-time pulsating connection beacons
- Fully responsive on mobile, tablet, and desktop
