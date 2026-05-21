# Modo de Teste (Anti-Spam) e Preparação para Produção

O sistema de disparos do WhatsApp Web JS foi configurado com um limite rígido de **Modo de Teste** para evitar que a Meta identifique comportamento de SPAM e bloqueie o número durante o desenvolvimento.

## O que foi alterado para o Modo Teste:

1. **Variável de Controle do Cron:** No arquivo `.env.local`, a variável `ENABLE_CRON` foi adicionada e definida como `false`. O cronograma de Trilhas de Cuidado só é iniciado caso essa variável esteja como `true`.
2. **Limite do Lote do Cron:** Em `bot/cron.js`, o tamanho do lote de mensagens processadas por ciclo (que roda a cada 30 min) foi reduzido de `20` para `1`.
3. **Limite da Fila do Painel:** Em `bot/index.js`, o polling de mensagens agendadas e/ou respondidas manualmente pelo ACS (rodando a cada 10 segundos) foi estrangulado para processar e enviar apenas **1 mensagem por ciclo** em vez de esvaziar a fila inteira de uma vez.

---

## Como voltar ao normal para PRODUÇÃO:

Quando for colocar o sistema no ar para atender a população real, siga os passos abaixo para remover os limites:

### 1. Reativar o Cron
No arquivo `.env.local` no servidor de produção, altere a chave para `true`:
```env
ENABLE_CRON=true
```

### 2. Aumentar a vazão das Trilhas de Cuidado
Abra o arquivo `bot/cron.js` e localize a linha `const batch = schedulesToSend.slice(0, 1);` (aprox. linha 94).
**Altere para:**
```javascript
// Limite anti-banimento (PRODUÇÃO): Processar no máximo 20 por ciclo
const batch = schedulesToSend.slice(0, 20);
```

### 3. Aumentar a vazão do Painel ACS
Abra o arquivo `bot/index.js` e localize o bloco do `setInterval` (aprox. linha 394).
O código estará assim (limitando a 1 mensagem):
```javascript
        if (pendingMessages && pendingMessages.length > 0) {
            // Modo Teste: Processa apenas 1 mensagem a cada 10 segundos
            const msg = pendingMessages[0];
            await processAcsMessage(msg);
        }
```
**Substitua por:**
```javascript
        if (pendingMessages && pendingMessages.length > 0) {
            for (const msg of pendingMessages) {
                await processAcsMessage(msg);
            }
        }
```

Após fazer essas alterações, salve os arquivos e **reinicie o bot** (`pm2 restart bot`) para aplicar o modo de Produção de alto desempenho.
