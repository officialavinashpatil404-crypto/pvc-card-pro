'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ExtractedData {
  documentType: string;
  name: string;
  dob: string;
  gender: string;
  documentNumber: string;
  address: string;
  photoBase64: string | null;
  qrBase64: string | null;
  signatureBase64?: string | null;
  signatureError?: string | null;
  frontCardBase64?: string | null;
  backCardBase64?: string | null;
  vid?: string | null;
  mobile?: string | null;
  photoError?: string | null;
  qrError?: string | null;
  localName?: string | null;
  localAddress?: string | null;
  issueDate?: string | null;
  detailsAsOn?: string | null;
  decryptedPdfBase64?: string | null;
  dobLine?: string | null;
  genderLine?: string | null;
  localAddressLabel?: string | null;
  textSource?: string;
  languageSource?: string;
  fatherName?: string | null;
  fatherNameLocal?: string | null;
  assemblyConstituency?: string | null;
  voterCropDebug?: any;
  village?: string | null;
  subdivision?: string | null;
  district?: string | null;
  state?: string | null;
  rationId?: string | null;
  aiRepaired?: boolean;
  aiWarning?: string | null;
  aiEnabled?: boolean;
}

type Step = 'upload' | 'review' | 'result';

// ─── Component ───────────────────────────────────────────────────────────────
export default function GenerateCardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-slate-500">Loading Generator Studio...</div>}>
      <GenerateCardContent />
    </Suspense>
  );
}

