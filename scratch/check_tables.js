const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    try {
        const { data, error } = await supabase
            .from('patient_groups')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('Erro ao ler patient_groups (provavelmente não existe):', error.message);
        } else {
            console.log('Tabela patient_groups existe! Registros:', data);
        }

        const { data: members, error: membersError } = await supabase
            .from('patient_group_members')
            .select('*')
            .limit(1);

        if (membersError) {
            console.log('Erro ao ler patient_group_members (provavelmente não existe):', membersError.message);
        } else {
            console.log('Tabela patient_group_members existe! Registros:', members);
        }

        const { data: columns, error: colError } = await supabase
            .from('scheduled_messages')
            .select('group_id')
            .limit(1);

        if (colError) {
            console.log('Erro ao ler coluna group_id na tabela scheduled_messages:', colError.message);
        } else {
            console.log('Coluna group_id na tabela scheduled_messages existe!');
        }
    } catch (e) {
        console.error('Erro de conexão/execução:', e);
    }
}

check();
