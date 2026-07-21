import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { STATIC_REPAIR_MAP } from "@/utils/gujaratiRepair";
import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/utils/auth";

interface RepairEntry {
  original_word: string;
  corrected_word: string;
  frequency: number;
  updated_at: string;
  is_static?: boolean;
}

export default async function AdminRepairsPage() {
  async function addCustomRepair(formData: FormData) {
    "use server";
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      throw new Error("Forbidden: Admin access required");
    }

    const original = formData.get("original") as string;
    const corrected = formData.get("corrected") as string;
    
    if (!original?.trim() || !corrected?.trim()) {
      return;
    }
    
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from('gujarati_repairs')
        .upsert({
          language: 'gujarati',
          original_word: original.trim(),
          corrected_word: corrected.trim(),
          frequency: 100, // manual override gets high weight
          updated_at: new Date().toISOString()
        }, { onConflict: 'language,original_word' });
      
      if (error) {
        console.error("Failed to insert custom repair:", error.message);
      }
    } catch (err: any) {
      console.error("Database connection error in action:", err.message);
    }
    
    revalidatePath('/admin/repairs');
  }

  const supabase = await createClient();
  let dbRepairs: RepairEntry[] = [];
  let dbError = null;

  try {
    const { data, error } = await supabase
      .from('gujarati_repairs')
      .select('*')
      .order('frequency', { ascending: false })
      .limit(100);

    if (error) {
      dbError = error.message;
    } else if (data) {
      dbRepairs = data.map((d: any) => ({
        original_word: d.original_word,
        corrected_word: d.corrected_word,
        frequency: d.frequency,
        updated_at: d.updated_at,
        is_static: false
      }));
    }
  } catch (err: any) {
    dbError = err.message || "Database connection issue";
  }

  // Fallback to static precompiled mappings if DB fails or is empty
  const useFallback = dbError || dbRepairs.length === 0;
  let displayedRepairs = dbRepairs;

  if (useFallback) {
    // Convert static map entries to the same format
    const fallbackList: RepairEntry[] = [];
    const keys = Array.from(STATIC_REPAIR_MAP.keys()).slice(0, 100);
    keys.forEach(k => {
      fallbackList.push({
        original_word: k,
        corrected_word: STATIC_REPAIR_MAP.get(k)!,
        frequency: 1, // Static entries start with frequency 1
        updated_at: new Date().toISOString(),
        is_static: true
      });
    });
    displayedRepairs = fallbackList;
  }

  return (
    <div className="space-y-xl max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-background">Gujarati Joint-Word Repairs</h1>
          <p className="font-body-md text-on-surface-variant mt-xs">
            Monitor and repair font-extraction errors from native Aadhaar/PAN/Ayushman PDFs.
          </p>
        </div>
        <div>
          <span className="px-md py-sm bg-secondary/15 text-secondary border border-secondary/20 rounded-xl font-bold font-label-md tracking-wider flex items-center gap-xs shadow-sm">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Auto-Growing Database
          </span>
        </div>
      </div>

      {/* Add Custom Repair Form Card */}
      <section className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant/30 shadow-sm">
        <h2 className="font-label-lg text-on-surface font-bold mb-xs">
          Add Custom Word Mapping (નવો નિયમ ઉમેરો)
        </h2>
        <p className="font-body-sm text-on-surface-variant mb-md">
          Create rules to fix spelling errors. For example, map corrupt spelling <b>સવર</b> to <b>સિલ્વર</b> or <b>સટી</b> to <b>સિટી</b>.
        </p>
        <form action={addCustomRepair} className="grid grid-cols-1 md:grid-cols-3 gap-md items-end">
          <div className="space-y-xs">
            <label className="font-label-md text-on-surface-variant block">Corrupted / PDF Word (ખોટો શબ્દ)</label>
            <input
              type="text"
              name="original"
              required
              placeholder="e.g. સવર"
              className="w-full p-sm border border-outline-variant/30 rounded-lg bg-surface-container-low font-body-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-xs">
            <label className="font-label-md text-on-surface-variant block">Corrected Word (સાચો શબ્દ)</label>
            <input
              type="text"
              name="corrected"
              required
              placeholder="e.g. સિલ્વર"
              className="w-full p-sm border border-outline-variant/30 rounded-lg bg-surface-container-low font-body-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="py-sm px-lg bg-primary text-on-primary font-label-md rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-xs shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Save Rule (નિયમ સેવ કરો)
          </button>
        </form>
      </section>

      {dbError && (
        <div className="p-md rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm space-y-xs shadow-sm">
          <p className="font-bold flex items-center gap-xs">
            ⚠️ Supabase Migration Notice
          </p>
          <p className="font-body-sm leading-relaxed">
            The database table <code>public.gujarati_repairs</code> was not found. Please apply migration <code>005_gujarati_repairs.sql</code>. 
            Showing built-in precompiled static conjunct repairs in the meantime.
          </p>
        </div>
      )}

      {!dbError && dbRepairs.length === 0 && (
        <div className="p-md rounded-xl bg-info-container text-on-info-container bg-primary/10 border border-primary/20 text-sm space-y-xs shadow-sm">
          <p className="font-bold">
            ℹ️ No PDF extraction errors logged yet
          </p>
          <p className="font-body-sm leading-relaxed">
            The dynamic repair database is currently empty. As users upload native PDFs containing regional fonts with missing conjuncts, the database will capture and auto-grow repairs. 
            Showing the built-in dictionary repairs below.
          </p>
        </div>
      )}

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="p-lg border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
          <span className="font-label-lg text-on-surface font-bold">
            Top Repair Candidates ({displayedRepairs.length})
          </span>
          <span className="text-xs px-sm py-xs bg-outline-variant/20 rounded text-on-surface-variant uppercase font-mono">
            {useFallback ? "STATIC DICTIONARY" : "LIVE DATABASE"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/70 border-b border-outline-variant/30">
                <th className="p-md font-label-md text-on-surface-variant">Original Extracted (Corrupted)</th>
                <th className="p-md font-label-md text-on-surface-variant">Repaired / Correct Form</th>
                <th className="p-md font-label-md text-on-surface-variant text-center">Frequency</th>
                <th className="p-md font-label-md text-on-surface-variant">Type / Status</th>
                <th className="p-md font-label-md text-on-surface-variant">Last Encountered</th>
              </tr>
            </thead>
            <tbody>
              {displayedRepairs.map((r, index) => (
                <tr key={index} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50 transition-colors">
                  <td className="p-md font-headline-sm text-amber-500 font-bold tracking-wide">
                    {r.original_word}
                  </td>
                  <td className="p-md font-headline-sm text-emerald-500 font-bold tracking-wide">
                    {r.corrected_word}
                  </td>
                  <td className="p-md font-headline-md text-on-surface text-center">
                    <span className="px-sm py-xs bg-surface-container-high rounded-full font-bold">
                      {r.frequency}
                    </span>
                  </td>
                  <td className="p-md font-body-md text-on-surface">
                    {r.is_static ? (
                      <span className="px-sm py-xs bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold uppercase tracking-wider">
                        Compiled Rule
                      </span>
                    ) : (
                      <span className="px-sm py-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold uppercase tracking-wider">
                        Auto Learned
                      </span>
                    )}
                  </td>
                  <td className="p-md font-body-md text-on-surface-variant">
                    {format(new Date(r.updated_at), 'MMM dd, yyyy HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
