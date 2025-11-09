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
    # Try creating client - if it fails, the tables probably don't exist yet
    supabase: Client = create_client(supabase_url, supabase_key)
    print("Connected to Supabase successfully")
    print("=" * 50)

    # Check users table
    print("Checking USERS table:")
    users = supabase.table('users').select('*').execute()
    print(f"Found {len(users.data)} users:")
    for user in users.data:
        print(f"  - ID: {user['id']}, Username: {user['username']}, Email: {user['email']}")
    print()

    # Check spaces table
    print("Checking SPACES table:")
    spaces = supabase.table('spaces').select('*').execute()
    print(f"Found {len(spaces.data)} spaces:")
    for space in spaces.data:
        print(f"  - ID: {space['id']}, Name: {space['name']}, Created by: {space['created_by']}, Visibility: {space['visibility']}")
    print()

    # Check space_members table
    print("Checking SPACE_MEMBERS table:")
    members = supabase.table('space_members').select('*').execute()
    print(f"Found {len(members.data)} space memberships:")
    for member in members.data:
        print(f"  - Space ID: {member['space_id']}, User ID: {member['user_id']}, Joined: {member['joined_at']}")
    print()

    # Check study_sessions table
    print("Checking STUDY_SESSIONS table:")
    sessions = supabase.table('study_sessions').select('*').execute()
    print(f"Found {len(sessions.data)} study sessions:")
    for session in sessions.data:
        print(f"  - ID: {session['id']}, User: {session['user_id']}, Space: {session.get('space_id', 'None')}, Duration: {session['duration_minutes']}min, Efficiency: {session.get('efficiency', 'N/A')}")
    print()

    # Check badges table
    print("Checking BADGES table:")
    badges = supabase.table('badges').select('*').execute()
    print(f"Found {len(badges.data)} badges:")
    for badge in badges.data:
        print(f"  - ID: {badge['id']}, Title: {badge['title']}, Requirement: {badge['requirement_type']} {badge['requirement_value']}")
    print()

    # Check user_badges table
    print("Checking USER_BADGES table:")
    user_badges = supabase.table('user_badges').select('*').execute()
    print(f"Found {len(user_badges.data)} user badges:")
    for ub in user_badges.data:
        print(f"  - User: {ub['user_id']}, Badge: {ub['badge_id']}, Achieved: {ub['achieved_at']}")
    print()

    print("=" * 50)
    print("Database check completed!")

except Exception as e:
    print(f"Error connecting to Supabase: {e}")
    print("Make sure:")
    print("1. You've run the supabase_schema.sql file in your Supabase SQL editor")
    print("2. Your SUPABASE_URL and SUPABASE_SERVICE_KEY are correct in .env")
    print("3. You've called the /api/test/seed endpoint to insert test data")