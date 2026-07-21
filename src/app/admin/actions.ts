'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/utils/auth";

export async function updateBanner(imageUrl: string, linkUrl: string) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      throw new Error("Forbidden: Admin access required");
    }

    // Set all existing active banners to inactive
    await supabase
      .from('banners')
      .update({ is_active: false })
      .eq('is_active', true);

    // Insert new active banner
    const { error } = await supabase
      .from('banners')
      .insert({
        image_url: imageUrl,
        link_url: linkUrl || null,
        is_active: true
      });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/dashboard');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update banner" };
  }
}
