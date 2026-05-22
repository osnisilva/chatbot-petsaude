const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: cacaria } = await supabase.from('ubs').select('id, name').ilike('name', '%cacaria%').single();
  console.log('UBS Cacaria:', cacaria);

  const { data: acs } = await supabase.from('acs').select('id, name, ubs_id, role, ubs:ubs_id(name)').ilike('name', '%osni%');
  console.log('ACS Osni:', acs);
  
  const { data: grupos } = await supabase.from('patient_groups').select('id, name, ubs_id');
  console.log('Grupos criados:', grupos);
}
check();
