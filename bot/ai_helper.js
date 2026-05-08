const { GoogleGenAI } = require('@google/genai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Inicialização do Gemini usando a chave de API (Modo Google AI Studio)
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    vertexai: false
});

/**
 * Filtra templates de saúde usando IA para garantir que sejam seguros para o paciente.
 */
async function filterSafeTemplates(patient, templates) {
    try {
        const prompt = `
Você é um assistente de saúde especializado em triagem de segurança.
Sua tarefa é analisar uma lista de mensagens de saúde e decidir quais são seguras para um paciente específico.

DADOS DO PACIENTE:
Nome: ${patient.name}
Comorbidades/Condições: ${patient.comorbidities && patient.comorbidities.length > 0 ? patient.comorbidities.join(', ') : 'Nenhuma relatada'}

TEMPLATES DE MENSAGENS (Candidatos):
${templates.map(t => `[ID: ${t.id}] Titulo: ${t.title} | Conteúdo: ${t.content}`).join('\n')}

DIRETRIZES DE SEGURANÇA:
1. Se o paciente for "ACAMADO", descarte mensagens que sugiram caminhadas, exercícios em pé ou atividades físicas intensas.
2. Se o paciente tiver "DIABETES", descarte sugestões de alimentos com alto índice glicêmico (se houver).
3. Se o paciente tiver "HIPERTENSÃO", descarte sugestões que envolvam alto consumo de sal ou esforços físicos extremos sem supervisão.
4. Mantenha apenas mensagens que tragam benefícios REAIS e SEGUROS para as condições listadas.

RESPOSTA:
Retorne APENAS um array JSON contendo os IDs dos templates que foram APROVADOS.
Exemplo de formato: ["uuid-1", "uuid-2"]
Não escreva mais nada além do array JSON.
        `;

        const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });

        const text = result.text;

        // Limpando a resposta para garantir que seja um JSON válido
        const jsonMatch = text.match(/\[.*\]/s);
        if (!jsonMatch) {
            console.error('[AI HELPER] Resposta da IA não contém um JSON válido:', text);
            return [];
        }

        const approvedIds = JSON.parse(jsonMatch[0]);
        
        // Retorna os objetos de template originais que foram aprovados
        return templates.filter(t => approvedIds.includes(t.id));

    } catch (error) {
        console.error('[AI HELPER ERRO] Falha ao filtrar templates com IA:', error.message);
        // Em caso de erro crítico na IA, retornamos vazio por segurança
        return [];
    }
}

/**
 * Escolhe um template aleatório da lista filtrada.
 */
async function getSafeRandomTemplate(patient, templates) {
    if (!templates || templates.length === 0) return null;

    const safeTemplates = await filterSafeTemplates(patient, templates);
    
    if (safeTemplates.length === 0) {
        console.warn(`[AI HELPER] Nenhuma mensagem segura encontrada para o paciente ${patient.name} na lista fornecida.`);
        return null;
    }

    // Sorteio aleatório entre as aprovadas
    const randomIndex = Math.floor(Math.random() * safeTemplates.length);
    return safeTemplates[randomIndex];
}

module.exports = {
    filterSafeTemplates,
    getSafeRandomTemplate
};
