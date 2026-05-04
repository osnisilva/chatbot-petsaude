const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserLink() {
  console.log('--- Verificando Vínculo do Usuário Gestor ---');
  
  // 1. Verificando UBS 'Secretaria de Saúde'
  const { data: ubs } = await supabase.from('ubs').select('id').eq('name', 'Secretaria de Saúde').maybeSingle();
  if (!ubs) {
    console.log('❌ UBS "Secretaria de Saúde" não encontrada. Criando...');
    const { data: newUbs } = await supabase.from('ubs').insert({ name: 'Secretaria de Saúde', cnes: '0000000' }).select().single();
    console.log(`✅ Criada com ID: ${newUbs.id}`);
  } else {
    console.log(`✅ UBS encontrada com ID: ${ubs.id}`);
  }

  // 2. Verificando ACS vinculados a usuários (auth_user_id)
  const { data: acsRecords } = await supabase.from('acs').select('*').not('auth_user_id', 'is', null);
  console.log(`Encontrados ${acsRecords.length} registros de ACS vinculados a usuários de autenticação.`);
  
  if (acsRecords.length === 0) {
    console.log('⚠️ Nenhum ACS está vinculado a um usuário real. Por isso o Dashboard aparece vazio (RLS bloqueando).');
    console.log('Vou listar os usuários do Auth para vincular um ao perfil de Gestor...');
    
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('Erro ao listar usuários:', error.message);
        return;
    }
    
    if (users.length > 0) {
        const gestor = users[0]; // Pega o primeiro usuário para testar
        console.log(`Vinculando usuário ${gestor.email} (${gestor.id}) ao perfil de Gestor...`);
        
        const finalUbsId = ubs ? ubs.id : (await supabase.from('ubs').select('id').eq('name', 'Secretaria de Saúde').single()).data.id;

        const { error: linkError } = await supabase.from('acs').insert({
            auth_user_id: gestor.id,
            name: 'Gestor Principal',
            phone_number: '00000000000',
            cns: '000000000000000',
            ubs_id: finalUbsId,
            microarea: 'Sede'
        });
        
        if (linkError) {
            console.error('Erro ao vincular:', linkError.message);
        } else {
            console.log('✅ Usuário vinculado com sucesso! O Dashboard deve funcionar agora.');
        }
    } else {
        console.log('❌ Nenhum usuário encontrado no Auth. Por favor, crie uma conta primeiro.');
    }
  }
}

checkUserLink();
