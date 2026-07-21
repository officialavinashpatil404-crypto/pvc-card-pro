'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
    mobile: formData.get('mobile') as string,
  }

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        mobile: data.mobile,
      }
    }
  })

  if (error) {
    redirect('/register?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const headersList = await headers()
  const forwardedHost = headersList.get('x-forwarded-host')
  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const domain = forwardedHost || host || 'pvc-card-pro.vercel.app'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${domain}`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/dashboard/update-password`,
  })

  if (error) {
    redirect('/forgot-password?error=' + encodeURIComponent(error.message))
  }

  redirect('/forgot-password?message=' + encodeURIComponent('Check your email for the reset link.'))
}

export async function signInWithGoogle() {
  const supabase = await createClient()

  const headersList = await headers()
  const forwardedHost = headersList.get('x-forwarded-host')
  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const domain = forwardedHost || host || 'pvc-card-pro.vercel.app'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${domain}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
    },
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  if (data.url) {
    redirect(data.url)
  }
}
