import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function TestVisionPage() {
  // Ensure user is logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  const isEnabled = process.env.ENABLE_VISION_OCR;

  let apiStatus = 'Not tested';
  let apiResponse = '';
  let errorDetail = '';

  if (apiKey) {
    try {
      // 1x1 base64 transparent pixel to check API authentication and quota
      const minBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: minBase64 },
              features: [{ type: 'TEXT_DETECTION' }],
            }
          ]
        })
      });
      
      apiStatus = `HTTP ${res.status} ${res.statusText}`;
      const responseText = await res.text();
      
      // Try parsing JSON formatting
      try {
        const parsed = JSON.parse(responseText);
        apiResponse = JSON.stringify(parsed, null, 2);
        if (parsed.responses?.[0]?.error) {
          errorDetail = parsed.responses[0].error.message;
        }
      } catch {
        apiResponse = responseText;
      }
    } catch (err: any) {
      apiStatus = 'Fetch failed';
      apiResponse = err.message || String(err);
      errorDetail = err.message || 'Network exception calling Google API.';
    }
  }

  return (
    <div className="max-w-[800px] mx-auto space-y-xl animate-fade-in pb-xl">
      {/* Page Header */}
      <div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Vision API Diagnostics</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Check connection status and credentials for Google Cloud Vision OCR.</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm p-xl space-y-lg">
        <div className="flex items-center gap-md pb-md border-b border-outline-variant/20">
          <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">troubleshoot</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Configuration Status</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-sm">
          <div className="space-y-xs">
            <span className="text-on-surface-variant font-label-md block">API Key present in .env.local</span>
            <div className="flex items-center gap-xs font-semibold">
              <span className={`material-symbols-outlined ${apiKey ? 'text-green-600' : 'text-error'}`}>
                {apiKey ? 'check_circle' : 'cancel'}
              </span>
              <span>
                {apiKey ? `Yes (Starts with ${apiKey.substring(0, 7)})` : 'No (GOOGLE_CLOUD_VISION_API_KEY missing)'}
              </span>
            </div>
          </div>

          <div className="space-y-xs">
            <span className="text-on-surface-variant font-label-md block">OCR Status (ENABLE_VISION_OCR)</span>
            <div className="flex items-center gap-xs font-semibold">
              <span className={`material-symbols-outlined ${isEnabled === 'true' ? 'text-green-600' : 'text-error'}`}>
                {isEnabled === 'true' ? 'check_circle' : 'cancel'}
              </span>
              <span>{isEnabled === 'true' ? 'Enabled' : `Disabled (Currently set to: ${isEnabled})`}</span>
            </div>
          </div>

          <div className="space-y-xs md:col-span-2">
            <span className="text-on-surface-variant font-label-md block">API Test Response Code</span>
            <div className="flex items-center gap-xs font-semibold">
              <span className={`material-symbols-outlined ${apiStatus.includes('200') ? 'text-green-600' : 'text-error'}`}>
                {apiStatus.includes('200') ? 'verified' : 'warning'}
              </span>
              <span className={apiStatus.includes('200') ? 'text-green-700' : 'text-error'}>{apiStatus}</span>
            </div>
          </div>
        </div>

        {errorDetail && (
          <div className="p-md rounded-xl bg-error/10 text-error border border-error/20 flex items-start gap-sm">
            <span className="material-symbols-outlined">report</span>
            <div className="space-y-xs text-sm">
              <p className="font-bold">Google Cloud Error Detected</p>
              <p>{errorDetail}</p>
              <p className="text-xs text-on-surface-variant mt-sm">
                Make sure the "Cloud Vision API" is enabled in your Google Cloud Project Console, and billing is active.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-xs pt-sm">
          <label className="font-label-md text-label-md text-on-surface-variant block">Raw Response Payload</label>
          <pre className="bg-surface-container-low border border-outline-variant/30 p-md rounded-xl overflow-x-auto text-xs font-mono max-h-[300px] text-on-surface-variant">
            {apiResponse || 'No response returned from test call.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
