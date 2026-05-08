"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createScheduleAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const acsProfile = await supabase.from('acs').select('id').eq('auth_user_id', user.id).single();
    if (!acsProfile.data) throw new Error("Perfil ACS não encontrado");

    const patient_id = formData.get('patient_id');
    const template_id = formData.get('template_id') || null;
    const is_random = formData.get('is_random') === 'true';
    const category = formData.get('category');
    const frequency = formData.get('frequency');
    const next_run_at = new Date().toISOString();

    const { error } = await supabase.from('scheduled_messages').insert({
      acs_id: acsProfile.data.id,
      patient_id,
      template_id: is_random ? null : template_id,
      is_random,
      category: is_random ? category : null,
      frequency,
      next_run_at,
      status: 'active'
    });

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

    await supabase.from('scheduled_messages').delete().eq('id', scheduleId);
    revalidatePath('/dashboard/agendamentos');
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir agendamento:', err.message);
    return { success: false, error: err.message };
  }
}
