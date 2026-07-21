import Link from 'next/link'
import { createClient } from "@/utils/supabase/server"

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: banner } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const services = [
    {
      id: 'aadhaar',
      name: 'Aadhaar PVC Card',
      desc: 'Standard UIDAI government print specification with front/back auto-layout.',
      price: '₹0.90 / card',
      icon: 'fingerprint',
      gradient: 'from-blue-600 to-indigo-600',
      bg: 'from-white to-blue-50/60',
      border: 'border-blue-100 hover:border-blue-500/50',
      tag: '🔥 Most Popular'
    },
    {
      id: 'pan',
      name: 'PAN PVC Card',
      desc: 'NSDL & UTI e-PAN PDF crop and ultra-crisp PVC print layout.',
      price: '₹0.90 / card',
      icon: 'credit_card',
      gradient: 'from-indigo-600 to-purple-600',
      bg: 'from-white to-indigo-50/60',
      border: 'border-indigo-100 hover:border-indigo-500/50',
      tag: 'Instant OCR'
    },
    {
      id: 'ayushman',
      name: 'Ayushman PVC Card',
      desc: 'PMJAY Health Card with multi-lingual Indic translation support.',
      price: '₹0.90 / card',
      icon: 'health_and_safety',
      gradient: 'from-emerald-600 to-teal-600',
      bg: 'from-white to-emerald-50/60',
      border: 'border-emerald-100 hover:border-emerald-500/50',
      tag: '8 Languages'
    },
    {
      id: 'eshram',
      name: 'e-Shram Labour Card',
      desc: 'e-Shram card auto-crop and standard PVC identity card layout.',
      price: '₹0.90 / card',
      icon: 'engineering',
      gradient: 'from-amber-500 to-orange-600',
      bg: 'from-white to-amber-50/60',
      border: 'border-amber-100 hover:border-amber-500/50',
      tag: 'Labour Card'
    },
    {
      id: 'voter',
      name: 'Voting ID Card',
      desc: 'EPIC Voter Card front & back automatic PDF detection and formatting.',
      price: '₹0.90 / card',
      icon: 'how_to_vote',
      gradient: 'from-sky-600 to-blue-700',
      bg: 'from-white to-sky-50/60',
      border: 'border-sky-100 hover:border-sky-500/50',
      tag: 'EPIC Format'
    },
    {
      id: 'abha',
      name: 'ABHA Health Card',
      desc: 'Ayushman Bharat Health Account (ABHA) ID card generator.',
      price: '₹0.90 / card',
      icon: 'medical_services',
      gradient: 'from-teal-600 to-cyan-600',
      bg: 'from-white to-teal-50/60',
      border: 'border-teal-100 hover:border-teal-500/50',
      tag: 'Health ID'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-8">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
        <span className="text-xs font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
          All-in-One PVC Platform
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Available PVC Printing Services</h1>
        <p className="text-slate-600 text-sm font-medium" style={{ maxWidth: '650px' }}>
          Select any card type below to extract PDF data, fix local language scripts with AI, and generate high-resolution print-ready PVC cards.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s) => (
          <Link
            key={s.id}
            href={`/dashboard/generate?type=${s.id}`}
            className={`group relative bg-gradient-to-b ${s.bg} p-6 rounded-3xl border ${s.border} shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${s.gradient} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <span className="material-symbols-outlined text-[28px]">{s.icon}</span>
                </div>
                <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                  {s.price}
                </span>
              </div>

              <div className="space-y-1.5 mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-primary transition-colors">{s.name}</h3>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">{s.desc}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 text-xs font-bold text-primary">
              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-extrabold">
                {s.tag}
              </span>
              <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Start Print &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Dynamic Advertisement Banner */}
      {banner && (
        <div className="w-full pt-4">
          {banner.link_url ? (
            <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="block transition-all hover:scale-[1.005] hover:brightness-105 duration-200 shadow-md hover:shadow-xl rounded-2xl overflow-hidden border border-slate-200/80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner.image_url} alt="Advertisement Banner" className="w-full h-auto object-cover max-h-[825px]" />
            </a>
          ) : (
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner.image_url} alt="System Announcement Banner" className="w-full h-auto object-cover max-h-[825px]" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
