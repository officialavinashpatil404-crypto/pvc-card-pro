import { createClient } from "@/utils/supabase/server";

/**
 * Checks if the currently logged-in user is authorized as an administrator.
 * Authorization checks:
 * 1. User must be logged in.
 * 2. If the `ADMIN_EMAILS` environment variable is defined, the user's email must be in that list.
 * 3. Fallback/additional check: user's role in the database must be 'ADMIN'.
 */
export async function isAdminUser(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    // Check ADMIN_EMAILS environment variable
    const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
    if (adminEmailsEnv.trim()) {
      const allowedEmails = adminEmailsEnv
        .split(",")
        .map(email => email.trim().toLowerCase())
        .filter(Boolean);

      if (user.email && allowedEmails.includes(user.email.toLowerCase())) {
        return true;
      }
    }

    // Fallback: Check role in database
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    return profile?.role === "ADMIN";
  } catch (error) {
    console.error("[isAdminUser] Verification error:", error);
    return false;
  }
}
