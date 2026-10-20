# 🎫 Plug-and-Play Support Ticket Component

A modern, full-stack, modular **Support Ticket Component** designed for enterprise web applications, IoT solutions, and SCADA systems.

Styled with **Tailwind CSS v3**, backed by **FastAPI (Python)**, **PostgreSQL / SQLite**, and **Real-Time WebSockets**.

---

## ⚡ Highlights

- **Pure Plug-and-Play**: Copy `frontend/src/components/support` into any React / Vite / Next.js project and import `<SupportTicketModule />`.
- **Styled with Tailwind CSS v3**: Clean, customizable utility classes with dark obsidian/navy aesthetics matching industrial dashboards.
- **Two Roles with Enforcement**:
  - **Company Owner / Client (`company_admin`)**: Raise support tickets, upload photos/videos, live chat via WebSocket, and *has exclusive authority to close resolved tickets* (with star rating & remarks).
  - **Solution Provider (`super_admin`)**: Triage tickets, update status (`Under Review`, `In Progress`, `Pending Customer Close`), and live chat. *Super Admin cannot close tickets until the client closes them.*
- **Real-Time Live Chat via WebSockets**: Instant message delivery per ticket room (`/ws/tickets/{ticket_id}`) with typing indicator, sender badges, and attachments.
- **Search & Filters**: Search by problem summary or machine reference, filter by status and urgency.
- **Metrics Dashboard**: Active tickets, resolved/closed tickets, and total tickets counters.

---

## 📦 How to Integrate into Any React / Next.js App

### Step 1: Copy Component Files
Copy the `src/components/support/` folder into your project.

### Step 2: Ensure Tailwind CSS is configured
Make sure your project has Tailwind CSS v3 installed and your `tailwind.config.js` includes the component path:

```js
// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Step 3: Mount the Component

```tsx
import React from 'react';
import { SupportTicketModule } from './components/support';

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#0b0f19] p-6">
      <SupportTicketModule
        role="company_admin" // or 'super_admin'
        currentUser={{
          id: 'usr-101',
          name: 'Arafath',
          role: 'company_admin',
          company_name: 'CSI Smart Tech Ltd',
          email: 'arafath@example.com'
        }}
        brandName="CSI Smart Tech Ltd"
        apiUrl="http://localhost:8000/api"
        wsUrl="ws://localhost:8000/ws"
        showRoleSwitcher={true} // Set false in production with real auth
        categories={[
          'Hardware / Sensor / Device Problem',
          'Software / Firmware / App Bug',
          'Network / Connectivity Issue',
          'Data / Export / Reporting Issue',
          'SCADA / Dashboard / Display Issue',
          'User Account / Access / Permission',
          'Billing / Subscription / License',
          'Installation / Commissioning',
          'Other / General Enquiry'
        ]}
        systems={[
          'Water Flow Monitoring',
          'Main Electrical Substation SCADA',
          'Boiler Telemetry Unit',
          'Energy Meter Gateway',
          'Chiller Sensor Line'
        ]}
        onTicketCreated={(ticket) => console.log('New ticket:', ticket)}
        onTicketClosed={(ticketId) => console.log('Closed ticket:', ticketId)}
      />
    </div>
  );
}
```

---

## 🛠️ Props & Customization API

| Prop | Type | Default | Description |
|---|---|---|---|
| `role` | `'company_admin' \| 'super_admin'` | `'company_admin'` | Active role perspective |
| `currentUser` | `CurrentUser` | Default mock user | Current logged-in user details (id, name, role, company_name) |
| `apiUrl` | `string` | `http://localhost:8000/api` | Base URL for REST API endpoints |
| `wsUrl` | `string` | `ws://localhost:8000/ws` | Base WebSocket URL for real-time live chat |
| `brandName` | `string` | `'CSI Smart Tech Ltd'` | Organization or brand name displayed |
| `showRoleSwitcher` | `boolean` | `true` | Show/hide the top 1-click role switcher banner (ideal for testing) |
| `categories` | `string[]` | Default 9 categories | Customizable list of problem categories |
| `systems` | `string[]` | Default IoT systems | Customizable list of affected systems/solutions |
| `className` | `string` | `''` | Custom wrapper CSS classes |
| `onRoleChange` | `(role) => void` | `undefined` | Callback when role is changed |
| `onTicketCreated` | `(ticket) => void` | `undefined` | Callback when a new ticket is raised |
| `onTicketClosed` | `(ticketId) => void` | `undefined` | Callback when a ticket is closed |

---

## 🐳 Running with Docker & Docker Compose

To start PostgreSQL, the FastAPI backend, and the React frontend together:

```bash
docker compose up --build
```

- **Frontend**: [http://localhost:3000](http://localhost:3000) (or `http://localhost:5173` in local dev)
- **FastAPI API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL Database**: Port `5432`

---

## 💻 Local Standalone Run

### 1. Backend (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend (Vite + React + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173).
