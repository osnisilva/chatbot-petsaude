import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { email, password, name, phone_number, cns, ubs_id, microarea, role } = body;

    // 1. Criar o usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Criar o registro na tabela ACS
    const { error: dbError } = await supabaseAdmin
      .from('acs')
      .insert([
        {
          auth_user_id: authData.user.id,
          name,
          phone_number,
          cns,
          ubs_id,
          microarea: microarea || null,
          role: role || 'acs'
        }
      ]);

    if (dbError) {
      // Rollback: Deletar o usuário auth se o insert na tabela falhar
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: authData.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
