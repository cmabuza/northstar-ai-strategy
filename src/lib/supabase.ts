import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const supabaseUrl = 'https://wctoouoaxbokkzhrvkhm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdG9vdW9heGJva2t6aHJ2a2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDExMTQsImV4cCI6MjA3NTQ3NzExNH0.DllMvGhl5Uk9ryZ0G78uHTEWhkqaE-WV0cmXQUqUQIY';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
