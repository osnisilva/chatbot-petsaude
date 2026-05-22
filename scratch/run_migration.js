const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log('Verificando se a tabela scheduled_messages já possui as novas colunas...');
    
    // Tenta ler as novas colunas
    const { data, error } = await supabase
        .from('scheduled_messages')
        .select('id, custom_title, custom_content, frequency')
        .limit(1);

    if (error) {
        console.log('As novas colunas NÃO foram detectadas ou ocorreu um erro:', error.message);
        console.log('\nPor favor, execute o conteúdo do arquivo abaixo no SQL Editor do seu Supabase Dashboard:');
        console.log(path.resolve(__dirname, '../supabase/migrations/20260522_add_campaign_features.sql'));
        console.log('\nConteúdo do SQL:\n');
        
        try {
            const sqlContent = fs.readFileSync(
                path.resolve(__dirname, '../supabase/migrations/20260522_add_campaign_features.sql'),
                'utf8'
            );
            console.log(sqlContent);
        } catch (readErr) {
            console.error('Erro ao ler o arquivo SQL:', readErr.message);
        }
    } else {
        console.log('✅ Sucesso! As colunas custom_title e custom_content já existem no banco de dados.');
        console.log('Registros de teste:', data);
    }
}

run();
