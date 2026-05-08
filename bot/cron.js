const { createClient } = require('@supabase/supabase-js');
const { getSafeRandomTemplate } = require('./ai_helper');

// Configuração do Supabase (Service Role é necessário para burlar o RLS e ler todos os agendamentos)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Função auxiliar para calcular a próxima data (baseada no momento do envio real)
function calculateNextRunAt(frequency) {
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
    return nextRun.toISOString();
}

async function processScheduledMessages(whatsappClient) {
    const currentHour = new Date().getHours();
    
    // Trava de Segurança Global: O robô só trabalha entre 08:00 e 18:00 (limite estrito)
    if (currentHour < 8 || currentHour >= 18) {
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
            template_id,
            is_random,
            category,
            patients ( phone_number, name, comorbidities ),
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

    // Limite anti-banimento: Processar no máximo 20 por ciclo
    const batch = schedulesToSend.slice(0, 20);

    for (const schedule of batch) {
        try {
            const phoneNumber = schedule.patients.phone_number;
            let content = '';
            let title = '';

            // LÓGICA DE SELEÇÃO DE CONTEÚDO (FIXO vs ALEATÓRIO)
            if (schedule.is_random) {
                console.log(`[CRON] Processando trilha aleatória (${schedule.category}) para ${schedule.patients.name}`);
                
                // 1. Buscar todos os templates da categoria
                const { data: templates, error: tError } = await supabase
                    .from('health_templates')
                    .eq('category', schedule.category);

                if (tError || !templates || templates.length === 0) {
                    console.error(`[CRON ERRO] Nenhum template encontrado para categoria ${schedule.category}`);
                    continue;
                }

                // 2. Pedir para a IA escolher um seguro
                const safeTemplate = await getSafeRandomTemplate(schedule.patients, templates);
                
                if (!safeTemplate) {
                    console.log(`[CRON INFO] IA não encontrou mensagem segura para ${schedule.patients.name}. Pulando este ciclo.`);
                    continue;
                }

                content = safeTemplate.content;
                title = safeTemplate.title;
            } else {
                // Mensagem Fixa (Padrão atual)
                if (!schedule.health_templates) {
                    console.error(`[CRON ERRO] Agendamento fixo ${schedule.id} sem template vinculado.`);
                    continue;
                }
                content = schedule.health_templates.content;
                title = schedule.health_templates.title;
            }
            
            // Formatando o número para o padrão do WhatsApp Web JS (DDD + Numero + @c.us)
            // Assumindo que o phone_number já está salvo corretamente ou precisa de ajuste
            let formattedNumber = phoneNumber;
            if (!formattedNumber.includes('@c.us')) {
                // Remove caracteres especiais se houver
                formattedNumber = formattedNumber.replace(/\D/g, '');
                // Se faltar o código do país, adiciona o 55
                if (formattedNumber.length <= 11) formattedNumber = `55${formattedNumber}`;
                formattedNumber = `${formattedNumber}@c.us`;
            }

            // Preparando a mensagem com o título da campanha
            const messageToSend = `🩺 *Mensagem da Equipe de Saúde*\n*Assunto:* ${title}\n\nOlá, ${schedule.patients.name.split(' ')[0]}!\n\n${content}\n\n_Esta é uma mensagem automática programada pelo seu Agente Comunitário de Saúde._`;

            // Enviar via WhatsApp
            await whatsappClient.sendMessage(formattedNumber, messageToSend);
            console.log(`[CRON SUCESSO] Mensagem enviada para ${phoneNumber}`);

            // Pausa de segurança anti-spam (5 a 10 segundos entre cada envio)
            const pause = Math.floor(Math.random() * (10000 - 5000 + 1) + 5000);
            await new Promise(r => setTimeout(r, pause));

            // Calcular próxima data (usa o horário atual por padrão dentro da função)
            const nextRun = calculateNextRunAt(schedule.frequency);

            // Atualizar banco
            await supabase
                .from('scheduled_messages')
                .update({ next_run_at: nextRun })
                .eq('id', schedule.id);

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
