const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRpc() {
    const sql = `
    ALTER TABLE public.scheduled_messages 
    ADD COLUMN IF NOT EXISTS custom_title TEXT,
    ADD COLUMN IF NOT EXISTS custom_content TEXT;
    
    ALTER TABLE public.scheduled_messages DROP CONSTRAINT IF EXISTS scheduled_messages_frequency_check;
    
    ALTER TABLE public.scheduled_messages 
    ADD CONSTRAINT scheduled_messages_frequency_check 
    CHECK (frequency IN ('diario', 'semanal', 'quinzenal', 'mensal', 'unica'));
    
    ALTER TABLE public.scheduled_messages DROP CONSTRAINT IF EXISTS check_message_source;
    
    ALTER TABLE public.scheduled_messages
    ADD CONSTRAINT check_message_source
    CHECK (
        (template_id IS NOT NULL AND custom_content IS NULL AND NOT is_random) OR
        (is_random AND category IS NOT NULL AND template_id IS NULL AND custom_content IS NULL) OR
        (template_id IS NULL AND custom_content IS NOT NULL AND NOT is_random)
    );
    `;

    console.log('Tentando rodar SQL via RPC...');
    
    // Tenta diferentes nomes comuns para RPCs de SQL se existirem
    const rpcs = ['exec_sql', 'execute_sql', 'run_sql', 'sql'];
    let success = false;
    
    for (const rpcName of rpcs) {
        try {
            const { data, error } = await supabase.rpc(rpcName, { query: sql, sql: sql, sql_query: sql });
            if (!error) {
                console.log(`✅ Sucesso usando RPC: ${rpcName}!`);
                success = true;
                break;
            } else {
                console.log(`❌ RPC ${rpcName} retornou erro: ${error.message}`);
            }
        } catch (e) {
            console.log(`❌ Falha ao chamar RPC ${rpcName}:`, e.message);
        }
    }
    
    if (!success) {
        console.log('\nNenhuma RPC de SQL disponível ou sem permissões.');
    }
}

testRpc();
