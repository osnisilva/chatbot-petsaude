# Integração Bot do WhatsApp

O serviço de mensageria, responsável por conectar o sistema ACS-Online ao paciente final, é um módulo isolado feito em **Node.js** utilizando a biblioteca `whatsapp-web.js`.

## 🤖 Funcionamento Geral
- O sistema roda um processo local separado (comando `npm run bot` ou via servidor/container PM2).
- Ao ser iniciado, o bot gera um **QR Code** (exibido no terminal com `qrcode-terminal`), que a unidade de saúde ou o ACS escaneia para conectar a linha de WhatsApp ao sistema.
- Ele atua de forma passiva, ouvindo eventos do WhatsApp, e ativa, enviando mensagens a partir de rotinas ou chamadas manuais.

## 🔄 Fluxo e Sincronização em Tempo Real
1. **Envio Pelo Painel:** O ACS envia uma mensagem na tela de chat. Ela é salva no banco `messages` com status `sent`.
2. **Disparo do Bot:** O bot lê o banco (ou é acionado via Webhook/Evento) e envia no WhatsApp.
3. **Rastreamento de Status (Status Tracking):**
   - A biblioteca `whatsapp-web.js` escuta os eventos `message_ack`.
   - Se o status muda no WhatsApp, o bot atualiza o banco de dados (Status: `delivered`, `read`).
   - O Frontend escuta essas mudanças no Supabase e atualiza o tique de leitura (✓✓) na tela do ACS em tempo real.
4. **Recebimento de Mensagens:**
   - Quando o paciente responde, o bot captura o evento de `message`, identifica ou cria a `chat_session` no banco de dados e salva o conteúdo na tabela `messages` como `sender_type = 'patient'`.

## 🗑️ Edição e Deleção
- O bot suporta edição de mensagens e deleção de mensagens (apagar para todos).
- Quando o ACS deleta uma mensagem pelo painel, o bot envia o comando de revogação (`revoke()`) pro WhatsApp.
- No banco de dados, usamos **Soft Delete** (`is_deleted = TRUE`), o que oculta o texto mas mantém a auditoria ativa no sistema.

## 🛡️ Conformidade e LGPD
- O fluxo de mensagens garante que o paciente só receba informações de acordo com as Trilhas de Cuidado aprovadas.
- Mensagens geradas por Inteligência Artificial sempre vêm sinalizadas.

---
**Links Relacionados:** [[Chat-e-Mensageria]], [[Backend]], [[Trilhas-de-Cuidado]]
**Tags:** #arquitetura #whatsapp #bot #mensageria
