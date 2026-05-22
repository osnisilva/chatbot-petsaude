const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Osni/Desktop/chatbot-petsaude/.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    try {
        // 1. Verificar a estrutura e os dados de comorbidades da tabela de pacientes
        const { data: patients, error: pError } = await supabase
            .from('patients')
            .select('id, name, comorbidities, ubs_id')
            .limit(10);
        
        if (pError) {
            console.error('Erro ao buscar pacientes:', pError.message);
            return;
        }

        console.log('=== PACIENTES E SUAS COMORBIDADES ===');
        patients.forEach(p => {
            console.log(`Nome: ${p.name}`);
            console.log(`UBS ID: ${p.ubs_id}`);
            console.log(`Comorbidades (tipo: ${typeof p.comorbidities}, valor):`, p.comorbidities);
            console.log('---------------------------');
        });

        // 2. Verificar os ACS cadastrados e qual ubs_id eles usam
        const { data: acsList, error: aError } = await supabase
            .from('acs')
            .select('id, name, ubs_id, role')
            .limit(5);

        if (aError) {
            console.error('Erro ao buscar ACS:', aError.message);
            return;
        }

        console.log('=== AGENTES DE SAÚDE (ACS) ===');
        acsList.forEach(a => {
            console.log(`ACS: ${a.name} | Role: ${a.role} | UBS ID: ${a.ubs_id}`);
        });

    } catch (e) {
        console.error('Erro:', e);
    }
}

run();
