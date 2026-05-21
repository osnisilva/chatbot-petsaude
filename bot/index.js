require('dotenv').config({ path: '.env.local' });
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const { initCronJobs } = require('./cron');

// Configuração do Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuração do Gemini (Google AI)
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


// Fila de mensagens anti-spam
const messageQueue = [];
let isProcessingQueue = false;

// Processador da fila (Anti-Spam)
async function processQueue() {
    if (isProcessingQueue || messageQueue.length === 0) return;
    
    isProcessingQueue = true;
    const { messageObj, replyText } = messageQueue.shift();

    try {
        // Simula "Digitando..." e aguarda de 2 a 5 segundos (comportamento humano)
        const chat = await messageObj.getChat();
        await chat.sendStateTyping();
        
        const delay = Math.floor(Math.random() * 3000) + 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        await chat.clearState();
        await messageObj.reply(replyText);
        console.log(`Mensagem enviada com sucesso para ${messageObj.from}`);

        // Pausa adicional para evitar limite de "rate" da Meta
        // Só manda uma próxima mensagem a cada ~5 segundos no mínimo
        await new Promise(resolve => setTimeout(resolve, 5000));
        
    } catch (err) {
        console.error(`Erro ao enviar mensagem:`, err);
    }

    isProcessingQueue = false;
    // Tenta processar o próximo da fila
    processQueue();
}

