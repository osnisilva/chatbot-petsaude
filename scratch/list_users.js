const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listAllUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }
  console.log('Usuários no sistema:', users.map(u => ({ id: u.id, email: u.email })));
  
  const { data: acs } = await supabase.from('acs').select('auth_user_id, name');
  console.log('Vínculos ACS atuais:', acs);
}

listAllUsers();
