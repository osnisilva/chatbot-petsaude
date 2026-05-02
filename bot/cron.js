const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (Service Role é necessário para burlar o RLS e ler todos os agendamentos)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Função auxiliar para calcular a próxima data
function calculateNextRunAt(frequency, currentRunDate) {
    const nextRun = new Date(currentRunDate);
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
            nextRun.setDate(nextRun.getDate() + 1); // Padrão
    }
    return nextRun.toISOString();
}

async function processScheduledMessages(whatsappClient) {
    console.log('[CRON] Verificando agendamentos pendentes...');
    const now = new Date().toISOString();

    // Buscar agendamentos ativos cuja data de envio já chegou
    const { data: schedules, error } = await supabase
        .from('scheduled_messages')
        .select(`
            id,
            frequency,
            next_run_at,
            patient_id,
            patients ( phone_number, name ),
            health_templates ( title, content )
        `)
        .eq('status', 'active')
        .lte('next_run_at', now);

    if (error) {
        console.error('[CRON ERRO] Falha ao buscar agendamentos:', error.message);
        return;
    }

    if (!schedules || schedules.length === 0) {
        return;
    }

    console.log(`[CRON] Encontrados ${schedules.length} agendamentos para envio.`);

    for (const schedule of schedules) {
        try {
            const phoneNumber = schedule.patients.phone_number;
            const content = schedule.health_templates.content;
            
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
            const messageToSend = `🩺 *Mensagem da Equipe de Saúde*\n*Assunto:* ${schedule.health_templates.title}\n\nOlá, ${schedule.patients.name.split(' ')[0]}!\n\n${content}\n\n_Esta é uma mensagem automática programada pelo seu Agente Comunitário de Saúde._`;

            // Enviar via WhatsApp
            await whatsappClient.sendMessage(formattedNumber, messageToSend);
            console.log(`[CRON SUCESSO] Mensagem enviada para ${phoneNumber}`);

            // Pausa de segurança anti-spam (5 a 10 segundos entre cada envio)
            const pause = Math.floor(Math.random() * (10000 - 5000 + 1) + 5000);
            await new Promise(r => setTimeout(r, pause));

            // Calcular próxima data
            const nextRun = calculateNextRunAt(schedule.frequency, schedule.next_run_at);

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
