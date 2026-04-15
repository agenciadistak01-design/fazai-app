/**
 * FAZAÍ — Chat API Route
 * Recebe mensagem do cliente, envia para Claude com system prompt + tools,
 * processa tool calls automaticamente, e retorna resposta via streaming.
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

    // Verificar se o projeto existe e está ativo
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

    // Verificar limite de créditos da sessão
    const CREDIT_LIMIT = project.token_limit || 150000;
    if (project.tokens_used >= CREDIT_LIMIT) {
      return NextResponse.json({
        message: `Seus créditos desta sessão acabaram! 😊 Seu site já está publicado e pronto.\n\nQuer continuar fazendo ajustes? Adquira um pacote de créditos extras:\n\n💎 Pacote Básico — R$29,90 (50 créditos extras)\n💎 Pacote Pro — R$49,90 (150 créditos extras)\n💎 Pacote Premium — R$79,90 (500 créditos extras)\n\nEntre em contato pelo WhatsApp para adquirir seu pacote e continuar criando!`,
        creditLimitReached: true,
        creditsUsed: project.tokens_used,
        creditLimit: CREDIT_LIMIT,
      });
    }

    // Salvar mensagem do usuário
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg.role === 'user') {
      await supabase.from('chat_messages').insert({
        project_id: projectId,
        role: 'user',
        content: lastUserMsg.content,
      });
    }

    // Formatar mensagens para a API do Claude
    const claudeMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Se o projeto já tem um site, adicionar contexto
    let systemPrompt = FAZAI_SYSTEM_PROMPT;
    if (project.site_html) {
      systemPrompt += `\n\n---\n\nCONTEXTO: O cliente já tem um site criado. O HTML atual está salvo internamente. Quando ele pedir revisões, use a tool update_site com o HTML completo atualizado. O site atual foi publicado em: ${project.site_url || 'ainda não publicado'}`;
    }

    // Chamar Claude com tools
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: systemPrompt,
      tools: FAZAI_TOOLS,
      messages: claudeMessages,
    });

    // Contabilizar tokens da sessão
    let totalTokensThisRequest =
      (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    // Loop de tool use — processar tool calls automaticamente
    let assistantText = '';
    let siteHtml: string | null = null;
    let siteUrl: string | null = null;
    let loopCount = 0;
    const maxLoops = 5; // Segurança contra loops infinitos

    while (response.stop_reason === 'tool_use' && loopCount < maxLoops) {
      loopCount++;

      // Extrair texto e tool calls da resposta
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
      const textBlocks = response.content.filter((b) => b.type === 'text');

      // Acumular texto
      for (const tb of textBlocks) {
        if (tb.type === 'text') assistantText += tb.text;
      }

      // Processar cada tool call
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

        // Se gerou HTML, salvar
        if (newHtml) {
          siteHtml = newHtml;

          // Salvar no Supabase Storage
          const fileName = `${projectId}/index.html`;
          await supabase.storage
            .from('sites')
            .upload(fileName, new Blob([newHtml], { type: 'text/html' }), {
              upsert: true,
              contentType: 'text/html',
            });

          // Gerar URL pública
          const { data: urlData } = supabase.storage
            .from('sites')
            .getPublicUrl(fileName);

          siteUrl = urlData.publicUrl;

          // Atualizar projeto
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

        // Se é deploy, usar a URL real
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

      // Continuar a conversa com os resultados das tools
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

      // Acumular tokens do loop
      totalTokensThisRequest +=
        (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
    }

    // Extrair texto final da resposta
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantText += block.text;
      }
    }

    // Salvar resposta do assistente
    await supabase.from('chat_messages').insert({
      project_id: projectId,
      role: 'assistant',
      content: assistantText,
    });

    // Atualizar tokens usados no projeto
    const newTokensUsed = (project.tokens_used || 0) + totalTokensThisRequest;
    await supabase
      .from('projects')
      .update({ tokens_used: newTokensUsed })
      .eq('id', projectId);

    // Calcular créditos restantes para mostrar ao cliente
    const creditsRemaining = Math.max(0, CREDIT_LIMIT - newTokensUsed);
    const creditsPercent = Math.round((newTokensUsed / CREDIT_LIMIT) * 100);

    // Retornar resposta
    return NextResponse.json({
      message: assistantText,
      siteUrl: siteUrl,
      siteHtml: siteHtml ? true : false,
      creditsUsed: newTokensUsed,
      creditLimit: CREDIT_LIMIT,
      creditsRemaining,
      creditsPercent,
    });
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
