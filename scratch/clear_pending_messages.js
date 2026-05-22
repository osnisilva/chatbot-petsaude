require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearPending() {
    console.log("Limpando mensagens presas na fila do bot...");
    
    // Atualiza mensagens que estão aguardando envio do ACS
    const { data, error } = await supabase
        .from('messages')
        .update({ 
            whatsapp_message_id: 'CANCELED_BEFORE_QR',
            status: 'failed'
        })
        .eq('sender_type', 'acs')
        .is('whatsapp_message_id', null);

    if (error) {
        console.error("Erro ao limpar mensagens:", error);
    } else {
        console.log("Mensagens pendentes canceladas com sucesso!");
    }
}

clearPending();
