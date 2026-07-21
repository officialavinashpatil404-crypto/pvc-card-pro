const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env variables
const envPath = path.join(__dirname, '..', '.env.local');
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

async function inspect() {
  console.log('Inspecting Supabase database schema...');
  
  // Try querying a few different potential tables
  const tables = ['users', 'profiles', 'payment_history', 'card_history', 'support_tickets'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table '${table}': ERROR - ${error.message} (${error.code})`);
      } else {
        console.log(`Table '${table}': SUCCESS - found records`, data);
      }
    } catch (err) {
      console.log(`Table '${table}': EXCEPTION - ${err.message}`);
    }
  }
}

inspect();