function GenerateCardContent() {
  const searchParams = useSearchParams();
  const docTypeParam = searchParams.get('type') || 'aadhaar';

  const [step, setStep] = useState<Step>('upload');

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Review state
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);

  // Result state
  const [isGenerating, setIsGenerating] = useState(false);
  const [frontPng, setFrontPng] = useState<string | null>(null);
  const [backPng, setBackPng] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState('');
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // ── Step 1: Upload & Extract ──────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setNeedsPassword(false);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped);
      setNeedsPassword(false);
      setError('');
    }
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsProcessing(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (password) formData.append('password', password);
      if (docTypeParam) formData.append('docType', docTypeParam.toUpperCase());

      const res = await fetch('/api/extract', { method: 'POST', body: formData });
      const contentType = res.headers.get('content-type') || '';
      let json: any = {};
      if (contentType.includes('application/json')) {
        json = await res.json();
      } else {
        const text = await res.text();
        console.error('[API/Extract Non-JSON response]:', text);
        setError(`Server Error (${res.status}): Unable to process PDF. Please check server logs.`);
        return;
      }

      if (!res.ok || json.error) {
        if (json.error === 'PASSWORD_REQUIRED') {
          setNeedsPassword(true);
        } else if (json.error === 'INVALID_PASSWORD') {
          setError('Incorrect password. Please try again.');
        } else {
          setError(json.error || 'Failed to process PDF.');
        }
        return;
      }

      setExtracted(json.data);
      console.log('[Extract Debug] OCR Logs from server:', json.data.ocrLogs);
      
      setStep('result');
      await handleGenerate(json.data);
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Step 2 → 3: Generate Card ─────────────────────────────────────────────
  const handleGenerate = async (dataToGenerate?: ExtractedData) => {
    const activeData = dataToGenerate || extracted;
    if (!activeData) return;
    setIsGenerating(true);
    setGenError('');
    setDebugLog([]);
    const logs: string[] = [];

    try {
      const docTypeUpper = activeData.documentType?.toUpperCase();
      if (docTypeUpper === 'PAN' || docTypeUpper === 'AYUSHMAN' || docTypeUpper === 'ABHA' || docTypeUpper === 'VOTER') {
        if (activeData.frontCardBase64) logs.push('✓ FRONT_CARD_EXTRACTED — front card region cropped');
        else logs.push('✗ FRONT_CARD_EXTRACTED — front card region not found');
        if (activeData.backCardBase64) logs.push('✓ BACK_CARD_EXTRACTED — back card region cropped');
        else logs.push('✗ BACK_CARD_EXTRACTED — back card region not found');
      } else {
        if (activeData.photoBase64) logs.push('✓ PHOTO_EXTRACTED — photo ready from PDF');
        else logs.push('✗ PHOTO_EXTRACTED — photo not found (placeholder used)');

        if (activeData.qrBase64) logs.push('✓ QR_EXTRACTED — QR code ready from PDF');
        else logs.push('✗ QR_EXTRACTED — QR not found (placeholder used)');
      }

      logs.push('… FRONT_RENDERED — rendering front card template');
      logs.push('… BACK_RENDERED — rendering back card template');
      setDebugLog([...logs]);

      const res = await fetch('/api/generate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activeData, exportType: 'pdf_a4' }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.details || data.error || 'Generation failed');

      if (data.frontPng) logs.push('✓ FRONT_PNG_CREATED — front PNG captured');
      if (data.backPng) logs.push('✓ BACK_PNG_CREATED — back PNG captured');
      if (data.pdfUrl) logs.push('✓ A4_PDF_CREATED — A4 PDF generated');
      setDebugLog([...logs]);

      setFrontPng(data.frontPng || null);
      setBackPng(data.backPng || null);
      setPdfUrl(data.pdfUrl || null);
      setStep('result');
    } catch (err: any) {
      setGenError(err.message || 'Failed to generate card. Please try again.');
      logs.push(`✗ ERROR — ${err.message}`);
      setDebugLog([...logs]);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Download helper ───────────────────────────────────────────────────────
  const download = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep('upload');
    setFile(null);
    setPassword('');
    setNeedsPassword(false);
    setError('');
    setExtracted(null);
    setFrontPng(null);
    setBackPng(null);
    setPdfUrl(null);
    setGenError('');
    setDebugLog([]);
  };

  const docTitle = docTypeParam === 'pan' ? 'PAN' : docTypeParam === 'ayushman' ? 'Ayushman' : docTypeParam === 'eshram' ? 'e-Shram' : docTypeParam === 'voter' ? 'Voting' : docTypeParam === 'abha' ? 'ABHA Health' : 'Aadhaar';
  const docDesc = docTypeParam === 'aadhaar'
    ? 'Upload your e-Aadhaar PDF — photo, text details and QR code are extracted automatically.'
    : `Upload your ${docTitle} Card PDF — details are extracted and aligned automatically.`;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-8">
      <style>{`
        @keyframes shram-progress {
          0% { left: -30%; width: 30%; }
          50% { left: 40%; width: 40%; }
          100% { left: 100%; width: 30%; }
        }
        .animate-shram-progress {
          position: absolute;
          top: 0;
          bottom: 0;
          animation: shram-progress 1.6s infinite ease-in-out;
        }
      `}</style>

      {/* Page Glass Header */}
      <section className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            Instant PVC Studio
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Generate {docTitle} PVC Card
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
            {docDesc}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/services"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
            Switch Service
          </Link>
        </div>
      </section>

      {/* Step Indicator Bar */}
      <StepIndicator current={step} />

      {/* ══════════════════ STEP 1: UPLOAD ══════════════════ */}
      {step === 'upload' && (
        <section className="bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
          <form onSubmit={handleExtract} className="space-y-6">

            {/* Drop Zone */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-6 sm:p-12 text-center transition-all cursor-pointer ${
                file 
                  ? 'border-primary bg-primary/5 shadow-inner' 
                  : 'border-slate-300 hover:border-primary hover:bg-blue-50/40 shadow-sm'
              }`}
              onClick={() => document.getElementById('pdf-input')?.click()}
            >
              <input
                id="pdf-input"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center gap-3">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  file ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : 'bg-primary/10 text-primary'
                }`}>
                  <span className="material-symbols-outlined text-[42px]">
                    {file ? 'task' : 'picture_as_pdf'}
                  </span>
                </div>
                {file ? (
                  <>
                    <div className="flex items-center gap-2 text-primary font-bold text-sm bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      {file.name}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {(file.size / 1024).toFixed(0)} KB · Click to choose a different PDF
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Drag & drop your {docTitle} PDF file here
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      or click to browse from device · Supports up to 10 MB PDF files
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Password Field */}
            {needsPassword && (
              <div className="space-y-2 bg-amber-50 p-4 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2 text-amber-800">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                  <span className="font-bold text-xs uppercase tracking-wider">
                    PDF Password Required
                  </span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                  {docTypeParam === 'aadhaar' ? (
                    <>
                      Enter the PDF password to unlock. For Aadhaar, it is the first 4 capital letters of your name + year of birth (e.g.{' '}
                      <code className="bg-amber-200/80 px-1.5 py-0.5 rounded text-xs font-mono font-bold">ABCD1990</code>).
                    </>
                  ) : (
                    <>Enter password to unlock PDF if required by issuer.</>
                  )}
                </p>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter PDF Password"
                  autoFocus
                  className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-xs font-bold text-slate-900"
                  required
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-red-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-red-600">error</span>
                  <span>{error}</span>
                </div>
                {error.includes('Recharge Required') && (
                  <Link href="/dashboard/subscription" className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-black text-xs hover:brightness-110 shrink-0 shadow-md flex items-center gap-1.5 justify-center">
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    Recharge ₹20 Now →
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!file || isProcessing}
              className="w-full py-3.5 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black rounded-2xl shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
            >
              {isProcessing ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  Extracting PDF Data…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                  Extract & Generate PVC Card
                </>
              )}
            </button>
          </form>
        </section>
      )}

      {/* ══════════════════ STEP 3: RESULT ══════════════════ */}
      {step === 'result' && (
        <section className="space-y-6">

          {/* Loading or Success Banner */}
          {isGenerating ? (
            <div 
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              className="p-8 bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xl gap-6 relative overflow-hidden text-center"
            >
              {/* Animated Top Border */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-500 via-white to-green-600"></div>

              {/* Glowing Card Animation */}
              <div className="relative flex items-center justify-center w-24 h-24 my-2">
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-75"></div>
                <div className="absolute inset-2 rounded-full border-4 border-dashed border-primary animate-spin"></div>
                <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <span className="material-symbols-outlined text-[36px] animate-pulse">credit_card</span>
                </div>
              </div>

              <div style={{ width: '100%', maxWidth: '448px' }} className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Generating High-Resolution PVC Card
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Cropping images, applying regional Indic language shaping, and creating standard A4 PDF layout...
                </p>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', maxWidth: '448px' }} className="h-2 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
                <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-primary to-blue-600 rounded-full animate-shram-progress"></div>
              </div>

              {/* Live Pipeline Logs */}
              {debugLog.length > 0 && (
                <div style={{ width: '100%', maxWidth: '448px' }} className="bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] leading-relaxed space-y-1 text-left shadow-inner">
                  <div className="text-emerald-400 font-bold flex items-center gap-2 border-b border-slate-800 pb-2 mb-2 uppercase tracking-wider text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Pipeline Process
                  </div>
                  <div className="space-y-1">
                    {debugLog.map((l, i) => {
                      const isSuccess = l.startsWith('✓');
                      const isFail = l.startsWith('✗');
                      return (
                        <div key={i} className="flex items-start gap-2">
                          <span className={isSuccess ? 'text-emerald-400 font-bold' : isFail ? 'text-red-400 font-bold' : 'text-blue-400'}>
                            {isSuccess ? '●' : isFail ? '■' : '○'}
                          </span>
                          <span className={isSuccess ? 'text-slate-200' : isFail ? 'text-red-400 font-medium' : 'text-slate-400'}>
                            {l.replace(/^[✓✗…]\s*/, '')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : genError ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl font-bold text-xs flex items-center gap-2 border border-red-200">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {genError}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold shadow-sm">
              <span className="material-symbols-outlined text-emerald-600 text-[22px]">check_circle</span>
              PVC Card generated successfully! Review side-by-side preview below and download.
            </div>
          )}

          {/* Card Previews (Side-by-Side on Desktop) */}
          {!isGenerating && !genError && (frontPng || backPng || pdfUrl) && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Front Preview */}
                {frontPng && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Front Card View</h2>
                    </div>
                    <div className="max-w-[600px] rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-white relative group">
                      <img
                        src={frontPng}
                        alt="PVC Card Front"
                        className="w-full block"
                      />
                    </div>
                  </div>
                )}

                {/* Back Preview */}
                {backPng && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Back Card View</h2>
                    </div>
                    <div className="max-w-[600px] rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-white relative group">
                      <img
                        src={backPng}
                        alt="PVC Card Back"
                        className="w-full block"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-Delete Warning Notice */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 shadow-md p-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shadow-sm">
                    <span className="material-symbols-outlined text-[28px]">timer</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="font-extrabold text-amber-900 text-sm leading-snug">
                        ⚠️ Download Files Now — Automatic Server Cleanup in 5 Minutes!
                      </p>
                      <p className="text-amber-800 text-xs mt-1 leading-relaxed font-medium">
                        Your generated PVC card files are temporarily held in encrypted memory and will be automatically purged in 5 minutes for privacy compliance. Download your print files immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Download Action Bar */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Download Ready Print Files
                </h3>
                <div className="flex flex-wrap gap-3">
                  {frontPng && (
                    <button
                      onClick={() => download(frontPng, `${docTypeParam}-pvc-front.png`)}
                      className="flex-1 min-w-[180px] py-3 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-primary text-[18px]">image</span>
                      Front Side PNG
                    </button>
                  )}
                  {backPng && (
                    <button
                      onClick={() => download(backPng, `${docTypeParam}-pvc-back.png`)}
                      className="flex-1 min-w-[180px] py-3 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-indigo-600 text-[18px]">image</span>
                      Back Side PNG
                    </button>
                  )}
                  {pdfUrl && (
                    <button
                      onClick={() => download(pdfUrl, `${docTypeParam}-pvc-a4.pdf`)}
                      className="flex-1 min-w-[180px] py-3.5 px-6 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                      Download Standard A4 PDF
                    </button>
                  )}
                </div>
              </div>

            </>
          )}

          {/* Start Over */}
          {(!isGenerating || genError) && (
            <div className="flex justify-center pt-2">
              <button
                onClick={reset}
                className="px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Print Another PVC Card
              </button>
            </div>
          )}
        </section>
      )}

    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string; icon: string }[] = [
    { id: 'upload', label: '1. Upload PDF File', icon: 'upload_file' },
    { id: 'result', label: '2. Download PVC Cards', icon: 'download' },
  ];
  const idx = steps.findIndex(s => s.id === current);

  return (
    <div className="bg-white/80 backdrop-blur-md px-6 py-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
              i < idx
                ? 'bg-emerald-500 text-white shadow-sm'
                : i === idx
                ? 'bg-primary text-white shadow-md shadow-primary/20 ring-2 ring-primary/20'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {i < idx
                ? <span className="material-symbols-outlined text-[16px]">check</span>
                : <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
              }
            </div>
            <span className={`text-xs font-extrabold ${i <= idx ? 'text-slate-900' : 'text-slate-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-1 mx-4 rounded-full transition-all ${i < idx ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
