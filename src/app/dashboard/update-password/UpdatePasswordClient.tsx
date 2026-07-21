'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from '../profile/actions';
import { createClient } from '@/utils/supabase/client';

export default function UpdatePasswordClient() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    
    // Auto-detect recovery token or session from URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        console.log('[UpdatePassword] Auth recovery session established');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess('');
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('newPassword', newPassword);
    formData.append('confirmNewPassword', confirmPassword);

    const res = await updatePassword(formData);
    setIsLoading(false);
    
    if (res.success) {
      setSuccess('Your password has been successfully updated!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } else {
      setError(res.error || 'Failed to update password.');
    }
  };

  return (
    <div className="max-w-[500px] mx-auto my-xl space-y-lg animate-fade-in py-12 px-4">
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto text-primary mb-3">
            <span className="material-symbols-outlined text-[32px]">lock_reset</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Set New Password</h2>
          <p className="text-xs font-medium text-slate-500">Enter a new secure password for your operator account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {success && (
            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
              <div>
                <p className="font-bold">{success}</p>
                <p className="text-[11px] text-emerald-600">Redirecting to dashboard...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-red-600">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">New Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock</span>
              <input 
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" 
                placeholder="Min. 8 characters" 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Confirm New Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock</span>
              <input 
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" 
                placeholder="Repeat new password" 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">info</span>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-900">Password Tips</p>
              <ul className="text-[11px] text-slate-500 list-disc list-inside space-y-0.5 font-medium">
                <li>Must be at least 8 characters</li>
                <li>Include a mix of letters and numbers</li>
              </ul>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                <span>Saving Password…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                <span>Save New Password</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
