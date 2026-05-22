-- =====================================================================================
-- MIGRAÇÃO: MÓDULO DE GRUPOS E CAMPANHAS DE SAÚDE
-- =====================================================================================

-- 1. Criar Tabela de Grupos de Pacientes
CREATE TABLE IF NOT EXISTS public.patient_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    ubs_id UUID REFERENCES public.ubs(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Criar Tabela de Membros do Grupo (Relacionamento Muitos-para-Muitos)
CREATE TABLE IF NOT EXISTS public.patient_group_members (
    group_id UUID REFERENCES public.patient_groups(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (group_id, patient_id)
);

-- 3. Modificar Tabela de Mensagens Agendadas (Trilhas)
-- Adiciona a coluna group_id
ALTER TABLE public.scheduled_messages 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.patient_groups(id) ON DELETE CASCADE;

-- Permite que patient_id seja NULL (pois o agendamento pode ser para um grupo)
ALTER TABLE public.scheduled_messages 
ALTER COLUMN patient_id DROP NOT NULL;

-- Adiciona restrição CHECK para garantir que ou patient_id ou group_id seja fornecido (e não ambos)
ALTER TABLE public.scheduled_messages 
DROP CONSTRAINT IF EXISTS check_patient_or_group;

ALTER TABLE public.scheduled_messages 
ADD CONSTRAINT check_patient_or_group 
CHECK (
    (patient_id IS NOT NULL AND group_id IS NULL) OR 
    (patient_id IS NULL AND group_id IS NOT NULL)
);

-- =====================================================================================
-- SEGURANÇA: ROW LEVEL SECURITY (RLS) & POLÍTICAS
-- =====================================================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.patient_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_group_members ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para a tabela patient_groups (Grupos de Saúde)
-- Todos autenticados da mesma UBS podem ver os grupos
DROP POLICY IF EXISTS "Todos da UBS podem ver grupos" ON public.patient_groups;
CREATE POLICY "Todos da UBS podem ver grupos" ON public.patient_groups
    FOR SELECT USING (
        is_admin() OR ubs_id = get_user_ubs_id()
    );

-- Apenas Gerentes e TI da mesma UBS podem criar/editar/excluir grupos
DROP POLICY IF EXISTS "Apenas gerentes e TI podem gerenciar grupos" ON public.patient_groups;
CREATE POLICY "Apenas gerentes e TI podem gerenciar grupos" ON public.patient_groups
    FOR ALL USING (
        is_admin() OR (
            ubs_id = get_user_ubs_id() AND 
            (SELECT role FROM public.acs WHERE auth_user_id = auth.uid()) IN ('gerente', 'admin_ti')
        )
    );

-- 2. Políticas para a tabela patient_group_members (Membros dos Grupos)
-- Qualquer ACS ou Gerente da UBS pode gerenciar e visualizar os membros dos grupos da UBS
DROP POLICY IF EXISTS "ACS e Gerentes gerenciam membros da mesma UBS" ON public.patient_group_members;
CREATE POLICY "ACS e Gerentes gerenciam membros da mesma UBS" ON public.patient_group_members
    FOR ALL USING (
        is_admin() OR 
        patient_id IN (SELECT id FROM public.patients WHERE ubs_id = get_user_ubs_id())
    ) WITH CHECK (
        is_admin() OR 
        patient_id IN (SELECT id FROM public.patients WHERE ubs_id = get_user_ubs_id())
    );

-- Atualizar política de agendamentos para também cobrir agendamentos de grupo
DROP POLICY IF EXISTS "ACS gerencia seus agendamentos" ON public.scheduled_messages;
CREATE POLICY "ACS gerencia seus agendamentos" ON public.scheduled_messages
    FOR ALL USING (
        is_admin() OR 
        patient_id IN (SELECT id FROM public.patients WHERE ubs_id = get_user_ubs_id()) OR
        group_id IN (SELECT id FROM public.patient_groups WHERE ubs_id = get_user_ubs_id())
    ) WITH CHECK (
        is_admin() OR 
        patient_id IN (SELECT id FROM public.patients WHERE ubs_id = get_user_ubs_id()) OR
        group_id IN (SELECT id FROM public.patient_groups WHERE ubs_id = get_user_ubs_id())
    );
