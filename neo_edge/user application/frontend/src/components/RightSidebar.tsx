"use client";

import Link from "next/link";
import { TrendingUp, Activity } from "lucide-react";

interface VendorStat {
    name: string;
    count: number;
    color: string;
}

interface RightSidebarProps {
    trendingTags?: string[];
    topVendors?: VendorStat[];
    activeTag?: string;
    activeCompany?: string;
}

export function RightSidebar({ trendingTags = [], topVendors = [], activeTag, activeCompany }: RightSidebarProps) {
    // FieldNote: show only real published-record stats. No mock fallback, so the
    // sidebar never advertises companies that have no records in the library.
    const tags = trendingTags;
    const vendors = topVendors;
    const maxVendorCount = Math.max(1, ...vendors.map(v => v.count));

    return (
        <aside className="hidden xl:block w-80 flex-shrink-0 space-y-8 pl-8 border-l border-neo-divider sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">

            {/* Trending Tags */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-neo-text-primary uppercase tracking-wider">
                    <TrendingUp size={16} className="text-neo-accent-b" />
                    Trending Tags
                </div>
                <div className="flex flex-wrap gap-2">
                    {tags.length === 0 && (
                        <span className="text-xs text-neo-text-secondary">Tags appear as records publish.</span>
                    )}
                    {tags.map(tag => {
                        const isActive = activeTag === tag;
                        return (
                            <Link
                                key={tag}
                                href={isActive ? "/latest" : `/latest?tag=${encodeURIComponent(tag)}`}
                                className={`px-2.5 py-1 rounded-md border text-xs transition-all duration-300 ${isActive
                                    ? "bg-neo-accent-a/20 border-neo-accent-a/40 text-neo-accent-a"
                                    : "bg-neo-panel border-neo-divider text-neo-text-secondary hover:text-neo-text-primary hover:border-neo-accent-a/50 hover:bg-neo-panel-hover"}`}
                            >
                                #{tag}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Vendor Leaderboard */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-neo-text-primary uppercase tracking-wider">
                    <Activity size={16} className="text-neo-accent-c" />
                    Companies in the Library
                </div>
                {vendors.length > 0 && (
                    <div className="flex items-center gap-3 text-[10px] text-neo-text-secondary -mt-2">
                        <span className="text-neo-text-secondary/70">Evidence grade:</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />A</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" />B</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />C</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500" />D</span>
                    </div>
                )}
                <div className="space-y-3">
                    {vendors.length === 0 && (
                        <span className="text-xs text-neo-text-secondary">Companies appear as records publish.</span>
                    )}
                    {vendors.map((vendor, i) => {
                        const isActive = activeCompany === vendor.name;
                        return (
                            <Link
                                key={vendor.name}
                                href={isActive ? "/latest" : `/latest?company=${encodeURIComponent(vendor.name)}`}
                                className={`flex items-center justify-between group rounded-md -mx-1 px-1 py-0.5 transition-colors ${isActive ? "bg-neo-accent-a/10" : "hover:bg-neo-panel-hover"}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs text-neo-text-secondary w-3">0{i + 1}</span>
                                    <div className={`w-2 h-2 rounded-full ${vendor.color}`} />
                                    <span className={`text-sm transition-colors ${isActive ? "text-neo-accent-a" : "text-neo-text-secondary group-hover:text-neo-text-primary"}`}>{vendor.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-12 bg-neo-divider rounded-full overflow-hidden">
                                        <div className="h-full bg-neo-accent-c/50" style={{ width: `${(vendor.count / maxVendorCount) * 100}%` }} />
                                    </div>
                                    <span className="text-xs font-mono text-neo-text-primary">{vendor.count}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

        </aside>
    );
}

