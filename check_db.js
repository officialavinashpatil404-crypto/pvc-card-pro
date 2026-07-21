const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
      process.env[key] = value;
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Error querying users table:', error);
  } else {
    console.log('Query success! Sample data:', data);
  }
}

check();
