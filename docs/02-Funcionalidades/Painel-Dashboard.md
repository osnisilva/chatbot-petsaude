# Painel Administrativo (Dashboard)

O Dashboard (`/dashboard/relatorios`) é o centro de comando visual para acompanhamento da saúde populacional e da operação do ACS-Online.

## 📊 Visões e Hierarquia

O painel se adapta ao nível de acesso do usuário (Role-Based Access Control):

- **Visão Local (Agente Comunitário - ACS):** Vê apenas os pacientes associados à sua própria área/carteira de acompanhamento.
- **Visão Gerencial (Gerente da UBS):** Vê métricas agregadas da Unidade Básica de Saúde específica.
- **Visão Central (Admin da Secretaria de Saúde):** Possui um *overview* de todas as unidades, com gráficos comparativos, relatórios cruzados e controle total de perfis de equipe.

## 🔍 Filtros Dinâmicos

A interface conta com um sistema avançado de filtros:
- **Período (Datas):** "Hoje", "Últimos 7 Dias", "Este Mês", "Trimestre", e Seleção Customizada.
- **Unidade de Saúde:** (Apenas para administradores).

Isso atualiza instantaneamente os gráficos baseados em `Recharts`.

## 📈 Métricas Acompanhadas

O painel foca em rastrear a adesão dos pacientes:
- Volume de Trilhas de Cuidado ativas x concluídas.
- Estatísticas Demográficas.
- **Fluxo de Mensagens (Tracking Granular):** Volume de mensagens Enviadas vs. Recebidas, o que ajuda a entender se os pacientes estão realmente engajando nas respostas ou se a comunicação está unilateral.

---
**Links Relacionados:** [[Frontend]], [[Trilhas-de-Cuidado]], [[Perfis-de-Acesso]]
**Tags:** #funcionalidade #dashboard #admin #relatorios
