import Link from "next/link";
import { ArrowLeft, BarChart3, Hash } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';

interface BenchRecord { videoId: string; company: string; grade: string | null; title: string; outcomes: string[]; tags: string[]; sourceType: string | null; }
interface Benchmarks { total: number; gradeDistribution: Record<string, number>; tagCoverage: { tag: string; count: number }[]; records: BenchRecord[]; }

async function getBenchmarks(): Promise<Benchmarks | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/benchmarks`, { cache: 'no-store' });
        const data = await res.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('Failed to fetch benchmarks:', error);
        return null;
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
const gradeBar = (g: string) => g === "A" ? "bg-emerald-500" : g === "B" ? "bg-sky-500" : g === "C" ? "bg-amber-500" : "bg-zinc-500";

export default async function BenchmarksPage() {
    const b = await getBenchmarks();

    if (!b || b.total === 0) {
        return (
            <div className="min-h-screen max-w-5xl mx-auto px-6 pt-6">
                <Link href="/latest" className="inline-flex items-center gap-2 text-sm text-neo-text-secondary hover:text-neo-accent-a mb-8"><ArrowLeft size={16} /> Back to library</Link>
                <h1 className="text-2xl font-bold text-neo-text-primary">Benchmarks</h1>
                <p className="mt-2 text-sm text-neo-text-secondary">No records yet. Benchmarks appear as the library grows.</p>
            </div>
        );
    }

    const grades = ["A", "B", "C", "D"];
    const maxGrade = Math.max(1, ...grades.map(g => b.gradeDistribution[g] || 0));
    const maxTag = Math.max(1, ...b.tagCoverage.map(t => t.count));

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-5xl mx-auto px-6 pt-6">

                <Link href="/latest" className="inline-flex items-center gap-2 text-sm text-neo-text-secondary hover:text-neo-accent-a transition-colors mb-8">
                    <ArrowLeft size={16} /> Back to library
                </Link>

                <div className="flex items-center gap-3">
                    <BarChart3 size={22} className="text-neo-accent-a" />
                    <h1 className="text-2xl md:text-3xl font-bold text-neo-text-primary">Benchmarks</h1>
                </div>
                <p className="mt-2 text-sm text-neo-text-secondary">Patterns across {b.total} firsthand records. Outcomes below are self-reported by the operators and not independently verified.</p>

                {/* Evidence grade distribution */}
                <section className="mt-8">
                    <h2 className="text-sm font-semibold text-neo-text-primary mb-4">Evidence quality</h2>
                    <div className="space-y-3 max-w-md">
                        {grades.map(g => {
                            const n = b.gradeDistribution[g] || 0;
                            return (
                                <div key={g} className="flex items-center gap-3">
                                    <span className="w-16 text-xs text-neo-text-secondary">Grade {g}</span>
                                    <div className="flex-1 h-5 bg-neo-panel rounded-md overflow-hidden border border-neo-divider">
                                        <div className={`h-full ${gradeBar(g)} opacity-80`} style={{ width: `${(n / maxGrade) * 100}%` }} />
                                    </div>
                                    <span className="w-6 text-right text-xs font-mono text-neo-text-primary">{n}</span>
                                </div>
                            );
                        })}
                    </div>
                    <p className="mt-3 text-xs text-neo-text-secondary">A independent/audited · B first-party with metrics · C qualitative or vendor talk · D demo/unverified.</p>
                </section>

                {/* Workflow / tag coverage */}
                <section className="mt-10">
                    <h2 className="text-sm font-semibold text-neo-text-primary mb-4">Workflow coverage</h2>
                    <div className="flex flex-wrap gap-2">
                        {b.tagCoverage.map(t => (
                            <Link key={t.tag} href={`/latest?tag=${encodeURIComponent(t.tag)}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neo-panel border border-neo-divider text-xs text-neo-text-secondary hover:text-neo-text-primary hover:border-neo-accent-a/50 transition-colors">
                                <Hash size={11} className="text-neo-accent-b" />{t.tag}
                                <span className="text-neo-text-primary font-mono">{t.count}</span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Reported outcomes across records */}
                <section className="mt-10">
                    <h2 className="text-sm font-semibold text-neo-text-primary mb-1">Reported outcomes across records</h2>
                    <p className="text-[11px] text-amber-400/80 mb-4">Self-reported, not independently verified. Mind the metric definitions on each record.</p>
                    <div className="space-y-2">
                        {b.records.map(r => (
                            <Link key={r.videoId} href={`/latest/${r.videoId}`} className="block rounded-xl border border-neo-divider bg-neo-panel p-4 hover:border-neo-accent-a/40 hover:bg-neo-panel-hover transition-all">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-neo-text-primary">{r.company || "—"}</span>
                                            {r.grade && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${gradeBadge(r.grade)}`}>{r.grade}</span>}
                                        </div>
                                        <p className="text-xs text-neo-text-secondary mt-0.5 line-clamp-1">{r.title}</p>
                                    </div>
                                </div>
                                {r.outcomes.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                                        {r.outcomes.map((o, i) => <span key={i} className="px-2 py-0.5 rounded-md bg-neo-bg border border-neo-divider text-[11px] text-neo-text-secondary">{o}</span>)}
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
