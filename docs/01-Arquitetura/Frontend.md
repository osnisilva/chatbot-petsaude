# Arquitetura de Frontend

O painel administrativo e a interface de operação dos Agentes Comunitários de Saúde (ACS) foram construídos com tecnologias web modernas, garantindo desempenho, acessibilidade e uma identidade visual forte (evitando o "design genérico").

## 🛠️ Tecnologias Utilizadas
- **Framework:** [Next.js 16+](https://nextjs.org/) utilizando o modelo **App Router**.
- **Linguagem:** TypeScript, para garantir tipagem estática e evitar erros em tempo de execução.
- **Estilização:** Tailwind CSS v4 para classes utilitárias rápidas e responsivas.
- **Ícones:** Lucide React.
- **Componentes:** Baseado em Shadcn UI (Radix UI) para acessibilidade nativa, adaptado para não parecer um template genérico.
- **Gráficos:** Recharts para o dashboard analítico.

## 🧩 Estrutura Principal (`app/`)
- `/login`: Página de autenticação limpa e robusta. Redirecionamentos após login foram otimizados para evitar erros `405 Method Not Allowed`.
- `/dashboard`: Área restrita, protegida por middleware.
  - `/dashboard/agendamentos`: Para listar as Trilhas de Cuidado.
  - `/dashboard/relatorios`: Painel central com visão consolidada das métricas e fluxo de envio/recebimento.

O painel possui um layout responsivo, funcionando muito bem tanto em monitores ultrawide (para gestores da Secretaria de Saúde) quanto em telas pequenas (para os agentes em campo).

## 🛣️ Roteamento, Segurança e Autenticação
- Utilizamos o `@supabase/ssr` para verificar os cookies e a sessão (Auth) no lado do servidor, impedindo que usuários não autorizados vejam o dashboard.
- A navegação é fluida graças ao sistema de rotas cliente/servidor do Next.js.

---
**Links Relacionados:** [[Backend]], [[Painel-Dashboard]], [[Configuracao-do-Ambiente]]
**Tags:** #arquitetura #frontend #nextjs #react #tailwind
