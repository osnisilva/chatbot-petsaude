
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debug() {
    const { data: acs } = await supabase
        .from('acs')
        .select('*, ubs:ubs_id(name)')
        .eq('name', 'Gestor Principal')
        .single();
    
    console.log('ACS Gestor Principal:', acs);

    const { data: patients } = await supabase
        .from('patients')
        .select('id, name, comorbidities, ubs_id')
        .eq('ubs_id', acs.ubs_id);
    
    console.log('Pacientes na mesma UBS:', patients.length);
    console.log('Pacientes com comorbidades:', patients.filter(p => p.comorbidities && p.comorbidities.length > 0).length);
}

debug();
