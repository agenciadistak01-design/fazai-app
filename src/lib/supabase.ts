/**
 * FAZAÍ — Supabase Client
 */

import { createClient } from '@supabase/supabase-js';

// Client-side (browser) — uses anon key
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Server-side — uses service role key (full access)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Database Types
 */
export interface Project {
  id: string;
  user_id: string;
  site_name: string | null;
  industry: string | null;
  site_html: string | null;
  site_url: string | null;
  status: 'active' | 'completed' | 'expired';
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}
