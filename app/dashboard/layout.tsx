import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardUI from '@/components/DashboardUI';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  // Buscar sessão
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Buscar perfil do profissional
  const { data: acsProfile } = await supabase
    .from('acs')
    .select('name, role, ubs:ubs_id(name)')
    .eq('auth_user_id', session.user.id)
    .single();

  const userName = acsProfile?.name || 'Administrador';
  const unitName = (acsProfile?.ubs as any)?.name || 'Secretaria de Saúde';
  const userRole = acsProfile?.role || 'acs';

  return (
    <DashboardUI userName={userName} unitName={unitName} userRole={userRole}>
      {children}
    </DashboardUI>
  );
}

