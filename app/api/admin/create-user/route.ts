import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { name, email, password, role, ubs_id, microarea, phone_number, cns } = await request.json();

    // Criar cliente admin (Service Role)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Criar usuário no Auth do Supabase
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // 2. Criar perfil na tabela 'acs'
    const { error: dbError } = await supabaseAdmin
      .from('acs')
      .insert({
        auth_user_id: authUser.user.id,
        name,
        email, // Salvamos o email aqui também para facilitar a gestão
        role,
        ubs_id,
        microarea,
        phone_number,
        cns
      });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, user: authUser.user });
  } catch (error: any) {
    console.error('Erro na API de administração:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
