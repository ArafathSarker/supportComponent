/**
 * Database Initializer & Verifier for Plug-and-Play Support Component.
 * Supports direct PostgreSQL connection via 'pg', or seamless fallback to Python schema runner.
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

async function runViaNodePg() {
  const { default: pg } = await import('pg')
  const { schemaQueries } = await import('./schema.mjs')

  const candidateUrls = [
    process.env.DATABASE_URL,
    'postgresql://postgres:postgres@localhost:5433/support_db',
    'postgresql://postgres:postgres@localhost:5432/support_db',
  ].filter(Boolean)

  let client = null
  let lastError = null

  for (const url of candidateUrls) {
    try {
      client = new pg.Client({ connectionString: url })
      await client.connect()
      console.log(`Connected to PostgreSQL via: ${url.replace(/:[^:@]*@/, ':****@')}`)
      break
    } catch (err) {
      lastError = err
      client = null
    }
  }

  if (!client) {
    throw new Error(`Could not connect to PostgreSQL via candidate URLs. Last error: ${lastError?.message}`)
  }

  try {
    await client.query('BEGIN')

    console.log('Applying extensions...')
    for (const q of schemaQueries.extensions) {
      await client.query(q)
    }

    console.log('Applying table schemas...')
    for (const q of schemaQueries.tables) {
      await client.query(q)
    }

    console.log('Applying compatibility column migrations...')
    for (const q of schemaQueries.compatibility) {
      await client.query(q)
    }

    console.log('Applying performance indexes...')
    for (const q of schemaQueries.indexes) {
      await client.query(q)
    }

    await client.query('COMMIT')
    console.log('✅ PostgreSQL support component schema verified & initialized successfully.')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    await client.end().catch(() => {})
  }
}

async function runViaPython() {
  console.log('Running database schema initialization via Python backend engine...')
  const pythonVenv = resolve(rootDir, 'backend', 'venv', 'bin', 'python')
  const pythonBin = existsSync(pythonVenv) ? pythonVenv : 'python3'
  const scriptPath = resolve(__dirname, 'db_init.py')

  execSync(`"${pythonBin}" "${scriptPath}"`, {
    stdio: 'inherit',
    cwd: rootDir,
  })
}

async function main() {
  try {
    // Attempt node pg first
    await runViaNodePg()
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.message?.includes("Cannot find package 'pg'")) {
      // Fallback to Python runner which has all DB drivers built-in
      try {
        await runViaPython()
      } catch (pyErr) {
        console.error('❌ Failed running schema via Python fallback:', pyErr.message)
        process.exitCode = 1
      }
    } else {
      console.error('❌ Error initializing PostgreSQL schema:', err.message)
      process.exitCode = 1
    }
  }
}

main()
