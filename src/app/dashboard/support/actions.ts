'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitTicket(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const subject = formData.get('subject') as string;
  const department = formData.get('department') as string;
  const message = formData.get('message') as string;

  if (!subject || !message) {
    return { success: false, error: "Subject and Message fields are required" };
  }

  try {
    const { error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: `[${department}] ${subject}`,
        message,
        status: 'OPEN'
      });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/support');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
