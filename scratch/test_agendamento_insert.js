
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testInsert() {
    // 1. Pega dados do Gestor Principal
    const { data: acs } = await supabase.from('acs').select('id, name').eq('name', 'Gestor Principal').single();
    
    // 2. Pega Maria Oliveira (tem comorbidades)
    const { data: patient } = await supabase.from('patients').select('id, name').eq('name', 'Maria Oliveira').single();
    
    // 3. Pega um template
    const { data: template } = await supabase.from('health_templates').select('id, title').limit(1).single();

    console.log(`Inserindo agendamento para ${patient.name} com template ${template.title} via ACS ${acs.name}`);

    const { data, error } = await supabase.from('scheduled_messages').insert({
        acs_id: acs.id,
        patient_id: patient.id,
        template_id: template.id,
        frequency: 'diario',
        next_run_at: new Date().toISOString(),
        status: 'active'
    }).select();

    if (error) {
        console.error('Erro na inserção:', error);
    } else {
        console.log('Inserção bem-sucedida:', data);
    }
}

testInsert();
