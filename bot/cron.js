const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const { getSafeRandomTemplate } = require('./ai_helper');

// Configuração do Supabase (Service Role é necessário para burlar o RLS e ler todos os agendamentos)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Função auxiliar para calcular a próxima data (baseada no momento do envio real)
function calculateNextRunAt(frequency, isGroup = false) {
    const nextRun = new Date(); // Usa o horário atual em que foi realmente enviado
    switch (frequency) {
        case 'diario':
            nextRun.setDate(nextRun.getDate() + 1);
            break;
        case 'semanal':
            nextRun.setDate(nextRun.getDate() + 7);
            break;
        case 'quinzenal':
            nextRun.setDate(nextRun.getDate() + 14);
            break;
        case 'mensal':
            nextRun.setMonth(nextRun.getMonth() + 1);
            break;
        default:
            nextRun.setDate(nextRun.getDate() + 1);
    }
    
    // Se for individual, não pode cair no sábado nem domingo
    if (!isGroup) {
        if (nextRun.getDay() === 6) nextRun.setDate(nextRun.getDate() + 2); // Sábado -> Segunda
        if (nextRun.getDay() === 0) nextRun.setDate(nextRun.getDate() + 1); // Domingo -> Segunda
    } else {
        // Se for grupo, não pode cair no domingo
        if (nextRun.getDay() === 0) nextRun.setDate(nextRun.getDate() + 1); // Domingo -> Segunda
    }
    
    return nextRun.toISOString();
}

// Função auxiliar para formatar e enviar mensagem de WhatsApp
async function sendWhatsAppMessage(whatsappClient, patient, title, content) {
    const phoneNumber = patient.phone_number;
    let formattedNumber = phoneNumber;
    
    if (!formattedNumber.includes('@c.us')) {
        // Remove caracteres especiais se houver
        formattedNumber = formattedNumber.replace(/\D/g, '');
        // Se faltar o código do país, adiciona o 55
        if (formattedNumber.length <= 11) formattedNumber = `55${formattedNumber}`;
        formattedNumber = `${formattedNumber}@c.us`;
    }

    // Preparando a mensagem com o título da campanha
    const messageToSend = `🩺 *Mensagem da Equipe de Saúde*\n*Assunto:* ${title}\n\nOlá, ${patient.name.split(' ')[0]}!\n\n${content}\n\n_Esta é uma mensagem automática programada pelo seu Agente Comunitário de Saúde. Para parar de receber estes avisos, responda *SAIR*._`;

    // Enviar via WhatsApp
    await whatsappClient.sendMessage(formattedNumber, messageToSend);
    console.log(`[CRON SUCESSO] Mensagem enviada para ${phoneNumber}`);
}

