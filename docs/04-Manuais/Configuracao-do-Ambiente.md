# Configuração do Ambiente

Este guia descreve como configurar e rodar o projeto localmente para desenvolvimento.

## 🛠️ Pré-requisitos
- Node.js (v20 ou superior)
- Conta no Supabase
- Chave de API do Google Gemini (`@google/genai`)
- Instalação das dependências do sistema.

## 📂 Passos Iniciais
1. Clone o repositório.
2. Na pasta raiz, rode o comando para instalar pacotes:
   ```bash
   npm install
   ```

## 🔐 Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:
```env
NEXT_PUBLIC_SUPABASE_URL=https://sua-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key # Somente para uso seguro (Bypass RLS)
GEMINI_API_KEY=sua-chave-api-gemini
```

## ▶️ Executando o Projeto

Você precisa rodar dois serviços em terminais separados:

1. **Painel Web (Frontend):**
   ```bash
   npm run dev
   ```
   Acesse: `http://localhost:3000`

2. **Bot do WhatsApp:**
   ```bash
   npm run bot
   ```
   Aguarde a geração do QR Code no terminal e escaneie com o celular da UBS para conectar o serviço de mensageria.

---
**Links Relacionados:** [[Backend]], [[Bot-WhatsApp]]
**Tags:** #manual #configuracao #setup #dev
