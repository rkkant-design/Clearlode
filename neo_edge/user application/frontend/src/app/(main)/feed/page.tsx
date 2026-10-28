"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bookmark, BookOpen, TrendingUp, Sparkles, Activity, Globe, Zap, MoreHorizontal, Clock, Share, X, Lightbulb, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FeedFilters } from "@/components/FeedFilters";
import { TrendingKeywords } from "@/components/TrendingKeywords";

const THUMBNAIL = "https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=2832&auto=format&fit=crop";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001";

type FeedImpact = "high" | "medium" | "low";

type FeedCard = {
  id: string;
  vendor: string;
  product: string;
  channel: string;
  title: string;
  timeAgo: string;
  summary: string;
  highlights: string[];
  impact: FeedImpact;
  thumb: string;
  avatar: string;
  author: string;
  handle: string;
  verified: boolean;
  videoUrl?: string;
  videoId?: string;
  trendingLabel?: string;
};

const AVATARS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop", 
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", 
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop", 
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop"
];

const stripQuotes = (value?: string | null) => {
  if (!value) return "";
  return value.replace(/["“”]/g, "").trim();
};

const formatTimeAgo = (timestamp?: string | null, fallback?: string) => {
  if (!timestamp) {
    return fallback || "moments ago";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return fallback || "moments ago";
  }
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const normalizeHandle = (author?: string, handle?: string | null) => {
  if (handle) return handle;
  if (!author) return "@neo";
  return `@${author.toLowerCase().replace(/\s+/g, "")}`;
};

const normalizeImpact = (value?: string): FeedImpact => {
  if (!value) return "medium";
  const normalized = value.toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "medium";
};

const getAvatarFor = (name?: string) => {
  if (!name) {
    return AVATARS[0];
  }
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear&fontSize=38`;
};

const mapFeedResponseToCard = (feed: any, index: number): FeedCard => {
  const channelTitle = stripQuotes(feed.channel_title || feed.channel || feed.source || feed.vendor);
  const author =
    channelTitle ||
    stripQuotes(feed.author) ||
    stripQuotes(feed.author_name) ||
    "FieldNote";
  const title = stripQuotes(feed.title) || feed.summary || "AI automation insight";
  const summary = stripQuotes(feed.summary) || feed.title || "No summary available yet.";
  const highlights = Array.isArray(feed.highlights) && feed.highlights.length > 0
    ? feed.highlights
    : Array.isArray(feed.tags)
      ? feed.tags.slice(0, 3)
      : [];

  const timestamp = feed.timestamp || feed.raw_timestamp || null;

  return {
    id: feed.id || feed.feed_id || feed.videoId || `feed-${index}`,
    vendor: stripQuotes(feed.vendor) || channelTitle || "FieldNote",
    product: stripQuotes(feed.product),
    channel: channelTitle || "Channel",
    title,
    timeAgo: feed.timeAgo || formatTimeAgo(timestamp),
    summary,
    highlights,
    impact: normalizeImpact(feed.impact),
    thumb: feed.thumbnailUrl || feed.thumb || THUMBNAIL,
    avatar: feed.avatar || getAvatarFor(author),
    author,
    handle: normalizeHandle(author),
    verified: true,
    videoUrl: feed.videoUrl || feed.video_url || feed.read_more_url,
    videoId: feed.videoId || feed.video_id,
    trendingLabel: feed.trendingLabel || feed.trending_label
  };
};


type VideoInsights = {
  videoId: string;
  title: string;
  channel: string;
  insights: string[];
  keyWords: string[];
};

export default function FeedPage() {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<FeedCard[]>([]);
  const [filteredItems, setFilteredItems] = useState<FeedCard[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    timeRange: "all",
    vendor: "",
    search: "",
    sortBy: "newest"
  });
  const [insightsModal, setInsightsModal] = useState<{ open: boolean; videoId: string | null; insights: VideoInsights | null; loading: boolean }>({
    open: false,
    videoId: null,
    insights: null,
    loading: false
  });

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchFeeds() {
      setIsLoadingFeed(true);
      try {
        const params = new URLSearchParams();
        params.append('limit', '50');
        if (filters.timeRange !== "all") {
          params.append('days', filters.timeRange);
        }
        if (filters.vendor) {
          params.append('vendor', filters.vendor);
        }

        const res = await fetch(`${API_BASE_URL}/api/feed?${params.toString()}`, { cache: "no-store" });
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.error || "Failed to fetch feed");
        }

        const feeds = Array.isArray(json.data?.videos) ? json.data.videos : [];
        if (isMounted) {
          const mapped = feeds.map(mapFeedResponseToCard);
          setFeedItems(mapped);
          setFeedError(null);
        }
      } catch (error) {
        console.error("Failed to fetch feed:", error);
        if (isMounted) {
          setFeedError(error instanceof Error ? error.message : "Unable to load feed right now.");
          setFeedItems([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingFeed(false);
        }
      }
    }

    fetchFeeds();

    return () => {
      isMounted = false;
    };
  }, [filters.timeRange, filters.vendor]);

  useEffect(() => {
    let filtered = [...feedItems];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.summary.toLowerCase().includes(searchLower) ||
        item.vendor.toLowerCase().includes(searchLower)
      );
    }

    if (filters.sortBy === "oldest") {
      filtered.reverse();
    }

    setFilteredItems(filtered);
  }, [feedItems, filters.search, filters.sortBy]);

  const handleMenuAction = (action: string, itemId: string) => {
    console.log(`Action: ${action}, Item ID: ${itemId}`);
    setOpenMenuId(null);
  };

  const handleKnowMore = async (videoId: string | undefined) => {
    if (!videoId) {
      return;
    }

    setInsightsModal({
      open: true,
      videoId,
      insights: null,
      loading: true
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/video/${videoId}/insights`, {
        cache: "no-store",
      });

      // Check if response is OK and is JSON
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to load insights");
      }

      setInsightsModal({
        open: true,
        videoId,
        insights: json.data,
        loading: false
      });
    } catch (error) {
      console.error("Failed to fetch insights:", error);
      setInsightsModal({
        open: true,
        videoId,
        insights: {
          videoId,
          title: "Unknown",
          channel: "Unknown",
          insights: [
            error instanceof Error 
              ? `Unable to load insights: ${error.message}` 
              : "Failed to load insights. Please ensure the backend server is running."
          ],
          keyWords: []
        },
        loading: false
      });
    }
  };

  const closeInsightsModal = () => {
    setInsightsModal({
      open: false,
      videoId: null,
      insights: null,
      loading: false
    });
  };

  return (
    <div className="min-h-screen -m-8 p-8 pb-20">
      {/* MAIN LAYOUT */}
      <main className="relative z-10 mx-auto max-w-7xl flex flex-col lg:flex-row gap-6">
        {/* LEFT SIDEBAR - FEED FILTERS */}
        <div className="hidden lg:block">
          <FeedFilters onFilterChange={handleFilterChange} />
        </div>

        {/* FEED */}
        <div className="w-full lg:w-[700px] mx-auto space-y-0 pb-8">
          {feedError && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
              {feedError}
            </div>
          )}

          {isLoadingFeed && (
            <div className="rounded-2xl border border-neo-divider bg-neo-panel p-6 text-neo-text-secondary">
              Syncing the latest enterprise intelligence…
            </div>
          )}

          {!isLoadingFeed && !filteredItems.length && !feedError && (
            <div className="rounded-2xl border border-neo-divider bg-neo-panel p-6 text-neo-text-secondary">
              {filters.search || filters.vendor || filters.timeRange !== "all" 
                ? "No feeds match your filters. Try adjusting your search criteria."
                : "No live feeds yet. Run the extraction workflow to populate fresh intel."}
            </div>
          )}

          {filteredItems.map((item, index) => (
            <motion.article 
              key={item.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="group relative bg-neo-panel border border-neo-divider rounded-2xl mb-4 px-4 py-4 hover:bg-neo-panel-hover hover:border-neo-accent-a/40 hover:shadow-[0_4px_20px_-4px_rgba(58,108,244,0.15)] transition-all duration-200 cursor-pointer"
            >
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <img 
                    src={item.avatar} 
                    alt={item.author} 
                    className="h-10 w-10 rounded-full border border-neo-divider object-cover" 
                    loading="lazy"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm bg-gradient-to-r from-neo-text-primary via-neo-accent-b to-neo-text-primary bg-clip-text text-transparent hover:underline">
                        {item.author}
                      </span>
                      {item.verified && (
                        <svg className="w-4 h-4 text-neo-accent-a" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8.5 12.5l2 2 5-5M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" />
                        </svg>
                      )}
                      <span className="text-neo-text-secondary text-sm">{item.handle}</span>
                      <span className="text-neo-text-secondary text-sm">·</span>
                      <span className="text-neo-text-secondary text-sm hover:underline">{item.timeAgo}</span>
                    </div>

                    {/* Three-dot menu */}
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === item.id ? null : item.id);
                        }} 
                        className="p-1 rounded-full hover:bg-neo-panel-hover transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-neo-text-secondary hover:text-neo-accent-a" />
                      </button>

                      <AnimatePresence>
                        {openMenuId === item.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-1 w-56 rounded-xl bg-neo-panel border border-neo-divider shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="py-1">
                              <button 
                                onClick={() => handleMenuAction('bookmark', item.id)} 
                                className="w-full px-4 py-2.5 text-left text-sm text-neo-text-primary hover:bg-neo-panel-hover flex items-center gap-3 transition-colors"
                              >
                                <Bookmark className="w-4 h-4" />
                                <span>Save to bookmarks</span>
                              </button>
                              <button 
                                onClick={() => handleMenuAction('follow', item.id)} 
                                className="w-full px-4 py-2.5 text-left text-sm text-neo-text-primary hover:bg-neo-panel-hover flex items-center gap-3 transition-colors"
                              >
                                <Globe className="w-4 h-4" />
                                <span>Follow {item.vendor}</span>
                              </button>
                              <button 
                                onClick={() => handleMenuAction('share', item.id)} 
                                className="w-full px-4 py-2.5 text-left text-sm text-neo-text-primary hover:bg-neo-panel-hover flex items-center gap-3 transition-colors"
                              >
                                <Share className="w-4 h-4" />
                                <span>Share update</span>
                              </button>
                              <button 
                                onClick={() => handleMenuAction('analytics', item.id)} 
                                className="w-full px-4 py-2.5 text-left text-sm text-neo-text-primary hover:bg-neo-panel-hover flex items-center gap-3 transition-colors"
                              >
                                <Activity className="w-4 h-4" />
                                <span>View analytics</span>
                              </button>
                              <div className="border-t border-neo-divider my-1"></div>
                              <button 
                                onClick={() => handleMenuAction('hide', item.id)} 
                                className="w-full px-4 py-2.5 text-left text-sm text-neo-text-secondary hover:bg-neo-panel-hover hover:text-neo-text-primary flex items-center gap-3 transition-colors"
                              >
                                <span>Hide this post</span>
                              </button>
                              <button 
                                onClick={() => handleMenuAction('report', item.id)} 
                                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-950/30 flex items-center gap-3 transition-colors"
                              >
                                <span>Report content</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Vendor Badge */}
                  <div className="flex items-center gap-2 mt-1 mb-2">
                    <span className="inline-flex items-center gap-1 bg-neo-accent-b/10 px-2 py-0.5 rounded text-[11px] font-semibold text-neo-accent-b border border-neo-accent-b/20">
                      <Sparkles className="w-3 h-3" />
                      {item.vendor} {item.product}
                    </span>
                  </div>

                  {/* Post Content */}
                  <div className="mt-2 space-y-3">
                    <p className="text-[15px] leading-relaxed bg-gradient-to-r from-neo-text-primary via-neo-accent-b to-neo-text-primary bg-clip-text text-transparent font-semibold">{item.title}</p>
                    <p className="text-neo-text-secondary text-sm leading-relaxed">{item.summary}</p>

                    {/* Image */}
                    <div className="mt-3 relative rounded-2xl overflow-hidden border border-neo-divider">
                      <img src={item.thumb} alt="Post thumbnail" className="w-full h-72 object-cover" loading="lazy" />
                      <div className="absolute top-3 left-3 bg-neo-panel/90 backdrop-blur-md px-2 py-1 rounded-full text-[10px] font-bold text-neo-text-primary border border-neo-divider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-neo-accent-c" /> {item.trendingLabel || "TRENDING"}
                      </div>
                    </div>

                    {/* Highlights */}
                    <div className="flex flex-wrap gap-2">
                      {item.highlights.map((h, idx) => (
                        <span 
                          key={idx} 
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neo-panel border border-neo-divider text-neo-text-primary text-xs hover:bg-neo-panel-hover transition-colors"
                        >
                          <Zap className="w-3 h-3 text-neo-accent-b" />
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-neo-divider">
                    {item.videoId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleKnowMore(item.videoId);
                        }}
                        className="group/know flex items-center gap-1.5 px-4 py-2 rounded-full bg-neo-accent-a/10 hover:bg-neo-accent-a/20 border border-neo-accent-a/30 text-xs text-neo-accent-a font-medium transition-all hover:shadow-[0_0_15px_rgba(58,108,244,0.2)]"
                      >
                        <Lightbulb className="w-3.5 h-3.5 group-hover/know:scale-110 transition-transform" />
                        <span>Know More</span>
                      </button>
                    )}
                    {item.videoId && (
                      <Link
                        href={`/latest/${item.videoId}?from=feed`}
                        onClick={(e) => e.stopPropagation()}
                        className="group/more flex items-center gap-1.5 px-4 py-2 rounded-full bg-neo-accent-b/10 hover:bg-neo-accent-b/20 border border-neo-accent-b/30 text-xs text-neo-accent-b font-medium transition-all hover:shadow-[0_0_15px_rgba(224,185,115,0.2)]"
                    >
                        <BookOpen className="w-3.5 h-3.5 group-hover/more:scale-110 transition-transform" />
                        <span>View Analysis</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* SIDEBAR */}
        <aside className="hidden lg:block w-80 space-y-4 sticky top-20 self-start overflow-y-auto max-h-[calc(100vh-100px)] pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TrendingKeywords />

          {/* Recent Feeds Card */}
          <div className="rounded-2xl bg-neo-panel p-5 border border-neo-divider backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neo-divider">
              <Clock className="w-4 h-4 text-neo-accent-a" />
              <h4 className="text-sm font-bold text-neo-accent-b tracking-wide">Recent Feeds</h4>
            </div>
            <ul className="space-y-3">
              {(feedItems.length ? feedItems.slice(0, 4) : []).map((feed, i) => (
                <li key={i} className="group cursor-pointer hover:bg-neo-panel-hover -mx-2 px-2 py-2 rounded-lg transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-neo-accent-a/10 border border-neo-accent-a/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-neo-accent-a" />
                      </div>
                      <div>
                        <div className="text-sm text-neo-text-primary group-hover:text-neo-accent-b font-medium transition-colors">
                          {feed.vendor}
                        </div>
                        <div className="text-xs text-neo-text-secondary">{feed.product}</div>
                      </div>
                    </div>
                    <span className="text-xs text-neo-text-secondary">{feed.timeAgo}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          
        </aside>
      </main>

      {/* Insights Modal */}
      <AnimatePresence>
        {insightsModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={closeInsightsModal}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-neo-panel via-neo-panel to-neo-panel-hover border-2 border-neo-divider rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.7)] backdrop-blur-xl"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-neo-panel via-neo-panel to-neo-panel/95 backdrop-blur-md border-b-2 border-neo-divider p-6 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-neo-accent-a/20 to-neo-accent-b/20 border-2 border-neo-accent-a/40 shadow-[0_0_15px_rgba(58,108,244,0.2)]">
                      <Lightbulb className="w-6 h-6 text-neo-accent-b" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Key Insights</h2>
                  </div>
                  {insightsModal.insights && (
                    <div className="pl-12">
                      <p className="text-base font-semibold text-white mb-1">{insightsModal.insights.title}</p>
                      <p className="text-sm text-neo-text-secondary">{insightsModal.insights.channel}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={closeInsightsModal}
                  className="p-2 rounded-full hover:bg-neo-panel-hover text-neo-text-secondary hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {insightsModal.loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-neo-accent-a animate-spin mb-4" />
                    <p className="text-sm text-neo-text-secondary">Loading insights...</p>
                  </div>
                ) : insightsModal.insights ? (
                  <>
                    {/* Insights List */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3 pb-2 border-b border-neo-divider">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-neo-accent-a/20 to-neo-accent-b/20 border border-neo-accent-a/30">
                          <Sparkles className="w-5 h-5 text-neo-accent-b" />
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-[0.15em]">
                          Key Insights
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {insightsModal.insights.insights.map((insight, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group rounded-2xl border-2 border-neo-divider bg-gradient-to-br from-neo-panel to-neo-panel-hover p-5 hover:border-neo-accent-a/60 hover:shadow-[0_0_20px_rgba(58,108,244,0.15)] transition-all duration-300"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-neo-accent-a/20 to-neo-accent-b/20 border-2 border-neo-accent-a/40 flex items-center justify-center text-sm font-bold text-white shadow-[0_0_10px_rgba(58,108,244,0.3)]">
                                {index + 1}
                              </div>
                              <p className="text-base text-white leading-relaxed flex-1 font-medium">{insight}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Key Words */}
                    {insightsModal.insights.keyWords && insightsModal.insights.keyWords.length > 0 && (
                      <div className="space-y-4 pt-6 border-t-2 border-neo-divider">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-neo-accent-b/10 border border-neo-accent-b/30">
                            <Zap className="w-4 h-4 text-neo-accent-b" />
                          </div>
                          <h3 className="text-base font-bold text-white uppercase tracking-[0.15em]">
                            Key Terms
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {insightsModal.insights.keyWords.slice(0, 10).map((word, index) => (
                            <span
                              key={index}
                              className="px-4 py-2 rounded-full bg-neo-panel-hover border border-neo-divider text-sm font-medium text-neo-text-primary hover:border-neo-accent-a/60 hover:text-neo-accent-a hover:bg-neo-accent-a/10 transition-all"
                            >
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View Full Analysis Link */}
                    {insightsModal.videoId && (
                      <div className="pt-6 border-t-2 border-neo-divider">
                        <Link
                          href={`/latest/${insightsModal.videoId}?from=feed`}
                          onClick={closeInsightsModal}
                          className="group/analysis flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-neo-accent-a/20 to-neo-accent-b/20 border-2 border-neo-accent-a/40 hover:border-neo-accent-a/60 hover:from-neo-accent-a/30 hover:to-neo-accent-b/30 transition-all hover:shadow-[0_0_20px_rgba(58,108,244,0.3)]"
                        >
                          <BookOpen className="w-5 h-5 text-neo-accent-b group-hover/analysis:scale-110 transition-transform" />
                          <span className="text-base font-bold text-white">View Full Analysis</span>
                          <Activity className="w-5 h-5 text-neo-accent-a group-hover/analysis:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-neo-text-secondary">No insights available.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

