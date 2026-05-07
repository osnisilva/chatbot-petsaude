'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updatePatientComorbidities(patientId: string, comorbidities: string[]) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('patients')
    .update({ comorbidities })
    .eq('id', patientId);

  if (error) {
    console.error('Erro ao atualizar comorbidades:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/pacientes');
  revalidatePath('/dashboard/agendamentos');
  return { success: true };
}
