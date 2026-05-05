const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecentMedia() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .not('media_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('Mensagens recentes com mídia:', data);
  }
}

checkRecentMedia();
