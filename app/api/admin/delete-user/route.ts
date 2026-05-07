import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { id, auth_user_id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID do profissional é obrigatório' }, { status: 400 });
    }

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

    // 1. Deletar da tabela acs
    const { error: dbError } = await supabaseAdmin
      .from('acs')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    // 2. Deletar do Auth do Supabase (se houver vínculo)
    if (auth_user_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(auth_user_id);
      if (authError) {
        console.error('Erro ao deletar do Auth:', authError.message);
        // Não lançamos erro aqui para não travar a exclusão do banco se o auth já não existir
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na API de exclusão:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
