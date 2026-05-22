require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log('Iniciando seed de apresentação...');

  // 1. Pegar algumas UBSs
  const { data: ubsList } = await supabase.from('ubs').select('id, name');
  if (!ubsList || ubsList.length === 0) {
    console.log('Nenhuma UBS encontrada.');
    return;
  }
  
  // Pegamos apenas UBS normais (pulamos a secretaria de saude se houver)
  const ubsValidas = ubsList.filter(u => u.name.includes('Saúde') && !u.name.includes('Secretaria'));
  const getUbs = () => ubsValidas[Math.floor(Math.random() * ubsValidas.length)].id;

  // 2. Criar Pacientes
  const patientsToInsert = [
    {
      name: 'Maria das Graças Silva',
      phone_number: '5524999112233',
      cns_masked: '***.***.***-11',
      ubs_id: getUbs(),
      comorbidities: ['Hipertensão', 'Diabetes'],
      lgpd_consent: true,
      birth_date: '1965-05-12'
    },
    {
      name: 'João Antônio Medeiros',
      phone_number: '5524998334455',
      cns_masked: '***.***.***-22',
      ubs_id: getUbs(),
      comorbidities: ['Asma'],
      lgpd_consent: true,
      birth_date: '1982-11-23'
    },
    {
      name: 'Lúcia Helena Costa',
      phone_number: '5524997556677',
      cns_masked: '***.***.***-33',
      ubs_id: getUbs(),
      comorbidities: ['Gestante', 'Hipertensão'],
      lgpd_consent: true,
      birth_date: '1990-02-15'
    },
    {
      name: 'Marcos Paulo Andrade',
      phone_number: '5524996778899',
      cns_masked: '***.***.***-44',
      ubs_id: getUbs(),
      comorbidities: ['Saúde Mental'],
      lgpd_consent: true,
      birth_date: '1975-08-08'
    },
    {
      name: 'Roberto Carlos Pires',
      phone_number: '5524995112233',
      cns_masked: '***.***.***-55',
      ubs_id: getUbs(),
      comorbidities: ['Tuberculose'],
      lgpd_consent: true,
      birth_date: '1958-12-30'
    }
  ];

  console.log('Inserindo pacientes...');
  const { data: insertedPatients, error: pError } = await supabase
    .from('patients')
    .upsert(patientsToInsert, { onConflict: 'phone_number' })
    .select('*');

  if (pError) {
    console.error('Erro ao inserir pacientes:', pError);
    return;
  }

  const pMaria = insertedPatients.find(p => p.name.includes('Maria'));
  const pJoao = insertedPatients.find(p => p.name.includes('João'));
  const pLucia = insertedPatients.find(p => p.name.includes('Lúcia'));

  // 3. Criar Sessões de Chat
  console.log('Criando sessões de chat...');
  
  // Apagar sessões anteriores desses pacientes
  await supabase.from('chat_sessions').delete().in('patient_id', [pMaria.id, pJoao.id, pLucia.id]);

  const sessionsData = [
    { patient_id: pMaria.id, status: 'active' },
    { patient_id: pJoao.id, status: 'escalated' },
    { patient_id: pLucia.id, status: 'escalated' }
  ];

  const { data: insertedSessions, error: sError } = await supabase
    .from('chat_sessions')
    .insert(sessionsData)
    .select('*');

  if (sError) {
    console.error('Erro ao inserir sessões:', sError);
    return;
  }

  const sMaria = insertedSessions.find(s => s.patient_id === pMaria.id);
  const sJoao = insertedSessions.find(s => s.patient_id === pJoao.id);
  const sLucia = insertedSessions.find(s => s.patient_id === pLucia.id);

  // 4. Inserir Histórico de Mensagens
  console.log('Inserindo mensagens...');
  
  // Apagar mensagens anteriores dessas sessões para evitar duplicação no seed
  await supabase.from('messages').delete().in('session_id', insertedSessions.map(s => s.id));

  const messagesToInsert = [
    // Chat da Maria (IA atendendo)
    { session_id: sMaria.id, sender_type: 'patient', content: 'Bom dia! Gostaria de saber se o meu remédio de pressão já chegou no posto.', created_at: new Date(Date.now() - 3600000).toISOString() },
    { session_id: sMaria.id, sender_type: 'bot', content: 'Olá, Maria! Verifiquei no sistema e a Losartana já está disponível para retirada na sua unidade. Lembre-se de levar a receita e um documento com foto.', created_at: new Date(Date.now() - 3500000).toISOString() },
    
    // Chat do João (Escalado para ACS)
    { session_id: sJoao.id, sender_type: 'patient', content: 'Oi, a bombinha da asma do meu filho acabou e ele tá chiando muito. O que eu faço?', created_at: new Date(Date.now() - 7200000).toISOString() },
    { session_id: sJoao.id, sender_type: 'bot', content: 'Olá, João. Como o seu caso parece ser uma crise aguda ou de urgência, estou transferindo você para falar diretamente com o Agente Comunitário de Saúde. Aguarde um instante.', created_at: new Date(Date.now() - 7100000).toISOString() },
    { session_id: sJoao.id, sender_type: 'acs', content: 'Oi João! Aqui é o ACS. Leve ele agora mesmo na UPA ou no postinho para que o médico possa nebulizar. Não espere, ok? A receita da bombinha está vencida?', created_at: new Date(Date.now() - 7000000).toISOString(), status: 'read' },
    { session_id: sJoao.id, sender_type: 'patient', content: 'Vou levar agora. Muito obrigado por me responder rápido!', created_at: new Date(Date.now() - 10000).toISOString() }, // Acabou de mandar (Unread)

    // Chat da Lúcia (Escalado para ACS com arquivo)
    { session_id: sLucia.id, sender_type: 'patient', content: 'Boa tarde. Tem como ver a data do meu ultrassom morfológico?', created_at: new Date(Date.now() - 86400000).toISOString() },
    { session_id: sLucia.id, sender_type: 'bot', content: 'Olá Lúcia! Um momento que vou transferir para um profissional confirmar na agenda do sistema.', created_at: new Date(Date.now() - 86000000).toISOString() },
    { session_id: sLucia.id, sender_type: 'acs', content: 'Boa tarde, Lúcia! Segue a guia do seu ultrassom. Está marcado para amanhã às 08h na clínica conveniada.', media_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', media_name: 'guia-ultrassom-lucia.pdf', media_type: 'application/pdf', created_at: new Date(Date.now() - 85000000).toISOString(), status: 'delivered' }
  ];

  const { error: mError } = await supabase.from('messages').insert(messagesToInsert);
  
  if (mError) {
    console.error('Erro ao inserir mensagens:', mError);
    return;
  }

  console.log('Seed finalizado com sucesso! A apresentação está pronta.');
}

seed();
