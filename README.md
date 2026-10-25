# 🎫 Plug-and-Play Support & Visiting Component

A modern, complete, and production-ready **Support Ticket & Field Visiting Management System** designed to be **copied and pasted directly into ANY project** (React, Vite, Next.js, Django, Node.js, etc.).

Built with **React 19 / 18 + Tailwind CSS v3** on the frontend, backed by **Django REST Framework + Django Channels (WebSockets)** and **PostgreSQL / SQLite**.

---

## 🌟 What Does This Component Do?

1. **Support Tickets Desk**:
   - **Raise Tickets**: Clients can report issues with priority, IoT system, error descriptions, and photo/video attachments.
   - **Edit Tickets Later**: Clients can edit open tickets if machine symptoms change.
   - **Live Chat Drawer**: Real-time WebSocket chat room per ticket with file attachments and typing indicators.
   - **Support Workspace (Diagnostic Triage)**: Solution providers can assign field engineers, record root cause, occurrence frequency, and checklist diagnostics.
   - **Role-Gated Resolution**: Only the client/company owner can formally **Close** the ticket with a 1-5 star rating and feedback remarks.

2. **Field Visiting Log & Visiting Report**:
   - **Schedule Visits**: Solution providers dispatch field engineers to client factories with scheduled dates, lead engineer contact, PPE requirements, and an **Action Checklist**.
   - **Support Ticket Management (Super Admin)**: Maintain a searchable employee directory (name + phone + designation) and the dynamic dropdown options used by the internal checklist. Visit dispatch uses searchable employee pickers, so names and phone numbers are never typed manually.
   - **Split Checklists**: A company-owner-visible checklist plus a dedicated Super Admin internal checklist built from dynamically managed dropdown options (never exposed to the client).
   - **Headcount Visibility Toggle**: The Super Admin decides whether the company owner sees the total number of visiting people (`3 Persons`) or only the main engineer's name and phone.
   - **Client Acknowledgement**: Company owners review the delegation, assign an escort engineer, and generate gate passes.
   - **Interactive Action Checklist**: Concise 3-task view with clickable `+N more tasks...` to dynamically expand all tasks and `Show less` to collapse.
   - **Resolution Logging & Audit Flags**: Field engineers log completed visits and mark each checklist item as *Solved* or *Unsolved*. If the company claimed a pre-visit checklist item was handled but the on-site team found it was not, the Super Admin can **flag** that specific item with a reason. Flag data is visible to Super Admins only.

---

## ⚡ 3-Minute Frontend Quickstart (Plug & Play)

You can drop this component into **any React, Vite, or Next.js application** in 3 simple steps:

### Step 1: Copy the Component Folder
Copy the folder:
```
frontend/src/components/support/
```
into your project's component directory (e.g., `src/components/support/`).

