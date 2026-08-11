export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto p-xl space-y-lg">
      <h1 className="font-headline-xl">Contact Us</h1>
      <p className="font-body-md text-on-surface-variant">We're here to help CSC operators maximize their efficiency.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-xl mt-lg">
        <div className="space-y-md">
          <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant/30 flex items-center gap-md">
            <span className="material-symbols-outlined text-primary text-[32px]">email</span>
            <div>
              <p className="font-label-md">Email Support</p>
              <a href="mailto:support@pvccardpro.com" className="font-body-md text-primary hover:underline">support@pvccardpro.com</a>
            </div>
          </div>
          
          <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant/30 flex items-center gap-md">
            <span className="material-symbols-outlined text-secondary text-[32px]">call</span>
            <div>
              <p className="font-label-md">Phone Support</p>
              <p className="font-body-md text-on-surface-variant">+91 98765 43210 (Mon-Sat, 10 AM - 6 PM)</p>
            </div>
          </div>
          
          <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant/30 flex items-center gap-md">
            <span className="material-symbols-outlined text-tertiary text-[32px]">location_on</span>
            <div>
              <p className="font-label-md">Office Address</p>
              <p className="font-body-md text-on-surface-variant">Tech Park, Sector 45, New Delhi, India 110001</p>
            </div>
          </div>
        </div>

        <form className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant/30 shadow-sm space-y-md">
          <h2 className="font-headline-sm">Send us a message</h2>
          <div className="space-y-xs">
            <label className="font-label-sm">Name</label>
            <input type="text" className="w-full p-sm bg-surface-container rounded-lg border border-outline-variant/50 focus:ring-2 focus:ring-primary outline-none" required />
          </div>
          <div className="space-y-xs">
            <label className="font-label-sm">Email</label>
            <input type="email" className="w-full p-sm bg-surface-container rounded-lg border border-outline-variant/50 focus:ring-2 focus:ring-primary outline-none" required />
          </div>
          <div className="space-y-xs">
            <label className="font-label-sm">Message</label>
            <textarea rows={4} className="w-full p-sm bg-surface-container rounded-lg border border-outline-variant/50 focus:ring-2 focus:ring-primary outline-none" required></textarea>
          </div>
          <button type="button" className="w-full py-sm bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary/90 transition-colors">Submit</button>
        </form>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 mt-lg">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200/60 pb-2">Business Information</h2>
        <p className="text-sm font-medium text-slate-700">
          Rapid PVC is operated by <strong className="text-slate-900 font-semibold">Avinash Naval Patil</strong>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
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
    </div>
  );
}