const client = new Client({
    authStrategy: new LocalAuth(), // Salva a sessão localmente (não precisa reler QR Code ao reiniciar)
    puppeteer: {
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // Reduz drasticamente o consumo de RAM
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    // Imprime o QR Code no terminal para o gestor autenticar
    qrcode.generate(qr, { small: true });
    console.log("👆 Escaneie o QR Code acima usando o WhatsApp da Secretaria de Saúde.");
});

client.on('ready', async () => {
    console.log('📱 Bot do WhatsApp conectado e pronto para uso!');
    
    try {
        // Tenta processar mensagens perdidas durante o tempo que o bot esteve offline (restart)
        const chats = await client.getChats();
        for (const chat of chats) {
            if (chat.unreadCount > 0) {
                const messages = await chat.fetchMessages({ limit: chat.unreadCount });
                for (const msg of messages) {
                    if (!msg.fromMe) {
                        // Simula o evento de nova mensagem para ser processada pela fila do bot
                        client.emit('message', msg);
                    }
                }
            }
        }
    } catch (err) {
        console.log('Erro ao buscar mensagens não lidas no startup:', err.message);
    }

    // Iniciar serviço de disparos programados (Trilhas de Cuidado) apenas se habilitado
    if (process.env.ENABLE_CRON === 'true') {
        initCronJobs(client);
    } else {
        console.log('⏳ [MODO TESTE] O Despertador (Cron) de Trilhas de Cuidado está DESLIGADO. Mude ENABLE_CRON para true no .env.local para ligar.');
    }
});

client.on('message', async (message) => {
    // Ignorar mensagens de grupos ou do próprio bot
    if (message.isGroupMsg || message.fromMe) return;

    let phoneNumber = message.from.replace('@c.us', '').replace('@s.whatsapp.net', '');
    
    // Tratamento para nova API do WhatsApp que às vezes retorna @lid (Linked Device) em vez do número real
    if (phoneNumber.includes('@lid')) {
        try {
            const contact = await message.getContact();
            if (contact && contact.number) {
                phoneNumber = contact.number;
            }
        } catch (e) {
            console.error('Erro ao buscar contato do @lid:', e);
        }
    }

    const messageText = message.body;

    // --- NOVA TRAVA DE HORÁRIO (08:00 - 18:00) - Fuso horário do Brasil ---
    const options = { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false };
    const spHour = parseInt(new Intl.DateTimeFormat('pt-BR', options).format(new Date()), 10);
    
    if (spHour < 8 || spHour >= 18) {
        console.log(`[Horário] Mensagem de ${phoneNumber} fora do horário (${spHour}h Brasília). Enviando aviso.`);
        const outOfOfficeMsg = `Olá! O atendimento automatizado da Secretaria de Saúde funciona de segunda a sexta, das *08h às 18h*.\n\nSua mensagem foi recebida e será processada no próximo período de atendimento.\n\n🚨 *Em caso de emergência:* Procure a UPA mais próxima ou ligue para o SAMU no número *192*.`;
        
        messageQueue.push({ messageObj: message, replyText: outOfOfficeMsg });
        processQueue();
        return;
    }
    // --------------------------------------------

    console.log(`Mensagem de ${phoneNumber}: ${messageText}`);

    try {
        // 1. [Mock e-SUS / Supabase] Verifica se paciente existe
        let { data: patient } = await supabase
            .from('patients')
            .select('*')
            .eq('phone_number', phoneNumber)
            .single();

        let replyText = '';

        if (!patient) {
            console.log('Paciente não encontrado localmente. Enviando aviso para ir à UBS...');
            // Resposta de "primeiro acesso / não cadastrado"
            replyText = `Olá! Bem-vindo ao atendimento automatizado da Secretaria de Saúde.\n\nNão encontramos o seu cadastro no nosso sistema. Por favor, dirija-se até a Unidade de Saúde (UBS) do seu bairro para realizar ou atualizar o seu cadastro.\n\nApós a atualização presencial, você poderá utilizar este canal normalmente!`;
        } else {
            // Verificação de Consentimento LGPD
            const userMsgUpper = messageText.trim().toUpperCase();

            if (patient.lgpd_consent === null) {
                if (userMsgUpper === 'ACEITO') {
                    await supabase.from('patients').update({ lgpd_consent: true }).eq('id', patient.id);
                    replyText = `✅ *Termo Aceito!*\nObrigado, ${patient.name}. Como posso ajudar você hoje com a Secretaria de Saúde?`;
                } else if (userMsgUpper === 'RECUSO') {
                    await supabase.from('patients').update({ lgpd_consent: false }).eq('id', patient.id);
                    replyText = `❌ *Termo Recusado*\nEntendemos sua decisão. O atendimento automatizado por este canal foi desativado. Para reativar no futuro, digite *ACEITO*.`;
                } else {
                    replyText = `Olá, ${patient.name}! Para seguirmos com seu atendimento pelo WhatsApp da Secretaria de Saúde e garantirmos sua privacidade de acordo com a LGPD, precisamos da sua autorização.\n\nResponda *ACEITO* para autorizar as mensagens ou *RECUSO* para não utilizar este canal.`;
                }
            } else if (patient.lgpd_consent === false) {
                if (userMsgUpper === 'ACEITO') {
                    await supabase.from('patients').update({ lgpd_consent: true }).eq('id', patient.id);
                    replyText = `✅ *Termo Aceito!*\nObrigado por reativar o canal, ${patient.name}. Como posso ajudar?`;
                } else {
                    replyText = `Você optou por não utilizar o atendimento automatizado. Caso mude de ideia e queira ser atendido, digite *ACEITO*.`;
                }
            } else {
                // Fluxo normal para pacientes que já deram consentimento (lgpd_consent === true)
                if (userMsgUpper === 'SAIR' || userMsgUpper === 'CANCELAR') {
                    await supabase.from('patients').update({ lgpd_consent: false }).eq('id', patient.id);
                    replyText = `❌ *Atendimento Cancelado*\nEntendido. Você não receberá mais os avisos de saúde e o atendimento automatizado foi desativado.\n\nPara voltar a usar o serviço no futuro, digite *ACEITO*.`;
                } else {
                    console.log(`Paciente ${patient.name} encontrado e validado. Consultando IA Gemini...`);
                    
                    try {
                    // 1. Busca ou cria sessão (ativa ou escalada)
                    let { data: session } = await supabase
                        .from('chat_sessions')
                        .select('*')
                        .eq('patient_id', patient.id)
                        .in('status', ['active', 'escalated'])
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (!session) {
                        const { data: newSession, error } = await supabase
                            .from('chat_sessions')
                            .insert({ patient_id: patient.id, status: 'active' })
                            .select()
                            .single();
                        if (error) throw error;
                        session = newSession;
                    } else {
                        // Atualiza a data da sessão
                        await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', session.id);
                    }

                    // 2. Grava a mensagem do paciente no banco
                    await supabase.from('messages').insert({
                        session_id: session.id,
                        sender_type: 'patient',
                        content: messageText
                    });

                    // Se a sessão estiver com o humano (escalated), não aciona a IA
                    if (session.status === 'escalated') {
                        console.log(`Sessão de ${patient.name} está com o ACS (Transbordo). IA ignorada.`);
                        return;
                    }

                    // 3. Busca o histórico dos últimos 60 dias
                    const sixtyDaysAgo = new Date();
                    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

                    const { data: history } = await supabase
                        .from('messages')
                        .select('sender_type, content')
                        .eq('session_id', session.id)
                        .gte('created_at', sixtyDaysAgo.toISOString())
                        .order('created_at', { ascending: true });

                    // Formata para o Gemini (apenas 'user' ou 'model')
                    const chatHistory = history.map(msg => ({
                        role: msg.sender_type === 'patient' ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    }));

                    // Prompt de sistema para instruir o Gemini
                    const systemInstruction = `Você é a assistente virtual da Secretaria de Saúde auxiliando o ACS.
Você está conversando com o paciente: ${patient.name}.
Suas funções:
1. Responder dúvidas gerais (ex: endereço da UBS, horário de funcionamento).
2. Se o paciente relatar QUALQUER SINTOMA (ex: dor de cabeça, febre, mal-estar, dor de barriga) ou pedir orientações médicas/remédios, você DEVE imediatamente transferir o atendimento para o ACS humano.
3. NUNCA dê diagnósticos, nem prescreva ou indique medicamentos.
4. NÃO ofereça agendamento de visitas médicas. Se o paciente apresentar um sintoma, APENAS transfira o atendimento para o ACS humano pelo chat.

Regra de Transferência:
Se você detectar uma queixa de saúde ou sintoma, inicie sua resposta OBRIGATORIAMENTE com a tag [TRANSFERIR]. Em seguida, escreva uma mensagem acolhedora avisando que está passando o caso para o ACS humano avaliar.

Exemplo de transferência:
"[TRANSFERIR] Entendi, ${patient.name}. Como se trata de um sintoma de saúde, não posso dar orientações ou diagnósticos. Estou transferindo o seu atendimento agora mesmo para o seu Agente Comunitário de Saúde (ACS) que vai te responder por aqui em breve."`;

                    // 4. Envia o histórico completo para a IA
                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: chatHistory,
                        config: {
                            systemInstruction: systemInstruction,
                            temperature: 0.7
                        }
                    });
                    replyText = response.text || "Desculpe, não consegui processar sua mensagem agora.";

                    // Intercepta a tag [TRANSFERIR] para mudar o status da sessão
                    if (replyText.includes('[TRANSFERIR]')) {
                        replyText = replyText.replace('[TRANSFERIR]', '').trim();
                        // Altera o status da sessão para 'escalated' (humano)
                        await supabase.from('chat_sessions').update({ status: 'escalated' }).eq('id', session.id);
                        console.log(`Atendimento de ${patient.name} transferido para o ACS.`);
                    }

                    // 5. Grava a resposta da IA no banco
                    await supabase.from('messages').insert({
                        session_id: session.id,
                        sender_type: 'bot',
                        content: replyText
                    });

                } catch (aiError) {
                    console.error("Erro na lógica de IA/Banco:", aiError);
                    replyText = `Olá, ${patient.name}! Recebi sua mensagem, mas nosso cérebro artificial está temporariamente fora do ar.`;
                }
            } // fecha o else do opt-out
        } // fecha o fluxo normal (else lgpd_consent === true)
    } // fecha o else (!patient)

        // 2. Coloca a resposta na Fila Anti-Spam
        messageQueue.push({ messageObj: message, replyText });
        processQueue();

    } catch (error) {
        console.error("Erro no processamento da mensagem:", error);
    }
});

