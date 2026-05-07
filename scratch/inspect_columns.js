const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspect() {
  const { data, error } = await supabase.from('acs').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log('Colunas encontradas:', Object.keys(data[0] || {}));
    console.log('Exemplo de dado:', data[0]);
  }
}

inspect();
