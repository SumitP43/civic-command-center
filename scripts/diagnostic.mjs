import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- ENV CHECK ---');
console.log('NEXT_PUBLIC_SUPABASE_URL present:', !!supabaseUrl, supabaseUrl ? (supabaseUrl.startsWith('http') ? 'Valid URL format' : 'Invalid URL format') : 'Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY present:', !!supabaseAnonKey, supabaseAnonKey ? `Length: ${supabaseAnonKey.length}` : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceKey, supabaseServiceKey ? `Length: ${supabaseServiceKey.length}` : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Fatal: Missing URL or Anon key');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runDiagnostics() {
  console.log('\n--- 1. TESTING SUPABASE CONNECTION (ANON KEY) ---');
  try {
    const { data, error } = await client.from('departments').select('count').limit(1);
    if (error) {
      console.log('Departments query error:', error.message, error.code, error.details);
    } else {
      console.log('Departments query SUCCESS! Data:', data);
    }
  } catch (err) {
    console.error('Connection exception:', err);
  }

  console.log('\n--- 2. TESTING SIGN IN WITH DEMO CITIZEN ---');
  try {
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: 'citizen1@demo.com',
      password: 'Demo@123456'
    });
    if (signInError) {
      console.log('Sign in error:', signInError.message, 'Status:', signInError.status, 'Name:', signInError.name);
    } else {
      console.log('Sign in SUCCESS! User ID:', signInData.user?.id, 'Email:', signInData.user?.email);
    }
  } catch (err) {
    console.error('Sign in exception:', err);
  }

  console.log('\n--- 3. TESTING SIGN UP WITH NEW USER ---');
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword@123';
  try {
    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test Citizen Diagnostic',
          phone: '+919999999999',
          role: 'citizen'
        }
      }
    });

    if (signUpError) {
      console.log('Sign up error:', signUpError.message, 'Status:', signUpError.status, 'Name:', signUpError.name);
    } else {
      console.log('Sign up SUCCESS! User ID:', signUpData.user?.id, 'Email:', signUpData.user?.email, 'Identities:', signUpData.user?.identities?.length);
      console.log('User identities:', signUpData.user?.identities);
      console.log('Session returned:', !!signUpData.session);

      // Check if profile was created
      if (signUpData.user?.id) {
        const { data: profileData, error: profileError } = await client
          .from('profiles')
          .select('*')
          .eq('id', signUpData.user.id);
        console.log('Profile query after signup:', profileData, 'Error:', profileError);
      }
    }
  } catch (err) {
    console.error('Sign up exception:', err);
  }

  if (supabaseServiceKey) {
    console.log('\n--- 4. TESTING SERVICE ROLE ADMIN CLIENT (Check existing users in Auth) ---');
    try {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 10 });
      if (usersError) {
        console.log('Admin listUsers error:', usersError.message);
      } else {
        console.log('Total users in auth.users:', usersData.users.length);
        usersData.users.forEach(u => {
          console.log(`- User: ${u.email}, confirmed_at: ${u.email_confirmed_at}, created_at: ${u.created_at}`);
        });
      }

      const { data: allProfiles, error: profErr } = await adminClient.from('profiles').select('id, email, role, full_name');
      if (profErr) {
        console.log('Admin profiles query error:', profErr.message);
      } else {
        console.log('Total rows in profiles table:', allProfiles?.length);
        allProfiles?.forEach(p => {
          console.log(`- Profile: ${p.email}, role: ${p.role}, name: ${p.full_name}`);
        });
      }
    } catch (err) {
      console.error('Admin exception:', err);
    }
  }
}

runDiagnostics();
