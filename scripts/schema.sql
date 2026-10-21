-- ==============================================================================
-- Plug-and-Play Support & Visiting Component - PostgreSQL Schema
-- Compatible with Django apps (tickets, chat, visiting) & Standalone PostgreSQL
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Core Support Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(36) PRIMARY KEY,
    ticket_code VARCHAR(30) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    affected_system VARCHAR(100) NOT NULL DEFAULT 'General System',
    category VARCHAR(100) NOT NULL,
    urgency VARCHAR(30) NOT NULL DEFAULT 'Medium',
    priority VARCHAR(30) NOT NULL DEFAULT 'Medium',
    production_impact VARCHAR(100) NOT NULL DEFAULT 'No Production Loss',
    line_number VARCHAR(100) NOT NULL DEFAULT '',
    floor_location VARCHAR(100) NOT NULL DEFAULT '',
    machine_id VARCHAR(100) NOT NULL DEFAULT '',
    sensor_id VARCHAR(255) NOT NULL DEFAULT '',
    factory_section VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
    company_name VARCHAR(150) NOT NULL DEFAULT 'CSI Smart Tech Ltd',
    created_by_name VARCHAR(100) NOT NULL DEFAULT 'Arafath',
    created_by_role VARCHAR(50) NOT NULL DEFAULT 'company_admin',
    iot_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    troubleshooting_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    support_severity VARCHAR(50) NOT NULL DEFAULT '',
    assigned_engineer VARCHAR(150) NOT NULL DEFAULT '',
    occurrence VARCHAR(100) NOT NULL DEFAULT '',
    future_possibility VARCHAR(100) NOT NULL DEFAULT '',
    root_cause TEXT NOT NULL DEFAULT '',
    support_note TEXT NOT NULL DEFAULT '',
    closed_at TIMESTAMPTZ NULL,
    closed_by VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Evidence & File Attachments Table
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    uploaded_by VARCHAR(100) NOT NULL DEFAULT 'User',
    source VARCHAR(50) NOT NULL DEFAULT 'ticket_creation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Live Chat Messages & Audit Timeline Events
CREATE TABLE IF NOT EXISTS ticket_messages (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_name VARCHAR(100) NOT NULL,
    sender_role VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    attachment_url VARCHAR(500) NULL,
    attachment_name VARCHAR(255) NULL,
    is_system_event BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Field Visiting Reports & Inspections Table
CREATE TABLE IF NOT EXISTS visiting_reports (
    id VARCHAR(36) PRIMARY KEY,
    visit_code VARCHAR(30) NOT NULL UNIQUE,
    ticket_id VARCHAR(36) NULL REFERENCES tickets(id) ON DELETE SET NULL,
    company_name VARCHAR(150) NOT NULL,
    target_system VARCHAR(150) NOT NULL,
    priority VARCHAR(30) NOT NULL DEFAULT 'High',
    line_number VARCHAR(100) NOT NULL DEFAULT '',
    floor_location VARCHAR(100) NOT NULL DEFAULT '',
    visiting_engineers VARCHAR(255) NOT NULL,
    lead_engineer VARCHAR(150) NOT NULL DEFAULT '',
    lead_engineer_phone VARCHAR(50) NOT NULL DEFAULT '',
    visiting_team_names TEXT NOT NULL DEFAULT '',
    total_visitors INTEGER NOT NULL DEFAULT 1,
    visit_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    purpose TEXT NOT NULL DEFAULT '',
    scheduled_date VARCHAR(100) NOT NULL,
    estimated_duration VARCHAR(50) NOT NULL DEFAULT '2 Hours',
    entry_requirements VARCHAR(255) NOT NULL DEFAULT 'Standard Factory Safety Equipment & Gate Pass',
    status VARCHAR(50) NOT NULL DEFAULT 'Pending Acknowledgement',
    super_admin_notes TEXT NULL,
    company_acknowledgement_notes TEXT NULL,
    acknowledged_at TIMESTAMPTZ NULL,
    acknowledged_by VARCHAR(100) NULL,
    completed_at TIMESTAMPTZ NULL,
    service_summary TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Safe Column Compatibility Migrations (ensures no column missing errors)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_code VARCHAR(30);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS affected_system VARCHAR(100) NOT NULL DEFAULT 'General System';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'General';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS urgency VARCHAR(30) NOT NULL DEFAULT 'Medium';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS priority VARCHAR(30) NOT NULL DEFAULT 'Medium';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS production_impact VARCHAR(100) NOT NULL DEFAULT 'No Production Loss';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS line_number VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS floor_location VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS machine_id VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sensor_id VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS factory_section VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'Open';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS company_name VARCHAR(150) NOT NULL DEFAULT 'CSI Smart Tech Ltd';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(100) NOT NULL DEFAULT 'Arafath';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50) NOT NULL DEFAULT 'company_admin';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS iot_details JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS troubleshooting_checklist JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS support_severity VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_engineer VARCHAR(150) NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS occurrence VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS future_possibility VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS root_cause TEXT NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS support_note TEXT NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_by VARCHAR(100) NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS file_path VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS file_type VARCHAR(100) NULL;
ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS file_size INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(100) NOT NULL DEFAULT 'User';
ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'ticket_creation';
ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS sender_name VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS sender_role VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500) NULL;
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255) NULL;
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS is_system_event BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS visit_code VARCHAR(30);
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS ticket_id VARCHAR(36) NULL;
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS company_name VARCHAR(150) NOT NULL DEFAULT '';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS target_system VARCHAR(150) NOT NULL DEFAULT '';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS priority VARCHAR(30) NOT NULL DEFAULT 'High';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS line_number VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS floor_location VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS visiting_engineers VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS lead_engineer VARCHAR(150) NOT NULL DEFAULT '';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS lead_engineer_phone VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS visiting_team_names TEXT NOT NULL DEFAULT '';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS total_visitors INTEGER NOT NULL DEFAULT 1;
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS visit_checklist JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT '';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS scheduled_date VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(50) NOT NULL DEFAULT '2 Hours';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS entry_requirements VARCHAR(255) NOT NULL DEFAULT 'Standard Factory Safety Equipment & Gate Pass';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'Pending Acknowledgement';
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS super_admin_notes TEXT NULL;
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS company_acknowledgement_notes TEXT NULL;
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ NULL;
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(100) NULL;
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS service_summary TEXT NULL;
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE visiting_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS tickets_code_idx ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status);
CREATE INDEX IF NOT EXISTS tickets_company_idx ON tickets(company_name);
CREATE INDEX IF NOT EXISTS ticket_attachments_ticket_idx ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS visiting_reports_code_idx ON visiting_reports(visit_code);
CREATE INDEX IF NOT EXISTS visiting_reports_ticket_idx ON visiting_reports(ticket_id);
