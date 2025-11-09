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

print("Checking Supabase Database Tables and Data")
print("=" * 60)

tables_to_check = [
    'users',
    'spaces',
    'space_members',
    'study_sessions',
    'badges',
    'user_badges',
    'space_activity',
    'space_chat',
    'status_checks'
]

for table in tables_to_check:
    try:
        response = requests.get(f"{supabase_url}/rest/v1/{table}?select=*", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"[OK] {table.upper()}: {len(data)} records")
            if data:
                # Show first record as example
                first_record = data[0]
                print(f"   Sample: {first_record}")
        else:
            print(f"[ERROR] {table.upper()}: Error {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[ERROR] {table.upper()}: Connection error - {e}")

    print()

print("=" * 60)
print("To insert test data, call: POST http://localhost:8000/api/test/seed")
print("To view data in Supabase Dashboard, go to your project > Table Editor")