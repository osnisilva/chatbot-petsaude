const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRLSFunctions() {
  console.log('--- Testando Funções Helper do Supabase ---');
  
  const { data: acs } = await supabase.from('acs').select('auth_user_id, ubs_id').not('auth_user_id', 'is', null).limit(1).single();
  
  if (acs) {
      console.log(`Testando para o usuário: ${acs.auth_user_id}`);
      
      // Tentando simular o usuário logado para o teste (não é possível via RPC normal sem o token do usuário)
      // Mas posso checar a lógica da função SQL diretamente.
      
      const { data: ubsId } = await supabase.rpc('get_user_ubs_id');
      console.log('Resultado rpc("get_user_ubs_id"):', ubsId);
  }
}

testRLSFunctions();
