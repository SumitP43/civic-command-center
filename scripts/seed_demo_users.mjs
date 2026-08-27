import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Fatal: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  console.log('=== SEEDING DEMO USERS INTO SUPABASE AUTH ===');

  // 1. Fetch departments
  const { data: depts, error: deptErr } = await adminClient.from('departments').select('id, code, name');
  if (deptErr) {
    console.error('Failed to load departments:', deptErr);
    process.exit(1);
  }
  const deptMap = {};
  depts.forEach(d => {
    deptMap[d.code] = d.id;
  });
  console.log(`Loaded ${depts.length} departments.`);

  // 2. Fetch existing auth users to avoid duplicate attempts
  const { data: listData } = await adminClient.auth.admin.listUsers();
  const existingUsers = new Map((listData?.users || []).map(u => [u.email?.toLowerCase(), u]));

  const demoAccounts = [
    // Super Admin
    {
      email: 'superadmin@demo.com',
      password: 'Demo@123456',
      full_name: 'Commissioner Rajendra Prasad',
      role: 'super_admin',
      phone: '+91-9876543200',
    },
    // Department Admins
    {
      email: 'deptadmin1@demo.com',
      password: 'Demo@123456',
      full_name: 'Ashok Mishra (PWD Admin)',
      role: 'department_admin',
      phone: '+91-9876543201',
    },
    {
      email: 'deptadmin2@demo.com',
      password: 'Demo@123456',
      full_name: 'Sunita Devi (Water Admin)',
      role: 'department_admin',
      phone: '+91-9876543202',
    },
    // Field Officers
    {
      email: 'officer1@demo.com',
      password: 'Demo@123456',
      full_name: 'Vijay Chauhan',
      role: 'officer',
      phone: '+91-9876543203',
      deptCode: 'PWD',
      badge: 'PWD-001',
      designation: 'Senior Road Inspector',
    },
    {
      email: 'officer2@demo.com',
      password: 'Demo@123456',
      full_name: 'Suresh Yadav',
      role: 'officer',
      phone: '+91-9876543204',
      deptCode: 'ELECTRICITY',
      badge: 'ELEC-001',
      designation: 'Line Superintendent',
    },
    {
      email: 'officer3@demo.com',
      password: 'Demo@123456',
      full_name: 'Deepak Verma',
      role: 'officer',
      phone: '+91-9876543205',
      deptCode: 'WATER',
      badge: 'WAT-001',
      designation: 'Water Supply Officer',
    },
    {
      email: 'officer4@demo.com',
      password: 'Demo@123456',
      full_name: 'Manoj Tiwari',
      role: 'officer',
      phone: '+91-9876543206',
      deptCode: 'SANITATION',
      badge: 'SAN-001',
      designation: 'Sanitation Inspector',
    },
    {
      email: 'officer5@demo.com',
      password: 'Demo@123456',
      full_name: 'Arun Singh',
      role: 'officer',
      phone: '+91-9876543207',
      deptCode: 'ROADS',
      badge: 'RD-001',
      designation: 'Road Maintenance Officer',
    },
    {
      email: 'officer6@demo.com',
      password: 'Demo@123456',
      full_name: 'Rajesh Kumar',
      role: 'officer',
      phone: '+91-9876543208',
      deptCode: 'TRAFFIC',
      badge: 'TRF-001',
      designation: 'Traffic Management Officer',
    },
    {
      email: 'officer7@demo.com',
      password: 'Demo@123456',
      full_name: 'Sanjay Mishra',
      role: 'officer',
      phone: '+91-9876543209',
      deptCode: 'STREETLIGHT',
      badge: 'STL-001',
      designation: 'Lighting Maintenance Officer',
    },
    {
      email: 'officer8@demo.com',
      password: 'Demo@123456',
      full_name: 'Pankaj Jha',
      role: 'officer',
      phone: '+91-9876543210',
      deptCode: 'SAFETY',
      badge: 'SAF-001',
      designation: 'Public Safety Officer',
    },
    // Citizens
    {
      email: 'citizen1@demo.com',
      password: 'Demo@123456',
      full_name: 'Rahul Sharma',
      role: 'citizen',
      phone: '+91-9876543211',
    },
    {
      email: 'citizen2@demo.com',
      password: 'Demo@123456',
      full_name: 'Priya Singh',
      role: 'citizen',
      phone: '+91-9876543212',
    },
    {
      email: 'citizen3@demo.com',
      password: 'Demo@123456',
      full_name: 'Amit Kumar',
      role: 'citizen',
      phone: '+91-9876543213',
    },
    {
      email: 'citizen4@demo.com',
      password: 'Demo@123456',
      full_name: 'Neha Gupta',
      role: 'citizen',
      phone: '+91-9876543214',
    },
    {
      email: 'citizen5@demo.com',
      password: 'Demo@123456',
      full_name: 'Ravi Patel',
      role: 'citizen',
      phone: '+91-9876543215',
    },
  ];

  for (const account of demoAccounts) {
    const emailKey = account.email.toLowerCase();
    let userId;

    if (existingUsers.has(emailKey)) {
      userId = existingUsers.get(emailKey).id;
      console.log(`[EXISTING] Auth user ${account.email} (${userId})`);
    } else {
      const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.full_name,
          role: account.role,
        },
      });

      if (createErr) {
        console.error(`[ERROR] Failed to create auth user ${account.email}:`, createErr.message);
        continue;
      }

      userId = createData.user.id;
      console.log(`[CREATED] Auth user ${account.email} (${userId})`);
    }

    // Upsert profile record
    const { error: profErr } = await adminClient.from('profiles').upsert({
      id: userId,
      email: account.email,
      full_name: account.full_name,
      role: account.role,
      phone: account.phone,
      city: 'Noida',
      state: 'Uttar Pradesh',
      is_active: true,
    }, { onConflict: 'id' });

    if (profErr) {
      console.error(`[WARN] Profile upsert error for ${account.email}:`, profErr.message);
    } else {
      console.log(`  ✓ Profile synchronized for ${account.email} (${account.role})`);
    }

    // Upsert officer record if officer
    if (account.role === 'officer' && account.deptCode) {
      const deptId = deptMap[account.deptCode];
      if (deptId) {
        const { error: offErr } = await adminClient.from('officers').upsert({
          profile_id: userId,
          department_id: deptId,
          badge_number: account.badge,
          designation: account.designation,
          status: 'available',
        }, { onConflict: 'profile_id' });

        if (offErr) {
          console.error(`[WARN] Officer record error for ${account.email}:`, offErr.message);
        } else {
          console.log(`  ✓ Officer record linked for ${account.email} (${account.badge} / ${account.deptCode})`);
        }
      }
    }
  }

  console.log('\n=== VERIFYING SIGN IN VIA CLIENT AUTH ===');
  const testUsers = ['superadmin@demo.com', 'deptadmin1@demo.com', 'officer1@demo.com', 'citizen1@demo.com'];

  for (const testEmail of testUsers) {
    const { data, error } = await client.auth.signInWithPassword({
      email: testEmail,
      password: 'Demo@123456',
    });

    if (error) {
      console.error(`[FAIL] Login test for ${testEmail}:`, error.message);
    } else {
      console.log(`[PASS] Login test for ${testEmail}: User ID = ${data.user?.id}`);
    }
  }

  console.log('\n=== SEED COMPLETED SUCCESSFULLY ===');
}

main().catch(console.error);
