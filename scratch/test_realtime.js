const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('Listening for messages...');
supabase.channel('test_channel')
    .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
    }, (payload) => {
        console.log('REALTIME WORKED!', payload);
    })
    .subscribe(async (status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
            console.log('Subscribed! Inserting test message...');
            // Inserir mensagem para disparar o webhook
            const { error } = await supabase.from('messages').insert({
                session_id: 'e6962fdb-3474-4b53-bfa2-31d7b32c7423', // fake session ID, probably will fail FK constraint, let's just insert something
                sender_type: 'bot',
                content: 'test realtime'
            });
            if (error) {
                console.log('Insert failed (probably FK), trying to insert with valid session...', error.message);
                const {data} = await supabase.from('chat_sessions').select('id').limit(1).single();
                if (data) {
                    await supabase.from('messages').insert({
                        session_id: data.id,
                        sender_type: 'bot',
                        content: 'test realtime'
                    });
                    console.log('Insert successful!');
                }
            } else {
                 console.log('Insert successful!');
            }
        }
    });

setTimeout(() => {
    console.log('Timeout. Exiting...');
    process.exit(0);
}, 8000);
