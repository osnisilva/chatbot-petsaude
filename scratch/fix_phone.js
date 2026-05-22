const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Pegar o paciente existente para copiar ubs e acs
    const { data: p } = await supabase.from('patients').select('*').eq('phone_number', '5524992513388').single();
    if (p) {
        // WhatsApp API para DDD <= 27 tira o 9. Inserir a versão sem o 9 extra.
        const altPhone = '552492513388'; 
        const { error } = await supabase.from('patients').insert({
            phone_number: altPhone,
            name: p.name,
            acs_id: p.acs_id,
            ubs_id: p.ubs_id,
            comorbidities: p.comorbidities,
            lgpd_consent: null
        });
        if (!error) console.log('Telefone alternativo (sem o 9) inserido com sucesso!');
        else console.log('Erro ou já inserido:', error.message);
    }
}
run();
