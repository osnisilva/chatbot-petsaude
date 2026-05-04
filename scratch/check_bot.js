const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBotActivity() {
  console.log('--- Verificando Atividade do Bot no Supabase ---');
  
  const { data, error } = await supabase
    .from('messages')
    .select('created_at, sender_type')
    .eq('sender_type', 'bot')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Erro ao buscar mensagens:', error.message);
    return;
  }

  if (data && data.length > 0) {
    const lastMsg = new Date(data[0].created_at);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastMsg) / (1000 * 60));
    
    console.log(`Última mensagem enviada pelo bot: ${data[0].created_at}`);
    console.log(`Tempo decorrido: ${diffMinutes} minutos.`);
    
    if (diffMinutes < 60) {
      console.log('✅ O bot parece estar ativo e respondendo (Google Cloud OK).');
    } else {
      console.log('⚠️ O bot não envia mensagens há mais de uma hora. Verifique a VPS.');
    }
  } else {
    console.log('ℹ️ Nenhuma mensagem do bot encontrada no histórico.');
  }
}

checkBotActivity();
