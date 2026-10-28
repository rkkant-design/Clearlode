"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { FeedCard } from "@/components/FeedCard";
import { FilterBar } from "@/components/FilterBar";

interface FeedItem {
    id: string;
    title: string;
    source: string;
    thumbnailUrl: string;
    videoUrl?: string;
    insights: string[];
    tags: string[];
    timestamp: string;
    evidenceGrade?: string | null;
    gradeRationale?: string | null;
    operator?: string | null;
    company?: string | null;
    sourceType?: string | null;
    recordedAt?: string | null;
}

interface FeedContainerProps {
    initialData: {
        videos: FeedItem[];
        count: number;
    };
    activeTag?: string;
    activeCompany?: string;
    activeFunction?: string;
}

export function FeedContainer({ initialData, activeTag, activeCompany, activeFunction }: FeedContainerProps) {
    const [feedItems, setFeedItems] = useState<FeedItem[]>(initialData.videos);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        days: "",
        sort: "relevance"
    });

    // Fetch data when filters or the active tag change
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (filters.days) params.append("days", filters.days);
                if (filters.sort) params.append("sort", filters.sort);
                if (activeTag) params.append("tag", activeTag);
                if (activeCompany) params.append("company", activeCompany);
                if (activeFunction) params.append("function", activeFunction);

                const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';
                const res = await fetch(`${API_BASE_URL}/api/videos?${params.toString()}`);
                const data = await res.json();
                if (data.success) {
                    setFeedItems(data.data.videos);
                }
            } catch (error) {
                console.error("Failed to fetch feed:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters.days, filters.sort, activeTag, activeCompany, activeFunction]);

    const handleFilterChange = useCallback((key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    return (
        <div className="flex-grow min-w-0">
            {/* Filters */}
            <FilterBar onFilterChange={handleFilterChange} />

            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-neo-text-primary">{(activeTag || activeCompany) ? "Filtered records" : "Latest Records"}</h2>
                <span className="text-xs text-neo-text-secondary font-mono">
                    {loading ? "Updating..." : `Showing ${feedItems.length} ${feedItems.length === 1 ? "record" : "records"}`}
                </span>
            </div>

            {/* Active filter (tag or company) */}
            {(activeTag || activeCompany) && (
                <div className="mb-6 flex items-center gap-2 text-sm">
                    <span className="text-neo-text-secondary">Filtered by</span>
                    <Link href="/latest" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neo-accent-a/15 border border-neo-accent-a/30 text-neo-accent-a hover:bg-neo-accent-a/25 transition-colors">
                        {activeTag ? `#${activeTag}` : activeCompany} <X size={13} />
                    </Link>
                </div>
            )}

            {/* Feed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    // Skeleton loading state
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-96 bg-neo-panel/50 rounded-xl animate-pulse border border-neo-divider" />
                    ))
                ) : (
                    feedItems.map((item) => (
                        <FeedCard
                            key={item.id}
                            id={item.id}
                            title={item.title}
                            source={item.source}
                            thumbnailUrl={item.thumbnailUrl || "from-indigo-900 to-blue-950"}
                            videoUrl={item.videoUrl}
                            insights={item.insights}
                            tags={item.tags}
                            timestamp={item.timestamp}
                            evidenceGrade={item.evidenceGrade}
                            gradeRationale={item.gradeRationale}
                            operator={item.operator}
                            company={item.company}
                            sourceType={item.sourceType}
                            recordedAt={item.recordedAt}
                        />
                    ))
                )}
            </div>

            {/* Load More / Infinite Scroll Trigger */}
            <div className="mt-12 flex justify-center">
                <button className="px-6 py-3 rounded-full border border-neo-divider bg-neo-panel text-sm text-neo-text-secondary hover:text-neo-text-primary hover:border-neo-accent-a/30 transition-all">
                    Load Previous Updates
                </button>
            </div>
        </div>
    );
}
