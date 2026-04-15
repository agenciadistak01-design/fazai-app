/**
 * FAZAÍ — Kiwify Webhook
 * Recebe notificação de pagamento e cria projeto para o cliente
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verificar webhook secret (Kiwify envia no header)
    const webhookSecret = req.headers.get('x-kiwify-signature');
    if (webhookSecret !== process.env.KIWIFY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Kiwify envia dados do comprador
    const {
      order_status,
      Customer: customer,
    } = body;

    // Só processar compras aprovadas
    if (order_status !== 'paid') {
      return NextResponse.json({ status: 'ignored', reason: 'not paid' });
    }

    const email = customer?.email;
    if (!email) {
      return NextResponse.json({ error: 'Email não encontrado' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verificar se usuário já existe no Supabase Auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let userId: string;

    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email
    );

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Criar usuário com magic link (sem senha)
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: email,
          email_confirm: true,
        });

      if (createError || !newUser.user) {
        console.error('Erro ao criar usuário:', createError);
        return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
      }

      userId = newUser.user.id;
    }

    // Criar projeto
    const { data: project, error: projError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        status: 'active',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (projError) {
      console.error('Erro ao criar projeto:', projError);
      return NextResponse.json({ error: 'Erro ao criar projeto' }, { status: 500 });
    }

    // Enviar magic link por email para o cliente acessar o chat
    await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/chat?project=${project.id}`,
      },
    });

    console.log(`✅ Projeto criado: ${project.id} para ${email}`);

    return NextResponse.json({
      status: 'success',
      projectId: project.id,
      userId: userId,
    });
  } catch (error: unknown) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
