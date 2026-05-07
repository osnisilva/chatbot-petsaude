const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedAcs() {
  console.log('Criando ACS fictícios...');

  // Pegar a primeira UBS encontrada
  const { data: ubs } = await supabase.from('ubs').select('id').limit(1).single();
  
  if (!ubs) {
    console.log('Nenhuma UBS encontrada.');
    return;
  }

  const fakeAcs = [
    { name: 'Ana Souza', phone_number: '5524991111111', cns: '111111111111111', ubs_id: ubs.id, microarea: '01', role: 'acs' },
    { name: 'Carlos Oliveira', phone_number: '5524992222222', cns: '222222222222222', ubs_id: ubs.id, microarea: '02', role: 'acs' },
    { name: 'Beatriz Santos', phone_number: '5524993333333', cns: '333333333333333', ubs_id: ubs.id, microarea: '03', role: 'acs' }
  ];

  const { error } = await supabase.from('acs').insert(fakeAcs);

  if (error) console.error('Erro ao inserir ACS:', error);
  else console.log('ACS fictícios criados com sucesso!');
}

seedAcs();
