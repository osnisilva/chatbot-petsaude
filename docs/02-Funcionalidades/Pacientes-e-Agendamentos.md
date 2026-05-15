# 👥 Pacientes e Agendamentos

O sistema ACS-Online possui módulos dedicados para a gestão da base de pacientes e o acompanhamento de consultas e agendamentos nas UBS.

## 1. Módulo de Pacientes

O módulo de Pacientes (`/dashboard/pacientes`) é o coração da base de dados populacional e atua como uma visão consolidada das informações provindas do e-SUS.

### Funcionalidades
- **Listagem e Busca:** Visualização de todos os pacientes com barra de busca por nome ou número do cartão (CNS).
- **Indicadores de Saúde:** Exibição das `comorbidities` (comorbidades) associadas ao paciente, destacadas com tags visuais na interface.
- **Filtro por UBS:** Para usuários com perfil `admin_ti` ou `gerente`, é possível filtrar a visualização da lista por Unidade Básica de Saúde específica.
- **Status do Termo LGPD:** A tela indica claramente o status de consentimento do paciente para uso do WhatsApp (Pendente, Aceito ou Recusado).

### Acesso Rápido ao Chat
- Clicar sobre um paciente na listagem redireciona o ACS diretamente para a tela do chat com o contexto daquele paciente já carregado (`/dashboard/chat?patientId=...`).

## 2. Módulo de Agendamentos

O módulo de Agendamentos (`/dashboard/agendamentos`) visa organizar o calendário das Unidades de Saúde.

### Componentes Chave
- **PatientCard (`PatientCard.tsx`):** Exibe o resumo do paciente de forma rápida para confirmar a identidade no momento de criar ou visualizar um agendamento.
- **Gestão de Filas (Futuro):** Planejado para conectar a intenção do paciente no WhatsApp ("preciso de uma consulta") com a tela de agendamentos no dashboard.

---
**Tags:** #pacientes #agendamentos #dashboard #funcionalidades
