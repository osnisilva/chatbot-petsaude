const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('Listening for chat_sessions...');
supabase.channel('test_sessions')
    .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_sessions'
    }, (payload) => {
        console.log('REALTIME SESSIONS WORKED!', payload);
    })
    .subscribe(async (status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
            console.log('Subscribed! Inserting test session...');
            const { error } = await supabase.from('chat_sessions').insert({
                patient_id: '8c9a92df-a1e9-4303-97ef-8f87c6318ea0',
                status: 'active'
            });
            if (error) console.log(error);
        }
    });

setTimeout(() => process.exit(0), 8000);
