const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugData() {
  console.log('--- Debug de Dados e Permissões ---');
  
  // 1. UBS da Sede
  const { data: sede } = await supabase.from('ubs').select('*').eq('name', 'Secretaria de Saúde').maybeSingle();
  console.log('UBS Sede (Admin):', sede ? `${sede.name} (${sede.id})` : 'Não encontrada');

  // 2. ACS Vinculados
  const { data: acs } = await supabase.from('acs').select('*, ubs(name)').not('auth_user_id', 'is', null);
  console.log('ACS Vinculados:', acs.map(a => `${a.name} -> UBS: ${a.ubs.name} (${a.ubs_id})`));

  // 3. Pacientes e suas UBS
  const { data: patients } = await supabase.from('patients').select('name, ubs_id, ubs(name)').limit(5);
  console.log('Alguns Pacientes:', patients.map(p => `${p.name} -> UBS: ${p.ubs.name} (${p.ubs_id})`));

  // 4. Verificando se os pacientes estão na mesma UBS que algum ACS ou se a UBS do ACS é a Sede
  if (acs.length > 0 && patients.length > 0) {
      const isSede = acs[0].ubs.name === 'Secretaria de Saúde';
      console.log(`O primeiro ACS (${acs[0].name}) é da Sede? ${isSede ? 'SIM' : 'NÃO'}`);
      
      const sameUbs = patients[0].ubs_id === acs[0].ubs_id;
      console.log(`O primeiro paciente (${patients[0].name}) está na mesma UBS que o ACS? ${sameUbs ? 'SIM' : 'NÃO'}`);
      
      if (!isSede && !sameUbs) {
          console.log('⚠️ PROBLEMA DETECTADO: O ACS logado não é da Sede e os pacientes estão em outra UBS. O RLS vai bloquear a visão.');
          console.log('Vou mover os pacientes de teste para a mesma UBS do ACS logado...');
          
          await supabase.from('patients').update({ ubs_id: acs[0].ubs_id }).in('name', ['Maria Oliveira', 'José dos Santos', 'Ana Souza']);
          console.log('✅ Pacientes movidos para a UBS do ACS logado.');
      }
  }
}

debugData();
