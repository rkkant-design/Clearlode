import { ArrowLeft, Play, CircleCheck } from "lucide-react";
import Link from "next/link";

async function getVideoData(id: string) {
    try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';
        const res = await fetch(`${API_BASE_URL}/api/video/${id}`, { cache: 'no-store' });
        const data = await res.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('Failed to fetch video:', error);
        return null;
    }
}

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ from?: string }>;
}

const asText = (v: any): string => {
    if (!v) return "";
    if (typeof v === "string") return v;
    return v.text || v.description || v.narrative || "";
};
const asArray = (v: any): any[] => (Array.isArray(v) ? v : v ? [v] : []);

const gradeClasses = (g?: string | null) => {
    switch ((g || "").toUpperCase()) {
        case "A": return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
        case "B": return "bg-sky-500/20 text-sky-300 border-sky-400/40";
        case "C": return "bg-amber-500/20 text-amber-300 border-amber-400/40";
        default: return "bg-zinc-500/20 text-zinc-300 border-zinc-400/40";
    }
};

export default async function VideoAnalysisPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { from } = await searchParams;
    const video = await getVideoData(id);
    const backHref = from === 'feed' ? '/feed' : '/latest';

    if (!video) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-neo-text-primary mb-4">Record not found</h1>
                    <Link href={backHref} className="text-neo-accent-a hover:underline">← Back to library</Link>
                </div>
            </div>
        );
    }

    const e = video.extraction || {};
    const meta = e.metadata || {};
    const feed = video.feed || {};

    const operator: string | null = Array.isArray(meta.speakers) && meta.speakers.length > 0 ? meta.speakers[0] : null;
    const company: string = (Array.isArray(meta.organizations) && meta.organizations[0]) || feed.vendor || video.channel_title || "";
    const grade: string | null = meta.evidence_grade || null;
    const gradeRationale: string | null = meta.grade_rationale || null;
    const sourceType: string | null = meta.source_type || null;
    const recordedAt: string | null = meta.recorded_at || null;
    const workflow: string | null = asArray(e.key_words).find((t) => typeof t === "string") || null;

    const headline: string = feed.headline || video.title;
    const lead: string = feed.summary || asArray(e.key_insight)[0] || "";
    const results: string[] = asArray(feed.highlights).filter((h) => typeof h === "string" && h.trim()).slice(0, 4);

    const whatTheyDid: string = asText(asArray(e.use_cases_applications)[0]) || asText(e.business_value_narrative);
    const whyItMatters: string = asText(e.business_value_narrative) || asText(e.customer_experience_dimension);
    const boundaries = asArray(e.risks_constraints);
    const quotes = asArray(e.quotable_insights).filter((q: any) => q && (q.quote || typeof q === "string"));

    const dateLabel = recordedAt
        ? new Date(recordedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
        : new Date(video.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" });
    const sourceLabel = sourceType ? sourceType[0].toUpperCase() + sourceType.slice(1) : "Source video";

    const videoBase: string = video.video_url || `https://www.youtube.com/watch?v=${id}`;
    const stampLink = (sec: number) => `${videoBase}${videoBase.includes("?") ? "&" : "?"}t=${sec}s`;
    const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-3xl mx-auto px-6 pt-6">

                <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-neo-text-secondary hover:text-neo-accent-a transition-colors mb-8">
                    <ArrowLeft size={16} /> Back to library
                </Link>

                {/* Eyebrow */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neo-text-secondary">
                    <span className="text-neo-text-primary font-medium">{company}</span>
                    {workflow && <><span className="opacity-40">·</span><span>{workflow}</span></>}
                    {grade && (
                        <>
                            <span className="opacity-40">·</span>
                            <span title={gradeRationale || undefined} className={`px-2 py-0.5 rounded text-xs font-bold border ${gradeClasses(grade)}`}>Grade {grade}</span>
                        </>
                    )}
                </div>

                {/* Headline */}
                <h1 className="mt-2 text-2xl md:text-3xl font-bold text-neo-text-primary leading-tight">{headline}</h1>

                {/* Byline */}
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neo-text-secondary">
                    {operator && <span>{operator}</span>}
                    <span className="opacity-40">·</span>
                    <span>{sourceLabel}{meta.event ? `, ${meta.event}` : ""} · {dateLabel}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-400"><CircleCheck size={13} /> verified</span>
                </div>

                {/* View toggle */}
                <Link href={`/latest/${id}/playbook`} className="mt-3 inline-flex items-center gap-1.5 text-xs text-neo-accent-a hover:underline">
                    View as implementation playbook &rarr;
                </Link>

                {/* Lead */}
                {lead && <p className="mt-5 text-base text-neo-text-primary leading-relaxed">{lead}</p>}

                {/* Key results */}
                {results.length > 0 && (
                    <div className={`mt-6 grid gap-3 ${results.length >= 3 ? 'sm:grid-cols-3' : results.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
                        {results.map((r, i) => (
                            <div key={i} className="rounded-xl bg-neo-panel border border-neo-divider p-4">
                                <p className="text-sm font-medium text-neo-text-primary leading-snug">{r}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 space-y-7">
                    {whatTheyDid && <Block title="What they did">{whatTheyDid}</Block>}
                    {whyItMatters && whyItMatters !== whatTheyDid && <Block title="Why it matters">{whyItMatters}</Block>}

                    {boundaries.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-neo-text-primary mb-2">Watch-outs</h2>
                            <ul className="space-y-2">
                                {boundaries.map((b: any, i: number) => (
                                    <li key={i} className="flex gap-2.5 text-sm text-neo-text-secondary leading-relaxed">
                                        <span className="mt-2 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                                        <span>
                                            {b.risk_label && <span className="font-medium text-neo-text-primary">{b.risk_label}: </span>}
                                            {b.risk_text || asText(b)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {quotes.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-neo-text-primary mb-3">In their words</h2>
                            <div className="space-y-4">
                                {quotes.map((q: any, i: number) => (
                                    <blockquote key={i} className="border-l-2 border-neo-accent-b/50 pl-4">
                                        <p className="text-sm italic text-neo-text-primary leading-relaxed">&ldquo;{typeof q === "string" ? q : q.quote}&rdquo;</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-neo-text-secondary">
                                            {[q.speaker, sourceType].filter(Boolean).length > 0 && (
                                                <span>{[q.speaker, sourceType].filter(Boolean).join(" · ")}</span>
                                            )}
                                            {typeof q.timestamp_seconds === "number" && (
                                                <a href={stampLink(q.timestamp_seconds)} target="_blank" rel="noopener noreferrer"
                                                   className="inline-flex items-center gap-1 text-neo-accent-a hover:underline font-mono">
                                                    <Play size={11} fill="currentColor" /> {mmss(q.timestamp_seconds)}
                                                </a>
                                            )}
                                        </div>
                                    </blockquote>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Source + grade footer */}
                    <div className="pt-5 border-t border-neo-divider space-y-3">
                        {video.video_url && (
                            <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-neo-accent-a hover:underline">
                                <Play size={13} fill="currentColor" /> {sourceLabel}{recordedAt ? `, ${new Date(recordedAt).toLocaleDateString()}` : ""} (firsthand)
                            </a>
                        )}
                        {grade && (
                            <p className="text-xs text-neo-text-secondary leading-relaxed">
                                <span className={`inline-block px-1.5 py-0.5 rounded font-bold border mr-2 ${gradeClasses(grade)}`}>Grade {grade}</span>
                                {gradeRationale || "Graded on source strength, baseline presence and metric hygiene."}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h2 className="text-sm font-semibold text-neo-text-primary mb-2">{title}</h2>
            <p className="text-sm text-neo-text-secondary leading-relaxed">{children}</p>
        </div>
    );
}
