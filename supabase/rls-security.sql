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

-- 3. Função Helper: Verificar se o usuário é da Secretaria de Saúde (Admin)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.acs a
    JOIN public.ubs u ON a.ubs_id = u.id
    WHERE a.auth_user_id = auth.uid() AND u.name = 'Secretaria de Saúde'
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
    FOR SELECT USING (auth_user_id = auth.uid() OR is_admin());

-- PACIENTES: ACS só vê pacientes da sua UBS. Admin vê todos.
DROP POLICY IF EXISTS "acs_can_read_own_patients_or_admin" ON public.patients;
CREATE POLICY "acs_can_read_own_patients_or_admin" ON public.patients
    FOR SELECT USING (
        is_admin() OR ubs_id = get_user_ubs_id()
    );

-- SESSÕES DE CHAT: ACS só vê chats de pacientes da sua UBS. Admin vê todos.
DROP POLICY IF EXISTS "acs_can_read_own_sessions" ON public.chat_sessions;
CREATE POLICY "acs_can_read_own_sessions" ON public.chat_sessions
    FOR SELECT USING (
        is_admin() OR patient_id IN (SELECT id FROM public.patients WHERE ubs_id = get_user_ubs_id())
    );
-- ACS pode atualizar o status da sessão (Assumir atendimento) se tiver permissão de visualização
DROP POLICY IF EXISTS "acs_can_update_own_sessions" ON public.chat_sessions;
CREATE POLICY "acs_can_update_own_sessions" ON public.chat_sessions
    FOR UPDATE USING (
        is_admin() OR patient_id IN (SELECT id FROM public.patients WHERE ubs_id = get_user_ubs_id())
    );

-- MENSAGENS: ACS pode ver e inserir mensagens em chats que ele tem acesso
DROP POLICY IF EXISTS "acs_can_read_messages" ON public.messages;
CREATE POLICY "acs_can_read_messages" ON public.messages
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM public.chat_sessions 
            WHERE is_admin() OR patient_id IN (SELECT id FROM public.patients WHERE ubs_id = get_user_ubs_id())
        )
    );

DROP POLICY IF EXISTS "acs_can_insert_messages" ON public.messages;
CREATE POLICY "acs_can_insert_messages" ON public.messages
    FOR INSERT WITH CHECK (
        session_id IN (
            SELECT id FROM public.chat_sessions 
            WHERE is_admin() OR patient_id IN (SELECT id FROM public.patients WHERE ubs_id = get_user_ubs_id())
        )
        AND sender_type = 'acs'
    );
