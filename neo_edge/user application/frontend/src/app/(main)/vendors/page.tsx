import Link from "next/link";
import { ArrowLeft, Building2, ArrowRight } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';

interface Company { name: string; count: number; grade: string | null; color: string; }

async function getCompanies(): Promise<Company[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/companies`, { cache: 'no-store' });
        const data = await res.json();
        return data.success ? data.data : [];
    } catch (error) {
        console.error('Failed to fetch companies:', error);
        return [];
    }
}

const gradeBadge = (g?: string | null) => {
    switch ((g || "").toUpperCase()) {
        case "A": return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
        case "B": return "bg-sky-500/20 text-sky-300 border-sky-400/40";
        case "C": return "bg-amber-500/20 text-amber-300 border-amber-400/40";
        default: return "bg-zinc-500/20 text-zinc-300 border-zinc-400/40";
    }
};

export default async function CompanyExplorerPage() {
    const companies = await getCompanies();
    const totalRecords = companies.reduce((a, c) => a + c.count, 0);

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-5xl mx-auto px-6 pt-6">

                <Link href="/latest" className="inline-flex items-center gap-2 text-sm text-neo-text-secondary hover:text-neo-accent-a transition-colors mb-8">
                    <ArrowLeft size={16} /> Back to library
                </Link>

                <div className="flex items-center gap-3">
                    <Building2 size={22} className="text-neo-accent-a" />
                    <h1 className="text-2xl md:text-3xl font-bold text-neo-text-primary">Company Explorer</h1>
                </div>
                <p className="mt-2 text-sm text-neo-text-secondary">
                    {companies.length} companies · {totalRecords} firsthand records. Dot colour shows the strongest evidence grade. Click a company to see its deployments.
                </p>

                <div className="mt-4 flex items-center gap-4 text-[11px] text-neo-text-secondary">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> A</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500" /> B</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> C</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-500" /> D</span>
                </div>

                {companies.length === 0 ? (
                    <p className="mt-10 text-sm text-neo-text-secondary">No companies yet. They appear as records are published.</p>
                ) : (
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {companies.map((c) => (
                            <Link
                                key={c.name}
                                href={`/latest?company=${encodeURIComponent(c.name)}`}
                                className="group flex flex-col justify-between rounded-xl border border-neo-divider bg-neo-panel p-5 hover:border-neo-accent-a/50 hover:bg-neo-panel-hover transition-all min-h-[120px]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5">
                                        <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${c.color}`} />
                                        <span className="text-base font-semibold text-neo-text-primary leading-snug group-hover:text-neo-accent-a transition-colors">{c.name}</span>
                                    </div>
                                    {c.grade && <span className={`px-2 py-0.5 rounded text-xs font-bold border shrink-0 ${gradeBadge(c.grade)}`}>{c.grade}</span>}
                                </div>
                                <div className="flex items-center justify-between mt-4 text-xs text-neo-text-secondary">
                                    <span>{c.count} {c.count === 1 ? "record" : "records"}</span>
                                    <ArrowRight size={14} className="text-neo-text-secondary group-hover:text-neo-accent-a transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
