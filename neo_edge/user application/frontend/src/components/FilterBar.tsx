"use client";

import { Calendar } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface FilterBarProps {
    onFilterChange?: (key: string, value: string) => void;
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
    const [days, setDays] = useState("");
    const [sort, setSort] = useState<"relevance" | "date">("relevance");
    const isInitialMount = useRef(true);

    // Push initial defaults + subsequent changes up to the container.
    useEffect(() => {
        if (isInitialMount.current) {
            // Send initial values on mount
            onFilterChange?.("days", days);
            onFilterChange?.("sort", sort);
            isInitialMount.current = false;
            return;
        }
        // Only call when days actually changes (not on every render)
        onFilterChange?.("days", days);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days]); // Intentionally excluding onFilterChange to prevent infinite loop

    useEffect(() => {
        if (!isInitialMount.current) {
            // Only call when sort actually changes (not on every render)
            onFilterChange?.("sort", sort);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sort]); // Intentionally excluding onFilterChange to prevent infinite loop

    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 sticky top-16 z-30 bg-neo-bg/90 backdrop-blur-xl py-4 border-b border-neo-divider -mx-8 px-8">

            <div className="flex flex-wrap items-center gap-3">
                {/* Date Selector */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neo-panel border border-neo-divider text-sm text-neo-text-secondary hover:border-neo-accent-a/50 transition-all">
                    <Calendar size={14} />
                    <select
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        className="bg-transparent outline-none cursor-pointer text-neo-text-primary"
                        aria-label="Time range"
                    >
                        <option value="">All Time</option>
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-3 ml-auto">
                <span className="text-xs font-mono text-neo-accent-b uppercase tracking-wider hidden md:inline-block">Sort by:</span>
                <div className="flex items-center p-1 bg-neo-panel rounded-lg border border-neo-divider">
                    <button
                        onClick={() => setSort("relevance")}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            sort === "relevance"
                                ? "bg-neo-panel-hover text-neo-text-primary shadow-sm"
                                : "text-neo-text-secondary hover:text-neo-text-primary"
                        }`}
                    >
                        Relevance
                    </button>
                    <button
                        onClick={() => setSort("date")}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            sort === "date"
                                ? "bg-neo-panel-hover text-neo-text-primary shadow-sm"
                                : "text-neo-text-secondary hover:text-neo-text-primary"
                        }`}
                    >
                        Date
                    </button>
                </div>
            </div>
        </div>
    );
}

