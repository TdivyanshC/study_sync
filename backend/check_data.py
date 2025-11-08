import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def check_data():
    print("Checking sessions collection...")
    sessions = await db.sessions.find().to_list(10)
    for session in sessions:
        print(f"Session: {session}")
        print(f"Type of _id: {type(session.get('_id'))}")

    print("\nChecking profiles collection...")
    profiles = await db.profiles.find().to_list(10)
    for profile in profiles:
        print(f"Profile: {profile}")

    print("\nChecking spaces collection...")
    spaces = await db.spaces.find().to_list(10)
    for space in spaces:
        print(f"Space: {space}")

if __name__ == "__main__":
    asyncio.run(check_data())