"use client";

import { useState, useEffect } from "react";
import { Filter, Search, Clock, Building2, SortAsc, X } from "lucide-react";

interface FilterProps {
  onFilterChange: (filters: {
    timeRange: string;
    vendor: string;
    search: string;
    sortBy: string;
  }) => void;
}

export function FeedFilters({ onFilterChange }: FilterProps) {
  const [timeRange, setTimeRange] = useState("all");
  const [vendor, setVendor] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [vendors, setVendors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVendors() {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';
        const res = await fetch(`${API_BASE_URL}/api/filters/vendors`);
        const data = await res.json();
        if (data.success) {
          setVendors(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchVendors();
  }, []);

  useEffect(() => {
    onFilterChange({ timeRange, vendor, search, sortBy });
  }, [timeRange, vendor, search, sortBy, onFilterChange]);

  const hasActiveFilters = timeRange !== "all" || vendor !== "" || search !== "";

  const clearFilters = () => {
    setTimeRange("all");
    setVendor("");
    setSearch("");
  };

  return (
    <aside className="sticky top-20 h-fit max-h-[calc(100vh-100px)] overflow-y-auto rounded-2xl bg-neo-panel p-5 border border-neo-divider shadow-lg backdrop-blur-xl w-60 space-y-6 pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex items-center gap-2 pb-3 border-b border-neo-divider">
        <div className="p-1.5 rounded-lg bg-neo-accent-b/10 border border-neo-accent-b/20">
          <Filter className="w-4 h-4 text-neo-accent-b" />
        </div>
        <h4 className="text-sm font-bold text-neo-accent-b tracking-wide">Feed Filters</h4>
      </div>

      {/* Search */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-3.5 h-3.5 text-neo-text-secondary" />
          <div className="text-[11px] font-semibold text-neo-text-primary uppercase tracking-wider">Search</div>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search feeds..."
          className="w-full px-3 py-2 rounded-lg bg-neo-bg border border-neo-divider text-neo-text-primary text-xs placeholder:text-neo-text-secondary focus:outline-none focus:border-neo-accent-a/50 transition-colors"
        />
      </div>

      {/* Time Range */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3.5 h-3.5 text-neo-text-secondary" />
          <div className="text-[11px] font-semibold text-neo-text-primary uppercase tracking-wider">Time Range</div>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-neo-bg border border-neo-divider text-neo-text-primary text-xs focus:outline-none focus:border-neo-accent-a/50 transition-colors cursor-pointer"
        >
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Vendor */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-3.5 h-3.5 text-neo-text-secondary" />
          <div className="text-[11px] font-semibold text-neo-text-primary uppercase tracking-wider">Vendor</div>
        </div>
        {loading ? (
          <div className="px-3 py-2 text-xs text-neo-text-secondary">Loading...</div>
        ) : (
          <select
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-neo-bg border border-neo-divider text-neo-text-primary text-xs focus:outline-none focus:border-neo-accent-a/50 transition-colors cursor-pointer"
          >
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}
      </div>

      {/* Sort By */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <SortAsc className="w-3.5 h-3.5 text-neo-text-secondary" />
          <div className="text-[11px] font-semibold text-neo-text-primary uppercase tracking-wider">Sort By</div>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-neo-bg border border-neo-divider text-neo-text-primary text-xs focus:outline-none focus:border-neo-accent-a/50 transition-colors cursor-pointer"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* Clear Filters */}
      <div className="pt-2 border-t border-neo-divider">
        <button
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          className={`w-full rounded-lg border px-3 py-2.5 text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
            hasActiveFilters
              ? "bg-neo-panel border-neo-divider text-neo-text-secondary hover:bg-neo-panel-hover hover:text-neo-text-primary hover:border-neo-accent-b/20"
              : "bg-neo-panel/30 border-neo-divider/50 text-neo-text-secondary/50 cursor-not-allowed"
          }`}
        >
          <X className="w-3 h-3" />
          Clear Filters
        </button>
      </div>
    </aside>
  );
}

