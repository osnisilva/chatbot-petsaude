# Esquema do Banco de Dados

O ACS-Online utiliza o PostgreSQL (através do Supabase). Abaixo estão as tabelas principais e seus propósitos:

## 🏥 Tabelas de Organização
- `ubs` (Unidades Básicas de Saúde): Armazena as unidades (`id`, `name`, `cnes`).
- `acs` (Agentes Comunitários / Equipe): Representa os profissionais. Possui chave estrangeira para `ubs` e uma coluna `role` (`acs`, `gerente`, `admin_ti`). Possui vínculo opcional com a tabela de autenticação (`auth_user_id`).

## 🧑‍⚕️ Tabela de Pacientes
- `patients`: Tabela que atua como **espelho do banco e-SUS**. Dados minimizados do paciente (foco em mensageria, não em prontuário eletrônico completo). 
  - Colunas chave: `phone_number`, `name`, `cns_masked` (Cartão SUS ofuscado), `birth_date` (Data de Nascimento).
  - Controle e Saúde: `comorbidities` (Array de comorbidades para triagem da IA), `lgpd_consent` (Consentimento do bot).
  - Relacionamentos: `acs_id` e `ubs_id`.

## 💬 Tabelas de Comunicação
- `chat_sessions`: Agrupa mensagens em sessões ativas, resolvidas ou escaladas. Vinculada a um paciente (`patient_id`).
- `messages`: Armazena o histórico do chat.
  - Colunas chave: `sender_type` ('patient', 'bot', 'acs'), `content`, `status` ('sent', 'delivered', 'read', 'failed'), `is_deleted` (booleano para *soft delete*).
  - Colunas de Mídia: `media_url`, `media_type`, `media_name`.

## Relacionamentos Principais
- Um paciente pertence a uma UBS e é acompanhado por um ACS.
- Uma Sessão de Chat pertence a um Paciente.
- Uma Mensagem pertence a uma Sessão de Chat.

---
**Links Relacionados:** [[Backend]], [[Seguranca-e-RLS]]
**Tags:** #banco-de-dados #esquema #sql #tabelas
