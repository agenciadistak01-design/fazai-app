/**
 * FAZAÍ — Serve site publicado do cliente
 * Rota: /sites/[projectId-prefix]
 */

import { createServerClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';

export default async function SitePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerClient();

  // Buscar projeto pelo prefixo do ID
  const { data: projects } = await supabase
    .from('projects')
    .select('site_html, site_name')
    .ilike('id', `${params.id}%`)
    .limit(1);

  const project = projects?.[0];

  if (!project || !project.site_html) {
    notFound();
  }

  // Servir o HTML diretamente
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{project.site_name || 'Site FAZAÍ'}</title>
      </head>
      <body
        dangerouslySetInnerHTML={{ __html: project.site_html }}
        suppressHydrationWarning
      />
    </html>
  );
}
