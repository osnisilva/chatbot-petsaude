-- =====================================================================================
-- REGRAS DE SEGURANÇA AVANÇADAS (RLS) - LGPD E TRANBORDO
-- =====================================================================================

-- 1. Habilitar RLS em todas as tabelas (se ainda não estiver)
ALTER TABLE public.ubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Função Helper: Pegar o ubs_id do usuário logado
CREATE OR REPLACE FUNCTION get_user_ubs_id()
RETURNS UUID AS $$
  SELECT ubs_id FROM public.acs WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2.1 Função Helper: Pegar o acs_id do usuário logado
CREATE OR REPLACE FUNCTION get_user_acs_id()
RETURNS UUID AS $$
  SELECT id FROM public.acs WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT (role = 'admin_ti') FROM public.acs WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Função Helper: Verificar se o usuário é Gerente da UBS
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.acs 
    WHERE auth_user_id = auth.uid() AND role = 'gerente'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================================================
-- POLÍTICAS DE ACESSO
-- =====================================================================================

-- UBS: Todos logados podem ler a lista de UBS
DROP POLICY IF EXISTS "Todos logados podem ver UBS" ON public.ubs;
CREATE POLICY "Todos logados podem ver UBS" ON public.ubs
    FOR SELECT USING (auth.role() = 'authenticated');

-- ACS: Pode ver seu próprio perfil ou, se for admin, pode ver todos
DROP POLICY IF EXISTS "ACS vê a si mesmo ou Admin vê todos" ON public.acs;
CREATE POLICY "ACS vê a si mesmo ou Admin vê todos" ON public.acs
    FOR SELECT USING (auth_user_id = auth.uid() OR (SELECT role FROM public.acs WHERE auth_user_id = auth.uid()) = 'admin_ti');

-- PACIENTES: ACS só vê seus pacientes. Gerente vê todos da UBS. Admin vê todos.
DROP POLICY IF EXISTS "acs_can_read_own_patients_or_admin" ON public.patients;
CREATE POLICY "acs_can_read_own_patients_or_admin" ON public.patients
    FOR SELECT USING (
        is_admin() 
        OR (is_manager() AND ubs_id = get_user_ubs_id())
        OR acs_id = get_user_acs_id()
    );

-- SESSÕES DE CHAT: ACS vê seus chats. Gerente vê todos da UBS. Admin vê todos.
DROP POLICY IF EXISTS "acs_can_read_own_sessions" ON public.chat_sessions;
CREATE POLICY "acs_can_read_own_sessions" ON public.chat_sessions
    FOR SELECT USING (
        is_admin() 
        OR patient_id IN (
            SELECT id FROM public.patients 
            WHERE (is_manager() AND ubs_id = get_user_ubs_id()) OR acs_id = get_user_acs_id()
        )
    );

-- ACS/Gerente pode atualizar o status da sessão se tiver permissão de visualização
DROP POLICY IF EXISTS "acs_can_update_own_sessions" ON public.chat_sessions;
CREATE POLICY "acs_can_update_own_sessions" ON public.chat_sessions
    FOR UPDATE USING (
        is_admin() 
        OR patient_id IN (
            SELECT id FROM public.patients 
            WHERE (is_manager() AND ubs_id = get_user_ubs_id()) OR acs_id = get_user_acs_id()
        )
    );

-- MENSAGENS: Acesso baseado na permissão da sessão
DROP POLICY IF EXISTS "acs_can_read_messages" ON public.messages;
CREATE POLICY "acs_can_read_messages" ON public.messages
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM public.chat_sessions 
            WHERE is_admin() 
            OR patient_id IN (
                SELECT id FROM public.patients 
                WHERE (is_manager() AND ubs_id = get_user_ubs_id()) OR acs_id = get_user_acs_id()
            )
        )
    );

DROP POLICY IF EXISTS "acs_can_insert_messages" ON public.messages;
CREATE POLICY "acs_can_insert_messages" ON public.messages
    FOR INSERT WITH CHECK (
        session_id IN (
            SELECT id FROM public.chat_sessions 
            WHERE is_admin() OR patient_id IN (SELECT id FROM public.patients WHERE acs_id = get_user_acs_id())
        )
        AND sender_type = 'acs'
    );

DROP POLICY IF EXISTS "acs_can_update_messages" ON public.messages;
CREATE POLICY "acs_can_update_messages" ON public.messages
    FOR UPDATE USING (
        session_id IN (
            SELECT id FROM public.chat_sessions 
            WHERE is_admin() OR patient_id IN (SELECT id FROM public.patients WHERE acs_id = get_user_acs_id())
        )
        AND sender_type = 'acs'
    );
