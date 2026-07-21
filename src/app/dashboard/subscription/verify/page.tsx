import { verifyPaymentSession } from "../actions";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ order_id?: string; plan?: string }>;
}

export default async function VerifyPaymentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const orderId = params.order_id;
  const plan = params.plan;

  if (!orderId || !plan) {
    return (
      <div 
        style={{ maxWidth: '600px', width: '100%' }}
        className="mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl text-center shadow-xl"
      >
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Verification Request</h1>
        <p className="text-slate-600 mb-6">Missing order details or payment transaction parameters.</p>
        <Link 
          href="/dashboard/subscription" 
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95"
        >
          Back to Subscriptions
        </Link>
      </div>
    );
  }

  const result = await verifyPaymentSession(orderId, plan as any);

  return (
    <div 
      style={{ maxWidth: '640px', width: '100%' }}
      className="mx-auto my-8 p-8 bg-white border border-slate-200/80 rounded-3xl shadow-xl text-center relative overflow-hidden"
    >
      {/* Decorative Gradient Top Bar */}
      <div className={`absolute top-0 left-0 right-0 h-2 ${result.success ? 'bg-emerald-500' : 'bg-red-500'}`} />

      {result.success ? (
        <div className="flex flex-col items-center w-full">
          {/* Animated Success Badge */}
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-emerald-100">
            <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>

          <span className="px-4 py-1.5 bg-emerald-100/70 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            Payment Verified
          </span>

          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Payment Successful!</h1>
          
          <p style={{ maxWidth: '450px' }} className="text-slate-600 text-base mb-6 leading-relaxed">
            Your account has been upgraded to the <strong className="text-slate-900 uppercase font-bold">{plan}</strong> plan. Your card credits are now ready to use!
          </p>

          {/* Details Card */}
          <div className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Order Reference:</span>
              <span className="font-mono text-slate-900 font-semibold text-xs bg-white px-2.5 py-1 rounded-md border border-slate-200 break-all">
                {orderId}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-slate-200/60 pt-3">
              <span className="text-slate-500 font-medium">Selected Plan:</span>
              <span className="font-bold text-blue-600 uppercase">{plan} Plan</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-slate-200/60 pt-3">
              <span className="text-slate-500 font-medium">Status:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                COMPLETED
              </span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link 
              href="/dashboard/generate" 
              className="flex-1 py-3.5 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">credit_card</span>
              Generate PVC Card
            </Link>
            <Link 
              href="/dashboard" 
              className="flex-1 py-3.5 px-6 bg-slate-100 text-slate-800 font-semibold rounded-xl hover:bg-slate-200 transition-all border border-slate-200 flex items-center justify-center gap-2 active:scale-95"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full">
          {/* Failed Badge */}
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-red-100">
            <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              cancel
            </span>
          </div>

          <span className="px-4 py-1.5 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            Verification Failed
          </span>

          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Payment Not Completed</h1>
          
          <p style={{ maxWidth: '450px' }} className="text-slate-600 text-base mb-6 leading-relaxed">
            {result.message || 'We could not complete your credit top-up. No charges were made.'}
          </p>

          <div className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mb-6 text-left">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Order ID:</span>
              <span className="font-mono text-slate-900 text-xs bg-white px-2.5 py-1 rounded-md border border-slate-200 break-all">
                {orderId}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link 
              href="/dashboard/subscription" 
              className="flex-1 py-3.5 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center justify-center"
            >
              Try Again
            </Link>
            <Link 
              href="/dashboard" 
              className="flex-1 py-3.5 px-6 bg-slate-100 text-slate-800 font-semibold rounded-xl hover:bg-slate-200 transition-all border border-slate-200 flex items-center justify-center"
            >
              Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
