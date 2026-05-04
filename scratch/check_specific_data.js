const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMyPatients() {
  const { data } = await supabase.from('patients').select('name, ubs_id').in('name', ['Maria Oliveira', 'José dos Santos', 'Ana Souza']);
  console.log('Meus Pacientes:', data);
  
  const { data: sessions } = await supabase.from('chat_sessions').select('id, status, patient_id').limit(10);
  console.log('Sessões de Chat:', sessions);
}

checkMyPatients();
