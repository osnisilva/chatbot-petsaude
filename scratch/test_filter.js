const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('Listening with filter...');
supabase.channel('test_filter')
    .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: "sender_type=eq.acs"
    }, (payload) => {
        console.log('FILTER WORKED!', payload);
    })
    .subscribe(async (status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
            const {data} = await supabase.from('chat_sessions').select('id').limit(1).single();
            if (data) {
                await supabase.from('messages').insert({
                    session_id: data.id,
                    sender_type: 'acs',
                    content: 'test filter'
                });
            }
        }
    });

setTimeout(() => process.exit(0), 8000);
