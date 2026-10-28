import { ArrowLeft, Play, Wrench, Boxes, ListChecks, Users, AlertTriangle, GitCompare, Coins, TrendingUp, Info, Clock, CircleCheck, Ruler } from "lucide-react";
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

interface PageProps { params: Promise<{ id: string }>; }

const asText = (v: any): string => {
    if (!v) return "";
    if (typeof v === "string") return v;
    return v.text || v.description || v.narrative || v.technology_text || "";
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

export default async function PlaybookPage({ params }: PageProps) {
    const { id } = await params;
    const video = await getVideoData(id);

    if (!video) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-neo-text-primary mb-4">Record not found</h1>
                    <Link href="/latest" className="text-neo-accent-a hover:underline">← Back to library</Link>
                </div>
            </div>
        );
    }

    const e = video.extraction || {};
    const meta = e.metadata || {};
    const feed = video.feed || {};

    const company: string = (Array.isArray(meta.organizations) && meta.organizations[0]) || feed.vendor || video.channel_title || "This company";
    const operator: string | null = Array.isArray(meta.speakers) && meta.speakers.length > 0 ? meta.speakers[0] : null;
    const grade: string | null = meta.evidence_grade || null;
    const sourceType: string | null = meta.source_type || null;
    const recordedAt: string | null = meta.recorded_at || null;

    const useCase = asArray(e.use_cases_applications)[0] || {};
    const approach: string = asText(useCase) || asText(e.business_value_narrative);
    const stack: string[] = asArray(useCase.tools_apis).filter(Boolean);
    const steps: string[] = asArray(useCase.actions).filter(Boolean);
    const channels: string[] = asArray(useCase.channels).filter(Boolean);
    const tech = asArray(e.enabling_technologies);
    const orgPrereq: string = asText(e.organizational_implications);
    const owner = asArray(e.personas_roles_context)[0];
    const pitfalls = asArray(e.risks_constraints);
    const enr = meta.enrichment || {};
    const altList = asArray(enr.alternatives);
    const prereqs = asArray(enr.prerequisites).filter(Boolean);
    const metricDefs = asArray(enr.metric_definitions).filter((m: any) => m && (m.metric || m.means));
    const outcomes: string[] = asArray(feed.highlights).filter((h) => typeof h === "string" && h.trim());
    const quotes = asArray(e.quotable_insights).filter((q: any) => q && (q.quote || typeof q === "string"));

    const videoBase: string = video.video_url || `https://www.youtube.com/watch?v=${id}`;
    const stampLink = (sec: number) => `${videoBase}${videoBase.includes("?") ? "&" : "?"}t=${sec}s`;
    const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
    const dateLabel = recordedAt
        ? new Date(recordedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
        : new Date(video.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" });

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-3xl mx-auto px-6 pt-6">

                <Link href={`/latest/${id}`} className="inline-flex items-center gap-2 text-sm text-neo-text-secondary hover:text-neo-accent-a transition-colors mb-8">
                    <ArrowLeft size={16} /> Back to the record
                </Link>

                {/* Header */}
                <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-neo-accent-a">Implementation playbook</div>
                <h1 className="mt-2 text-2xl md:text-3xl font-bold text-neo-text-primary leading-tight">How {company} built it</h1>
                {useCase.name && <p className="mt-1 text-base text-neo-text-secondary">{useCase.name}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neo-text-secondary">
                    {operator && <span>{operator}</span>}
                    <span className="opacity-40">·</span>
                    <span>{sourceType ? sourceType[0].toUpperCase() + sourceType.slice(1) : "Source"} · {dateLabel}</span>
                    {grade && <span title="Evidence grade" className={`px-2 py-0.5 rounded text-xs font-bold border ${gradeClasses(grade)}`}>Grade {grade}</span>}
                </div>
                {enr.time_to_value && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-neo-text-secondary"><Clock size={13} className="text-neo-accent-b" /> Time to value: {enr.time_to_value}</div>
                )}

                <div className="mt-8 space-y-8">

                    {/* The approach */}
                    {approach && (
                        <section>
                            <h2 className="text-sm font-semibold text-neo-text-primary mb-2">The approach</h2>
                            <p className="text-sm text-neo-text-secondary leading-relaxed">{approach}</p>
                        </section>
                    )}

                    {/* What you'd need to replicate this — the playbook value-add */}
                    <section className="rounded-xl border border-neo-accent-a/30 bg-neo-accent-a/5 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-neo-text-primary mb-4">
                            <ListChecks size={16} className="text-neo-accent-a" /> What you&rsquo;d need to replicate this
                        </h2>
                        <div className="space-y-4">
                            {stack.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-neo-accent-b mb-2"><Boxes size={13} /> Stack to assemble</div>
                                    <div className="flex flex-wrap gap-2">
                                        {stack.map((s, i) => <span key={i} className="px-2 py-0.5 rounded-md bg-neo-bg border border-neo-divider text-xs text-neo-text-primary">{s}</span>)}
                                    </div>
                                </div>
                            )}
                            {tech.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-neo-accent-b mb-2"><Wrench size={13} /> Key integration</div>
                                    {tech.map((t: any, i: number) => (
                                        <p key={i} className="text-sm text-neo-text-secondary leading-relaxed">
                                            {t.technology_label && <span className="font-medium text-neo-text-primary">{t.technology_label}: </span>}
                                            {asText(t)}
                                        </p>
                                    ))}
                                </div>
                            )}
                            {orgPrereq && (
                                <div>
                                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-neo-accent-b mb-2"><Users size={13} /> Org prerequisites</div>
                                    <p className="text-sm text-neo-text-secondary leading-relaxed">{orgPrereq}</p>
                                </div>
                            )}
                            {owner && (owner.persona || owner.role) && (
                                <div>
                                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-neo-accent-b mb-2"><Users size={13} /> Who should own it</div>
                                    <p className="text-sm text-neo-text-secondary leading-relaxed">
                                        {owner.persona && <span className="font-medium text-neo-text-primary">{owner.persona}</span>}
                                        {owner.role && <span> &mdash; {owner.role}</span>}
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Prerequisites / readiness */}
                    {prereqs.length > 0 && (
                        <section>
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-neo-text-primary mb-3"><CircleCheck size={15} className="text-neo-accent-a" /> Before you start &mdash; readiness</h2>
                            <ul className="space-y-2">
                                {prereqs.map((p: string, i: number) => (
                                    <li key={i} className="flex gap-2.5 text-sm text-neo-text-secondary leading-relaxed">
                                        <CircleCheck size={15} className="mt-0.5 text-neo-text-secondary shrink-0" />
                                        <span>{p}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Analyst layer: alternatives, cost, ROI — clearly NOT from the source */}
                    {(altList.length > 0 || enr.cost || enr.roi) && (
                        <section className="rounded-xl border border-neo-divider bg-neo-panel/30 p-5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-neo-text-primary">
                                <Info size={15} className="text-neo-accent-b" /> Alternatives, cost and ROI
                            </div>
                            <p className="text-[11px] text-amber-400/80 mt-1 mb-4">
                                Market context and framework from FieldNote analysis &mdash; not stated by the deployer.
                            </p>

                            {altList.length > 0 && (
                                <div className="mb-5">
                                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-neo-accent-b mb-2"><GitCompare size={13} /> Alternatives to this stack</div>
                                    <div className="space-y-3">
                                        {altList.map((a: any, i: number) => (
                                            <div key={i} className="text-sm text-neo-text-secondary">
                                                <span className="text-neo-text-primary font-medium">{a.used}</span>{a.category && <span className="text-xs"> &middot; {a.category}</span>}
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {asArray(a.options).map((o: string, j: number) => <span key={j} className="px-2 py-0.5 rounded-md bg-neo-bg border border-neo-divider text-xs">{o}</span>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {enr.cost && (
                                <div className="mb-5">
                                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-neo-accent-b mb-2"><Coins size={13} /> What it likely costs</div>
                                    {enr.cost.disclosed === false && <p className="text-sm text-amber-400/90 mb-2">Not disclosed. {enr.cost.note}</p>}
                                    <ul className="space-y-1.5">
                                        {asArray(enr.cost.drivers).map((d: string, i: number) => (
                                            <li key={i} className="flex gap-2 text-sm text-neo-text-secondary leading-relaxed"><span className="mt-2 w-1 h-1 rounded-full bg-neo-accent-b shrink-0" /><span>{d}</span></li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {enr.roi && (
                                <div>
                                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-neo-accent-b mb-2"><TrendingUp size={13} /> ROI</div>
                                    {enr.roi.claimed_benefit && <p className="text-sm text-neo-text-secondary leading-relaxed"><span className="text-neo-text-primary font-medium">Claimed benefit: </span>{enr.roi.claimed_benefit}</p>}
                                    {enr.roi.missing && <p className="text-sm text-amber-400/90 leading-relaxed mt-1">{enr.roi.missing}</p>}
                                    {enr.roi.formula && <p className="text-xs font-mono text-neo-text-secondary bg-neo-bg border border-neo-divider rounded-md p-2.5 mt-2">{enr.roi.formula}</p>}
                                </div>
                            )}
                        </section>
                    )}

                    {/* How it works */}
                    {(steps.length > 0 || channels.length > 0) && (
                        <section>
                            <h2 className="text-sm font-semibold text-neo-text-primary mb-3">How it works</h2>
                            {steps.length > 0 && (
                                <ul className="space-y-2 mb-3">
                                    {steps.map((s, i) => (
                                        <li key={i} className="flex gap-2.5 text-sm text-neo-text-secondary leading-relaxed">
                                            <span className="mt-0.5 font-mono text-xs text-neo-accent-b shrink-0">{String(i + 1).padStart(2, "0")}</span>
                                            <span>{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {channels.length > 0 && (
                                <div className="text-xs text-neo-text-secondary">Channels: {channels.join(" · ")}</div>
                            )}
                        </section>
                    )}

                    {/* Pitfalls */}
                    {pitfalls.length > 0 && (
                        <section>
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-neo-text-primary mb-2"><AlertTriangle size={15} className="text-amber-500" /> Pitfalls to plan for</h2>
                            <ul className="space-y-2">
                                {pitfalls.map((b: any, i: number) => (
                                    <li key={i} className="text-sm text-neo-text-secondary leading-relaxed">
                                        {b.risk_label && <span className="font-medium text-neo-text-primary">{b.risk_label}: </span>}
                                        {b.risk_text || asText(b)}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* What the metrics mean — metric hygiene */}
                    {metricDefs.length > 0 && (
                        <section>
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-neo-text-primary mb-1"><Ruler size={15} className="text-neo-accent-b" /> What the metrics mean</h2>
                            <p className="text-[11px] text-amber-400/80 mb-3">Definitions matter: deflection, resolution, and containment are not the same thing.</p>
                            <div className="space-y-3">
                                {metricDefs.map((m: any, i: number) => (
                                    <div key={i} className="text-sm text-neo-text-secondary leading-relaxed">
                                        {m.metric && <span className="font-medium text-neo-text-primary">{m.metric}: </span>}
                                        {m.means}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Reported outcomes — demoted + labelled */}
                    {outcomes.length > 0 && (
                        <section className="rounded-xl border border-neo-divider bg-neo-panel/40 p-4">
                            <h2 className="text-sm font-semibold text-neo-text-primary">Reported outcomes</h2>
                            <p className="text-xs text-amber-400/90 mb-3">Self-reported by the presenter at a vendor event. Not independently verified.</p>
                            <div className="flex flex-wrap gap-2">
                                {outcomes.map((o, i) => <span key={i} className="px-2.5 py-1 rounded-md bg-neo-bg border border-neo-divider text-xs text-neo-text-secondary">{o}</span>)}
                            </div>
                        </section>
                    )}

                    {/* In their words */}
                    {quotes.length > 0 && (
                        <section>
                            <h2 className="text-sm font-semibold text-neo-text-primary mb-3">In their words</h2>
                            <div className="space-y-4">
                                {quotes.map((q: any, i: number) => (
                                    <blockquote key={i} className="border-l-2 border-neo-accent-b/50 pl-4">
                                        <p className="text-sm italic text-neo-text-primary leading-relaxed">&ldquo;{typeof q === "string" ? q : q.quote}&rdquo;</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-neo-text-secondary">
                                            {(q.speaker || sourceType) && <span>{[q.speaker, sourceType].filter(Boolean).join(" · ")}</span>}
                                            {typeof q.timestamp_seconds === "number" && (
                                                <a href={stampLink(q.timestamp_seconds)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-neo-accent-a hover:underline font-mono">
                                                    <Play size={11} fill="currentColor" /> {mmss(q.timestamp_seconds)}
                                                </a>
                                            )}
                                        </div>
                                    </blockquote>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Source */}
                    <div className="pt-5 border-t border-neo-divider">
                        {video.video_url && (
                            <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-neo-accent-a hover:underline">
                                <Play size={13} fill="currentColor" /> Source: {sourceType || "video"}{recordedAt ? `, ${new Date(recordedAt).toLocaleDateString()}` : ""} (firsthand)
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
