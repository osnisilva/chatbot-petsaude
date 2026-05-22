const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    try {
        // 1. Procurar o ACS
        let { data: acs } = await supabase
            .from('acs')
            .select('id, name, ubs_id')
            .ilike('name', '%Osni%')
            .limit(1)
            .maybeSingle();

        if (!acs) {
            console.log('ACS "Osni" não encontrado. Criando um ACS "Osni" de teste...');
            // Pegar uma UBS qualquer
            const { data: ubs } = await supabase.from('ubs').select('id').limit(1).single();
            
            const { data: newAcs, error } = await supabase.from('acs').insert({
                name: 'Osni',
                phone_number: '550000000000',
                cns: '000000000000000',
                ubs_id: ubs.id,
                role: 'acs'
            }).select().single();
            
            if (error) throw error;
            acs = newAcs;
            console.log('ACS "Osni" criado com ID:', acs.id);
        } else {
            console.log('ACS encontrado:', acs.name);
        }

        const phone = '5524992513388';

        // 2. Criar ou atualizar o paciente
        const { data: existingPatient } = await supabase
            .from('patients')
            .select('id')
            .eq('phone_number', phone)
            .maybeSingle();

        if (existingPatient) {
            console.log('Paciente já existe, atualizando...');
            const { error } = await supabase.from('patients').update({
                name: 'Osni Augusto Souza da Silva',
                acs_id: acs.id,
                ubs_id: acs.ubs_id,
                comorbidities: ['Hipertensão', 'Obesidade'],
                lgpd_consent: null
            }).eq('id', existingPatient.id);
            if (error) throw error;
            console.log('Paciente atualizado com sucesso!');
        } else {
            console.log('Inserindo novo paciente...');
            const { error } = await supabase.from('patients').insert({
                phone_number: phone,
                name: 'Osni Augusto Souza da Silva',
                acs_id: acs.id,
                ubs_id: acs.ubs_id,
                comorbidities: ['Hipertensão', 'Obesidade'],
                lgpd_consent: null
            });
            if (error) throw error;
            console.log('Paciente cadastrado com sucesso!');
        }

    } catch (err) {
        console.error('Erro:', err);
    }
}

run();
