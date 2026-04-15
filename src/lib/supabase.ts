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
  tokens_used: number;
  token_limit: number;
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

/**
 * SQL para criar as tabelas (rodar no Supabase SQL Editor):
 *
 * -- Projetos (cada compra = 1 projeto)
 * CREATE TABLE projects (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
 *   site_name TEXT,
 *   industry TEXT,
 *   site_html TEXT,
 *   site_url TEXT,
 *   status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW(),
 *   expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
 * );
 *
 * -- Mensagens do chat
 * CREATE TABLE chat_messages (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
 *   role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
 *   content TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- RLS policies
 * ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Users can view own projects"
 *   ON projects FOR SELECT
 *   USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can update own projects"
 *   ON projects FOR UPDATE
 *   USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can view own messages"
 *   ON chat_messages FOR SELECT
 *   USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
 *
 * -- Storage bucket para sites publicados
 * INSERT INTO storage.buckets (id, name, public) VALUES ('sites', 'sites', true);
 *
 * CREATE POLICY "Public read access"
 *   ON storage.objects FOR SELECT
 *   USING (bucket_id = 'sites');
 *
 * CREATE POLICY "Service role write access"
 *   ON storage.objects FOR INSERT
 *   WITH CHECK (bucket_id = 'sites');
 *
 * CREATE POLICY "Service role update access"
 *   ON storage.objects FOR UPDATE
 *   USING (bucket_id = 'sites');
 */
