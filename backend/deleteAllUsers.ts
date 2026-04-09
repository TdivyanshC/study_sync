import { connectDB } from './src/config/database';
import User from './src/models/User';
import UserStreak from './src/models/UserStreak';
import Friendship from './src/models/Friendship';
import SpaceMember from './src/models/SpaceMember';
import SessionEvent from './src/models/SessionEvent';
import Alarm from './src/models/Alarm';

const deleteAllUsers = async () => {
  try {
    await connectDB();
    
    console.log('Starting deletion of all users and related data...');
    
    // Delete related collections first (referential integrity)
    const alarmsDeleted = await Alarm.deleteMany({});
    console.log(`✅ Deleted ${alarmsDeleted.deletedCount} alarms`);
    
    const sessionEventsDeleted = await SessionEvent.deleteMany({});
    console.log(`✅ Deleted ${sessionEventsDeleted.deletedCount} session events`);
    
    const spaceMembersDeleted = await SpaceMember.deleteMany({});
    console.log(`✅ Deleted ${spaceMembersDeleted.deletedCount} space members`);
    
    const friendshipsDeleted = await Friendship.deleteMany({});
    console.log(`✅ Deleted ${friendshipsDeleted.deletedCount} friendships`);
    
    const streaksDeleted = await UserStreak.deleteMany({});
    console.log(`✅ Deleted ${streaksDeleted.deletedCount} user streaks`);
    
    // Finally delete all users
    const usersDeleted = await User.deleteMany({});
    console.log(`✅ Deleted ${usersDeleted.deletedCount} users`);
    
    console.log('\n✅ All user data has been successfully removed from database');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting users:', error);
    process.exit(1);
  }
};

deleteAllUsers();
