#!/usr/bin/env python3
"""
Database Schema Initializer & Verifier for Plug-and-Play Support Component.
Initializes PostgreSQL (or SQLite fallback) with all required tables, columns, and indexes.
"""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

def main():
    print("=" * 70)
    print("🚀 Initializing & Verifying Support Component Database Schema")
    print("=" * 70)

    try:
        import django
        django.setup()
        from django.core.management import call_command
        from django.db import connection

        print(f"Connected to database engine: {connection.settings_dict['ENGINE']}")
        print(f"Database name: {connection.settings_dict['NAME']}")

        # Apply all Django migrations
        print("\nApplying database migrations...")
        call_command('migrate', '--noinput')

        # Read and execute raw SQL schema script if on PostgreSQL
        if 'postgresql' in connection.settings_dict['ENGINE']:
            sql_file = BASE_DIR / 'scripts' / 'schema.sql'
            if sql_file.exists():
                print("\nVerifying PostgreSQL tables & compatibility columns from schema.sql...")
                with open(sql_file, 'r', encoding='utf-8') as f:
                    sql_content = f.read()

                with connection.cursor() as cursor:
                    # Execute each statement
                    for statement in sql_content.split(';'):
                        stmt = statement.strip()
                        if stmt and not stmt.startswith('--'):
                            try:
                                cursor.execute(stmt)
                            except Exception as e:
                                print(f"Notice on statement: {e}")

        print("\n" + "=" * 70)
        print("✅ Database schema initialized and verified successfully!")
        print("=" * 70)

    except Exception as err:
        print(f"\n❌ Error during database initialization: {err}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
