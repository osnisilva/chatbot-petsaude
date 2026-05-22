const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Osni/Desktop/chatbot-petsaude/.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    try {
        // Obter os membros atuais da tabela
        const { data: members, error } = await supabase
            .from('patient_group_members')
            .select('*');
        
        if (error) {
            console.error('Erro ao ler patient_group_members:', error);
            return;
        }

        console.log('Membros atuais na tabela:', members);

        // Tentar obter a lista de chaves primárias e constraints via query RPC se disponível, ou ver o comportamento
        // Vamos rodar uma query direta nas tabelas do sistema do postgres usando RPC ou apenas testar inserções duplicadas
        console.log('Testando inserção de duplicado...');
        if (members && members.length > 0) {
            const first = members[0];
            const { data, error: insertError } = await supabase
                .from('patient_group_members')
                .insert({
                    group_id: first.group_id,
                    patient_id: first.patient_id
                });
            console.log('Resultado da inserção duplicada:', data, 'Erro:', insertError ? insertError.message : 'Nenhum');
        }

    } catch (e) {
        console.error(e);
    }
}

run();
