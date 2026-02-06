/**
 * Script to create a test user programmatically
 * Run: node CREATE_TEST_USER.js
 */

const { createClient } = require('@supabase/supabase-js');

// Replace with your Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    username: 'testuser',
    display_name: 'Test User',
    gender: 'male',
    age: '25',
    relationship: 'Single'
  };

  console.log('Creating test user...');

  try {
    // Create user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: {
        username: testUser.username,
        display_name: testUser.display_name
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return;
    }

    console.log('Auth user created:', authUser.user.id);

    // Create user record in users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: testUser.email,
        username: testUser.username.toLowerCase(),
        public_user_id: 'TESTU1',
        display_name: testUser.display_name,
        gender: testUser.gender,
        age: parseInt(testUser.age),
        relationship_status: testUser.relationship,
        preferred_sessions: [],
        onboarding_completed: false
      })
      .select()
      .single();

    if (userError) {
      console.error('User record error:', userError);
      return;
    }

    console.log('Test user created successfully!');
    console.log('User:', userRecord);
    console.log('\nLogin credentials:');
    console.log('Email:', testUser.email);
    console.log('Password:', testUser.password);

  } catch (error) {
    console.error('Error:', error);
  }
}

createTestUser();
