/**
 * FAZAÍ — Chat API Route
 * Recebe mensagem do cliente, envia para Claude com system prompt + tools,
 * processa tool calls automaticamente, e retorna resposta.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { FAZAI_SYSTEM_PROMPT } from '@/lib/system-prompt';
import { FAZAI_TOOLS, processToolResult } from '@/lib/tools';
import { createServerClient } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, projectId } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      projectId: string;
    };

    if (!messages || !projectId) {
      return NextResponse.json(
        { error: 'messages e projectId são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projError || !project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    if (project.status === 'expired') {
      return NextResponse.json({ error: 'Sessão expirada' }, { status: 403 });
    }

    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg.role === 'user') {
      await supabase.from('chat_messages').insert({
        project_id: projectId,
        role: 'user',
        content: lastUserMsg.content,
      });
    }

    const claudeMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    let systemPrompt = FAZAI_SYSTEM_PROMPT;
    if (project.site_html) {
      systemPrompt += `\n\n---\n\nCONTEXTO: O cliente já tem um site criado. O HTML atual está salvo internamente. Quando ele pedir revisões, use a tool update_site com o HTML completo atualizado. O site atual foi publicado em: ${project.site_url || 'ainda não publicado'}`;
    }

    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: systemPrompt,
      tools: FAZAI_TOOLS,
      messages: claudeMessages,
    });

    let assistantText = '';
    let siteHtml: string | null = null;
    let siteUrl: string | null = null;
    let loopCount = 0;
    const maxLoops = 5;

    while (response.stop_reason === 'tool_use' && loopCount < maxLoops) {
      loopCount++;

      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
      const textBlocks = response.content.filter((b) => b.type === 'text');

      for (const tb of textBlocks) {
        if (tb.type === 'text') assistantText += tb.text;
      }

      const toolResults: Array<{
        type: 'tool_result';
        tool_use_id: string;
        content: string;
      }> = [];

      for (const toolBlock of toolUseBlocks) {
        if (toolBlock.type !== 'tool_use') continue;

        const { result, siteHtml: newHtml } = processToolResult(
          toolBlock.name,
          toolBlock.input as Record<string, unknown>,
          projectId
        );

        if (newHtml) {
          siteHtml = newHtml;

          const fileName = `${projectId}/index.html`;
          await supabase.storage
            .from('sites')
            .upload(fileName, new Blob([newHtml], { type: 'text/html' }), {
              upsert: true,
              contentType: 'text/html',
            });

          const { data: urlData } = supabase.storage
            .from('sites')
            .getPublicUrl(fileName);

          siteUrl = urlData.publicUrl;

          await supabase
            .from('projects')
            .update({
              site_html: newHtml,
              site_url: siteUrl,
              site_name:
                (toolBlock.input as Record<string, unknown>).site_name as string ||
                project.site_name,
              industry:
                (toolBlock.input as Record<string, unknown>).industry as string ||
                project.industry,
              updated_at: new Date().toISOString(),
            })
            .eq('id', projectId);
        }

        let toolResult = result;
        if (toolBlock.name === 'deploy_site' && siteUrl) {
          toolResult = `Site publicado com sucesso! URL: ${siteUrl}`;
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: toolResult,
        });
      }

      const continuedMessages = [
        ...claudeMessages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResults },
      ];

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        tools: FAZAI_TOOLS,
        messages: continuedMessages,
      });
    }

    for (const block of response.content) {
      if (block.type === 'text') {
        assistantText += block.text;
      }
    }

    await supabase.from('chat_messages').insert({
      project_id: projectId,
      role: 'assistant',
      content: assistantText,
    });

    return NextResponse.json({
      message: assistantText,
      siteUrl: siteUrl,
      siteHtml: siteHtml ? true : false,
    });
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
