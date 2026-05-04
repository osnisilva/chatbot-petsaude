const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedMockData() {
  console.log('--- Iniciando Geração de Dados Fictícios para Chat ao Vivo ---');

  // 1. Pegar uma UBS existente
  const { data: ubs } = await supabase.from('ubs').select('id').limit(1).single();
  if (!ubs) {
    console.error('Nenhuma UBS encontrada. Por favor, crie uma UBS primeiro.');
    return;
  }

  // 2. Pegar ou Criar ACS
  let { data: acs } = await supabase.from('acs').select('id').limit(1).single();
  if (!acs) {
      console.log('Criando ACS fictício...');
      const { data: newAcs, error: acsError } = await supabase.from('acs').insert({
          name: 'João Silva (ACS)',
          phone_number: '5511999999999',
          cns: '123456789012345',
          ubs_id: ubs.id,
          microarea: '01'
      }).select().single();
      if (acsError) throw acsError;
      acs = newAcs;
  }

  // 3. Criar Pacientes de Teste
  console.log('Criando pacientes de teste...');
  const mockPatients = [
      { name: 'Maria Oliveira', phone_number: '5511988888881', ubs_id: ubs.id, acs_id: acs.id, lgpd_consent: true, comorbidities: ['diabetes', 'hipertensao'] },
      { name: 'José dos Santos', phone_number: '5511988888882', ubs_id: ubs.id, acs_id: acs.id, lgpd_consent: true, comorbidities: ['asma'] },
      { name: 'Ana Souza', phone_number: '5511988888883', ubs_id: ubs.id, acs_id: acs.id, lgpd_consent: true, comorbidities: [] }
  ];

  const { data: patients, error: pError } = await supabase.from('patients').upsert(mockPatients, { onConflict: 'phone_number' }).select();
  if (pError) throw pError;

  // 4. Criar Sessões e Mensagens
  console.log('Criando sessões e mensagens...');

  for (const patient of patients) {
      // Determina status baseada no paciente para variedade
      const status = patient.name === 'Maria Oliveira' ? 'escalated' : (patient.name === 'José dos Santos' ? 'active' : 'resolved');
      
      const { data: session, error: sError } = await supabase.from('chat_sessions').insert({
          patient_id: patient.id,
          status: status
      }).select().single();

      if (sError) throw sError;

      // Mensagens da Maria (Transbordo para o ACS)
      if (patient.name === 'Maria Oliveira') {
          await supabase.from('messages').insert([
              { session_id: session.id, sender_type: 'patient', content: 'Olá, minha glicemia está um pouco alta hoje.' },
              { session_id: session.id, sender_type: 'bot', content: 'Olá Maria! Entendo sua preocupação. Você já tomou sua medicação hoje?' },
              { session_id: session.id, sender_type: 'patient', content: 'Sim, tomei, mas ainda me sinto um pouco tonta. Posso falar com o João?' },
              { session_id: session.id, sender_type: 'bot', content: 'Com certeza. Estou transferindo você para o seu Agente de Saúde agora mesmo.' }
          ]);
      }

      // Mensagens do José (Ativa com o Bot)
      if (patient.name === 'José dos Santos') {
          await supabase.from('messages').insert([
              { session_id: session.id, sender_type: 'patient', content: 'Quais são as dicas de hoje para quem tem asma?' },
              { session_id: session.id, sender_type: 'bot', content: 'Olá José! Para hoje, a dica é evitar ambientes com muita poeira e manter a bombinha sempre por perto. Beber água também ajuda!' }
          ]);
      }

      // Mensagens da Ana (Resolvida)
      if (patient.name === 'Ana Souza') {
          await supabase.from('messages').insert([
              { session_id: session.id, sender_type: 'patient', content: 'Obrigada pelas informações sobre a vacina!' },
              { session_id: session.id, sender_type: 'bot', content: 'De nada, Ana! Fico feliz em ajudar. Se precisar de mais alguma coisa, é só chamar.' }
          ]);
      }
  }

  console.log('✅ Dados de teste gerados com sucesso!');
}

seedMockData().catch(console.error);
