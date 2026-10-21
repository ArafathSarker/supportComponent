export const schemaQueries = {
  extensions: [
    'CREATE EXTENSION IF NOT EXISTS pgcrypto',
  ],
  tables: [
    `CREATE TABLE IF NOT EXISTS companies (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      contact_email VARCHAR(254) NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS support_users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL CHECK (role IN ('super_admin', 'company_admin')),
      company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
      CHECK (role = 'super_admin' OR company_id IS NOT NULL)
    )`,
    `CREATE TABLE IF NOT EXISTS dynamic_options (
      id BIGSERIAL PRIMARY KEY,
      key VARCHAR(64) NOT NULL CHECK (key IN ('system', 'category', 'work_performed')),
      label VARCHAR(255) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (key, label)
    )`,
    `CREATE TABLE IF NOT EXISTS tickets (
      id BIGSERIAL PRIMARY KEY,
      company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      created_by_id BIGINT NOT NULL REFERENCES support_users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      sensor_id VARCHAR(255) NOT NULL,
      factory_section VARCHAR(255) NOT NULL,
      affected_system VARCHAR(255) NOT NULL,
      problem_category VARCHAR(255) NOT NULL,
      urgency VARCHAR(16) NOT NULL DEFAULT 'low'
        CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
      priority VARCHAR(16) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
      description TEXT NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    'ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sensor_id VARCHAR(255) NOT NULL DEFAULT \'\'',
    'ALTER TABLE tickets ADD COLUMN IF NOT EXISTS factory_section VARCHAR(255) NOT NULL DEFAULT \'\'',
    `CREATE TABLE IF NOT EXISTS ticket_attachments (
      id BIGSERIAL PRIMARY KEY,
      ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      file VARCHAR(100) NOT NULL,
      file_type VARCHAR(16) NOT NULL DEFAULT '',
      uploaded_by_id BIGINT REFERENCES support_users(id) ON DELETE SET NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS ticket_messages (
      id BIGSERIAL PRIMARY KEY,
      ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      sender_id BIGINT NOT NULL REFERENCES support_users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS visiting_logs (
      id BIGSERIAL PRIMARY KEY,
      ticket_id BIGINT REFERENCES tickets(id) ON DELETE CASCADE,
      company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      created_by_id BIGINT NOT NULL REFERENCES support_users(id) ON DELETE CASCADE,
      visiting_date DATE NOT NULL,
      number_of_persons SMALLINT NOT NULL DEFAULT 1 CHECK (number_of_persons > 0),
      responsible_phone_numbers VARCHAR(255) NOT NULL,
      reason TEXT NOT NULL,
      work_performed JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  ],
  // Keep existing databases compatible when the initializer runs after a
  // schema update. Defaults allow these additions on tables with rows.
  compatibility: [
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_email VARCHAR(254) NOT NULL DEFAULT ''",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    "ALTER TABLE support_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT ''",
    "ALTER TABLE support_users ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'company_admin'",
    "ALTER TABLE support_users ADD COLUMN IF NOT EXISTS company_id BIGINT",
    "ALTER TABLE dynamic_options ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE dynamic_options ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS company_id BIGINT",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_by_id BIGINT",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT ''",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sensor_id VARCHAR(255) NOT NULL DEFAULT ''",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS factory_section VARCHAR(255) NOT NULL DEFAULT ''",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS affected_system VARCHAR(255) NOT NULL DEFAULT ''",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS problem_category VARCHAR(255) NOT NULL DEFAULT ''",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS urgency VARCHAR(16) NOT NULL DEFAULT 'low'",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS priority VARCHAR(16) NOT NULL DEFAULT 'medium'",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'open'",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    "ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS ticket_id BIGINT",
    "ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS file VARCHAR(100) NOT NULL DEFAULT ''",
    "ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS file_type VARCHAR(16) NOT NULL DEFAULT ''",
    "ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS uploaded_by_id BIGINT",
    "ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    "ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS ticket_id BIGINT",
    "ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS sender_id BIGINT",
    "ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    "ALTER TABLE visiting_logs ADD COLUMN IF NOT EXISTS ticket_id BIGINT",
    "ALTER TABLE visiting_logs ADD COLUMN IF NOT EXISTS company_id BIGINT",
    "ALTER TABLE visiting_logs ADD COLUMN IF NOT EXISTS created_by_id BIGINT",
    "ALTER TABLE visiting_logs ADD COLUMN IF NOT EXISTS visiting_date DATE NOT NULL DEFAULT CURRENT_DATE",
    "ALTER TABLE visiting_logs ADD COLUMN IF NOT EXISTS number_of_persons SMALLINT NOT NULL DEFAULT 1",
    "ALTER TABLE visiting_logs ADD COLUMN IF NOT EXISTS responsible_phone_numbers VARCHAR(255) NOT NULL DEFAULT ''",
    "ALTER TABLE visiting_logs ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE visiting_logs ADD COLUMN IF NOT EXISTS work_performed JSONB NOT NULL DEFAULT '[]'::jsonb",
    "ALTER TABLE visiting_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    "ALTER TABLE visiting_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  ],
  indexes: [
    'CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status)',
    'CREATE INDEX IF NOT EXISTS dynamic_options_key_idx ON dynamic_options(key)',
    'CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx ON ticket_messages(ticket_id)',
    'CREATE INDEX IF NOT EXISTS visiting_logs_company_idx ON visiting_logs(company_id)',
  ],
}
