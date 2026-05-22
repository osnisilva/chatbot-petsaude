-- =====================================================================================
-- MIGRAÇÃO: ADIÇÃO DE MENSAGENS AVULSAS E SUPORTE A DISPARO ÚNICO
-- =====================================================================================

-- 1. Adicionar colunas custom_title e custom_content para agendamentos de mensagens avulsas
ALTER TABLE public.scheduled_messages 
ADD COLUMN IF NOT EXISTS custom_title TEXT,
ADD COLUMN IF NOT EXISTS custom_content TEXT;

-- 2. Atualizar a restrição check da coluna frequency para aceitar a opção 'unica'
-- Removemos a constraint antiga de frequência gerada automaticamente
ALTER TABLE public.scheduled_messages DROP CONSTRAINT IF EXISTS scheduled_messages_frequency_check;

-- Adiciona a nova restrição com a opção 'unica'
ALTER TABLE public.scheduled_messages 
ADD CONSTRAINT scheduled_messages_frequency_check 
CHECK (frequency IN ('diario', 'semanal', 'quinzenal', 'mensal', 'unica'));

-- 3. Adicionar restrição check para garantir integridade e exclusão mútua das origens de mensagem
-- Garante que:
-- - Ou usa template_id (mensagem fixa do template)
-- - Ou usa is_random (trilha randômica inteligente, com categoria especificada)
-- - Ou usa custom_content (mensagem personalizada avulsa)
-- E não pode misturar
ALTER TABLE public.scheduled_messages DROP CONSTRAINT IF EXISTS check_message_source;

ALTER TABLE public.scheduled_messages
ADD CONSTRAINT check_message_source
CHECK (
    (template_id IS NOT NULL AND custom_content IS NULL AND NOT is_random) OR
    (is_random AND category IS NOT NULL AND template_id IS NULL AND custom_content IS NULL) OR
    (template_id IS NULL AND custom_content IS NOT NULL AND NOT is_random)
);

-- Comentários para documentação
COMMENT ON COLUMN public.scheduled_messages.custom_title IS 'Título/Assunto da mensagem personalizada avulsa';
COMMENT ON COLUMN public.scheduled_messages.custom_content IS 'Conteúdo do texto da mensagem personalizada avulsa';
