"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createScheduleAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const acsProfile = await supabase.from('acs').select('id, role').eq('auth_user_id', user.id).single();
    if (!acsProfile.data) throw new Error("Perfil ACS não encontrado");

    const patient_id = formData.get('patient_id') || null;
    const group_id = formData.get('group_id') || null;
    const message_type = formData.get('message_type') || 'template'; // 'template' | 'random' | 'custom'
    const template_id = formData.get('template_id') || null;
    const category = formData.get('category') || null;
    const frequency = formData.get('frequency');
    
    // Captura da mensagem personalizada avulsa
    const custom_title = formData.get('custom_title') as string || null;
    const custom_content = formData.get('custom_content') as string || null;
    
    // Captura da data programada
    const next_run_at_input = formData.get('next_run_at') as string;
    const is_random = message_type === 'random';

    // 1. Validar horários e restrições se for grupo
    // 2. Buscar o title e content padrão do grupo se for grupo (sobrescrevendo o que vier da UI)
    let final_custom_title = custom_title;
    let final_custom_content = custom_content;

    if (group_id) {
      if (acsProfile.data.role !== 'gerente' && acsProfile.data.role !== 'admin_ti') {
        throw new Error("Apenas gerentes podem cadastrar campanhas de grupo para a unidade.");
      }
      if (!next_run_at_input) {
        throw new Error("A data e o horário do envio são obrigatórios para campanhas de grupo.");
      }
      const d = new Date(next_run_at_input);
      if (d.getDay() === 0) {
        throw new Error("Não é permitido agendar campanhas de grupo aos domingos.");
      }
      const hour = d.getHours();
      if (hour < 8 || hour >= 18) {
        throw new Error("O horário de agendamento deve estar entre 08:00 e 17:59.");
      }

      // Busca os dados do grupo no banco de dados para garantir que a campanha tenha a mesma mensagem para todos
      const { data: groupData, error: groupError } = await supabase
        .from('patient_groups')
        .select('campaign_title, campaign_content')
        .eq('id', group_id)
        .single();

      if (groupError || !groupData) {
        throw new Error("Erro ao buscar os dados do grupo de saúde.");
      }
      
      final_custom_title = groupData.campaign_title || 'Campanha de Saúde';
      final_custom_content = groupData.campaign_content || '';
    }

    const next_run_at = next_run_at_input ? new Date(next_run_at_input).toISOString() : new Date().toISOString();

    const insertData: any = {
      acs_id: acsProfile.data.id,
      patient_id: patient_id || null,
      group_id: group_id || null,
      frequency,
      next_run_at,
      status: 'active',
      is_random
    };

    if (message_type === 'custom') {
      insertData.template_id = null;
      insertData.category = null;
      insertData.custom_title = final_custom_title ? final_custom_title.trim() : 'Campanha de Saúde';
      insertData.custom_content = final_custom_content ? final_custom_content.trim() : '';
    } else if (message_type === 'random') {
      insertData.template_id = null;
      insertData.category = category;
      insertData.custom_title = null;
      insertData.custom_content = null;
    } else {
      // template
      insertData.template_id = template_id;
      insertData.category = null;
      insertData.custom_title = null;
      insertData.custom_content = null;
    }

    const { error } = await supabase.from('scheduled_messages').insert(insertData);

    if (error) throw error;
    revalidatePath('/dashboard/agendamentos');
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao criar agendamento:', err.message);
    return { success: false, error: err.message };
  }
}

export async function deleteScheduleAction(scheduleId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const acsProfile = await supabase.from('acs').select('id, role').eq('auth_user_id', user.id).single();
    if (!acsProfile.data) throw new Error("Perfil ACS não encontrado");

    const schedule = await supabase.from('scheduled_messages').select('group_id').eq('id', scheduleId).single();
    if (schedule.data?.group_id && acsProfile.data.role !== 'gerente' && acsProfile.data.role !== 'admin_ti') {
      throw new Error("Apenas gerentes podem cancelar campanhas de grupo.");
    }

    await supabase.from('scheduled_messages').delete().eq('id', scheduleId);
    revalidatePath('/dashboard/agendamentos');
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir agendamento:', err.message);
    return { success: false, error: err.message };
  }
}

export async function deleteAllSchedulesForPatientAction(patientId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    await supabase.from('scheduled_messages').delete().eq('patient_id', patientId);
    revalidatePath('/dashboard/agendamentos');
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir acompanhamento do paciente:', err.message);
    return { success: false, error: err.message };
  }
}