// Função robusta para processar o envio de mensagens do ACS
async function processAcsMessage(msg) {
    if (msg.whatsapp_message_id) return; // Já foi enviado/processado

    try {
        const { data: session } = await supabase.from('chat_sessions').select('patient_id').eq('id', msg.session_id).single();
        if (session) {
            const { data: patient } = await supabase.from('patients').select('phone_number').eq('id', session.patient_id).single();
            if (patient) {
                // Se o número não começar com '55' e for longo (ex: LID do WhatsApp), envia para @lid
                const isLid = !patient.phone_number.startsWith('55') && patient.phone_number.length >= 14;
                const chatId = isLid ? `${patient.phone_number}@lid` : `${patient.phone_number}@c.us`;
                let sentMsg;
                
                if (msg.media_url) {
                    console.log(`📎 Enviando arquivo do ACS para ${patient.phone_number}: ${msg.media_name}`);
                    const media = await MessageMedia.fromUrl(msg.media_url);
                    sentMsg = await client.sendMessage(chatId, media, { caption: msg.content });
                } else {
                    console.log(`👨‍⚕️ Disparando resposta do ACS para ${patient.phone_number}: ${msg.content}`);
                    sentMsg = await client.sendMessage(chatId, msg.content);
                }

                // Salva o ID do WhatsApp no banco para não processar de novo
                if (sentMsg && sentMsg.id && sentMsg.id._serialized) {
                    await supabase.from('messages')
                        .update({ whatsapp_message_id: sentMsg.id._serialized, status: 'sent' })
                        .eq('id', msg.id);
                }
            }
        }
    } catch (err) {
        console.error("Erro ao enviar mensagem do ACS:", err);
    }
}

