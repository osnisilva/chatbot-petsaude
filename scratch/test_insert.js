
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// We simulate the user session by using the service role first to get the IDs, 
// but we want to check if the RLS would allow it.
// Actually, let's just check the data integrity.

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
    const { data: acs } = await supabase.from('acs').select('id, name, ubs_id').eq('name', 'Gestor Principal').single();
    console.log('ACS:', acs);

    const { data: templates } = await supabase.from('health_templates').select('id, title');
    console.log('Templates:', templates);

    const { data: patients } = await supabase.from('patients').select('id, name, comorbidities').not('comorbidities', 'eq', '{}');
    console.log('Pacientes com comorbidades:', patients);

    if (patients.length > 0 && templates.length > 0) {
        const p = patients[0];
        const t = templates[0];
        
        console.log(`Tentando simular inserção para paciente ${p.name} e template ${t.title}`);
        
        // This script uses SERVICE_ROLE, so it will always succeed.
        // We need to know why the USER is having trouble.
    }
}

checkData();
