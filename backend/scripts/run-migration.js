const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Running migration: Fix public_user_id column size');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE users ALTER COLUMN public_user_id TYPE VARCHAR(10);'
  });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('Migration completed successfully!');
  console.log('Result:', data);
}

runMigration();
