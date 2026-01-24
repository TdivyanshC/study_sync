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

print("Checking Database Schema for Missing Columns")
print("=" * 60)

# Check users table columns
print("Users table columns:")
response = requests.get(f"{supabase_url}/rest/v1/users?select=*&limit=1", headers=headers)
if response.status_code == 200:
    data = response.json()
    if data:
        user = data[0]
        columns = list(user.keys())
        print(f"  Columns: {columns}")
        has_updated_at = 'updated_at' in columns
        print(f"  Has updated_at: {has_updated_at}")
    else:
        print("  No data in users table")
else:
    print(f"  Error: {response.status_code} - {response.text}")

print()

# Check daily_user_metrics table columns
print("daily_user_metrics table columns:")
response = requests.get(f"{supabase_url}/rest/v1/daily_user_metrics?select=*&limit=1", headers=headers)
if response.status_code == 200:
    data = response.json()
    if data:
        record = data[0]
        columns = list(record.keys())
        print(f"  Columns: {columns}")
        has_current_streak = 'current_streak' in columns
        print(f"  Has current_streak: {has_current_streak}")
    else:
        print("  No data in daily_user_metrics table")
else:
    print(f"  Error: {response.status_code} - {response.text}")

print("=" * 60)