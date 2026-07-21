'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const name = formData.get('name') as string;
  const mobile = formData.get('mobile') as string;

  if (!name) {
    return { success: false, error: "Name is required" };
  }

  try {
    // Update public.users profile table (using upsert to heal missing profile rows)
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        name,
        mobile,
        email: user.email || ''
      });

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    // Update auth user metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { name, mobile }
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    revalidatePath('/dashboard/profile');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmNewPassword') as string;

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long" };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "Passwords do not match" };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
