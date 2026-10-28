import Link from "next/link";
import { HeroSpotlight } from "@/components/HeroSpotlight";
import { RightSidebar } from "@/components/RightSidebar";
import { FeedContainer } from "@/components/FeedContainer";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';

// FieldNote business functions (domains). Add more here as the library expands.
const FUNCTIONS: { value: string; label: string }[] = [
    { value: "", label: "All functions" },
    { value: "customer-support", label: "Customer Support" },
    { value: "software-engineering", label: "Software Engineering" },
];

async function getVideos(tag?: string, company?: string, fn?: string) {
    try {
        const params = new URLSearchParams();
        if (tag) params.append('tag', tag);
        if (company) params.append('company', company);
        if (fn) params.append('function', fn);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${API_BASE_URL}/api/videos${qs}`, { cache: 'no-store' });
        const data = await res.json();
        return data.success ? data.data : { videos: [], count: 0 };
    } catch (error) {
        console.error('Failed to fetch videos:', error);
        return { videos: [], count: 0 };
    }
}

async function getSpotlight() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/spotlight`, { cache: 'no-store' });
        const data = await res.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('Failed to fetch spotlight:', error);
        return null;
    }
}

async function getTrendingTags() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/stats/trending`, { cache: 'no-store' });
        const data = await res.json();
        return data.success ? data.data : [];
    } catch (error) {
        console.error('Failed to fetch trending tags:', error);
        return [];
    }
}

async function getTopVendors() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/stats/vendors`, { cache: 'no-store' });
        const data = await res.json();
        return data.success ? data.data : [];
    } catch (error) {
        console.error('Failed to fetch top vendors:', error);
        return [];
    }
}

export default async function LatestPage({ searchParams }: { searchParams: Promise<{ tag?: string; company?: string; function?: string }> }) {
    const sp = await searchParams;
    const { tag, company } = sp;
    const fn = sp.function;
    const [videosData, spotlightData, trendingTags, topVendors] = await Promise.all([
        getVideos(tag, company, fn),
        getSpotlight(),
        getTrendingTags(),
        getTopVendors()
    ]);

    // Fallback spotlight data if API returns null
    const spotlight = spotlightData || {
        title: "Oracle Cloud World: Generative AI Integration in Fusion ERP",
        vendor: "Oracle",
        date: "Oct 24, 2025",
        insights: [
            "Native RAG implementation reduces supply chain forecasting errors by 40%",
            "Auto-generation of financial narratives cuts quarterly close time by 2 days",
            "Agentic workflows now handle 65% of routine procurement approvals autonomously"
        ],
        videoId: "x-RZKN9ZOiI"
    };

    return (
        <div className="relative">
            {/* Hero Section */}
            <HeroSpotlight
                title={spotlight.title}
                vendor={spotlight.vendor}
                date={spotlight.date}
                insights={spotlight.insights}
                videoId={spotlight.videoId}
                videoUrl={spotlight.videoUrl}
                evidenceGrade={spotlight.evidenceGrade}
                gradeRationale={spotlight.gradeRationale}
                operator={spotlight.operator}
                sourceType={spotlight.sourceType}
            />

            {/* Function tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {FUNCTIONS.map(f => {
                    const isActive = (fn || "") === f.value;
                    return (
                        <Link
                            key={f.value || "all"}
                            href={f.value ? `/latest?function=${f.value}` : "/latest"}
                            className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${isActive
                                ? "bg-neo-accent-a/20 border-neo-accent-a/40 text-neo-accent-a font-medium"
                                : "bg-neo-panel border-neo-divider text-neo-text-secondary hover:text-neo-text-primary hover:border-neo-accent-a/40"}`}
                        >
                            {f.label}
                        </Link>
                    );
                })}
            </div>

            <div className="flex flex-col xl:flex-row gap-8">

                {/* Main Content Area with FeedContainer */}
                <FeedContainer initialData={videosData} activeTag={tag} activeCompany={company} activeFunction={fn} />

                {/* Right Sidebar (Desktop Only) */}
                <RightSidebar trendingTags={trendingTags} topVendors={topVendors} activeTag={tag} activeCompany={company} />
            </div>
        </div>
    );
}
