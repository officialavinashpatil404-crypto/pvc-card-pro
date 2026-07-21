import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    console.log(`[OAuth Callback] Received code, exchanging for session...`)
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error(`[OAuth Callback] Error exchanging code:`, error.message)
    } else if (data?.user) {
      console.log(`[OAuth Callback] Session successfully created for user: ${data.user.id}`)
      
      // Auto-heal missing profile row in public.users on Google OAuth login
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profile) {
          const newProfile = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || 'Operator',
            email: data.user.email || '',
            mobile: data.user.user_metadata?.mobile || '',
            plan: 'Free',
            remaining_cards: 0,
            plan_expiry: null
          };
          await supabase.from('users').upsert(newProfile, { onConflict: 'id' });
          console.log(`[OAuth Callback] Profile auto-created/updated for new user: ${data.user.id}`);
        }
      } catch (profileErr: any) {
        console.warn(`[OAuth Callback] Profile auto-creation warning:`, profileErr.message);
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const baseUrl = isLocalEnv ? origin : (forwardedHost ? `https://${forwardedHost}` : 'https://pvc-card-pro.vercel.app');
      
      console.log(`[OAuth Callback] Redirecting to: ${baseUrl}${next}`)
      return NextResponse.redirect(`${baseUrl}${next}`)
    }
  } else {
    console.warn(`[OAuth Callback] No code found in URL search params`)
  }

  return NextResponse.redirect(`${origin}/login?error=Authentication%20failed`)
}
