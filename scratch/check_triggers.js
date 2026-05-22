const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Osni/Desktop/chatbot-petsaude/.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    try {
        const { data, error } = await supabase.rpc('get_triggers_if_any');
        if (error) {
            console.log('Tentando ler triggers via SQL genérico...');
            // Como não temos RPC customizado 'get_triggers_if_any', vamos rodar uma query direta via query do Postgres se possível.
            // Mas o supabase-js não permite queries SQL arbitrárias a menos que tenhamos uma RPC de execução.
            // Vamos ler a tabela de migrações ou criar uma RPC temporária para verificar triggers se for o caso.
            // Mas podemos também consultar a tabela pg_trigger usando uma query se tivermos uma RPC genérica ou verificar se no repositório local há migrations.
            console.log('Não há RPC de trigger direta. Mas podemos listar todas as migrations locais.');
        } else {
            console.log('Triggers:', data);
        }

        // Vamos ler as migrations locais para ver se há algum trigger declarado
        console.log('Fim do script de verificação.');
    } catch (e) {
        console.error(e);
    }
}

run();
