import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';
import SessionType from './src/models/SessionType';

dotenv.config();

/**
 * One-time migration script to fix corrupted preferredSessions data
 * 
 * This script finds all users where preferredSessions contains MongoDB ObjectId strings,
 * looks up the corresponding SessionType documents by _id, extracts the session slug/name,
 * and replaces the IDs with proper slug strings.
 */
async function runMigration() {
  try {
    console.log('🔄 Starting preferredSessions migration...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync');
    console.log('✅ Connected to MongoDB');

    // Find all users that have ObjectId formatted strings in preferredSessions
    const objectIdPattern = /^[a-f0-9]{24}$/;
    
    const usersWithIds = await User.find({
      preferredSessions: {
        $elemMatch: { $regex: objectIdPattern }
      }
    });

    console.log(`📍 Found ${usersWithIds.length} users with corrupted preferredSessions data`);

    let updatedCount = 0;
    let failedCount = 0;

    for (const user of usersWithIds) {
      console.log(`\n⚙️  Processing user: ${user._id}`);
      console.log(`   Current preferredSessions:`, user.preferredSessions);

      const convertedSessions: string[] = [];
      const idLookups: string[] = [];

      // Separate existing slugs from ObjectIds that need lookup
      for (const item of user.preferredSessions) {
        if (objectIdPattern.test(item)) {
          idLookups.push(item);
        } else {
          convertedSessions.push(item);
        }
      }

      console.log(`   Found ${idLookups.length} IDs to resolve`);

      if (idLookups.length > 0) {
        try {
          // Look up all session types by their ObjectId
          const sessionTypes = await SessionType.find({
            _id: { $in: idLookups.map(id => new mongoose.Types.ObjectId(id)) }
          });

          console.log(`   Found ${sessionTypes.length} matching SessionType documents`);

          // Create mapping: id -> slug (lowercase name, spaces replaced with dashes)
          const sessionSlugMap = new Map<string, string>();
          
          sessionTypes.forEach(st => {
            // Extract slug from name (normalize to match the standard slugs)
            const slug = st.name
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/session$/, '')
              .trim();
            
            sessionSlugMap.set(st._id.toString(), slug);
            console.log(`     ${st._id} → "${slug}" (from name: "${st.name}")`);
          });

          // Resolve all IDs
          for (const id of idLookups) {
            const slug = sessionSlugMap.get(id);
            if (slug) {
              convertedSessions.push(slug);
            } else {
              console.log(`     ⚠️  No SessionType found for id: ${id}, skipping`);
            }
          }

          // Remove duplicates while preserving order
          const uniqueSessions = [...new Set(convertedSessions)];
          
          console.log(`   Final preferredSessions:`, uniqueSessions);

          // Update the user document
          await User.findByIdAndUpdate(user._id, {
            $set: { preferredSessions: uniqueSessions }
          });

          console.log(`   ✅ User updated successfully`);
          updatedCount++;
        } catch (err) {
          console.error(`   ❌ Failed to process user ${user._id}:`, err);
          failedCount++;
        }
      }
    }

    console.log(`\n📊 Migration complete!`);
    console.log(`   Successfully updated: ${updatedCount} users`);
    console.log(`   Failed: ${failedCount} users`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
runMigration();
