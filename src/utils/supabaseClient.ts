import { createClient } from '@supabase/supabase-js'

// Environment variables with fallback values
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://aazlefqsoatputxkbimq.supabase.co'
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhemxlZnFzb2F0cHV0eGtiaW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjgzNzYsImV4cCI6MjA3NDA0NDM3Nn0.CAoSJzbnLndv77LDBjxOdgcL7TW2likCxZ87Fz8jVJM'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)