import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ucbyolqkqxqqaqeeeauw.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYnlvbHFrcXhxcWFxZWVlYXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0ODUxMDAsImV4cCI6MjA5NzA2MTEwMH0.XSe1cWuYT4SYQfgc7dhhmnc1P1JLA7VXqmXDevbjBV0';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register') || request.nextUrl.pathname.startsWith('/forgot-password')
  const isPublicRoute = request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname.startsWith('/api')

  console.log(`[Middleware Debug] Path: ${request.nextUrl.pathname}, User: ${user?.id || 'null'}, isAuthRoute: ${isAuthRoute}, isPublicRoute: ${isPublicRoute}`)

  if (!user && !isAuthRoute && !isPublicRoute) {
    console.log(`[Middleware Debug] Unauthenticated user accessing protected route. Bypassing redirect for testing.`);
    return supabaseResponse;
  }

  if (user && isAuthRoute) {
      // user is logged in, redirect away from auth routes
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
  }

  return supabaseResponse
}
