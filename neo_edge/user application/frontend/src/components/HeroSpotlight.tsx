"use client";

import Link from "next/link";
import { Play, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSpotlightProps {
    title: string;
    vendor: string;
    date: string;
    insights: string[];
    videoId?: string;
    videoUrl?: string; // Optional background video / CTA target
    evidenceGrade?: string | null;
    gradeRationale?: string | null;
    operator?: string | null;
    sourceType?: string | null;
}

// FieldNote evidence-grade colour map (A strongest -> D weakest)
const gradeClasses = (g?: string | null) => {
    switch ((g || "").toUpperCase()) {
        case "A": return "bg-emerald-500/20 text-emerald-200 border-emerald-400/40";
        case "B": return "bg-sky-500/20 text-sky-200 border-sky-400/40";
        case "C": return "bg-amber-500/20 text-amber-200 border-amber-400/40";
        default: return "bg-zinc-500/20 text-zinc-200 border-zinc-400/40";
    }
};

const getVideoIdFromUrl = (url?: string) => {
    if (!url) return null;
    const trimmed = url.trim();

    if (!trimmed.startsWith("http")) {
        return trimmed;
    }

    try {
        const parsed = new URL(trimmed);
        const queryId = parsed.searchParams.get("v");
        if (queryId) return queryId;

        const segments = parsed.pathname.split("/").filter(Boolean);
        return segments.pop() || null;
    } catch {
        return trimmed;
    }
};

export function HeroSpotlight({ title, vendor, date, insights, videoId, videoUrl, evidenceGrade, gradeRationale, operator, sourceType }: HeroSpotlightProps) {
    const normalizedVideoId = videoId || getVideoIdFromUrl(videoUrl);
    const videoHref = normalizedVideoId ? `/latest/${normalizedVideoId}` : "#";
    const analysisHref = normalizedVideoId ? `/latest/${normalizedVideoId}` : "#";

    return (
        <section className="relative w-full h-[70vh] min-h-[540px] overflow-hidden rounded-2xl border border-neo-divider bg-neo-panel mb-12 group">
            {/* Background layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-neo-accent-a/20 via-transparent to-neo-accent-b/5 z-0" />
            <div className="absolute inset-0 bg-[url('/placeholder-hero.jpg')] bg-cover bg-center opacity-40 mix-blend-overlay blur-sm scale-105 group-hover:scale-110 transition-transform duration-[18s] ease-linear" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E1013] via-[#0E1013]/80 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0E1013] via-[#0E1013]/70 to-transparent z-10" />

            {/* Foreground content */}
            <div className="absolute inset-0 z-20 flex items-end p-6 md:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 w-full max-w-7xl mx-auto items-end">
                    {/* Left - hero copy */}
                    <div className="lg:col-span-7 space-y-6 text-white">
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono uppercase tracking-wider">
                            <span className="px-3 py-1 bg-neo-accent-a/15 text-neo-accent-a border border-neo-accent-a/30 rounded-full">
                                Spotlight
                            </span>
                            <span className="px-3 py-1 rounded-full text-white font-bold tracking-wider bg-white/10 border border-white/10">
                                {vendor}
                            </span>
                            {evidenceGrade && (
                                <span title={gradeRationale || undefined} className={`px-3 py-1 rounded-full font-bold tracking-wider border ${gradeClasses(evidenceGrade)}`}>
                                    Grade {evidenceGrade}
                                </span>
                            )}
                            {sourceType && (
                                <span className="px-3 py-1 rounded-full text-white/90 bg-white/5 border border-white/10">
                                    {sourceType}
                                </span>
                            )}
                            <span className="text-neo-text-secondary text-[0.7rem] md:text-xs">{date}</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white">
                            {title}
                        </h1>

                        {operator && (
                            <p className="text-sm md:text-base text-white/80 font-medium -mt-2">
                                {operator}
                            </p>
                        )}

                        {normalizedVideoId ? (
                            <Link
                                href={videoHref}
                                className="group/watch flex items-center gap-3 bg-neo-accent-a hover:bg-neo-accent-a/90 text-white px-6 py-3 rounded-lg font-semibold transition-all hover:shadow-[0_0_25px_rgba(58,108,244,0.35)] w-fit"
                            >
                                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                                    <Play size={18} fill="currentColor" />
                                </span>
                                Watch Video
                            </Link>
                        ) : (
                            <div className="group/watch flex items-center gap-3 bg-neo-accent-a/50 text-white/50 px-6 py-3 rounded-lg font-semibold w-fit cursor-not-allowed">
                                <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                                    <Play size={18} fill="currentColor" />
                                </span>
                                Watch Video
                            </div>
                        )}
                    </div>

                    {/* Right - insights card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="lg:col-span-5 w-full"
                    >
                        <div className="bg-neo-panel/80 backdrop-blur-xl border border-neo-divider rounded-2xl p-6 space-y-4 text-neo-text-primary hover:border-neo-accent-a/30 transition-colors">
                            <div className="flex items-center justify-between border-b border-neo-divider pb-4">
                                <div className="flex items-center gap-2 text-neo-accent-b">
                                    <BarChart3 size={18} />
                                    <span className="font-mono text-xs uppercase tracking-[0.2em] font-bold">
                                        Key Insights
                                    </span>
                                </div>
                            </div>

                            <ul className="space-y-4">
                                {insights.map((insight, index) => {
                                    const insightNumber = (index + 1).toString().padStart(2, "0");
                                    return (
                                        <li key={index} className="flex gap-4 items-start text-sm text-neo-text-secondary">
                                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-neo-accent-b/10 text-neo-accent-b text-xs font-mono flex items-center justify-center border border-neo-accent-b/20">
                                                {insightNumber}
                                            </span>
                                            <p className="leading-relaxed text-neo-text-primary/90">{insight}</p>
                                        </li>
                                    );
                                })}
                            </ul>

                            {normalizedVideoId ? (
                                <Link
                                    href={analysisHref}
                                    className="w-full block text-center pt-4 mt-2 text-[0.65rem] font-mono text-neo-text-secondary hover:text-neo-accent-a uppercase tracking-[0.4em] border-t border-neo-divider hover:border-neo-accent-a/30 transition-colors"
                                >
                                    View Full Record
                                </Link>
                            ) : (
                                <div className="w-full block text-center pt-4 mt-2 text-[0.65rem] font-mono text-neo-text-secondary/50 uppercase tracking-[0.4em] border-t border-neo-divider cursor-not-allowed">
                                    View Full Record
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
