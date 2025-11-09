import requests
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

supabase_url = os.environ['SUPABASE_URL']
supabase_key = os.environ['SUPABASE_SERVICE_KEY']

print(f"Testing connection to: {supabase_url}")

# Test basic connectivity with a simple REST API call
headers = {
    'Authorization': f'Bearer {supabase_key}',
    'apikey': supabase_key,
    'Content-Type': 'application/json'
}

try:
    # Try to get the service health or basic info
    response = requests.get(f"{supabase_url}/rest/v1/", headers=headers, timeout=10)
    print(f"HTTP Status: {response.status_code}")

    if response.status_code == 200:
        print("Supabase connection successful!")
        print("Your credentials are working correctly.")
        print("\nNext step: Run the supabase_schema.sql file in your Supabase SQL editor to create the database tables.")
    elif response.status_code == 401:
        print("Authentication failed - check your SUPABASE_SERVICE_KEY")
    elif response.status_code == 404:
        print("Connection successful, but no tables exist yet")
        print("Run the supabase_schema.sql file in your Supabase SQL editor to create the database tables.")
    else:
        print(f"Unexpected response: {response.status_code}")
        print("Connection may work, but check your setup")

except requests.exceptions.RequestException as e:
    print(f"Connection failed: {e}")
    print("Check your SUPABASE_URL format and network connection")
except Exception as e:
    print(f"Unexpected error: {e}")