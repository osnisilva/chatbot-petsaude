# Arquitetura de Backend

O backend do ACS-Online utiliza a plataforma **Supabase** (PostgreSQL-as-a-Service) como sua espinha dorsal, em conjunto com as *API Routes* e *Server Actions* do **Next.js**.

## 🗄️ Supabase (PostgreSQL)
Utilizamos o Supabase para gerenciar os dados principais da aplicação:
- **Tabelas Principais:** Pacientes, Unidades Básicas de Saúde (UBS), Equipe (ACS), Sessões de Chat e Mensagens.
- O banco de dados é relacional e garante a integridade dos dados através de restrições rigorosas e Chaves Estrangeiras (Foreign Keys).

> Para detalhes sobre a estrutura das tabelas, veja [[Esquema]].

## 🔒 Autenticação (Supabase Auth)
- O Supabase Auth gerencia os logins dos profissionais e gestores.
- Cada usuário registrado na tabela `acs` possui um `auth_user_id` vinculado à tabela `auth.users` do Supabase.
- Isso permite a autenticação segura no painel web, validando a sessão no servidor via *middleware* do Next.js antes de conceder acesso às rotas protegidas.

## 📂 Storage (Armazenamento de Mídias)
- O **Supabase Storage** é utilizado para armazenar mídias e documentos (imagens, PDFs) enviados pelo painel para o WhatsApp dos pacientes.
- O fluxo de envio de arquivos salva o arquivo em um *bucket* seguro e passa a URL gerada para a API do bot realizar o disparo via WhatsApp.

## 🌐 API Routes e Next.js Server Actions
O próprio painel (Next.js) fornece um backend BFF (Backend For Frontend):
- As requisições de buscar dados do Supabase rodam de forma segura (do lado do servidor).
- A comunicação entre o Bot do WhatsApp (Node.js separado) e o painel ocorre de forma bidirecional. O banco de dados Supabase atua como a única fonte de verdade.

---
**Links Relacionados:** [[Frontend]], [[Bot-WhatsApp]], [[Esquema]]
**Tags:** #arquitetura #backend #supabase #banco-de-dados #api
