-- =====================================================================================
-- ESQUEMA DO SUPABASE: CHATBOT ACS
-- =====================================================================================

-- 1. Tabela: Unidades Básicas de Saúde (UBS)
CREATE TABLE public.ubs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cnes TEXT UNIQUE NOT NULL, -- Cadastro Nacional de Estabelecimentos de Saúde
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela: Agentes Comunitários de Saúde (ACS)
CREATE TABLE public.acs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id), -- Vincula ao Firebase/Supabase Auth se usarem dashboard
    name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    cns TEXT UNIQUE NOT NULL, -- Cartão Nacional de Saúde do ACS
    ubs_id UUID REFERENCES public.ubs(id) NOT NULL,
    microarea TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela: Pacientes (Mapeamento básico do e-SUS para contexto local)
-- NOTA: Dados estritamente necessários. Sem prontuário.
CREATE TABLE public.patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL, -- WhatsApp do paciente (usado para identificá-lo no chat)
    name TEXT NOT NULL,
    cns_masked TEXT, -- Ex: ***.***.***-12
    acs_id UUID REFERENCES public.acs(id), -- ACS responsável
    ubs_id UUID REFERENCES public.ubs(id) NOT NULL,
    lgpd_consent BOOLEAN DEFAULT NULL, -- NULL (Pendente), TRUE (Aceito), FALSE (Recusado)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela: Sessões de Chat (Histórico do WhatsApp)
CREATE TABLE public.chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela: Mensagens
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'bot', 'acs')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================================
-- SEGURANÇA: ROW LEVEL SECURITY (RLS) - LGPD
-- =====================================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.ubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Exemplo de Política RLS: O ACS só pode ler dados dos pacientes da sua própria microárea
-- Assumindo que auth.uid() retorna o ID logado do ACS
CREATE POLICY "acs_can_read_own_patients" ON public.patients
    FOR SELECT USING (
        acs_id = (SELECT id FROM public.acs WHERE auth_user_id = auth.uid())
    );

-- O sistema de backend (Vercel) usando a chave SERVICE_ROLE fará bypass dessas regras 
-- para gerenciar o bot automatizado com segurança.
