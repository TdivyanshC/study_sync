require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MongoDB connection string (MONGODB_URI)');
  process.exit(1);
}

async function testConnection() {
  try {
    await mongoose.connect(MONGODB_URI);
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
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testConnection();