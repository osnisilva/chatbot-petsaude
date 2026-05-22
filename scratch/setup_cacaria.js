const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Iniciando script de criação...');

  // 1. Procurar ou criar a UBS 'Cacaria'
  let { data: ubs } = await supabase
    .from('ubs')
    .select('*')
    .ilike('name', '%cacaria%')
    .single();

  if (!ubs) {
    console.log('UBS Cacaria não encontrada. Criando...');
    const { data: newUbs, error: ubsError } = await supabase
      .from('ubs')
      .insert({ name: 'UBS Cacaria', cnes: 'CNES-CACARIA-' + Math.floor(Math.random() * 10000) })
      .select()
      .single();
    
    if (ubsError) throw ubsError;
    ubs = newUbs;
    console.log('UBS Cacaria criada com ID:', ubs.id);
  } else {
    console.log('UBS Cacaria encontrada:', ubs.id);
  }

  // 2. Criar usuário gerente no Auth (silva, 123mudar)
  const email = 'silva@cacaria.com';
  let { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: '123mudar',
    email_confirm: true,
  });

  if (authError && authError.message.includes('already exists')) {
    console.log('Usuário Auth já existe, buscando...');
    const { data: users } = await supabase.auth.admin.listUsers();
    authUser = { user: users.users.find(u => u.email === email) };
  } else if (authError) {
    throw authError;
  }
  
  const userId = authUser.user.id;
  console.log('Auth user ID:', userId);

  // 3. Criar registro do gerente na tabela ACS
  const { data: existingAcs } = await supabase
    .from('acs')
    .select('*')
    .eq('auth_user_id', userId)
    .single();

  if (!existingAcs) {
    console.log('Criando perfil ACS (Gerente) para Silva...');
    const { error: acsError } = await supabase
      .from('acs')
      .insert({
        auth_user_id: userId,
        name: 'Silva (Gerente)',
        phone_number: '5511999990001',
        cns: 'CNS-SILVA-' + Math.floor(Math.random() * 10000),
        ubs_id: ubs.id,
        role: 'gerente'
      });
    if (acsError) throw acsError;
  } else {
    console.log('Perfil ACS já existe para Silva.');
  }

  // 4. Adicionar pacientes de teste
  console.log('Criando pacientes de teste na unidade Cacaria...');
  const pacientes = [
    { name: 'Paciente Teste 1', phone_number: '5511999990002', cns_masked: '***.***.***-01', ubs_id: ubs.id, gender: 'M', comorbidities: ['Hipertensão'] },
    { name: 'Paciente Teste 2', phone_number: '5511999990003', cns_masked: '***.***.***-02', ubs_id: ubs.id, gender: 'F', comorbidities: ['Diabetes'] },
    { name: 'Paciente Teste 3', phone_number: '5511999990004', cns_masked: '***.***.***-03', ubs_id: ubs.id, gender: 'O', comorbidities: [] }
  ];

  for (const p of pacientes) {
    const { error: pError } = await supabase.from('patients').upsert(p, { onConflict: 'phone_number' });
    if (pError) console.error('Erro ao criar paciente', p.name, pError);
  }

  console.log('Script finalizado com sucesso!');
}

main().catch(console.error);
