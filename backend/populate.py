import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def populate_dummy_data():
    # Clear existing data
    await db.profiles.drop()
    await db.spaces.drop()
    await db.sessions.drop()
    await db.space_activity.drop()
    await db.space_chat.drop()

    # Dummy profiles
    profiles = [
        {
            "user_id": "user1",
            "username": "Alice",
            "xp": 150,
            "level": 6,
            "streak": 8,
            "total_hours": 30.5,
            "efficiency": 88.0,
            "achievements": ["First Session", "Week Streak"]
        },
        {
            "user_id": "user2",
            "username": "Bob",
            "xp": 200,
            "level": 8,
            "streak": 12,
            "total_hours": 45.0,
            "efficiency": 92.0,
            "achievements": ["Month Streak", "High Efficiency"]
        },
        {
            "user_id": "user3",
            "username": "Charlie",
            "xp": 100,
            "level": 5,
            "streak": 5,
            "total_hours": 20.0,
            "efficiency": 85.0,
            "achievements": ["First Achievement"]
        },
    ]
    for profile in profiles:
        await db.profiles.insert_one(profile)
    
    # Dummy spaces
    spaces = [
        {
            "_id": "space1",
            "name": "Math Study Group",
            "description": "Group for math enthusiasts",
            "created_by": "user1",
            "members": ["user1", "user2"],
            "created_at": datetime.utcnow()
        },
        {
            "_id": "space2",
            "name": "Science Club",
            "description": "Discussing science topics",
            "created_by": "user2",
            "members": ["user2", "user3"],
            "created_at": datetime.utcnow()
        },
        {
            "_id": "space3",
            "name": "General Study",
            "description": "All subjects welcome",
            "created_by": "user1",
            "members": ["user1", "user2", "user3"],
            "created_at": datetime.utcnow()
        },
    ]
    for space in spaces:
        await db.spaces.insert_one(space)
    
    # Dummy sessions
    sessions = [
        {
            "_id": "sess1",
            "user_id": "user1",
            "subject": "Math",
            "duration_minutes": 60,
            "efficiency": 90.0,
            "created_at": datetime.utcnow() - timedelta(days=1)
        },
        {
            "_id": "sess2",
            "user_id": "user1",
            "subject": "Physics",
            "duration_minutes": 45,
            "efficiency": 85.0,
            "created_at": datetime.utcnow() - timedelta(days=2)
        },
        {
            "_id": "sess3",
            "user_id": "user2",
            "subject": "Chemistry",
            "duration_minutes": 50,
            "efficiency": 95.0,
            "created_at": datetime.utcnow() - timedelta(days=1)
        },
        {
            "_id": "sess4",
            "user_id": "user2",
            "subject": "Biology",
            "duration_minutes": 40,
            "efficiency": 88.0,
            "created_at": datetime.utcnow() - timedelta(days=3)
        },
        {
            "_id": "sess5",
            "user_id": "user3",
            "subject": "History",
            "duration_minutes": 30,
            "efficiency": 80.0,
            "created_at": datetime.utcnow() - timedelta(days=1)
        },
    ]
    for session in sessions:
        await db.sessions.insert_one(session)
    
    # Dummy space_activity
    activities = [
        {
            "_id": "act1",
            "space_id": "space1",
            "user_id": "user1",
            "action": "started task",
            "progress": 25,
            "created_at": datetime.utcnow() - timedelta(hours=1)
        },
        {
            "_id": "act2",
            "space_id": "space1",
            "user_id": "user2",
            "action": "updated progress",
            "progress": 50,
            "created_at": datetime.utcnow() - timedelta(hours=2)
        },
        {
            "_id": "act3",
            "space_id": "space2",
            "user_id": "user2",
            "action": "completed task",
            "progress": 100,
            "created_at": datetime.utcnow() - timedelta(hours=3)
        },
        {
            "_id": "act4",
            "space_id": "space3",
            "user_id": "user3",
            "action": "started task",
            "progress": 10,
            "created_at": datetime.utcnow() - timedelta(hours=4)
        },
    ]
    for activity in activities:
        await db.space_activity.insert_one(activity)
    
    # Dummy space_chat
    chats = [
        {
            "_id": "chat1",
            "space_id": "space1",
            "user_id": "user1",
            "message": "Hey everyone, let's discuss the math problems!",
            "created_at": datetime.utcnow() - timedelta(minutes=30)
        },
        {
            "_id": "chat2",
            "space_id": "space1",
            "user_id": "user2",
            "message": "Sure, I'm stuck on problem 5.",
            "created_at": datetime.utcnow() - timedelta(minutes=25)
        },
        {
            "_id": "chat3",
            "space_id": "space2",
            "user_id": "user2",
            "message": "Anyone up for a study session tonight?",
            "created_at": datetime.utcnow() - timedelta(minutes=20)
        },
        {
            "_id": "chat4",
            "space_id": "space2",
            "user_id": "user3",
            "message": "Yes, I need help with biology.",
            "created_at": datetime.utcnow() - timedelta(minutes=15)
        },
        {
            "_id": "chat5",
            "space_id": "space3",
            "user_id": "user1",
            "message": "Check out these study tips!",
            "created_at": datetime.utcnow() - timedelta(minutes=10)
        },
    ]
    for chat in chats:
        await db.space_chat.insert_one(chat)
    
    print("Dummy data populated successfully")

if __name__ == "__main__":
    asyncio.run(populate_dummy_data())