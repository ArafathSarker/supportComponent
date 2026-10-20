# 🎫 Plug-and-Play Support & Visiting Component

A modern, full-stack, modular **Support Ticket & Factory Visiting Management Component** designed for enterprise web applications, IoT solutions, and SCADA platforms.

Styled with **Tailwind CSS v3**, backed by **Django (Python)**, **Django REST Framework**, **Django Channels (WebSockets)**, and **PostgreSQL / SQLite**.

---

## ⚡ Highlights

- **Pure Plug-and-Play**: Copy `frontend/src/components/support` into any React / Vite / Next.js project and import `<SupportTicketModule />`.
- **Styled with Tailwind CSS v3**: Clean, customizable utility classes with dark obsidian/navy aesthetics matching industrial dashboards.
- **Two Distinct Pages & Modules**:
  1. **Support Tickets**:
     - **Company Owner (`company_admin`)**: Raise support tickets with IoT machine details, **edit ticket details later** via dedicated Edit modal, upload evidence photos/videos, live chat via WebSocket, and *has exclusive authority to close resolved tickets* (with star rating & remarks).
     - **Solution Provider (`super_admin`)**: Can check/monitor available support tickets, triage tickets, update status (`Under Review`, `In Progress`, `Pending Customer Close`), and live chat. *Super Admin cannot raise support tickets (button removed) and cannot close tickets directly.*
     - **Real-Time WebSocket Chat & Notifications**: Instant live chat per ticket room (`/ws/tickets/{ticket_id}`) with typing indicator, sender badges, and attachments, plus global live table sync (`/ws/notifications`).
  2. **Visiting Report / Visiting Log**:
     - **Company Admin ("Visiting Report")**: View on-site engineer visit requests dispatched by the solution provider and **Acknowledge Visit** with gate pass details and escort instructions.
     - **Super Admin ("Visiting Log")**: Schedule and dispatch factory visit requests to client facilities (specifying engineers, date, duration, PPE requirements) and log post-visit service findings upon completion.
- **Role System**: Easily switch perspectives between Company Owner and Super Admin via the 1-click tester banner (persisted in `localStorage`).

---

## 🚀 Running the Backend (Django + Channels)

### Local Development:
```bash
# Activate virtual environment
source backend/venv/bin/activate

# Run migrations
python backend/manage.py migrate

# Start ASGI server (HTTP + WebSockets)
python -m daphne -b 0.0.0.0 -p 8000 support_project.asgi:application
# or
python backend/manage.py runserver 0.0.0.0:8000
```

### Running Backend Tests:
```bash
source backend/venv/bin/activate
pytest
```

---

## 🐳 Running with Docker & Docker Compose

To start PostgreSQL, Django ASGI backend, and Nginx frontend together:

```bash
sudo docker compose up --build -d
```

- **Frontend App (Nginx)**: [http://localhost:3000](http://localhost:3000)
- **Django API**: [http://localhost:8000/api/](http://localhost:8000/api/)
- **Django Admin**: [http://localhost:8000/admin/](http://localhost:8000/admin/)
- **PostgreSQL Database**: Port `5432` (or `5433` if port 5432 is occupied)

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
        showRoleSwitcher={true} // toggle off in production with real auth
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
| `role` | `'company_admin' \| 'super_admin'` | `'company_admin'` | Active role perspective (read from `localStorage`) |
| `activeTab` | `'tickets' \| 'visiting'` | `'tickets'` | Controlled tab view |
| `onTabChange` | `(tab) => void` | `undefined` | Tab change callback |
| `currentUser` | `CurrentUser` | Default mock user | Current user details (id, name, role, company_name) |
| `apiUrl` | `string` | Auto-detected / `/api` | Base URL for REST API |
| `wsUrl` | `string` | Auto-detected / `/ws` | Base WebSocket URL for real-time live chat |
| `brandName` | `string` | `'CSI Smart Tech Ltd'` | Organization or brand name displayed |
| `showRoleSwitcher` | `boolean` | `true` | Show/hide the top 1-click role switcher banner |
| `categories` | `string[]` | Default 9 categories | Customizable list of problem categories |
| `systems` | `string[]` | Default IoT systems | Customizable list of affected systems/solutions |
| `onTicketCreated` | `(ticket) => void` | `undefined` | Callback when a new ticket is raised |
| `onTicketClosed` | `(ticketId) => void` | `undefined` | Callback when a ticket is closed |
