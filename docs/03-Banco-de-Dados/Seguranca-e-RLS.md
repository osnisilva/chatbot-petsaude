# Segurança e Row Level Security (RLS)

Sendo um sistema que lida com dados sensíveis de saúde, a privacidade e a segurança não são apenas recursos, mas requisitos legais (LGPD).

## 🛡️ O que é Row Level Security (RLS)?
O PostgreSQL permite criar políticas que definem quais linhas (rows) um usuário autenticado pode ver ou modificar. No ACS-Online, o RLS está habilitado em todas as tabelas (`ubs`, `acs`, `patients`, `chat_sessions`, `messages`).

## 👥 Políticas por Nível de Acesso

### Agente Comunitário (ACS)
- **Leitura:** O agente só pode realizar `SELECT` em pacientes onde `patients.acs_id` for igual ao seu próprio ID (descobrir ID via `auth.uid()`). Ele não consegue ver pacientes de outros agentes.
- **Mensagens:** Só pode ler/escrever mensagens em sessões atreladas aos seus pacientes.

### Gerente da UBS
- **Leitura:** Pode ler dados de todos os pacientes onde `patients.ubs_id` for igual ao ID da sua UBS. 
- **Restrição:** Não tem acesso a pacientes de outras UBS da cidade.

### Administrador / Secretaria de Saúde (`admin_ti`)
- **Leitura Global:** Possui bypass das regras restritivas, podendo visualizar dados agregados de toda a rede para fins estatísticos e de controle gerencial.

## 🤖 Acesso do Bot e Rotas de Sistema
Para que o Bot (via Node.js) possa ler e escrever livremente no banco de dados para enviar e receber mensagens, ele utiliza a `SERVICE_ROLE` key do Supabase. Essa chave ignora as políticas de RLS e só deve ser mantida de forma segura no `.env.local` do servidor backend, nunca exposta ao frontend (Next.js).

---
**Links Relacionados:** [[Esquema]], [[Perfis-de-Acesso]]
**Tags:** #banco-de-dados #seguranca #rls #lgpd #supabase
