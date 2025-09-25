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
    print("Checking profiles:")
    profiles = await db.profiles.find().to_list(10)
    for p in profiles:
        print(f"  {p}")
    
    print("\nChecking spaces:")
    spaces = await db.spaces.find().to_list(10)
    for s in spaces:
        print(f"  {s}")
    
    print("\nChecking sessions:")
    sessions = await db.sessions.find().to_list(10)
    for s in sessions:
        print(f"  {s}")
    
    print("\nChecking space_activity:")
    activities = await db.space_activity.find().to_list(10)
    for a in activities:
        print(f"  {a}")
    
    print("\nChecking space_chat:")
    chats = await db.space_chat.find().to_list(10)
    for c in chats:
        print(f"  {c}")

if __name__ == "__main__":
    asyncio.run(check_data())