-- =====================================================================================
-- ATUALIZAÇÃO: TRILHAS DE CUIDADO (COMORBIDADES, TEMPLATES E AGENDAMENTOS)
-- =====================================================================================

-- 1. Adicionar comorbidades à tabela de pacientes
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS comorbidities TEXT[] DEFAULT '{}';

-- 2. Tabela de Templates (Biblioteca da Equipe Multidisciplinar)
CREATE TABLE IF NOT EXISTS public.health_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('nutricao', 'educacao_fisica', 'enfermagem', 'psicologia', 'lembrete_medicamento')),
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- O texto da mensagem que será enviado
    created_by UUID REFERENCES public.acs(id), -- Quem criou (opcional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Agendamentos (Trilhas configuradas pelo ACS)
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    acs_id UUID REFERENCES public.acs(id) NOT NULL,
    patient_id UUID REFERENCES public.patients(id) NOT NULL,
    template_id UUID REFERENCES public.health_templates(id) NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('diario', 'semanal', 'quinzenal', 'mensal')),
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================================
-- RLS (ROW LEVEL SECURITY)
-- =====================================================================================

ALTER TABLE public.health_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Templates: Todos logados podem ver os templates
DROP POLICY IF EXISTS "Todos podem ver templates" ON public.health_templates;
CREATE POLICY "Todos podem ver templates" ON public.health_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas admins (ou perfis específicos no futuro) podem criar templates. 
-- Por enquanto, vamos liberar para quem tem acesso ao painel criar.
DROP POLICY IF EXISTS "Todos autenticados podem criar templates" ON public.health_templates;
CREATE POLICY "Todos autenticados podem criar templates" ON public.health_templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Agendamentos: ACS só pode ver e criar agendamentos para pacientes da sua UBS
DROP POLICY IF EXISTS "ACS gerencia seus agendamentos" ON public.scheduled_messages;
CREATE POLICY "ACS gerencia seus agendamentos" ON public.scheduled_messages
    FOR ALL USING (
        is_admin() OR patient_id IN (SELECT id FROM public.patients WHERE ubs_id = get_user_ubs_id())
    ) WITH CHECK (
        is_admin() OR patient_id IN (SELECT id FROM public.patients WHERE ubs_id = get_user_ubs_id())
    );
