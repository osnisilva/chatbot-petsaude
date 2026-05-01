import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase
// Aqui usamos a SERVICE_ROLE_KEY porque o webhook atua como backend/admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// Método GET: Necessário para a configuração inicial do Webhook no painel da Meta
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso!');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Token de verificação inválido', { status: 403 });
}

// Método POST: Recebe as mensagens e atualizações de status do WhatsApp
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verifica se é um evento do WhatsApp Business API
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages) {
            const msg = change.value.messages[0];
            const contact = change.value.contacts[0];
            
            const phoneNumber = contact.wa_id;
            const messageText = msg.text?.body || '';

            console.log(`Mensagem recebida de ${phoneNumber}: ${messageText}`);

            // ==============================================================
            // LÓGICA DO CHATBOT AQUI
            // ==============================================================
            
            // 1. [Mock e-SUS] Verifica se o paciente existe ou busca no e-SUS
            let { data: patient } = await supabase
              .from('patients')
              .select('*')
              .eq('phone_number', phoneNumber)
              .single();

            if (!patient) {
              // Simulando a leitura read-only de um banco externo (e-SUS)
              console.log('Paciente não encontrado localmente. Consultando mock do e-SUS...');
              
              // Aqui seria a chamada real de leitura (ex: fetch) para a API do e-SUS
              const esusMockData = {
                name: contact.profile.name || 'Paciente',
                ubs_id: null, // Na prática, viria do e-SUS
                cns_masked: '***.***.***-12'
              };

              // Insere o cache local no Supabase
              /*
              const { data: newPatient } = await supabase.from('patients').insert({
                phone_number: phoneNumber,
                name: esusMockData.name,
                cns_masked: esusMockData.cns_masked
              }).select().single();
              patient = newPatient;
              */
              
              // Por enquanto, responderemos de forma genérica
              await sendWhatsAppMessage(phoneNumber, `Olá, ${esusMockData.name}! Bem-vindo ao atendimento da Secretaria de Saúde. Percebemos que é o seu primeiro acesso. Estamos sincronizando seus dados.`);
              return NextResponse.json({ status: 'success' }, { status: 200 });
            }

            // 2. Registra a mensagem recebida no Supabase
            // ... (implementação do fluxo de sessão de chat) ...

            // 3. Processa IA (Gemini) e envia resposta
            await sendWhatsAppMessage(phoneNumber, `Olá! Recebi sua mensagem: "${messageText}". O sistema está em construção!`);
          }
        }
      }
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    return new NextResponse('Evento não suportado', { status: 404 });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}

// Função auxiliar para enviar mensagem de volta ao WhatsApp
async function sendWhatsAppMessage(to: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn('Variáveis de ambiente do WhatsApp não configuradas. Mensagem não enviada.');
    return;
  }

  const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: text },
    }),
  });
}
