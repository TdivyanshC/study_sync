import os
from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client, Client

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_key = os.environ['SUPABASE_SERVICE_KEY']

try:
    # Try creating client without proxy parameter
    supabase: Client = create_client(supabase_url, supabase_key)
    print("Supabase client created successfully")

    # Test connection by trying to select from a table that should exist
    # If tables don't exist yet, this will fail but connection will work
    try:
        result = supabase.table('users').select('*').limit(1).execute()
        print("Database connection successful")
        print(f"Found {len(result.data)} users in database")
    except Exception as e:
        if "relation" in str(e).lower() or "does not exist" in str(e).lower():
            print("Database connection successful, but tables may not be created yet")
            print("Run the supabase_schema.sql in your Supabase SQL editor")
        else:
            print(f"Database query failed: {e}")

except Exception as e:
    print(f"Supabase connection failed: {e}")
    print("Check your SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    print("Note: SUPABASE_URL should be the project URL (https://xxx.supabase.co), not the PostgreSQL connection string")
    print("If the error mentions 'proxy', try updating the Supabase library or check your credentials")