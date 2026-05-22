"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper para obter o perfil do ACS/Gerente logado e verificar se pertence à UBS
async function getAcsProfile(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: acs, error } = await supabase
    .from('acs')
    .select('id, ubs_id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (error || !acs) throw new Error("Perfil de agente de saúde não encontrado");
  return acs;
}

// 1. Criar novo grupo de saúde (Restrito a gerente ou admin_ti)
export async function createGroupAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const profile = await getAcsProfile(supabase);

    if (profile.role !== 'gerente' && profile.role !== 'admin_ti') {
      throw new Error("Apenas gerentes ou administradores de TI podem criar grupos de saúde");
    }

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!name || name.trim() === '') {
      throw new Error("O nome do grupo é obrigatório");
    }

    const { error } = await supabase
      .from('patient_groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        ubs_id: profile.ubs_id
      });

    if (error) throw error;

    revalidatePath('/dashboard/grupos');
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao criar grupo:', err.message);
    return { success: false, error: err.message };
  }
}

// 2. Deletar grupo de saúde (Restrito a gerente ou admin_ti)
export async function deleteGroupAction(groupId: string) {
  try {
    const supabase = await createClient();
    const profile = await getAcsProfile(supabase);

    if (profile.role !== 'gerente' && profile.role !== 'admin_ti') {
      throw new Error("Apenas gerentes ou administradores de TI podem excluir grupos de saúde");
    }

    // Deletar o grupo (a deleção de membros e agendamentos vinculados ocorrerá em cascata)
    const { error } = await supabase
      .from('patient_groups')
      .delete()
      .eq('id', groupId)
      .eq('ubs_id', profile.ubs_id); // Garante que pertence à mesma UBS

    if (error) throw error;

    revalidatePath('/dashboard/grupos');
    revalidatePath('/dashboard/agendamentos');
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir grupo:', err.message);
    return { success: false, error: err.message };
  }
}

// 3. Adicionar membros a um grupo em lote (Pode ser feito por ACS e Gerente)
export async function addMembersToGroupAction(groupId: string, patientIds: string[]) {
  try {
    if (!patientIds || patientIds.length === 0) {
      return { success: true, count: 0 };
    }

    const supabase = await createClient();
    const profile = await getAcsProfile(supabase);

    // Validar se o grupo pertence à UBS do ACS logado
    const { data: group, error: groupError } = await supabase
      .from('patient_groups')
      .select('id')
      .eq('id', groupId)
      .eq('ubs_id', profile.ubs_id)
      .single();

    if (groupError || !group) {
      throw new Error("Grupo não encontrado ou não pertence à sua unidade de saúde");
    }

    // Validar quais pacientes pertencem à mesma UBS
    const { data: validPatients, error: patientsError } = await supabase
      .from('patients')
      .select('id')
      .in('id', patientIds)
      .eq('ubs_id', profile.ubs_id);

    if (patientsError || !validPatients) {
      throw new Error("Erro ao validar pacientes na sua unidade de saúde");
    }

    const validPatientIds = validPatients.map(p => p.id);
    if (validPatientIds.length === 0) {
      throw new Error("Nenhum paciente selecionado pertence à sua unidade de saúde");
    }

    // Preparar registros para inserção
    const inserts = validPatientIds.map(pId => ({
      group_id: groupId,
      patient_id: pId
    }));

    // Inserir os membros no grupo (usando upsert ou ignorando duplicados)
    // O Supabase irá disparar erro se tentar inserir uma PK composta que já existe, 
    // então usaremos .upsert() com ignoreDuplicates se disponível ou inseriremos filtrando.
    const { error } = await supabase
      .from('patient_group_members')
      .upsert(inserts, { onConflict: 'group_id,patient_id', ignoreDuplicates: true });

    if (error) throw error;

    revalidatePath('/dashboard/grupos');
    revalidatePath('/dashboard/pacientes');
    return { success: true, count: validPatientIds.length };
  } catch (err: any) {
    console.error('Erro ao adicionar membros ao grupo:', err.message);
    return { success: false, error: err.message };
  }
}

// 4. Remover membro de um grupo (Pode ser feito por ACS e Gerente)
export async function removeMemberFromGroupAction(groupId: string, patientId: string) {
  try {
    const supabase = await createClient();
    const profile = await getAcsProfile(supabase);

    // Validar se o grupo pertence à UBS do ACS logado (segurança extra)
    const { data: group, error: groupError } = await supabase
      .from('patient_groups')
      .select('id')
      .eq('id', groupId)
      .eq('ubs_id', profile.ubs_id)
      .single();

    if (groupError || !group) {
      throw new Error("Grupo não encontrado ou não pertence à sua unidade de saúde");
    }

    const { error } = await supabase
      .from('patient_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('patient_id', patientId);

    if (error) throw error;

    revalidatePath('/dashboard/grupos');
    revalidatePath('/dashboard/pacientes');
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao remover membro do grupo:', err.message);
    return { success: false, error: err.message };
  }
}
