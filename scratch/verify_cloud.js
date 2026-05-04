const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifySupabase() {
  console.log('--- Verificando Supabase Cloud ---');
  
  const tables = ['ubs', 'acs', 'patients', 'chat_sessions', 'messages', 'health_templates', 'scheduled_messages'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Tabela '${table}': Não encontrada ou erro (${error.message})`);
    } else {
      console.log(`✅ Tabela '${table}': Existe.`);
    }
  }
}

verifySupabase();
