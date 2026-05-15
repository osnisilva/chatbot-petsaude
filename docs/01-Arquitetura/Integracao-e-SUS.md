# 🔌 Integração e-SUS (Prontidão e Arquitetura)

Este documento descreve o estado atual da integração entre o ACS-Online e o sistema e-SUS do município, bem como a arquitetura necessária para torná-la totalmente automatizada.

## 1. Estado Atual (Mock / Intermediário)

Atualmente, o sistema **não realiza consultas diretas** no banco PostgreSQL do e-SUS municipal (PEC/Centralizador). Em vez disso, o ACS-Online funciona com uma tabela espelho no Supabase (`patients`), que possui as seguintes características:

- **Campos Mapeados:** `cns_masked` (Cartão Nacional de Saúde), `birth_date` e `comorbidities` (adicionado recentemente).
- **Alimentação de Dados:** O bot e o dashboard operam assumindo que a tabela `patients` já contém os registros. Se o paciente não for encontrado pelo WhatsApp, o bot orienta a ida presencial à UBS.

## 2. Lacunas e Necessidades Técnicas

Para que a integração se torne "Pronta para Produção", as seguintes etapas são essenciais:

1. **Acesso à Rede Municipal:** O e-SUS normalmente roda em servidores locais ou nuvens governamentais restritas. Será necessário acesso VPN, liberação de IP ou uma API Gateway.
2. **Desenvolvimento de um Job ETL (Extract, Transform, Load):**
   - Um script (Node.js ou Python) que roda periodicamente (ex: diariamente de madrugada).
   - Conecta no banco PostgreSQL do e-SUS.
   - Extrai novos pacientes e atualizações de condições clínicas (comorbidades).
   - Realiza *Upsert* (Insert/Update) na tabela `patients` do Supabase via API ou conexão direta.

## 3. Mapeamento de Dados Sugerido

| e-SUS (Tabela de Cidadão) | Supabase (`patients`) | Descrição |
| :--- | :--- | :--- |
| `no_cidadao` | `name` | Nome completo do paciente. |
| `nu_telefone_celular` | `phone_number` | Limpo e formatado com DDI (55). |
| `nu_cns` | `cns_masked` | Ofuscado por segurança (LGPD). |
| `dt_nascimento` | `birth_date` | Utilizado para cálculos na triagem. |
| `condicoes_clinicas` | `comorbidities` | Array de texto (ex: `['Diabetes', 'Hipertensão']`). |

## 4. Considerações de Segurança (LGPD)

- **Minimização de Dados:** Apenas os dados estritamente necessários para triagem e notificação são espelhados no Supabase. O prontuário clínico (evoluções médicas) **não deve** ser importado.
- **Consentimento:** O campo `lgpd_consent` é gerenciado exclusivamente pelo ACS-Online no momento do primeiro contato via WhatsApp, não dependendo do e-SUS.

---
**Tags:** #arquitetura #e-sus #integração #banco-de-dados
