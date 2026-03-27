import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI || MONGODB_URI.trim() === '') {
  console.error('Missing MongoDB connection string (MONGODB_URI)');
  process.exit(1);
}

console.log('Attempting to connect to:', MONGODB_URI.replace(/:[^:@]+@/, ':***@')); // Hide password in logs

// MONGODB_URI is guaranteed to be a non-empty string here
const uri = MONGODB_URI;

async function testConnection() {
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');

    // Create a test user
    const testUser = await User.create({
      _id: new mongoose.Types.ObjectId().toHexString(),
      email: 'test@example.com',
      username: 'testuser' + Date.now(),
      publicUserId: 'TEST' + Math.floor(Math.random() * 1000000),
      displayName: 'Test User',
      gender: 'Other',
      age: 25,
      relationshipStatus: 'Single',
      preferredSessions: [],
      onboardingCompleted: false,
    });

    console.log('✅ Test user created:', testUser.toObject());

    // Close the connection
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testConnection();