const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Osni/Desktop/chatbot-petsaude/.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    try {
        const { data: counts, error } = await supabase
            .from('patients')
            .select('ubs_id, name');
        
        if (error) {
            console.error(error);
            return;
        }

        const stats = {};
        counts.forEach(p => {
            stats[p.ubs_id] = (stats[p.ubs_id] || 0) + 1;
        });

        console.log('Pacientes por UBS ID:', stats);

        const { data: ubsList } = await supabase.from('ubs').select('id, name');
        console.log('UBSs existentes:', ubsList);

    } catch (e) {
        console.error(e);
    }
}

run();
