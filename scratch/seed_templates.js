const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const templates = [
  // Nutrição
  {
    category: 'nutricao',
    title: '[IA] Diabetes - Controle de Carboidratos',
    content: 'Olá! 🤖 Aqui é a IA do sistema de saúde. Para um bom controle do diabetes, prefira carboidratos complexos (aveia, batata doce, arroz integral). Eles evitam picos de açúcar no sangue. Não se esqueça de fracionar suas refeições e incluir fibras!',
  },
  {
    category: 'nutricao',
    title: '[IA] Hipertensão - Redução de Sódio',
    content: 'Olá! 🤖 Dica do sistema: O sal é um dos maiores vilões da pressão alta. Tente substituir o sal por temperos naturais como alho, cebola, orégano, manjericão e limão. Retire o saleiro da mesa e evite temperos prontos em cubo.',
  },
  {
    category: 'nutricao',
    title: '[IA] Obesidade - Porções e Saciedade',
    content: 'Olá! 🤖 IA do posto passando para lembrar: Comer devagar e mastigar bem os alimentos ajuda o cérebro a entender quando você já está satisfeito. Tente iniciar as refeições por um bom prato de salada de folhas, isso aumenta a saciedade!',
  },
  {
    category: 'nutricao',
    title: '[IA] Cardiopatias - Gorduras Boas',
    content: 'Olá! 🤖 Lembrete automático do sistema: Para proteger seu coração, evite frituras e gorduras saturadas (carnes gordas, manteiga). Prefira o azeite de oliva extra virgem, abacate e oleaginosas (castanhas) em pequenas porções.',
  },
  {
    category: 'nutricao',
    title: '[IA] Geral - Importância da Hidratação',
    content: 'Olá! 🤖 Mensagem do sistema: A água é fundamental para o funcionamento dos rins e controle da pressão. Tente beber pelo menos 2 litros de água por dia. Dica: ande sempre com uma garrafinha perto de você!',
  },

  // Educação Física
  {
    category: 'educacao_fisica',
    title: '[IA] Diabetes - Exercícios e Glicemia',
    content: 'Olá! 🤖 Dica da IA: Exercícios regulares ajudam a insulina a funcionar melhor, reduzindo o açúcar no sangue. Tente fazer caminhadas leves de 30 minutos na maioria dos dias da semana. Lembre-se de levar um carboidrato rápido caso sinta fraqueza (hipoglicemia).',
  },
  {
    category: 'educacao_fisica',
    title: '[IA] Hipertensão - Atividades Seguras',
    content: 'Olá! 🤖 Lembrete do sistema: Antes de começar a se exercitar, certifique-se de que sua pressão está controlada. Evite exercícios que prendam a respiração (manobra de Valsalva). Caminhadas, natação e dança são excelentes opções!',
  },
  {
    category: 'educacao_fisica',
    title: '[IA] Obesidade - Baixo Impacto',
    content: 'Olá! 🤖 IA do posto de saúde: Se você está acima do peso, proteja suas articulações. Prefira atividades de baixo impacto no início, como hidroginástica, bicicleta ergométrica ou caminhadas em terreno plano. Vá no seu ritmo!',
  },
  {
    category: 'educacao_fisica',
    title: '[IA] Saúde Mental - Movimento e Humor',
    content: 'Olá! 🤖 Mensagem automática: Você sabia que a atividade física libera endorfina, o hormônio do bem-estar? 15 a 20 minutos de movimento por dia já podem ajudar a reduzir os sintomas de ansiedade e depressão. Que tal um alongamento hoje?',
  },
  {
    category: 'educacao_fisica',
    title: '[IA] Sedentarismo - Primeiros Passos',
    content: 'Olá! 🤖 Dica da IA: Sair do sedentarismo não significa correr uma maratona. Comece trocando o elevador pelas escadas, ou descendo um ponto antes do ônibus para caminhar um pouco mais. Todo movimento conta!',
  },

  // Enfermagem
  {
    category: 'enfermagem',
    title: '[IA] Diabetes - Cuidados com os Pés',
    content: 'Olá! 🤖 Lembrete de Enfermagem do Sistema: Pacientes com diabetes devem inspecionar os pés diariamente. Verifique se há cortes, bolhas ou vermelhidão. Seque bem entre os dedos após o banho e evite andar descalço para prevenir feridas graves.',
  },
  {
    category: 'enfermagem',
    title: '[IA] Hipertensão - Aferição da Pressão',
    content: 'Olá! 🤖 Mensagem da IA: Ao medir a pressão no posto ou em casa, lembre-se: fique em repouso por 5 minutos, não tome café ou fume 30 min antes, sente-se com as costas apoiadas e os pés no chão. Não converse durante a medição!',
  },
  {
    category: 'enfermagem',
    title: '[IA] Saúde Mental - Sinais de Alerta',
    content: 'Olá! 🤖 Informação do sistema: Se sentir uma tristeza persistente, falta de vontade para atividades diárias ou alterações graves no sono e apetite, não hesite em procurar nossa equipe na UBS. Você não está sozinho(a).',
  },
  {
    category: 'enfermagem',
    title: '[IA] Geral - Vacinação em Dia',
    content: 'Olá! 🤖 Lembrete automático: Ter uma doença crônica como asma, diabetes ou hipertensão aumenta o risco de complicações por infecções. Mantenha suas vacinas de gripe e COVID-19 em dia na nossa UBS.',
  },
  {
    category: 'enfermagem',
    title: '[IA] Cardiopatias - Sinais de Emergência',
    content: 'Olá! 🤖 Alerta do Sistema: Dor no peito tipo aperto que irradia para o braço esquerdo, falta de ar súbita e suor frio são sinais de alerta para infarto. Nesses casos, procure uma emergência (UPA ou Samu 192) imediatamente.',
  },

  // Psicologia
  {
    category: 'psicologia',
    title: '[IA] Ansiedade - Respiração Diafragmática',
    content: 'Olá! 🤖 Dica do sistema para relaxamento: Se sentir ansiedade, tente a respiração 4-7-8. Inspire pelo nariz contando até 4, segure o ar contando até 7, e expire lentamente pela boca contando até 8. Repita 3 vezes.',
  },
  {
    category: 'psicologia',
    title: '[IA] Depressão - Pequenas Vitórias',
    content: 'Olá! 🤖 Mensagem da IA: Em dias difíceis, tarefas simples podem parecer impossíveis. Foque em pequenas vitórias, como levantar da cama, tomar um banho ou beber água. Celebre cada pequeno passo que você conseguir dar hoje.',
  },
  {
    category: 'psicologia',
    title: '[IA] Doenças Crônicas - Aceitação',
    content: 'Olá! 🤖 Reflexão gerada por IA: Receber o diagnóstico de uma doença crônica gera muitas emoções (raiva, medo, negação). Permita-se sentir, mas busque apoio. O tratamento é uma parceria entre você e a equipe de saúde.',
  },
  {
    category: 'psicologia',
    title: '[IA] Obesidade - Fome Emocional',
    content: 'Olá! 🤖 IA do Posto: Antes de comer algo fora do planejado, pergunte-se: "Estou com fome de verdade ou estou ansioso/triste/entediado?". Aprender a identificar a fome emocional é o primeiro passo para o controle.',
  },
  {
    category: 'psicologia',
    title: '[IA] Geral - Estabelecendo Limites',
    content: 'Olá! 🤖 Dica de saúde mental do sistema: Dizer "não" para o que te sobrecarrega é dizer "sim" para a sua saúde. Aprender a respeitar seus próprios limites é uma forma fundamental de autocuidado.',
  },

  // Lembrete de Medicamento
  {
    category: 'lembrete_medicamento',
    title: '[IA] Hipertensão - Horários Regulares',
    content: 'Olá! 🤖 Alerta do Sistema de Medicação: Seus remédios para pressão só funcionam bem se tomados todos os dias no mesmo horário. Mesmo que a pressão esteja normal, NÃO pare a medicação sem orientação médica!',
  },
  {
    category: 'lembrete_medicamento',
    title: '[IA] Diabetes - Uso de Insulina/Antidiabéticos',
    content: 'Olá! 🤖 Lembrete automático: Nunca pule as refeições se você usa insulina ou medicamentos para baixar a glicose, pois há risco de hipoglicemia. Siga a orientação médica sobre o tempo entre a medicação e a comida.',
  },
  {
    category: 'lembrete_medicamento',
    title: '[IA] Saúde Mental - Uso Contínuo',
    content: 'Olá! 🤖 Aviso da IA: Medicamentos para ansiedade e depressão podem levar algumas semanas para fazer o efeito completo. Não desanime e nunca interrompa o uso de forma abrupta por conta própria, consulte seu médico.',
  },
  {
    category: 'lembrete_medicamento',
    title: '[IA] Geral - Organização de Doses',
    content: 'Olá! 🤖 Dica de organização do sistema: Para não esquecer seus remédios, use alarmes no celular ou caixinhas separadoras de pílulas por dia da semana. Deixe a cartela sempre à vista, próximo de onde toma café ou água.',
  },
  {
    category: 'lembrete_medicamento',
    title: '[IA] Geral - Esquecimento de Dose',
    content: 'Olá! 🤖 Orientação do Sistema: Esqueceu de tomar o remédio na hora? Tome assim que lembrar. Porém, se já estiver muito perto da próxima dose, pule a dose esquecida. NUNCA tome dose dupla para compensar!',
  }
];

async function insertTemplates() {
  console.log("Inserindo templates gerados por IA no banco...");
  
  const { data, error } = await supabase
    .from('health_templates')
    .insert(templates)
    .select();
    
  if (error) {
    console.error("Erro ao inserir templates:", error);
  } else {
    console.log(`Sucesso! ${data.length} templates foram inseridos.`);
  }
}

insertTemplates();
