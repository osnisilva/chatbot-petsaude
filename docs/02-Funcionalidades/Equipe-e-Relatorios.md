# 👥 Equipe e Relatórios

Estes dois módulos fornecem ao gestor da UBS e à Secretaria de Saúde as ferramentas necessárias para administrar acessos e monitorar o desempenho do atendimento.

## 1. Módulo de Equipe (`/dashboard/equipe`)

A página de gestão da equipe permite visualizar e controlar quem tem acesso ao painel do ACS-Online.

### Funcionalidades
- **Listagem de Agentes:** Exibe todos os profissionais cadastrados na base.
- **Hierarquia de Acesso:** O sistema reconhece 3 papéis principais (roles):
  1. `acs`: Visão restrita aos pacientes de sua própria microárea (RLS).
  2. `gerente`: Visão completa da sua Unidade Básica de Saúde (UBS).
  3. `admin_ti`: Visão global (Secretaria de Saúde), podendo ver e filtrar dados de todas as UBS.
- **Vínculo com Unidade:** Cada membro é associado estritamente à sua respectiva UBS para garantir o isolamento dos dados de pacientes.

## 2. Módulo de Relatórios (`/dashboard/relatorios`)

Módulo essencial para a tomada de decisões da gestão municipal, exibindo gráficos e métricas operacionais consolidadas.

### Funcionalidades e Métricas
- **Filtros Temporais:** Os dados podem ser analisados por recortes de tempo definidos pelo usuário (hoje, última semana, mês).
- **Volume de Mensagens:**
  - *Enviadas vs Recebidas:* Acompanhamento do fluxo e da taxa de uso do bot e da equipe.
  - *Trilhas de Cuidado vs Chat Manual:* Análise de qual volume de envio partiu da automação versus atendimento humanizado.
- **Gráficos Demográficos (`DemographicChart.tsx`):**
  - Exibição de dados da população atendida com base nas métricas extraídas dos pacientes.
- **Performance de Atendimento:** Permite identificar gargalos onde pacientes estão aguardando retorno por muito tempo na fila de "Transbordo".

---
**Tags:** #equipe #relatorios #dashboard #funcionalidades #gestao
