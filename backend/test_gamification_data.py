"""
Test script to push gamification data and verify XP calculations, streaks, and badges.
This will insert study sessions and check if the frontend reflects the changes correctly.
"""

import os
import sys
import io
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# User ID from the logs
USER_ID = "2ba45274-d17b-45c2-b4fc-a0f6fe8d96f3"

def get_current_user_stats():
    """Get current user statistics"""
    try:
        response = supabase.table("users").select("username, xp, level, streak_count").eq("id", USER_ID).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        print(f"❌ Error fetching user stats: {e}")
        return None

def insert_study_sessions():
    """Insert test study sessions with various durations"""
    print("\n📚 Inserting test study sessions...")
    
    sessions = [
        {
            "user_id": USER_ID,
            "duration_minutes": 45,
            "created_at": (datetime.now() - timedelta(days=0, hours=2)).isoformat(),
            "efficiency": 85.5
        },
        {
            "user_id": USER_ID,
            "duration_minutes": 60,
            "created_at": (datetime.now() - timedelta(days=0, hours=1)).isoformat(),
            "efficiency": 92.0
        },
        {
            "user_id": USER_ID,
            "duration_minutes": 30,
            "created_at": datetime.now().isoformat(),
            "efficiency": 78.5
        }
    ]
    
    inserted_sessions = []
    for i, session in enumerate(sessions, 1):
        try:
            response = supabase.table("study_sessions").insert(session).execute()
            if response.data:
                inserted_sessions.append(response.data[0])
                print(f"✅ Inserted session {i}: {session['duration_minutes']} mins (efficiency: {session['efficiency']}%)")
        except Exception as e:
            print(f"❌ Error inserting session: {e}")
    
    return inserted_sessions

def calculate_expected_xp(duration_minutes):
    """Calculate expected XP based on duration"""
    # Base XP calculation: 10 XP per minute
    base_xp = duration_minutes * 10
    
    # Bonus for longer sessions
    if duration_minutes >= 60:
        base_xp += 100  # 1 hour bonus
    if duration_minutes >= 120:
        base_xp += 200  # 2 hour bonus
    
    return base_xp

def update_streak():
    """Update user streak count"""
    print("\n🔥 Updating streak count...")
    
    try:
        # Get current streak
        current_stats = get_current_user_stats()
        if current_stats:
            current_streak = current_stats.get('streak_count', 0)
            new_streak = current_streak + 3  # Add 3 days to streak
            
            response = supabase.table("users").update({
                "streak_count": new_streak
            }).eq("id", USER_ID).execute()
            
            if response.data:
                print(f"✅ Streak updated: {current_streak} → {new_streak} days")
                return new_streak
        else:
            print("❌ Could not fetch current user stats")
    except Exception as e:
        print(f"❌ Error updating streak: {e}")
    
    return None

def award_xp_for_sessions(sessions):
    """Award XP for study sessions"""
    print("\n⭐ Awarding XP for sessions...")
    
    total_xp_awarded = 0
    for session in sessions:
        duration = session.get('duration_minutes', 0)
        expected_xp = calculate_expected_xp(duration)
        
        try:
            # Insert XP history
            xp_entry = {
                "user_id": USER_ID,
                "amount": expected_xp,
                "source": f"study_session_{session['id']}",
                "created_at": session['created_at']
            }
            
            response = supabase.table("xp_history").insert(xp_entry).execute()
            if response.data:
                total_xp_awarded += expected_xp
                print(f"✅ Awarded {expected_xp} XP for {duration} min session")
        except Exception as e:
            print(f"❌ Error awarding XP: {e}")
    
    # Update user's total XP
    if total_xp_awarded > 0:
        try:
            current_stats = get_current_user_stats()
            if current_stats:
                current_xp = current_stats.get('xp', 0)
                new_xp = current_xp + total_xp_awarded
                
                # Calculate new level (100 XP per level)
                new_level = new_xp // 100
                
                response = supabase.table("users").update({
                    "xp": new_xp,
                    "level": new_level
                }).eq("id", USER_ID).execute()
                
                if response.data:
                    print(f"✅ Total XP updated: {current_xp} → {new_xp}")
                    print(f"✅ Level: {current_stats.get('level', 0)} → {new_level}")
        except Exception as e:
            print(f"❌ Error updating total XP: {e}")
    
    return total_xp_awarded

