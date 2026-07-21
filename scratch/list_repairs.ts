import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
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

import { createClient } from '../src/utils/supabase/client';

async function list() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('gujarati_repairs').select('*');
    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log('--- Database gujarati_repairs rows: ---');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.error('Exception:', err.message);
  }
}

list();
