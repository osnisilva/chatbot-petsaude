
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debug() {
    const { data: patients } = await supabase
        .from('patients')
        .select('id, name, comorbidities');
    
    console.log('Todos os pacientes e comorbidades:');
    if (patients) {
        patients.forEach(p => {
            console.log(`- ${p.name}: [${p.comorbidities ? p.comorbidities.join(', ') : 'nenhuma'}]`);
        });
    } else {
        console.log('Nenhum paciente encontrado ou erro na busca.');
    }
}

debug();