def check_and_award_badges():
    """Check if user qualifies for badges and award them"""
    print("\n🏆 Checking for badge eligibility...")
    
    try:
        # Get user stats
        stats = get_current_user_stats()
        if not stats:
            print("❌ Could not fetch user stats")
            return
        
        xp = stats.get('xp', 0)
        streak = stats.get('streak_count', 0)
        level = stats.get('level', 0)
        
        # Define badge criteria - first create badges if they don't exist
        badges_to_check = [
            {
                "title": "XP Master",
                "description": "Earned 500+ XP",
                "icon_url": "⭐",
                "requirement_type": "xp",
                "requirement_value": 500,
                "user_qualifies": xp >= 500
            },
            {
                "title": "Streak Warrior",
                "description": "Maintained 3+ day streak",
                "icon_url": "🔥",
                "requirement_type": "streak",
                "requirement_value": 3,
                "user_qualifies": streak >= 3
            },
            {
                "title": "Level Champion",
                "description": "Reached level 5",
                "icon_url": "🏅",
                "requirement_type": "level",
                "requirement_value": 5,
                "user_qualifies": level >= 5
            }
        ]
        
        # Award badges
        for badge_def in badges_to_check:
            if not badge_def["user_qualifies"]:
                continue
                
            try:
                # First, ensure the badge exists in badges table
                existing_badge = supabase.table("badges").select("id").eq("title", badge_def["title"]).execute()
                
                if not existing_badge.data:
                    # Create the badge
                    new_badge = supabase.table("badges").insert({
                        "title": badge_def["title"],
                        "description": badge_def["description"],
                        "icon_url": badge_def["icon_url"],
                        "requirement_type": badge_def["requirement_type"],
                        "requirement_value": badge_def["requirement_value"]
                    }).execute()
                    badge_id = new_badge.data[0]["id"]
                else:
                    badge_id = existing_badge.data[0]["id"]
                
                # Check if user already has this badge
                user_has_badge = supabase.table("user_badges").select("*").eq("user_id", USER_ID).eq("badge_id", badge_id).execute()
                
                if not user_has_badge.data:
                    # Award the badge to user
                    response = supabase.table("user_badges").insert({
                        "user_id": USER_ID,
                        "badge_id": badge_id
                    }).execute()
                    
                    if response.data:
                        print(f"✅ Badge awarded: {badge_def['icon_url']} {badge_def['title']}")
                else:
                    print(f"ℹ️  Badge already earned: {badge_def['icon_url']} {badge_def['title']}")
                    
            except Exception as e:
                print(f"❌ Error awarding badge {badge_def['title']}: {e}")
    
    except Exception as e:
        print(f"❌ Error checking badges: {e}")

def display_summary():
    """Display final summary of user stats"""
    print("\n" + "="*60)
    print("📊 FINAL USER STATISTICS")
    print("="*60)
    
    try:
        # Get user stats
        stats = get_current_user_stats()
        if stats:
            print(f"👤 Username: {stats.get('username', 'N/A')}")
            print(f"⭐ XP: {stats.get('xp', 0)}")
            print(f"🎯 Level: {stats.get('level', 0)}")
            print(f"🔥 Streak: {stats.get('streak_count', 0)} days")
        
        # Get today's study time
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        
        sessions = supabase.table("study_sessions").select("duration_minutes").eq("user_id", USER_ID).gte("created_at", today_start).lte("created_at", today_end).execute()
        
        if sessions.data:
            total_minutes = sum(s['duration_minutes'] for s in sessions.data)
            print(f"📚 Today's Study Time: {total_minutes} minutes ({total_minutes/60:.1f} hours)")
            print(f"📝 Sessions Today: {len(sessions.data)}")
        
        # Get badges - join with badges table to get badge info
        user_badges_response = supabase.table("user_badges").select("badge_id").eq("user_id", USER_ID).execute()
        
        if user_badges_response.data:
            print(f"\n🏆 Badges Earned ({len(user_badges_response.data)}):")
            for ub in user_badges_response.data:
                badge_info = supabase.table("badges").select("title, icon_url").eq("id", ub['badge_id']).execute()
                if badge_info.data:
                    badge = badge_info.data[0]
                    print(f"   {badge['icon_url']} {badge['title']}")
        
        print("\n" + "="*60)
        print("✅ Test data inserted successfully!")
        print("🔍 Check your frontend home screen to verify the data")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"❌ Error displaying summary: {e}")

def main():
    """Main execution function"""
    print("\n" + "="*60)
    print("🎮 GAMIFICATION SYSTEM TEST")
    print("="*60)
    
    # Display current stats
    print("\n📊 Current User Stats (Before):")
    current_stats = get_current_user_stats()
    if current_stats:
        print(f"   XP: {current_stats.get('xp', 0)}")
        print(f"   Level: {current_stats.get('level', 0)}")
        print(f"   Streak: {current_stats.get('streak_count', 0)} days")
    
    # Insert study sessions
    sessions = insert_study_sessions()
    
    if sessions:
        # Award XP for sessions
        total_xp = award_xp_for_sessions(sessions)
        
        # Update streak
        update_streak()
        
        # Check and award badges
        check_and_award_badges()
        
        # Display final summary
        display_summary()
    else:
        print("\n❌ No sessions were inserted. Please check the errors above.")

if __name__ == "__main__":
    main()
