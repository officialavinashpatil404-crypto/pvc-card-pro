'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { GoogleGenAI } from "@google/genai";
import { encrypt, decrypt } from "@/utils/crypto";

/**
 * Validates a Gemini API Key by making a simple request
 */
export async function validateGeminiKey(key: string) {
  if (!key) return { success: false, error: "API Key is required" };
  
  try {
    const ai = new GoogleGenAI({ apiKey: key.trim() });
    
    // Try valid Gemini models in order of preference (newest valid first)
    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
    let responseText = '';
    let modelWorked = '';
    
    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: "Respond with only the word OK." }] }],
          config: { maxOutputTokens: 5 }
        });
        responseText = (response.text || '').trim();
        modelWorked = modelName;
        break;
      } catch (modelErr: any) {
        continue; // try next model
      }
    }
    if (responseText.toUpperCase().includes("OK") || responseText.length > 0) {
      return { success: true };
    }
    
    return { success: false, error: "Invalid response received from Gemini API." };
  } catch (err: any) {
    console.error("[Gemini Validation] Error validation:", err.message || err);
    
    let userFriendlyError = "Verification failed. Please check your internet connection or API Key status.";
    const errMsg = (err.message || "").toLowerCase();
    
    if (errMsg.includes("api_key_invalid") || errMsg.includes("invalid api key") || errMsg.includes("api key not valid") || errMsg.includes("unauthorized")) {
      userFriendlyError = "Invalid API Key. Please verify the key and try again.";
    } else if (errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("429")) {
      userFriendlyError = "API key works, but your Gemini API quota has been exceeded.";
    } else if (errMsg.includes("permission_denied") || errMsg.includes("access") || errMsg.includes("403")) {
      userFriendlyError = "Permission denied. Check if the Gemini API is enabled for your project.";
    }
    
    return { success: false, error: userFriendlyError };
  }
}

/**
 * Ensures that a row for the authenticated user exists in the public.users table.
 * If the user registered before the migrations were run, this automatically heals it.
 */
async function ensureUserProfileExists(supabase: any, user: any) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn("[Profile Check] Error checking profile existence:", error.message);
      return;
    }

    if (!data) {
      console.log("[Profile Check] Profile not found for auth user. Inserting profile row...");
      const name = user.user_metadata?.name || 'Operator';
      const mobile = user.user_metadata?.mobile || '';
      const email = user.email || '';

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          name,
          email,
          mobile,
          plan: 'Free',
          remaining_cards: 10
        });

      if (insertError) {
        console.error("[Profile Check] Profile insertion failed:", insertError.message);
      } else {
        console.log("[Profile Check] Profile created successfully for user:", user.id);
      }
    }
  } catch (err: any) {
    console.error("[Profile Check] Unhandled exception in profile helper:", err.message);
  }
}

/**
 * Fetches user's Gemini settings (if key is set, returns masked value)
 */
export async function getGeminiSettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", connected: false };
  }

  // Ensure the user's profile row exists in public.users table
  await ensureUserProfileExists(supabase, user);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('gemini_api_key')
      .eq('id', user.id)
      .single();

    if (error) {
      // If table doesn't have the column yet or DB is not accessible, return not connected
      console.warn("[getGeminiSettings] Error fetching from users table:", error.message);
      return { success: true, connected: false, key: '' };
    }

    const encryptedKey = data?.gemini_api_key;
    if (!encryptedKey) {
      return { success: true, connected: false, key: '' };
    }

    const decrypted = decrypt(encryptedKey);
    if (!decrypted) {
      return { success: true, connected: false, key: '' };
    }

    // Mask key for safety (e.g. AIzaSy...XXXX)
    const masked = decrypted.length > 10
      ? `${decrypted.substring(0, 6)}...${decrypted.substring(decrypted.length - 4)}`
      : 'Connected';

    return { success: true, connected: true, key: masked };
  } catch (err: any) {
    return { success: false, error: err.message, connected: false };
  }
}

/**
 * Encrypts and saves the user's Gemini API Key to the database
 */
export async function saveGeminiKey(key: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Ensure the user's profile row exists in public.users table
  await ensureUserProfileExists(supabase, user);

  if (!key) {
    return { success: false, error: "API Key is required" };
  }

  // 1. Validate Key first
  const valResult = await validateGeminiKey(key);
  if (!valResult.success) {
    return { success: false, error: valResult.error };
  }

  // 2. Encrypt Key
  const encryptedKey = encrypt(key.trim());

  try {
    // 3. Save to database using select() to check affected rows
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ gemini_api_key: encryptedKey })
      .eq('id', user.id)
      .select('gemini_api_key');

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    if (!updateData || updateData.length === 0) {
      return { 
        success: false, 
        error: "Failed to update profile. Your profile row does not exist in the users table and could not be created automatically." 
      };
    }

    // 4. Verify by reading the value back from the database
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('gemini_api_key')
      .eq('id', user.id)
      .single();

    if (verifyError || !verifyData || verifyData.gemini_api_key !== encryptedKey) {
      return { 
        success: false, 
        error: "Verification failed. The API Key was not permanently stored in the database." 
      };
    }

    revalidatePath('/dashboard/ai-settings');
    revalidatePath('/dashboard/generate');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Removes the user's Gemini API Key from the database
 */
export async function removeGeminiKey() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ gemini_api_key: null })
      .eq('id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/ai-settings');
    revalidatePath('/dashboard/generate');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
