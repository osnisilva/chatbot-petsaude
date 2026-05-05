const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupStorage() {
  console.log('Tentando criar o bucket "chat-media"...');
  const { data, error } = await supabase.storage.createBucket('chat-media', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('O bucket "chat-media" já existe.');
    } else {
      console.error('Erro ao criar bucket:', error.message);
    }
  } else {
    console.log('Bucket "chat-media" criado com sucesso!');
  }
}

setupStorage();
