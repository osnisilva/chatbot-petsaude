# Trilhas de Cuidado

As **Trilhas de Cuidado** representam o núcleo terapêutico automatizado do ACS-Online, permitindo que a unidade de saúde mantenha contato constante e assertivo com os pacientes.

## 🩺 Categorias e Comorbidades
A biblioteca conta com *templates* (modelos de mensagem) categorizados por áreas multidisciplinares e agravos em saúde:
1. **Nutrição** (ex: Dicas de redução de sódio para hipertensos).
2. **Educação Física** (ex: Alongamentos leves, caminhada).
3. **Enfermagem** (ex: Agendamento de curativos, orientações pós-alta).
4. **Psicologia** (ex: Cuidado com saúde mental, ansiedade).
5. **Lembretes de Medicação** (Aviso programado).

## 🧠 Sistema Híbrido: Fixo vs. Randomizado (IA)

O ACS pode escolher como disparar essas trilhas:

- **Modo Fixo:** Dispara o modelo de texto exato, garantindo controle estrito (ideal para lembretes de exames e medicamentos vitais).
- **Modo Dinâmico (IA):** Integração com o Google Gemini (`@google/genai`). O sistema pega a ideia central do modelo, as comorbidades do paciente e gera variações de texto diárias. Isso evita que o paciente se canse ("monotonia da mensagem repetida") e aumenta o engajamento.

> [!WARNING] Sinalização Obrigatória
> Qualquer mensagem gerada por IA é sempre acompanhada de um aviso/rodapé indicando que o texto foi gerado por Inteligência Artificial, seguindo normas éticas.

## ⚙️ Motor de Agendamento
O sistema utiliza *Cron Jobs* (`node-cron`) para ler diariamente as trilhas ativas e acionar o bot do WhatsApp, disparando centenas de mensagens de forma distribuída para não sobrecarregar a rede ou ser bloqueado por *spam*.

## 🔒 Segurança de Conteúdo
Travas lógicas impedem absurdos clínicos: um paciente diabético, porém hipertenso, não receberá "Dicas de doces diet" (devido ao cruzamento de IA que evita complicações sistêmicas). As trilhas são filtradas de acordo com as tags clínicas de cada usuário.

---
**Links Relacionados:** [[Bot-WhatsApp]], [[Esquema]]
**Tags:** #funcionalidade #saude #ia #gemini #agendamento
