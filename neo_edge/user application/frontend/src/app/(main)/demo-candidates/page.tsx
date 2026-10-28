"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';

const gradeBadge = (g?: string | null) => {
    switch ((g || "").toUpperCase()) {
        case "A": return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
        case "B": return "bg-sky-500/20 text-sky-300 border-sky-400/40";
        case "C": return "bg-amber-500/20 text-amber-300 border-amber-400/40";
        default: return "bg-zinc-500/20 text-zinc-300 border-zinc-400/40";
    }
};

interface ListItem { id: string; company: string; title: string; grade: string | null; }
interface Detail { company: string; grade: string | null; operator: string | null; source: string | null; stack: string[]; approach: string; outcomes: string[]; pitfalls: string[]; cost: string[]; }

function parse(v: any): Detail {
    const e = v.extraction || {};
    const meta = e.metadata || {};
    const feed = v.feed || {};
    const uc = (Array.isArray(e.use_cases_applications) && e.use_cases_applications[0]) || {};
    return {
        company: (Array.isArray(meta.organizations) && meta.organizations[0]) || v.channel_title || "",
        grade: meta.evidence_grade || null,
        operator: (Array.isArray(meta.speakers) && meta.speakers[0]) || null,
        source: meta.source_type || null,
        stack: Array.isArray(uc.tools_apis) ? uc.tools_apis : [],
        approach: uc.description || "",
        outcomes: Array.isArray(feed.highlights) ? feed.highlights : [],
        pitfalls: Array.isArray(e.risks_constraints) ? e.risks_constraints.map((r: any) => r.risk_label || r.risk_text).filter(Boolean) : [],
        cost: (((meta.enrichment || {}).cost || {}).drivers) || []
    };
}

export default function ComparePage() {
    const [list, setList] = useState<ListItem[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [details, setDetails] = useState<Record<string, Detail>>({});

    useEffect(() => {
        fetch(`${API}/api/videos?limit=100`).then(r => r.json()).then(d => {
            if (d.success) setList(d.data.videos.map((v: any) => ({ id: v.id, company: v.company || v.source, title: v.title, grade: v.evidenceGrade || null })));
        }).catch(() => { });
    }, []);

    useEffect(() => {
        selected.forEach(id => {
            if (!details[id]) {
                fetch(`${API}/api/video/${id}`).then(r => r.json()).then(d => {
                    if (d.success) setDetails(prev => ({ ...prev, [id]: parse(d.data) }));
                }).catch(() => { });
            }
        });
    }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : (prev.length >= 3 ? prev : [...prev, id]));

    const chosen = selected.map(id => details[id]).filter(Boolean) as Detail[];
    const cols = `150px repeat(${chosen.length}, minmax(0, 1fr))`;

    const rows: { label: string; render: (d: Detail) => React.ReactNode }[] = [
        { label: "Evidence grade", render: d => d.grade ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${gradeBadge(d.grade)}`}>{d.grade}</span> : <span className="text-neo-text-secondary">—</span> },
        { label: "Operator", render: d => <span className="text-neo-text-secondary">{d.operator || "—"}</span> },
        { label: "Source", render: d => <span className="text-neo-text-secondary capitalize">{d.source || "—"}</span> },
        { label: "Stack", render: d => d.stack.length ? <div className="flex flex-wrap gap-1">{d.stack.map((s, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-neo-bg border border-neo-divider text-[11px] text-neo-text-secondary">{s}</span>)}</div> : <span className="text-neo-text-secondary">—</span> },
        { label: "Approach", render: d => <span className="text-neo-text-secondary">{d.approach || "—"}</span> },
        { label: "Reported outcomes", render: d => d.outcomes.length ? <ul className="space-y-1">{d.outcomes.map((o, i) => <li key={i} className="text-neo-text-secondary">• {o}</li>)}</ul> : <span className="text-neo-text-secondary">—</span> },
        { label: "Pitfalls", render: d => d.pitfalls.length ? <ul className="space-y-1">{d.pitfalls.map((o, i) => <li key={i} className="text-neo-text-secondary">• {o}</li>)}</ul> : <span className="text-neo-text-secondary">—</span> },
        { label: "Cost drivers", render: d => d.cost.length ? <ul className="space-y-1">{d.cost.map((o, i) => <li key={i} className="text-neo-text-secondary">• {o}</li>)}</ul> : <span className="text-neo-text-secondary">—</span> }
    ];

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-5xl mx-auto px-6 pt-6">

                <Link href="/latest" className="inline-flex items-center gap-2 text-sm text-neo-text-secondary hover:text-neo-accent-a transition-colors mb-8">
                    <ArrowLeft size={16} /> Back to library
                </Link>

                <h1 className="text-2xl md:text-3xl font-bold text-neo-text-primary">Compare Deployments</h1>
                <p className="mt-2 text-sm text-neo-text-secondary">Pick up to 3 records to compare side by side. Reported outcomes are self-reported, not independently verified.</p>

                {/* Picker */}
                <div className="mt-6 flex flex-wrap gap-2">
                    {list.map(item => {
                        const isSel = selected.includes(item.id);
                        const disabled = !isSel && selected.length >= 3;
                        return (
                            <button
                                key={item.id}
                                onClick={() => toggle(item.id)}
                                disabled={disabled}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all ${isSel
                                    ? "bg-neo-accent-a/20 border-neo-accent-a/40 text-neo-accent-a"
                                    : disabled
                                        ? "bg-neo-panel/40 border-neo-divider/50 text-neo-text-secondary/40 cursor-not-allowed"
                                        : "bg-neo-panel border-neo-divider text-neo-text-secondary hover:text-neo-text-primary hover:border-neo-accent-a/50"}`}
                            >
                                {isSel && <Check size={12} />}
                                {item.company}
                                {item.grade && <span className={`px-1 rounded text-[9px] font-bold border ${gradeBadge(item.grade)}`}>{item.grade}</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Comparison */}
                {chosen.length === 0 ? (
                    <p className="mt-10 text-sm text-neo-text-secondary">Select records above to compare them.</p>
                ) : (
                    <div className="mt-8 overflow-x-auto">
                        <div className="min-w-[640px]">
                            {/* Header */}
                            <div className="grid gap-px bg-neo-divider border border-neo-divider rounded-t-xl overflow-hidden" style={{ gridTemplateColumns: cols }}>
                                <div className="bg-neo-panel p-3" />
                                {chosen.map((d, i) => (
                                    <div key={i} className="bg-neo-panel p-3">
                                        <div className="text-sm font-semibold text-neo-text-primary leading-snug">{d.company || "—"}</div>
                                    </div>
                                ))}
                            </div>
                            {/* Rows */}
                            {rows.map((row, ri) => (
                                <div key={ri} className="grid gap-px bg-neo-divider border-x border-b border-neo-divider" style={{ gridTemplateColumns: cols }}>
                                    <div className="bg-neo-bg p-3 text-[11px] font-mono uppercase tracking-wider text-neo-accent-b">{row.label}</div>
                                    {chosen.map((d, ci) => (
                                        <div key={ci} className="bg-neo-panel p-3 text-xs leading-relaxed">{row.render(d)}</div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
