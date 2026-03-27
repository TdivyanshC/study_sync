import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI ?? '';
if (!MONGODB_URI || MONGODB_URI.trim() === '') {
  console.error('Missing MongoDB connection string (MONGODB_URI)');
  process.exit(1);
}

console.log('Attempting to connect to:', MONGODB_URI.replace(/:[^:@]+@/, ':***@'));

async function createTestUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');

    // Create multiple test users
    const testUsers = [
      {
        _id: new mongoose.Types.ObjectId().toHexString(),
        email: 'test1@example.com',
        username: 'testuser_alpha' + Date.now(),
        publicUserId: 'TEST_ALPHA' + Math.floor(Math.random() * 100000),
        displayName: 'Alpha Test User',
        gender: 'Male',
        age: 22,
        relationshipStatus: 'Single',
        preferredSessions: ['session1', 'session2'],
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId().toHexString(),
        email: 'test2@example.com',
        username: 'testuser_beta' + Date.now(),
        publicUserId: 'TEST_BETA' + Math.floor(Math.random() * 100000),
        displayName: 'Beta Test User',
        gender: 'Female',
        age: 24,
        relationshipStatus: 'In a relationship',
        preferredSessions: ['session3'],
        onboardingCompleted: false,
      },
      {
        _id: new mongoose.Types.ObjectId().toHexString(),
        email: 'test3@example.com',
        username: 'testuser_gamma' + Date.now(),
        publicUserId: 'TEST_GAMMA' + Math.floor(Math.random() * 100000),
        displayName: 'Gamma Test User',
        gender: 'Other',
        age: 28,
        relationshipStatus: 'Committed',
        preferredSessions: ['session1', 'session3', 'session4'],
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId().toHexString(),
        email: 'test4@example.com',
        username: 'testuser_delta' + Date.now(),
        publicUserId: 'TEST_DELTA' + Math.floor(Math.random() * 100000),
        displayName: 'Delta Test User',
        gender: 'Male',
        age: 30,
        relationshipStatus: 'Single',
        preferredSessions: [],
        onboardingCompleted: false,
      },
      {
        _id: new mongoose.Types.ObjectId().toHexString(),
        email: 'test5@example.com',
        username: 'testuser_epsilon' + Date.now(),
        publicUserId: 'TEST_EPSILON' + Math.floor(Math.random() * 100000),
        displayName: 'Epsilon Test User',
        gender: 'Female',
        age: 26,
        relationshipStatus: 'Engaged',
        preferredSessions: ['session2', 'session5'],
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    ];

    const createdUsers = await User.insertMany(testUsers);
    console.log('✅ Created', createdUsers.length, 'test users:');
    createdUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.email})`);
    });

    // Verify users were created
    const count = await User.countDocuments();
    console.log('✅ Total users in database:', count);

    // Close the connection
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestUsers();