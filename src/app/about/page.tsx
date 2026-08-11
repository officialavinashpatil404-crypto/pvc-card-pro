import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-10 space-y-8 text-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">About Rapid PVC</h1>
        <Link href="/" className="text-xs font-semibold text-emerald-600 hover:underline">
          &larr; Back to Home
        </Link>
      </div>

      <div className="space-y-4 leading-relaxed text-slate-600 text-sm sm:text-base">
        <p className="font-medium text-slate-900">
          Rapid PVC is an online PVC card generation and document processing service for customers in India. Users can upload eligible documents and generate high-quality PVC card print-ready outputs through the web application.
        </p>
        <p>
          Rapid PVC is operated by <strong className="text-slate-900 font-semibold">Avinash Naval Patil</strong>.
        </p>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200/60 pb-2">Business Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400 block">Business Name</span>
            <span className="font-bold text-slate-900">Rapid PVC</span>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400 block">Legal Name</span>
            <span className="font-bold text-slate-900">Avinash Naval Patil</span>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400 block">Business Type</span>
            <span className="font-bold text-slate-900">Proprietorship</span>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400 block">Country</span>
            <span className="font-bold text-slate-900">India</span>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-500 font-medium">
        <Link href="/contact" className="hover:text-slate-900">Contact Us</Link> &bull;
        <Link href="/privacy-policy" className="hover:text-slate-900">Privacy Policy</Link> &bull;
        <Link href="/terms-conditions" className="hover:text-slate-900">Terms and Conditions</Link> &bull;
        <Link href="/refund-policy" className="hover:text-slate-900">Refund Policy</Link>
      </div>
    </div>
  );
}
