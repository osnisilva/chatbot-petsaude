const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
    console.log('Aplicando migração SQL...');
    
    // Como o cliente JS não tem um método direto para rodar SQL puro de forma arbitrária 
    // (normalmente se usa o dashboard ou RPC), vamos tentar via RPC se houver uma função auxiliar
    // Caso contrário, informaremos que o arquivo SQL foi criado para execução manual ou via CLI.
    
    // Alternativa: Se o ambiente tiver o Supabase CLI, poderíamos tentar.
    // Mas aqui vamos assumir que as colunas precisam ser criadas.
    
    const sql = `
    ALTER TABLE public.scheduled_messages 
        ADD COLUMN IF NOT EXISTS is_random BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE public.scheduled_messages 
        ALTER COLUMN template_id DROP NOT NULL;
    `;

    console.log('Script SQL criado em supabase/add_random_support.sql');
    console.log('IMPORTANTE: Verifique se as colunas já existem ou execute o arquivo no SQL Editor do Supabase.');
    
    // Teste de conexão/leitura para ver se já existem
    const { data, error } = await supabase.from('scheduled_messages').select('*').limit(1);
    if (error) {
        console.error('Erro ao acessar tabela:', error.message);
    } else {
        console.log('Conexão com Supabase OK.');
    }
}

applyMigration();
