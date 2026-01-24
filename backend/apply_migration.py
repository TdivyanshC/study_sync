import requests
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

supabase_url = os.environ['SUPABASE_URL']
supabase_key = os.environ['SUPABASE_SERVICE_KEY']

headers = {
    'Authorization': f'Bearer {supabase_key}',
    'apikey': supabase_key,
    'Content-Type': 'application/json'
}

# Read the migration SQL
migration_file = ROOT_DIR / 'migrations' / '20251220_fix_database_schema_issues.sql'

with open(migration_file, 'r') as f:
    migration_sql = f.read()

print("Applying migration: 20251220_fix_database_schema_issues.sql")
print("=" * 60)

# Split the SQL into individual statements
statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]

for i, stmt in enumerate(statements, 1):
    if not stmt:
        continue

    print(f"Executing statement {i}: {stmt[:50]}...")

    # Use the Supabase REST API to execute raw SQL
    # Note: This might not work for all DDL statements
    try:
        response = requests.post(
            f"{supabase_url}/rest/v1/rpc/exec_sql",
            headers=headers,
            json={'sql': stmt}
        )

        if response.status_code == 200:
            print(f"  ✓ Statement {i} executed successfully")
        else:
            print(f"  ✗ Statement {i} failed: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"  ✗ Statement {i} error: {e}")

print("=" * 60)
print("Migration application complete.")