// Escuta o banco de dados por ações do ACS no painel (Envio, Edição, Remoção)
supabase.channel('acs_actions')
    .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: "sender_type=eq.acs"
    }, async (payload) => {
        await processAcsMessage(payload.new);
    })

    .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: "sender_type=eq.acs"
    }, async (payload) => {
        const oldMsg = payload.old;
        const newMsg = payload.new;
        
        if (!newMsg.whatsapp_message_id) return;

        try {
            // 1. Caso de Remoção (is_deleted: true)
            if (newMsg.is_deleted && !oldMsg.is_deleted) {
                console.log(`🗑️ Removendo mensagem no WhatsApp: ${newMsg.whatsapp_message_id}`);
                const msgToPerform = await client.getMessageById(newMsg.whatsapp_message_id);
                if (msgToPerform) await msgToPerform.delete(true); // true = deletar para todos
                return;
            }

            // 2. Caso de Edição (content alterado)
            if (newMsg.content !== oldMsg.content && !newMsg.is_deleted) {
                console.log(`✏️ Editando mensagem no WhatsApp: ${newMsg.whatsapp_message_id}`);
                const msgToPerform = await client.getMessageById(newMsg.whatsapp_message_id);
                if (msgToPerform) await msgToPerform.edit(newMsg.content);
                return;
            }
        } catch (err) {
            console.error("Erro ao processar UPDATE no bot:", err.message);
        }
    })
    .subscribe();

// Listener de Status da Mensagem (ACK)
client.on('message_ack', async (msg, ack) => {
    // ack: 0: erro, 1: enviado, 2: entregue, 3: lido
    let status = 'sent';
    if (ack === 2) status = 'delivered';
    if (ack === 3) status = 'read';
    if (ack === 0) status = 'failed';

    if (msg.id && msg.id._serialized) {
        await supabase.from('messages')
            .update({ status })
            .eq('whatsapp_message_id', msg.id._serialized);
    }
});

// Polling robusto para garantir que nenhuma mensagem seja perdida (ex: se o websocket falhar)
setInterval(async () => {
    try {
        const { data: pendingMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('sender_type', 'acs')
            .is('whatsapp_message_id', null)
            .order('created_at', { ascending: true });

        if (pendingMessages && pendingMessages.length > 0) {
            // Modo Teste: Processa apenas 1 mensagem a cada 10 segundos para simular digitação humana
            const msg = pendingMessages[0];
            await processAcsMessage(msg);
        }
    } catch (err) {
        console.error("Erro no polling de mensagens pendentes:", err.message);
    }
}, 10000); // Roda a cada 10 segundos

// Inicializa
console.log("Iniciando o cliente do WhatsApp Web...");
client.initialize();
