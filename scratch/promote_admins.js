const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function promote() {
  console.log('Buscando UBS Secretaria de Saúde...');
  const { data: ubs } = await supabase
    .from('ubs')
    .select('id')
    .eq('name', 'Secretaria de Saúde')
    .single();

  if (ubs) {
    console.log(`UBS encontrada: ${ubs.id}. Atualizando usuários...`);
    const { error } = await supabase
      .from('acs')
      .update({ role: 'admin_ti' })
      .eq('ubs_id', ubs.id);

    if (error) console.error('Erro ao atualizar:', error);
    else console.log('Usuários da Secretaria promovidos para admin_ti com sucesso!');
  } else {
    console.log('UBS Secretaria de Saúde não encontrada pelo nome exato.');
  }
}

promote();
