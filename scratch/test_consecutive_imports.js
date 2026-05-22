const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Osni/Desktop/chatbot-petsaude/.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper de normalização
const normalize = (str) => 
  str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function run() {
    try {
        // Criar um grupo temporário para teste
        const testUbsId = 'd1c3d384-7edc-4a67-afc1-b0e6466d4321'; // UBS Cacaria
        const { data: testGroup, error: tgError } = await supabase
            .from('patient_groups')
            .insert({
                name: 'Grupo Teste Comorbidades Consecutivas',
                description: 'Testando importação acumulada',
                ubs_id: testUbsId
            })
            .select()
            .single();
        
        if (tgError) {
            console.error('Erro ao criar grupo de teste:', tgError);
            return;
        }

        const groupId = testGroup.id;
        console.log(`Grupo de teste criado: ID = ${groupId}`);

        // Função interna para simular a importação por comorbidade
        async function simulateImport(comorbidityName) {
            console.log(`\n--- Simulando importação para comorbidade: "${comorbidityName}" ---`);
            const { data: patients, error: patientsError } = await supabase
                .from('patients')
                .select('id, name, comorbidities')
                .eq('ubs_id', testUbsId);
            
            if (patientsError) throw patientsError;

            const normalizedSearch = normalize(comorbidityName);
            const matchedPatients = patients.filter((p) => {
                if (!p.comorbidities || !Array.isArray(p.comorbidities)) return false;
                return p.comorbidities.some((c) => {
                    if (!c) return false;
                    return normalize(c).includes(normalizedSearch);
                });
            });

            console.log(`Pacientes correspondentes encontrados (${matchedPatients.length}):`, matchedPatients.map(p => p.name));

            if (matchedPatients.length === 0) return 0;

            const inserts = matchedPatients.map((p) => ({
                group_id: groupId,
                patient_id: p.id
            }));

            const { error: insertError } = await supabase
                .from('patient_group_members')
                .upsert(inserts, { onConflict: 'group_id,patient_id', ignoreDuplicates: true });

            if (insertError) throw insertError;
            return matchedPatients.length;
        }

        // Função para listar os membros atuais do grupo
        async function logGroupMembers() {
            const { data: members, error: mError } = await supabase
                .from('patient_group_members')
                .select('patient:patient_id(name, comorbidities)')
                .eq('group_id', groupId);
            
            if (mError) throw mError;
            console.log(`Membros atuais no grupo (${members.length}):`);
            members.forEach(m => {
                if (m.patient) {
                    console.log(`  - ${m.patient.name} | Comorbidades: ${m.patient.comorbidities}`);
                }
            });
        }

        // 1. Log inicial (vazio)
        await logGroupMembers();

        // 2. Importar Hipertensão
        await simulateImport('Hipertensão');
        await logGroupMembers();

        // 3. Importar Asma
        await simulateImport('Asma');
        await logGroupMembers();

        // 4. Limpar o grupo de teste para não poluir
        console.log('\nLimpando grupo de teste...');
        await supabase.from('patient_groups').delete().eq('id', groupId);
        console.log('Limpeza concluída!');

    } catch (e) {
        console.error('Erro durante o teste:', e);
    }
}

run();
