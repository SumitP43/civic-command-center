import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function checkDatabase() {
  console.log('--- 1. TEST DIRECT INSERT INTO PROFILES VIA ADMIN ---');
  const testId = '00000000-0000-0000-0000-000000000001';
  // Note: profiles references auth.users(id), so we cannot insert an ID that doesn't exist in auth.users unless auth.users has that id.
  
  console.log('--- 2. TEST ADMIN CREATE USER (auth.admin.createUser) ---');
  try {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: 'test_admin_created@example.com',
      password: 'Password@123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Admin Created',
        role: 'citizen'
      }
    });

    if (error) {
      console.log('admin.createUser Error:', error.message, error.status, JSON.stringify(error));
    } else {
      console.log('admin.createUser SUCCESS! User ID:', data.user?.id);
      
      // Check if profile was created by trigger
      const { data: prof, error: profErr } = await adminClient.from('profiles').select('*').eq('id', data.user.id);
      console.log('Profile for new user:', prof, 'profErr:', profErr);
      
      // Clean up test user
      await adminClient.auth.admin.deleteUser(data.user.id);
      console.log('Cleaned up test user');
    }
  } catch (err) {
    console.error('createUser Exception:', err);
  }
}

checkDatabase();
