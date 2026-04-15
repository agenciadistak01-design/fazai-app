/**
 * FAZAÍ — Claude Tools Definition
 * Tools que o Claude chama autonomamente para criar/editar/publicar sites
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const FAZAI_TOOLS: Tool[] = [
  {
    name: 'write_site',
    description:
      'Cria o site completo do cliente. Gera um arquivo HTML único com CSS e JS inline. ' +
      'Use esta tool após coletar todas as informações na Fase 1 da descoberta. ' +
      'O HTML deve ser completo, responsivo, com copy persuasiva e design profissional.',
    input_schema: {
      type: 'object' as const,
      properties: {
        html: {
          type: 'string',
          description:
            'O código HTML completo do site (inclui CSS inline no <style> e JS inline no <script>). ' +
            'Deve ser um documento HTML5 válido e completo.',
        },
        site_name: {
          type: 'string',
          description: 'Nome do site/negócio do cliente (usado para gerar o subdomínio)',
        },
        industry: {
          type: 'string',
          description: 'Indústria/segmento do cliente (saude, advocacia, fitness, etc.)',
        },
      },
      required: ['html', 'site_name'],
    },
  },
  {
    name: 'update_site',
    description:
      'Edita o site existente do cliente. Use quando o cliente pedir revisões. ' +
      'Envie o HTML completo atualizado (não apenas o diff).',
    input_schema: {
      type: 'object' as const,
      properties: {
        html: {
          type: 'string',
          description: 'O código HTML completo atualizado do site.',
        },
        change_description: {
          type: 'string',
          description: 'Breve descrição do que foi alterado (para log interno).',
        },
      },
      required: ['html', 'change_description'],
    },
  },
  {
    name: 'deploy_site',
    description:
      'Publica o site do cliente e retorna a URL pública. ' +
      'Use após write_site ou update_site.',
    input_schema: {
      type: 'object' as const,
      properties: {
        publish: {
          type: 'boolean',
          description: 'Se true, publica o site. Sempre envie true.',
        },
      },
      required: ['publish'],
    },
  },
];

/**
 * Processa o resultado de uma tool call
 * No MVP, salvamos o HTML no Supabase Storage e geramos URL pública
 */
export function processToolResult(
  toolName: string,
  toolInput: Record<string, unknown>,
  projectId: string
): { result: string; siteHtml?: string } {
  switch (toolName) {
    case 'write_site': {
      const html = toolInput.html as string;
      const siteName = toolInput.site_name as string;
      return {
        result: `Site "${siteName}" criado com sucesso! Use deploy_site para publicar.`,
        siteHtml: html,
      };
    }

    case 'update_site': {
      const html = toolInput.html as string;
      const changeDesc = toolInput.change_description as string;
      return {
        result: `Site atualizado: ${changeDesc}. Use deploy_site para publicar a nova versão.`,
        siteHtml: html,
      };
    }

    case 'deploy_site': {
      const subdomain = projectId.slice(0, 8);
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/sites/${subdomain}`;
      return {
        result: `Site publicado com sucesso! URL: ${url}`,
      };
    }

    default:
      return { result: `Tool "${toolName}" não reconhecida.` };
  }
}
