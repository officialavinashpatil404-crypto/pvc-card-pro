'use client';

import { useState } from 'react';
import { updateProfile, updatePassword } from './actions';

interface UserProfile {
  name: string;
  mobile: string;
  email: string;
  plan: string;
}

interface ProfileClientProps {
  userProfile: UserProfile;
}

export default function ProfileClient({ userProfile }: ProfileClientProps) {
  // Profile Info Form States
  const [name, setName] = useState(userProfile.name || '');
  const [mobile, setMobile] = useState(userProfile.mobile || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileSuccess('');
    setProfileError('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('mobile', mobile);

    const res = await updateProfile(formData);
    setIsUpdatingProfile(false);
    if (res.success) {
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } else {
      setProfileError(res.error || 'Failed to update profile.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPwd(true);
    setPwdSuccess('');
    setPwdError('');

    if (newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters long');
      setIsUpdatingPwd(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match');
      setIsUpdatingPwd(false);
      return;
    }

    const formData = new FormData();
    formData.append('newPassword', newPassword);
    formData.append('confirmNewPassword', confirmPassword);

    const res = await updatePassword(formData);
    setIsUpdatingPwd(false);
    if (res.success) {
      setPwdSuccess('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccess(''), 4000);
    } else {
      setPwdError(res.error || 'Failed to change password.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Profile & Security</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Manage operator details, registered phone number, and password security.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-100/80 px-4 py-2 rounded-2xl border border-slate-200/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-blue-600 text-white font-black flex items-center justify-center text-lg shadow-md">
            {userProfile.name?.[0]?.toUpperCase() || 'O'}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">{userProfile.name || 'Operator'}</p>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{userProfile.plan} Plan</p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">badge</span>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Personal Information</h2>
        </div>
        
        <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
          {profileSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {profileError}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Full Operator Name</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                placeholder="Enter full name" 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Mobile Number</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                placeholder="Mobile number"
                type="tel" 
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700">Primary Email Address</label>
              <input 
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-500 cursor-not-allowed outline-none" 
                type="email" 
                value={userProfile.email}
                disabled
              />
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Verified Primary Email
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit"
              disabled={isUpdatingProfile}
              className="px-5 py-2.5 bg-primary hover:brightness-110 text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-2"
            >
              {isUpdatingProfile ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  Saving…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Security Form */}
      <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">lock</span>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Security & Password</h2>
        </div>
        
        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
          {pwdSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {pwdSuccess}
            </div>
          )}
          {pwdError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {pwdError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">New Password</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                placeholder="Min. 8 characters" 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                placeholder="Repeat password" 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit"
              disabled={isUpdatingPwd}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-2"
            >
              {isUpdatingPwd ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  Updating…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
