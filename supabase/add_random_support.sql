-- =====================================================================================
-- ATUALIZAÇÃO: SUPORTE A TRILHAS ALEATÓRIAS POR CATEGORIA
-- =====================================================================================

-- 1. Adicionar colunas para suporte a trilhas aleatórias
ALTER TABLE public.scheduled_messages 
    ADD COLUMN IF NOT EXISTS is_random BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Tornar template_id opcional (pode ser nulo se for uma trilha aleatória)
ALTER TABLE public.scheduled_messages 
    ALTER COLUMN template_id DROP NOT NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.scheduled_messages.is_random IS 'Define se o agendamento usa uma mensagem fixa ou escolhe uma aleatória da categoria';
COMMENT ON COLUMN public.scheduled_messages.category IS 'Categoria da trilha aleatória (usado quando is_random = true)';
