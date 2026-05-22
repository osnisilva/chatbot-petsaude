-- Adiciona os campos de texto da campanha na tabela de grupos
ALTER TABLE public.patient_groups
ADD COLUMN IF NOT EXISTS campaign_title TEXT,
ADD COLUMN IF NOT EXISTS campaign_content TEXT;
