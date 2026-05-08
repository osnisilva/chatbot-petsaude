import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { id, auth_user_id, name, email, password, role, ubs_id, microarea, phone_number, cns } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID do profissional é obrigatório' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // 1. Atualizar Auth (E-mail e Senha) - Apenas se o profissional tiver uma conta vinculada
    if (auth_user_id) {
      const authUpdateData: any = {};
      if (email) authUpdateData.email = email;
      if (password) authUpdateData.password = password;

      if (Object.keys(authUpdateData).length > 0) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          auth_user_id,
          authUpdateData
        );
        if (authError) throw authError;
      }
    }

    // 2. Atualizar Banco (Tabela acs) - AGORA COM EMAIL!
    const { error: dbError } = await supabaseAdmin
      .from('acs')
      .update({
        name,
        email, // <-- Faltava este campo aqui!
        role,
        ubs_id,
        microarea,
        phone_number,
        cns
      })
      .eq('id', id);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na API de atualização:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
