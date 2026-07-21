'use client';

import { useState } from 'react';
import { updateBanner } from './actions';

interface BannerFormProps {
  initialImageUrl?: string;
  initialLinkUrl?: string;
}

export default function BannerForm({ initialImageUrl = '', initialLinkUrl = '' }: BannerFormProps) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [linkUrl, setLinkUrl] = useState(initialLinkUrl);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      setMessage({ type: 'error', text: 'Image URL is required' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const res = await updateBanner(imageUrl.trim(), linkUrl.trim());
    setLoading(false);

    if (res.success) {
      setMessage({ type: 'success', text: 'Dashboard banner updated successfully!' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update banner' });
    }
  };

  return (
    <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant/30 shadow-sm space-y-md">
      <h2 className="font-headline-md text-headline-md text-on-surface">Manage Dynamic Dashboard Banner</h2>
      <p className="text-on-surface-variant text-body-md">
        Add or update the advertisement image shown in the banner slot at the bottom of the user dashboard.
      </p>

      <form onSubmit={handleSubmit} className="space-y-md">
        <div className="space-y-xs">
          <label className="font-label-md text-on-surface-variant block">Banner Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/banner.jpg"
            className="w-full px-md py-sm bg-surface-container rounded-lg border border-outline-variant focus:outline-none focus:border-primary text-on-surface text-body-md"
            required
          />
        </div>

        <div className="space-y-xs">
          <label className="font-label-md text-on-surface-variant block">Target Redirect Link URL (Optional)</label>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com/offers"
            className="w-full px-md py-sm bg-surface-container rounded-lg border border-outline-variant focus:outline-none focus:border-primary text-on-surface text-body-md"
          />
        </div>

        {imageUrl && (
          <div className="space-y-xs">
            <span className="font-label-md text-on-surface-variant block">Live Banner Preview</span>
            <div className="border-2 border-dashed border-outline-variant/50 rounded-lg p-sm bg-surface-container-low max-h-48 overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Banner Live Preview"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
                className="max-w-full max-h-40 rounded object-contain"
              />
            </div>
          </div>
        )}

        {message && (
          <div className={`p-md rounded-lg text-body-md ${message.type === 'success' ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'}`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-md px-lg bg-primary hover:bg-primary/90 text-on-primary font-label-lg rounded-lg shadow transition-all duration-200 flex items-center justify-center disabled:opacity-50"
        >
          {loading ? 'Updating Banner...' : 'Save Banner Image'}
        </button>
      </form>
    </div>
  );
}
