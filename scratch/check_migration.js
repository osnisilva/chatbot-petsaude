const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
  console.log('Iniciando migração de banco de dados...');
  
  // Como o SDK JS não tem comando direto de SQL DDL,
  // vamos tentar verificar se a coluna já existe via query.
  const { data: columns, error: colError } = await supabase
    .from('acs')
    .select('*')
    .limit(1);

  if (colError) {
    console.error('Erro ao acessar tabela acs:', colError.message);
    return;
  }

  const hasRoleColumn = columns && columns[0] && 'role' in columns[0];

  if (!hasRoleColumn) {
    console.log('AVISO: A coluna "role" não pôde ser detectada ou não existe.');
    console.log('IMPORTANTE: Como o SDK do Supabase não permite comandos ALTER TABLE diretamente por segurança,');
    console.log('você deve copiar o SQL que forneci anteriormente e colar no "SQL Editor" do Supabase.');
  } else {
    console.log('Coluna "role" detectada.');
  }
}

migrate();
