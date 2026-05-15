# Perfis de Acesso

O ACS-Online utiliza Role-Based Access Control (RBAC) para garantir que cada profissional acesse apenas o que é da sua competência.

## 👤 Agente Comunitário de Saúde (ACS)
- **Papel na Tabela:** `role = 'acs'`
- **Permissões:**
  - Pode fazer login no painel administrativo.
  - Vê apenas a lista de pacientes atribuídos à sua microárea (`acs_id`).
  - Pode disparar e configurar Trilhas de Cuidado para os seus pacientes.
  - Acessa o painel de Mensageria para conversar e enviar arquivos.
  - Pode editar ou apagar (soft delete) mensagens que ele mesmo enviou.
- **Proibições:** Não pode ver pacientes de outros agentes, não pode alterar dados da UBS, não visualiza o dashboard gerencial completo.

## 🏢 Gerente da Unidade (Gerente)
- **Papel na Tabela:** `role = 'gerente'`
- **Permissões:**
  - Vê todos os pacientes vinculados à sua Unidade Básica de Saúde (`ubs_id`).
  - Acessa o Dashboard com métricas agregadas da UBS (volume de pacientes, mensagens enviadas vs. recebidas pela unidade).
  - Visualiza a agenda e o trabalho de todos os ACS vinculados à sua UBS.
- **Proibições:** Não pode criar perfis de ACS (isso é tarefa da Secretaria) e não tem visão macro da rede de saúde (outras unidades).

## 👑 Administrador / Secretaria de Saúde (`admin_ti`)
- **Papel na Tabela:** `role = 'admin_ti'`
- **Permissões:**
  - **CRUD Completo:** Pode criar, editar e excluir (desativar) perfis de todos os profissionais (ACS e Gerentes).
  - **Visão Global:** O Dashboard exibe gráficos consolidados de toda a rede de saúde do município, com capacidade de filtrar por UBS específica.
  - **Auditoria:** Pode visualizar logs e mensagens com status `is_deleted = TRUE` (Soft Delete) para garantir transparência.
- **Proibições:** Restrições aplicadas apenas via código a nível de banco de dados por segurança mestre.

---
**Links Relacionados:** [[Seguranca-e-RLS]], [[Painel-Dashboard]]
**Tags:** #manual #perfis #rbac #permissoes
