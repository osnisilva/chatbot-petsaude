const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Osni/Desktop/chatbot-petsaude/.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    try {
        const { data: patients, error } = await supabase
            .from('patients')
            .select('id, name, comorbidities, ubs_id')
            .eq('ubs_id', '555d8e1d-e39d-4876-a7c6-c3dd866f4f00');
        
        if (error) {
            console.error(error);
            return;
        }

        console.log('Pacientes da UBS Secretaria de Saúde:');
        patients.forEach(p => {
            console.log(`Nome: ${p.name} | Comorbidades:`, p.comorbidities);
        });

    } catch (e) {
        console.error(e);
    }
}

run();
