const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Osni/Desktop/chatbot-petsaude/.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    try {
        // 1. Ver todos os pacientes e suas comorbidades
        const { data: patients, error: pError } = await supabase
            .from('patients')
            .select('id, name, comorbidities, ubs_id');
        
        if (pError) {
            console.error('Erro ao buscar pacientes:', pError);
            return;
        }
        
        console.log('Pacientes e suas comorbidades:');
        patients.forEach(p => {
            console.log(`- ${p.name} (UBS: ${p.ubs_id}):`, p.comorbidities);
        });

        // 2. Ver grupos existentes
        const { data: groups, error: gError } = await supabase
            .from('patient_groups')
            .select('id, name, ubs_id');
        
        if (gError) {
            console.error('Erro ao buscar grupos:', gError);
            return;
        }

        console.log('\nGrupos cadastrados:');
        groups.forEach(g => {
            console.log(`- ${g.name} (ID: ${g.id}, UBS: ${g.ubs_id})`);
        });

        // 3. Ver membros de cada grupo
        const { data: members, error: mError } = await supabase
            .from('patient_group_members')
            .select('group_id, patient_id');
        
        if (mError) {
            console.error('Erro ao buscar membros:', mError);
            return;
        }

        console.log('\nMembros por grupo:');
        groups.forEach(g => {
            const groupMembers = members.filter(m => m.group_id === g.id);
            console.log(`Grupo "${g.name}" possui ${groupMembers.length} membros:`);
            groupMembers.forEach(m => {
                const pat = patients.find(p => p.id === m.patient_id);
                console.log(`  * ${pat ? pat.name : m.patient_id} (Comorbidades: ${pat ? pat.comorbidities : 'N/A'})`);
            });
        });

    } catch (e) {
        console.error(e);
    }
}

run();
