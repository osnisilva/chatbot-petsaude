# Chat e Mensageria (WhatsApp)

O painel de Mensageria permite ao Agente Comunitário de Saúde (ACS) ter uma interface no estilo "WhatsApp Web" unificada e oficial, vinculada aos registros médicos.

## 💬 A Interface
- É responsiva e foca no histórico entre o profissional de saúde de plantão e o paciente.
- Separa contatos por fila ou busca direta.
- Mostra indicadores de mensagens não lidas.

## 🔄 Status das Mensagens
Graças à arquitetura reativa (`whatsapp-web.js` + `Supabase`), a tela atualiza instantaneamente os ícones de *tick*:
- ⏳ Enviando
- ✓ Entregue ao servidor (Sent)
- ✓✓ Entregue ao celular do paciente (Delivered)
- ✓✓ (Azul) Lida pelo paciente (Read)

## 📎 Envio de Arquivos
- O ACS pode anexar documentos médicos (guias, receitas, cartilhas em PDF) e imagens (fotos de lesões enviadas pelo paciente).
- Os arquivos transitam pelo **Supabase Storage** antes de serem disparados para o paciente via bot.

## 🤖 Inteligência Artificial e Automação
Quando o paciente entra em contato, ele passa inicialmente por uma triagem da Inteligência Artificial (Google Gemini), operando sob as seguintes regras de negócio:
- **Respostas Institucionais:** A IA pode informar horários de funcionamento, campanhas e dúvidas gerais.
- **Transbordo Automático:** Se a IA detectar o relato de QUALQUER sintoma ou pedido de orientação médica/medicamento, ela ativa a tag de "Transbordo" (Escalation). A sessão do chat sai do modo bot e passa automaticamente para a fila do ACS humano.

## 🕒 Horário de Atendimento e Anti-Spam
- **Travas de Horário:** O bot só responde e encaminha conversas ativamente dentro do horário comercial (ex: 08:00 às 18:00, horário de Brasília). Fora desse horário, uma mensagem padrão de ausência e instruções de emergência (SAMU/UPA) é disparada.
- **Fila Anti-Spam:** Para evitar banimentos na API do WhatsApp por limite de taxa de envio (rate limit), todas as respostas do sistema passam por uma fila ("queue") que simula pausas humanas ("Digitando...") entre o envio das mensagens.

## 🗑️ Auditoria e "Soft Delete"
Como é uma comunicação de saúde oficial:
- **Exclusão de Mensagem:** Quando o ACS "apaga" uma mensagem enviada por engano, o bot dispara a função `revoke()` que apaga no celular do paciente ("Esta mensagem foi apagada").
- **Soft Delete:** No banco de dados, a mensagem ganha a flag `is_deleted = TRUE`. Ela some da interface normal, mas o Administrador de TI e a Secretaria de Saúde sempre poderão auditar esse log por motivos de segurança e LGPD, impedindo exclusão permanente (Hard Delete) não autorizada.
- **Edição:** Funciona de forma similar, mantendo um histórico do texto original "por baixo dos panos" no Supabase.

---
**Links Relacionados:** [[Bot-WhatsApp]], [[Painel-Dashboard]]
**Tags:** #funcionalidade #chat #whatsapp #arquivos #auditoria
