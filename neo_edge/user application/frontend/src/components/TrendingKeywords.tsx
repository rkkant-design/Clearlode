"use client";

import { useState, useEffect } from "react";
import { Activity, TrendingUp } from "lucide-react";

interface Keyword {
  keyword: string;
  count: number;
}

export function TrendingKeywords() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';
        const res = await fetch(`${API_BASE_URL}/api/filters/trending-keywords?limit=5`);
        const data = await res.json();
        if (data.success) {
          setKeywords(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch trending keywords:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTrending();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-neo-panel p-5 border border-neo-divider backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neo-divider">
          <Activity className="w-4 h-4 text-neo-accent-a" />
          <h4 className="text-sm font-bold text-neo-accent-b tracking-wide">Trending</h4>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-neo-panel-hover rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!keywords.length) {
    return (
      <div className="rounded-2xl bg-neo-panel p-5 border border-neo-divider backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neo-divider">
          <Activity className="w-4 h-4 text-neo-accent-a" />
          <h4 className="text-sm font-bold text-neo-accent-b tracking-wide">Trending</h4>
        </div>
        <p className="text-xs text-neo-text-secondary">No trending keywords yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-neo-panel p-5 border border-neo-divider backdrop-blur-xl">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neo-divider">
        <Activity className="w-4 h-4 text-neo-accent-a" />
        <h4 className="text-sm font-bold text-neo-accent-b tracking-wide">Trending</h4>
      </div>
      <ul className="space-y-3">
        {keywords.map((item, i) => (
          <li key={i} className="group cursor-pointer hover:bg-neo-panel-hover -mx-2 px-2 py-2 rounded-lg transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neo-text-primary group-hover:text-neo-accent-b font-medium transition-colors">
                {item.keyword}
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-neo-accent-c" />
            </div>
            <span className="text-xs text-neo-text-secondary">{item.count} mentions</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

