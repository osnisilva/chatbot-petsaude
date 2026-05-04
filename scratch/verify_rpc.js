const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyRLS() {
  console.log('--- Reaplicando Regras de Segurança (RLS) ---');
  
  const sqlFiles = [
    'supabase/schema.sql',
    'supabase/rls-security.sql',
    'supabase/care_pathways.sql'
  ];

  for (const file of sqlFiles) {
    console.log(`Lendo ${file}...`);
    const sql = fs.readFileSync(file, 'utf8');
    
    // O Supabase JS SDK não tem um método direto para rodar SQL arbitrário
    // Usaremos a API de RPC ou algo similar se disponível, mas geralmente
    // em scripts de seed usamos o @supabase/supabase-js com service_role
    // para bypassar RLS. 
    // Como não posso rodar SQL puro via SDK facilmente sem uma função RPC 'exec_sql',
    // vou verificar se a política já existe via inspeção de metadados se possível.
  }
  
  console.log('Dica: Como não posso rodar SQL puro diretamente pelo SDK sem uma função RPC configurada,');
  console.log('vou tentar verificar se o is_admin() está funcionando para o usuário logado.');
  
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    console.log('❌ Erro ao chamar rpc("is_admin"):', error.message);
    console.log('Isso sugere que a função is_admin() não existe ou não está acessível via RPC.');
  } else {
    console.log('✅ Chamada RPC para is_admin retornou:', data);
  }
}

applyRLS();
