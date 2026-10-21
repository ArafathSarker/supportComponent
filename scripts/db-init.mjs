import pg from 'pg'
import { schemaQueries } from './schema.mjs'

const { Client } = pg
const client = new Client({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://support:support@localhost:5432/support',
})

try {
  await client.connect()
  await client.query('BEGIN')
  for (const group of Object.values(schemaQueries)) {
    for (const query of group) await client.query(query)
  }
  await client.query('COMMIT')
  console.log('PostgreSQL support-ticket schema initialized.')
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  console.error('Could not initialize PostgreSQL schema:', error.message)
  process.exitCode = 1
} finally {
  await client.end()
}