### Step 2: Install the Single Dependency
The component only requires [lucide-react](https://lucide.dev) for icons:

```bash
npm install lucide-react
```

Make sure **Tailwind CSS v3** is installed in your project and includes the component in your `tailwind.config.js`:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Step 3: Drop `<SupportTicketModule />` into Any Page

```tsx
import React from 'react';
import { SupportTicketModule } from './components/support';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <SupportTicketModule
        // Connect to your backend API & WebSocket
        apiUrl="http://localhost:8000/api"
        wsUrl="ws://localhost:8000/ws"

        // Pass the logged-in user details
        currentUser={{
          id: 'usr-101',
          name: 'Arafath',
          role: 'company_admin', // 'company_admin' (Client) or 'super_admin' (Provider)
          company_name: 'CSI Smart Tech Ltd',
          email: 'arafath@example.com'
        }}

        brandName="CSI Smart Tech Ltd"

        // Set to false in production to hide the 1-click role testing banner
        showRoleSwitcher={true}

        // (Optional) Customize categories for your domain
        categories={[
          'Hardware / Sensor / Device Problem',
          'Software / Firmware Bug',
          'Network / Gateway Connectivity',
          'SCADA / Telemetry Display Issue',
          'Account / Permissions',
          'General Enquiry'
        ]}

        // (Optional) Customize IoT machines or systems
        systems={[
          'Sewing Line Sensor Array',
          'Main Substation SCADA Unit',
          'Chiller Telemetry Unit',
          'Edge LoRaWAN Gateway',
          'Factory Boiler Controller'
        ]}

        onTicketCreated={(ticket) => console.log('Created:', ticket)}
        onTicketClosed={(id) => console.log('Closed ticket:', id)}
      />
    </div>
  );
}
```

That's it! All ticket modals, chat drawers, visiting logs, pagination, search, and expandable checklists are fully self-contained.

---

## 🛠️ Props & Customization Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `currentUser` | `CurrentUser` | Required | Current user: `{ id, name, role, company_name, email }` |
| `role` | `'company_admin' \| 'super_admin'` | `'company_admin'` | User role perspective (`company_admin` = Client, `super_admin` = Provider) |
| `apiUrl` | `string` | Auto-detected | Base HTTP API URL (e.g. `http://localhost:8000/api` or `/api`) |
| `wsUrl` | `string` | Auto-detected | Base WebSocket URL (e.g. `ws://localhost:8000/ws` or `/ws`) |
| `brandName` | `string` | `'CSI Smart Tech Ltd'` | Organization or tenant brand name |
| `showRoleSwitcher`| `boolean` | `true` | Displays top banner to test between Client and Admin perspectives |
| `activeTab` | `'tickets' \| 'visiting' \| 'management'` | `'tickets'` | Tab to display (`tickets`, `visiting`, or super-admin `management`) |
| `onTabChange` | `(tab) => void` | `undefined` | Callback fired when tab switches |
| `categories` | `string[]` | 9 defaults | List of selectable issue categories in the Raise Ticket modal |
| `systems` | `string[]` | 5 defaults | List of affected machine systems / assets |
| `onTicketCreated`| `(ticket) => void` | `undefined` | Callback fired when a new ticket is submitted |
| `onTicketUpdated`| `(ticket) => void` | `undefined` | Callback fired when a ticket or workspace is updated |
| `onTicketClosed` | `(ticketId) => void` | `undefined` | Callback fired when customer closes a ticket |

---

## 🚀 Running the Backend (Django + Channels)

The backend provides high-performance REST APIs and real-time WebSockets using Django Channels and Daphne.

### Option A: Local Python Environment

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run database migrations (works out of the box with SQLite or PostgreSQL)
python manage.py migrate

# 5. Start ASGI server (handles both HTTP REST and WebSockets)
python -m daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

> **Note on Database**: If PostgreSQL is not configured, the backend automatically falls back to local SQLite (`support.db`). You do not need to configure anything to test immediately!

### Run Automated Tests
```bash
source backend/venv/bin/activate
pytest backend/tests/ -v
```

---

## 🐳 Running with Docker (1-Command Full Stack)

To run PostgreSQL, Django API (Daphne), and the React frontend together:

```bash
docker compose up --build -d
```

| Service | Address | Description |
|---|---|---|
| **Frontend UI** | [http://localhost:3000](http://localhost:3000) | React App served via Nginx |
| **Backend REST API** | [http://localhost:8000/api/](http://localhost:8000/api/) | Django REST Framework |
| **WebSockets** | `ws://localhost:8000/ws/` | Django Channels (Daphne) |
| **Django Admin** | [http://localhost:8000/admin/](http://localhost:8000/admin/) | Admin panel |
| **PostgreSQL DB** | `localhost:5433` | Database: `support_db` (user/pass: `postgres`) |

To stop containers:
```bash
docker compose down
```

---

## 🗄️ Database Schemas (Using with Node.js, Go, or Custom Backends)

If your existing project uses **Node.js (Express, Nest, Next.js API routes), Go, or FastAPI**, you can use the pre-built schema files in `scripts/`:

- **Raw PostgreSQL Schema**: [`scripts/schema.sql`](file:///home/arafath/supportComponent/scripts/schema.sql)
  - Contains complete `CREATE TABLE` statements for `support_tickets`, `ticket_messages`, `ticket_attachments`, and `visiting_reports`.
- **Node.js / JavaScript Schema**: [`scripts/schema.mjs`](file:///home/arafath/supportComponent/scripts/schema.mjs)
  - Ready for Knex, Drizzle, Prisma, or TypeORM.
- **Database Initializer Scripts**:
  - Node.js: `node scripts/db-init.mjs`
  - Python: `python scripts/db_init.py`

### Database Tables Overview:
1. `support_tickets`: Stores ticket code (`TCK-YYYYMMDD-XXXX`), system, category, urgency, priority, status, diagnostics (occurrence, root cause, checklist, assigned engineer), and customer rating.
2. `ticket_messages`: Real-time chat messages linked to a ticket (`sender_name`, `sender_role`, `message`, `attachment_url`).
3. `ticket_attachments`: Files and evidence photos attached to tickets.
4. `visiting_reports`: Scheduled field visits (`VIS-YYYYMMDD-XXXX`), delegation lead engineer, phone, date, `visit_checklist` (company-visible), `super_admin_checklist` (internal dropdown-based), `show_visitor_count` toggle, audit flags (`is_flagged`, `flag_reason`, `flag_checklist_items`), and acknowledgement state.
5. `support_employees`: Super Admin managed employee directory (`name`, `phone`, `designation`, `department`, lead-engineer flag, active flag).
6. `support_checklist_options`: Dynamic dropdown options for the Super Admin internal checklist (`label`, `category`, `sort_order`, active flag).

---

## 📡 REST API Reference

All endpoints accept standard JSON and return structured responses:

### 🎫 Tickets API (`/api/tickets/`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tickets/` | List tickets with filters (`?role=...&companyName=...&status=...&priority=...&search=...`) |
| `POST` | `/api/tickets/` | Create a new support ticket |
| `GET` | `/api/tickets/stats/` | Get ticket counts (Open, In Progress, Solved, Critical) |
| `GET` | `/api/tickets/{id}/` | Get full ticket details with messages and attachments |
| `PATCH` | `/api/tickets/{id}/` | Update ticket details or Super Admin diagnostic workspace |
| `POST` | `/api/tickets/{id}/close/` | Close ticket (requires `rating` 1-5 and `remarks`) - **Client only** |
| `POST` | `/api/tickets/{id}/reopen/` | Reopen a previously closed ticket |

### 💬 Chat & Messages API (`/api/tickets/{id}/messages/`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tickets/{id}/messages/` | Retrieve message history for a ticket |
| `POST` | `/api/tickets/{id}/messages/` | Post a chat message with optional attachment |

### 🚗 Visiting Reports API (`/api/visiting/`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/visiting/` | List visiting reports with role/company filtering (role-gated internal data) |
| `POST` | `/api/visiting/` | Schedule a new visit (employee IDs, searchable visit + confidential reasons, headcount toggle) |
| `PATCH` | `/api/visiting/{id}/` | Toggle headcount visibility / update the confidential reason (Super Admin) |
| `POST` | `/api/visiting/{id}/acknowledge/` | Acknowledge visit (gate pass info, escort engineer) |
| `POST` | `/api/visiting/{id}/complete/` | Complete visit with itemized resolution and optional audit flags |

### ⚙️ Support Ticket Management API (`/api/support/`) — Super Admin only
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/support/employees/` | Search the employee directory (`?search=&active_only=1&lead_only=1`) |
| `POST` | `/api/support/employees/` | Add a support employee (name + phone required) |
| `PATCH` | `/api/support/employees/{id}/` | Update an employee |
| `DELETE` | `/api/support/employees/{id}/` | Remove an employee |
| `GET` | `/api/support/checklist-options/` | List managed visit reasons (`?kind=visit_reason&search=`) |
| `POST` | `/api/support/checklist-options/` | Add a visit or confidential reason |
| `PATCH` | `/api/support/checklist-options/{id}/` | Update / enable / disable a reason |
| `DELETE` | `/api/support/checklist-options/{id}/` | Remove a reason |
| `GET` | `/api/support/problem-categories/` | List problem categories with their pre-ticket checklist (`?search=&active_only=1`) |
| `POST` | `/api/support/problem-categories/` | Add a problem category with its dynamic checklist (`checklist: []`) |
| `PATCH` | `/api/support/problem-categories/{id}/` | Update a category name, description or checklist |
| `DELETE` | `/api/support/problem-categories/{id}/` | Remove a problem category |

### 📁 Uploads API (`/api/upload/`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload/` | Multipart file upload (returns public URL for attachments) |

---

## 🔌 WebSocket Channels Reference

- **Ticket Chat Room**: `ws://<host>/ws/tickets/<ticket_id>/`
  - Broadcasts live chat messages, typing events, and attachments to anyone inside the drawer.
- **Global Table Notifications**: `ws://<host>/ws/notifications/`
  - Broadcasts ticket creations, status changes, and visiting updates to automatically refresh tables across all connected users in real time.

---

## 💡 Role Permissions (At a Glance)

| Feature | Company Admin (Client) | Super Admin (Provider) |
|---|:---:|:---:|
| Raise New Ticket | ✅ Yes | ❌ No (Provider cannot raise) |
| Edit Open Ticket | ✅ Yes | ❌ No |
| Live Chat Drawer | ✅ Yes | ✅ Yes |
| Super Admin Workspace (Diagnostics) | ❌ Hidden | ✅ Yes (Lead engineer, root cause, triage) |
| Support Ticket Management (employees + dropdown options) | ❌ Hidden | ✅ Yes |
| See internal dropdown checklist | ❌ Never | ✅ Yes |
| See total visitor headcount | ✅ Only when toggled on | ✅ Always |
| Flag company pre-visit checklist items | ❌ Hidden | ✅ Yes |
| Close Resolved Ticket | ✅ **Exclusive Authority** | ❌ Cannot close directly |
| Schedule Visiting Engineer | ❌ No | ✅ Yes |
| Acknowledge Visiting Delegation | ✅ Yes | ❌ No |
| Complete & Resolve Visit Checklist | ❌ No | ✅ Yes |

---

## ❓ Frequently Asked Questions (FAQ)

### 1. Can I use this without Docker?
**Yes.** You can run the backend with standard `python -m daphne -b 0.0.0.0 -p 8000 config.asgi:application` and the frontend with `npm run dev` in Vite or inside your existing Next.js / Create-React-App project.

### 2. Can I use SQLite instead of PostgreSQL?
**Yes.** SQLite is built-in. If no `DATABASE_URL` is provided, Django defaults to local `support.db` automatically.

### 3. Why are Tailwind CSS classes not showing up in my app?
Ensure your `tailwind.config.js` `content` array includes the path where you copied the support component:
`"./src/components/support/**/*.{js,ts,jsx,tsx}"`

### 4. How do I disable the test role switcher in production?
Pass `showRoleSwitcher={false}` to `<SupportTicketModule />`. The component will strictly respect the role passed in `currentUser.role`.

---

## 📄 License
MIT License. Free to use, adapt, and integrate into any commercial or open-source software project.
