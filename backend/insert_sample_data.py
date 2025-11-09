import os
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}

def insert_sample_data():
    print("Inserting sample data into Supabase...")

    try:
        # 1. Insert a user
        import uuid
        unique_username = f"test_user_{str(uuid.uuid4())[:8]}"
        unique_email = f"{unique_username}@example.com"

        user_payload = {
            "username": unique_username,
            "email": unique_email,
            "password_hash": "superhashedpassword123"
        }

        print("1. Inserting user...")
        user_resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/users",
            json=user_payload,
            headers=headers,
        )

        print(f"User response status: {user_resp.status_code}")
        print(f"User response text: '{user_resp.text}'")

        if user_resp.status_code != 201:
            print(f"Error inserting user: {user_resp.status_code} - {user_resp.text}")
            return

        # Supabase returns empty body for INSERT, so we need to query it back
        if user_resp.text.strip() == "":
            # Query the user we just inserted
            query_resp = requests.get(
                f"{SUPABASE_URL}/rest/v1/users?username=eq.jane_doe",
                headers=headers,
            )
            if query_resp.status_code == 200:
                query_data = query_resp.json()
                if query_data:
                    user_data = query_data[0]
                    user_id = user_data.get("id")
                    print(f"   User inserted with ID: {user_id}")
                else:
                    print("Error: User inserted but not found in query")
                    return
            else:
                print(f"Error querying inserted user: {query_resp.status_code}")
                return
        else:
            user_data = user_resp.json()
            user_id = user_data.get("id")
            print(f"   User inserted with ID: {user_id}")

        # 2. Insert a space
        space_payload = {
            "name": "AP Study Sync Demo Space",
            "visibility": "public",
            "created_by": user_id,
        }

        print("2. Inserting space...")
        space_resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/spaces",
            json=space_payload,
            headers=headers,
        )

        print(f"Space response status: {space_resp.status_code}")
        print(f"Space response text: '{space_resp.text}'")

        if space_resp.status_code != 201:
            print(f"Error inserting space: {space_resp.status_code} - {space_resp.text}")
            return

        # Supabase returns empty body for INSERT, so we need to query it back
        if space_resp.text.strip() == "":
            # Query the space we just inserted
            query_resp = requests.get(
                f"{SUPABASE_URL}/rest/v1/spaces?created_by=eq.{user_id}",
                headers=headers,
            )
            if query_resp.status_code == 200:
                query_data = query_resp.json()
                if query_data:
                    space_data = query_data[0]  # Get the first (most recent) space
                    space_id = space_data.get("id")
                    print(f"   Space inserted with ID: {space_id}")
                else:
                    print("Error: Space inserted but not found in query")
                    return
            else:
                print(f"Error querying inserted space: {query_resp.status_code}")
                return
        else:
            space_data = space_resp.json()
            space_id = space_data.get("id")
            print(f"   Space inserted with ID: {space_id}")

        # 3. Insert membership
        membership_payload = {
            "space_id": space_id,
            "user_id": user_id
        }

        print("3. Inserting membership...")
        membership_resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/space_members",
            json=membership_payload,
            headers=headers,
        )

        print(f"Membership response status: {membership_resp.status_code}")
        print(f"Membership response text: '{membership_resp.text}'")

        if membership_resp.status_code != 201:
            print(f"Error inserting membership: {membership_resp.status_code} - {membership_resp.text}")
            return

        # Supabase returns empty body for INSERT, so we don't need to parse JSON
        print(f"   Membership inserted")

        # 4. Insert study session
        session_payload = {
            "space_id": space_id,
            "user_id": user_id,
            "duration_minutes": 25,
            "efficiency": 87.3
        }

        print("4. Inserting study session...")
        session_resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/study_sessions",
            json=session_payload,
            headers=headers,
        )

        print(f"Session response status: {session_resp.status_code}")
        print(f"Session response text: '{session_resp.text}'")

        if session_resp.status_code != 201:
            print(f"Error inserting study session: {session_resp.status_code} - {session_resp.text}")
            return

        print(f"   Study session inserted")

        print("\n✅ All sample data inserted successfully!")
        print("\nInserted data:")
        print(f"User: {user_data}")
        print(f"Space: {space_data}")
        print(f"Membership: {membership_data}")
        print(f"Study Session: {session_data}")

        return {
            "user": user_data,
            "space": space_data,
            "membership": membership_data,
            "study_session": session_data
        }

    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    insert_sample_data()