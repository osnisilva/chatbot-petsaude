const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedEngagement() {
  console.log('Iniciando seed de dados de engajamento...');

  // 1. Pegar alguns ACS
  const { data: acsList } = await supabase.from('acs').select('id, name, ubs_id').limit(5);

  if (!acsList || acsList.length === 0) {
    console.log('Nenhum ACS encontrado para vincular dados.');
    return;
  }

  for (const acs of acsList) {
    console.log(`Gerando dados para: ${acs.name}`);
    
    // Criar 3 pacientes fictícios para cada ACS
    for (let i = 1; i <= 3; i++) {
      const phone = `552499${Math.floor(1000000 + Math.random() * 9000000)}`;
      const { data: patient, error: pError } = await supabase
        .from('patients')
        .upsert({
          name: `Paciente Teste ${i} (${acs.name})`,
          phone_number: phone,
          acs_id: acs.id,
          ubs_id: acs.ubs_id,
          lgpd_consent: true
        }, { onConflict: 'phone_number' })
        .select()
        .single();

      if (patient) {
        // Criar uma sessão
        const { data: session } = await supabase
          .from('chat_sessions')
          .insert({ patient_id: patient.id, status: 'active' })
          .select()
          .single();

        if (session) {
          // Criar uma mensagem do Bot para contar no engajamento
          await supabase.from('messages').insert({
            session_id: session.id,
            sender_type: 'bot',
            content: 'Olá! Sou o assistente virtual da sua unidade de saúde. Como posso ajudar hoje?'
          });
        }
      }
    }
  }

  console.log('Seed de engajamento concluído com sucesso!');
}

seedEngagement();
