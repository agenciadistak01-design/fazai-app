/**
 * FAZAI - Deploy API Route
 * Recebe HTML do site e publica no Supabase Storage
 * Retorna URL publica do site publicado
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, html, siteName } = body as {
      projectId: string;
      html: string;
      siteName?: string;
    };

    if (!projectId || !html) {
      return NextResponse.json(
        { error: 'projectId e html sao obrigatorios' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verificar se o projeto existe
    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projError || !project) {
      return NextResponse.json(
        { error: 'Projeto nao encontrado' },
        { status: 404 }
      );
    }

    if (project.status === 'expired') {
      return NextResponse.json(
        { error: 'Sessao expirada' },
        { status: 403 }
      );
    }

    // Upload do HTML para Supabase Storage
    const fileName = `${projectId}/index.html`;
    const { error: uploadError } = await supabase.storage
      .from('sites')
      .upload(fileName, new Blob([html], { type: 'text/html' }), {
        upsert: true,
        contentType: 'text/html',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Erro ao publicar site' },
        { status: 500 }
      );
    }

    // Gerar URL publica
    const { data: urlData } = supabase.storage
      .from('sites')
      .getPublicUrl(fileName);

    const siteUrl = urlData.publicUrl;

    // Atualizar projeto no banco
    await supabase
      .from('projects')
      .update({
        site_html: html,
        site_url: siteUrl,
        site_name: siteName || project.site_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    return NextResponse.json({
      success: true,
      siteUrl,
      message: `Site publicado com sucesso!`,
    });
  } catch (error: unknown) {
    console.error('Deploy API Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
