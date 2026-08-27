import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function checkComplaints() {
  const { data: countData, error } = await adminClient.from('complaints').select('count');
  console.log('Total complaints in db:', countData);
  
  if (countData && countData[0]?.count === 0) {
    console.log('Generating demo complaints...');
    const { data, error: fnErr } = await adminClient.rpc('generate_demo_complaints');
    console.log('generate_demo_complaints result:', data, 'error:', fnErr);
  }
}

checkComplaints();