async function processScheduledMessages(whatsappClient) {
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    // Trava de Segurança Global: O robô só trabalha entre 08:00 e 18:00 (limite estrito)
    // E nunca trabalha aos domingos (0)
    if (currentHour < 8 || currentHour >= 18 || currentDay === 0) {
        return;
    }

    console.log('[CRON] Verificando agendamentos pendentes...');
    const now = new Date().toISOString();

    const { data: schedules, error } = await supabase
        .from('scheduled_messages')
        .select(`
            id,
            frequency,
            next_run_at,
            patient_id,
            group_id,
            template_id,
            is_random,
            category,
            custom_title,
            custom_content,
            patients ( id, phone_number, name, comorbidities, lgpd_consent ),
            health_templates ( title, category, content )
        `)
        .eq('status', 'active')
        .lte('next_run_at', now);

    if (error) {
        console.error('[CRON ERRO] Falha ao buscar agendamentos:', error.message);
        return;
    }

    if (!schedules || schedules.length === 0) return;

    // Filtro Inteligente de Horários por Categoria
    const schedulesToSend = schedules.filter(s => {
        // Trilhas Individuais (não é grupo) não podem rodar aos sábados (6)
        if (!s.group_id && currentDay === 6) {
            return false;
        }

        // Se for fixo, pega a categoria do template vinculado. Se for randômico, usa a categoria do agendamento.
        const cat = s.is_random ? s.category : (s.health_templates?.category);
        
        if (!cat) return true; // Se não tiver categoria, envia em qualquer horário comercial
        if (cat === 'lembrete_medicamento') {
            return currentHour >= 8 && currentHour <= 9;
        }
        // Nutrição (Alimentação): Almoço (11:00 às 13:59)
        if (cat === 'nutricao') {
            return currentHour >= 11 && currentHour <= 13;
        }
        // Educação Física: Tarde (16:00 às 17:59) - ajustado para o limite global
        if (cat === 'educacao_fisica') {
            return currentHour >= 16 && currentHour < 18;
        }
        // Psicologia / Enfermagem / Bem-estar: Horário comercial amplo (08:00 às 18:00)
        return currentHour >= 8 && currentHour < 18;
    });

    if (schedulesToSend.length === 0) {
        console.log(`[CRON] ${schedules.length} campanhas pendentes, mas nenhuma na janela de horário apropriada agora.`);
        return;
    }

    console.log(`[CRON] Disparando ${schedulesToSend.length} campanhas na janela de horário atual.`);

    // Limite anti-banimento (MODO TESTE): Processar no máximo 1 por ciclo
    const batch = schedulesToSend.slice(0, 1);

    for (const schedule of batch) {
        try {
            if (schedule.group_id) {
                console.log(`[CRON] Processando agendamento de GRUPO (ID: ${schedule.group_id})`);
                
                // 1. Buscar membros do grupo
                const { data: members, error: mError } = await supabase
                    .from('patient_group_members')
                    .select(`
                        patients ( id, phone_number, name, comorbidities, lgpd_consent )
                    `)
                    .eq('group_id', schedule.group_id);
                
                if (mError) {
                    console.error(`[CRON ERRO] Falha ao buscar membros do grupo ${schedule.group_id}:`, mError.message);
                    continue;
                }
                
                if (!members || members.length === 0) {
                    console.log(`[CRON INFO] Grupo ${schedule.group_id} está vazio. Nenhuma mensagem a enviar.`);
                    // Atualizar data de próxima execução para não travar
                    const isUnica = schedule.frequency === 'unica';
                    const updateData = isUnica 
                        ? { status: 'completed' } 
                        : { next_run_at: calculateNextRunAt(schedule.frequency, !!schedule.group_id) };
                    await supabase
                        .from('scheduled_messages')
                        .update(updateData)
                        .eq('id', schedule.id);
                    continue;
                }
                
                console.log(`[CRON] Enviando mensagens para ${members.length} membros do grupo.`);
                
                // Buscar templates da categoria se for aleatório para reusar no grupo (otimização)
                let categoryTemplates = [];
                if (schedule.is_random) {
                    const { data: templates, error: tError } = await supabase
                        .from('health_templates')
                        .eq('category', schedule.category);
                    
                    if (tError || !templates || templates.length === 0) {
                        console.error(`[CRON ERRO] Nenhum template encontrado para categoria ${schedule.category}`);
                        // Atualizar data para evitar travamento
                        const isUnica = schedule.frequency === 'unica';
                        const updateData = isUnica 
                            ? { status: 'completed' } 
                            : { next_run_at: calculateNextRunAt(schedule.frequency, !!schedule.group_id) };
                        await supabase
                            .from('scheduled_messages')
                            .update(updateData)
                            .eq('id', schedule.id);
                        continue;
                    }
                    categoryTemplates = templates;
                }
                
                for (const member of members) {
                    const patient = member.patients;
                    if (!patient) continue;
                    
                    if (patient.lgpd_consent === false) {
                        console.log(`[CRON INFO] Paciente ${patient.name} optou por sair (LGPD). Pulando envio.`);
                        continue;
                    }
                    
                    let content = '';
                    let title = '';
                    
                    if (schedule.is_random) {
                        // Escolha do template customizado para cada paciente via IA
                        const safeTemplate = await getSafeRandomTemplate(patient, categoryTemplates);
                        if (!safeTemplate) {
                            console.log(`[CRON INFO] IA não encontrou mensagem segura para ${patient.name}. Pulando este paciente.`);
                            continue;
                        }
                        content = safeTemplate.content;
                        title = safeTemplate.title;
                    } else if (schedule.custom_content) {
                        content = schedule.custom_content;
                        title = schedule.custom_title || 'Campanha de Saúde';
                    } else {
                        if (!schedule.health_templates) {
                            console.error(`[CRON ERRO] Agendamento fixo ${schedule.id} sem template/conteúdo avulso.`);
                            continue;
                        }
                        content = schedule.health_templates.content;
                        title = schedule.health_templates.title;
                    }
                    
                    await sendWhatsAppMessage(whatsappClient, patient, title, content);
                    
                    // Pausa de segurança anti-spam (5 a 10 segundos entre cada envio do grupo)
                    const pause = Math.floor(Math.random() * (10000 - 5000 + 1) + 5000);
                    await new Promise(r => setTimeout(r, pause));
                }
                
                // Calcular próxima data e atualizar o agendamento do grupo ou marcar como concluído se for única
                const isUnica = schedule.frequency === 'unica';
                const updateData = isUnica 
                    ? { status: 'completed' } 
                    : { next_run_at: calculateNextRunAt(schedule.frequency, !!schedule.group_id) };
                await supabase
                    .from('scheduled_messages')
                    .update(updateData)
                    .eq('id', schedule.id);
                
                console.log(`[CRON SUCESSO] Agendamento de grupo ${schedule.id} processado com sucesso.`);
                
            } else {
                // Lógica de paciente individual (id do paciente deve estar presente)
                if (!schedule.patients) {
                    console.error(`[CRON ERRO] Agendamento individual ${schedule.id} sem paciente vinculado.`);
                    continue;
                }
                
                const patient = schedule.patients;
                
                if (patient.lgpd_consent === false) {
                    console.log(`[CRON INFO] Paciente ${patient.name} optou por sair (LGPD). Pulando envio.`);
                    continue;
                }
                
                let content = '';
                let title = '';
                
                if (schedule.is_random) {
                    console.log(`[CRON] Processando trilha aleatória (${schedule.category}) para ${patient.name}`);
                    const { data: templates, error: tError } = await supabase
                        .from('health_templates')
                        .eq('category', schedule.category);
                    
                    if (tError || !templates || templates.length === 0) {
                        console.error(`[CRON ERRO] Nenhum template encontrado para categoria ${schedule.category}`);
                        continue;
                    }
                    
                    const safeTemplate = await getSafeRandomTemplate(patient, templates);
                    if (!safeTemplate) {
                        console.log(`[CRON INFO] IA não encontrou mensagem segura para ${patient.name}. Pulando este ciclo.`);
                        continue;
                    }
                    content = safeTemplate.content;
                    title = safeTemplate.title;
                } else if (schedule.custom_content) {
                    content = schedule.custom_content;
                    title = schedule.custom_title || 'Campanha de Saúde';
                } else {
                    if (!schedule.health_templates) {
                        console.error(`[CRON ERRO] Agendamento fixo ${schedule.id} sem template/conteúdo avulso.`);
                        continue;
                    }
                    content = schedule.health_templates.content;
                    title = schedule.health_templates.title;
                }
                
                await sendWhatsAppMessage(whatsappClient, patient, title, content);
                
                // Pausa de segurança anti-spam (5 a 10 segundos)
                const pause = Math.floor(Math.random() * (10000 - 5000 + 1) + 5000);
                await new Promise(r => setTimeout(r, pause));
                
                const isUnica = schedule.frequency === 'unica';
                const updateData = isUnica 
                    ? { status: 'completed' } 
                    : { next_run_at: calculateNextRunAt(schedule.frequency, !!schedule.group_id) };
                await supabase
                    .from('scheduled_messages')
                    .update(updateData)
                    .eq('id', schedule.id);
                
                console.log(`[CRON SUCESSO] Agendamento individual ${schedule.id} processado com sucesso.`);
            }
        } catch (err) {
            console.error(`[CRON ERRO] Falha ao processar agendamento ${schedule.id}:`, err.message);
        }
    }
}

function initCronJobs(whatsappClient) {
    // Roda a cada 30 minutos (ajuste conforme necessário)
    cron.schedule('*/30 * * * *', () => {
        processScheduledMessages(whatsappClient);
    });
    console.log('[SISTEMA] Serviço de Cron (Despertador de Trilhas de Cuidado) inicializado.');
}

module.exports = { initCronJobs };
