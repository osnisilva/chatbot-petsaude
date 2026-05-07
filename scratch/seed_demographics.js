const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedDemographics() {
  console.log('Populando dados demográficos fictícios...');

  const { data: patients } = await supabase.from('patients').select('id');

  if (!patients) return;

  const genders = ['M', 'F'];
  const years = [1950, 1960, 1970, 1980, 1990, 2000, 2010];

  for (const p of patients) {
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const year = years[Math.floor(Math.random() * years.length)];
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    const birth = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    await supabase.from('patients').update({ gender, birth_date: birth }).eq('id', p.id);
  }

  console.log('Dados demográficos atualizados!');
}

seedDemographics();
