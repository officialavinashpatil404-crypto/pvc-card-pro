'use client';

import { useState, useEffect } from 'react';
import { getGeminiSettings, saveGeminiKey, removeGeminiKey, validateGeminiKey } from './actions';

export default function AISettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await getGeminiSettings();
        if (res.success) {
          setIsConnected(res.connected);
          if (res.connected && res.key) {
            setMaskedKey(res.key);
            setApiKey(res.key);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleValidate = async () => {
    if (!apiKey) {
      setStatusMessage({ type: 'error', text: 'Please enter an API Key to validate.' });
      return;
    }

    setIsValidating(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const res = await validateGeminiKey(apiKey);
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'API Key is valid! Gemini API is working properly.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to validate API key.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An unexpected validation error occurred.' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      setStatusMessage({ type: 'error', text: 'Please enter an API Key to save.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const res = await saveGeminiKey(apiKey);
      if (res.success) {
        setIsConnected(true);
        // Refresh masked key from server
        const settings = await getGeminiSettings();
        if (settings.success && settings.key) {
          setMaskedKey(settings.key);
          setApiKey(settings.key);
        }
        setStatusMessage({ type: 'success', text: 'API Key saved and connected successfully!' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to save API key.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An unexpected saving error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to disconnect and delete your Gemini API Key? AI language repair will be disabled.')) {
      return;
    }

    setIsRemoving(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const res = await removeGeminiKey();
      if (res.success) {
        setIsConnected(false);
        setApiKey('');
        setMaskedKey('');
        setStatusMessage({ type: 'success', text: 'API Key removed and disconnected successfully.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to remove API key.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsRemoving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1000px] mx-auto p-lg flex flex-col items-center justify-center min-h-[400px]">
        <span className="material-symbols-outlined animate-spin text-primary text-[40px] mb-sm">progress_activity</span>
        <p className="font-body-md text-on-surface-variant">Loading AI Settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-xl animate-fade-in pb-xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">AI Settings</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Connect your personal Google Gemini API Key for high-accuracy regional language rendering.
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <div className="w-16 h-16 rounded-full border-4 border-surface-container-highest overflow-hidden shadow-sm bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
          </div>
          <div>
            <p className="font-label-md text-on-surface font-bold uppercase tracking-wide">
              {isConnected ? '✨ AI Active' : 'Offline Mode'}
            </p>
            <p className="text-xs text-on-surface-variant">Language Repair Status</p>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="grid grid-cols-1 gap-xl">
        <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-xl py-lg border-b border-outline-variant/30 bg-surface-container-low/50 flex flex-col md:flex-row md:items-center justify-between gap-sm">
            <div className="flex items-center gap-md">
              <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">key</span>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Google Gemini API Key</h2>
                <p className="text-xs text-on-surface-variant">Your key remains securely encrypted and linked to your profile.</p>
              </div>
            </div>
            {/* Status indicator */}
            <div className="flex items-center gap-xs px-md py-xs rounded-full bg-surface-container-high border border-outline-variant/20 self-start md:self-auto">
              <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-outline-variant'}`}></span>
              <span className="font-label-md text-on-surface font-semibold text-xs">
                {isConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>

          <div className="p-xl space-y-lg">
            {statusMessage.text && (
              <div 
                className={`p-sm rounded-xl font-label-md flex items-center gap-xs border text-sm ${
                  statusMessage.type === 'success' 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-error/15 text-error border-error/25'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {statusMessage.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-xl">
              <div className="space-y-base">
                <div className="flex justify-between items-center">
                  <label className="font-label-md text-label-md text-on-surface-variant block">Enter Gemini API Key</label>
                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => {
                        setApiKey('');
                        setIsConnected(false);
                      }}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      Enter a new key
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={isConnected && apiKey === maskedKey}
                    placeholder={isConnected ? '••••••••••••••••••••••••••••••••' : 'AIzaSy...'}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg pl-md pr-12 py-sm font-body-md text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showKey ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* API and Model Meta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md p-md bg-surface-container-low/60 rounded-xl border border-outline-variant/20">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary text-[24px]">smart_toy</span>
                  <div>
                    <p className="font-label-sm text-xs text-on-surface-variant">Configured Model</p>
                    <p className="font-label-md text-sm text-on-surface font-bold">Gemini 2.5 Flash</p>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
                  <div>
                    <p className="font-label-sm text-xs text-on-surface-variant">Security & Privacy</p>
                    <p className="font-label-md text-sm text-on-surface font-bold">Encrypted AES-256-GCM</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-md pt-sm">
                {!isConnected ? (
                  <>
                    <button
                      type="submit"
                      disabled={isSaving || isValidating}
                      className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-md flex items-center gap-sm hover:brightness-110 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px]">save</span>
                          Save & Connect Key
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleValidate}
                      disabled={isSaving || isValidating}
                      className="border border-outline-variant hover:bg-surface-container-high text-on-surface px-lg py-sm rounded-lg font-label-md flex items-center gap-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isValidating ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                          Validating...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px]">verified</span>
                          Validate API Key
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="bg-error text-on-error px-lg py-sm rounded-lg font-label-md flex items-center gap-sm hover:brightness-110 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRemoving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                        Removing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                        Remove & Disconnect Key
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        {/* Section: Features & Usage Guidelines */}
        <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-xl space-y-md">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-xs">
            <span className="material-symbols-outlined text-primary">info</span>
            AI Settings Guidelines
          </h3>
          <div className="space-y-sm text-on-surface-variant font-body-sm leading-relaxed">
            <p>
              By adding your own Google Gemini API key, this web application can leverage advanced LLM capabilities to instantly correct broken regional fonts, missing matras, and local script spelling corruptions commonly found in Aadhaar & Ayushman card text layers.
            </p>
            <ul className="list-disc pl-lg space-y-xs">
              <li>
                <strong>Strict Privacy Policy</strong>: Your API key is encrypted using AES-256-GCM protocol on our server before storing. It is never printed in console logs, never shared with developers, and never exposed in front-end requests.
              </li>
              <li>
                <strong>Scope Limitation</strong>: Gemini will only trigger for Aadhaar and Ayushman card parsing when local spelling confidence falls below 95%. It will never modify numbers (UID, ID, dates), photos, layout, font styling, templates, or coordinates.
              </li>
              <li>
                <strong>Automatic Bypass</strong>: For PAN, Voter, ABHA, and e-Shram cards, Gemini is completely disabled and will never run.
              </li>
              <li>
                <strong>Fallback Protection</strong>: If your key hits quota limits, fails authentication, or times out (10s limit), the system automatically falls back to our standard offline local-language repair engines.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
