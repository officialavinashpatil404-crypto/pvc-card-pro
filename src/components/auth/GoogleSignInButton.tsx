'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSignIn = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        alert("Supabase Error: " + error.message)
        setIsLoading(false)
      }
    } catch (err: any) {
      alert("System Error: " + err.message)
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={isLoading}
      className="w-full py-3 px-4 bg-white border border-outline-variant rounded-xl shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 flex items-center justify-center gap-3 font-label-md text-label-md text-on-surface disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <span className="material-symbols-outlined animate-spin text-outline">progress_activity</span>
      ) : (
        <img src="https://www.google.com/favicon.ico" alt="Google Logo" width={20} height={20} className="w-5 h-5" />
      )}
      <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
    </button>
  )
}
