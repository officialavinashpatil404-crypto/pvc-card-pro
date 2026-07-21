import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ucbyolqkqxqqaqeeeauw.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYnlvbHFrcXhxcWFxZWVlYXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0ODUxMDAsImV4cCI6MjA5NzA2MTEwMH0.XSe1cWuYT4SYQfgc7dhhmnc1P1JLA7VXqmXDevbjBV0';

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  )
}
