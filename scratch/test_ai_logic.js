const { filterSafeTemplates } = require('../bot/ai_helper');

async function testAI() {
    console.log('--- TESTE DE SEGURANÇA COM IA ---');
    
    const patient = {
        name: 'João Silva',
        comorbidities: ['acamado', 'idoso']
    };

    const templates = [
        { id: '1', title: 'Caminhada', content: 'Olá! Que tal fazer uma caminhada de 20 minutos hoje no parque?' },
        { id: '2', title: 'Alongamento', content: 'Olá! Vamos fazer alguns alongamentos leves nos braços e pescoço hoje?' },
        { id: '3', title: 'Corrida', content: 'Bora correr! A meta de hoje é 5km para fortalecer o coração.' },
        { id: '4', title: 'Hidratação', content: 'Lembre-se de beber bastante água ao longo do dia, pelo menos 2 litros.' }
    ];

    console.log(`Paciente: ${patient.name} (${patient.comorbidities.join(', ')})`);
    console.log('Analisando templates...');

    const approved = await filterSafeTemplates(patient, templates);

    console.log('\n--- RESULTADO DA IA ---');
    console.log('Mensagens APROVADAS:');
    approved.forEach(t => {
        console.log(`- [${t.title}]: ${t.content}`);
    });

    const rejected = templates.filter(t => !approved.find(a => a.id === t.id));
    console.log('\nMensagens REJEITADAS:');
    rejected.forEach(t => {
        console.log(`- [${t.title}]`);
    });
}

testAI();
