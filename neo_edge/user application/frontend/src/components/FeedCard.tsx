"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, TrendingUp, Play, User } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface FeedCardProps {
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

// FieldNote evidence-grade colour map (A strongest -> D weakest)
const gradeClasses = (g?: string | null) => {
  switch ((g || "").toUpperCase()) {
    case "A": return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
    case "B": return "bg-sky-500/20 text-sky-300 border-sky-400/40";
    case "C": return "bg-amber-500/20 text-amber-300 border-amber-400/40";
    default: return "bg-zinc-500/20 text-zinc-300 border-zinc-400/40";
  }
};

export function FeedCard({ id, title, source, thumbnailUrl, videoUrl, insights, tags, timestamp, evidenceGrade, gradeRationale, operator, company, sourceType, recordedAt }: FeedCardProps) {
  const [showPlayer, setShowPlayer] = useState(false);

  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}?autoplay=1` : null;
  };

  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (embedUrl) {
      setShowPlayer(true);
    }
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <div className="block h-full bg-neo-panel border border-neo-divider rounded-xl overflow-hidden hover:border-neo-accent-a/50 transition-all"
      >
        {/* Thumbnail */}
        <div className="relative h-48 bg-neo-bg overflow-hidden cursor-pointer" onClick={handlePlayClick}>
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br from-indigo-900 to-blue-950`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neo-bg via-transparent to-transparent opacity-60" />

          {/* Source Badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-xs font-medium text-white">
              {source}
            </span>
          </div>

          {/* Evidence grade */}
          {evidenceGrade && (
            <div className="absolute top-3 right-3">
              <span
                title={gradeRationale || undefined}
                className={`px-2 py-1 rounded-md text-xs font-bold border backdrop-blur-sm ${gradeClasses(evidenceGrade)}`}
              >
                Grade {evidenceGrade}
              </span>
            </div>
          )}

          {/* Video Play Icon Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 rounded-full bg-neo-accent-a/90 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Title */}
          <h3 className="text-base font-semibold text-neo-text-primary line-clamp-2 leading-snug group-hover:text-neo-accent-a transition-colors">
            {title}
          </h3>

          {/* Firsthand provenance: named operator + company */}
          {(operator || company) && (
            <div className="flex items-start gap-2 text-xs text-neo-text-secondary">
              <User size={13} className="mt-0.5 text-neo-accent-a shrink-0" />
              <span className="leading-snug">{operator || company}</span>
            </div>
          )}

          {/* Source type + recorded date */}
          {(sourceType || recordedAt) && (
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-neo-text-secondary font-mono">
              {sourceType && <span>{sourceType}</span>}
              {sourceType && recordedAt && <span className="opacity-50">·</span>}
              {recordedAt && <span>{recordedAt}</span>}
            </div>
          )}

          {/* Reported outcomes (attributed to the source, pending human scrub) */}
          {insights && insights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-neo-text-secondary uppercase tracking-wider font-mono">
              <TrendingUp size={12} className="text-neo-accent-b" />
              Reported Outcomes
            </div>
            <ul className="space-y-1.5">
              {insights.slice(0, 2).map((insight, i) => (
                <li key={i} className="flex gap-2 items-start text-xs text-neo-text-secondary leading-relaxed">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-neo-accent-b shrink-0" />
                  <span className="line-clamp-2">{insight}</span>
                </li>
              ))}
            </ul>
          </div>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-neo-bg border border-neo-divider text-xs text-neo-text-secondary">
                {tag}
              </span>
            ))}
          </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-neo-divider">
            <div className="flex items-center gap-1.5 text-xs text-neo-text-secondary">
              <Clock size={12} />
              {timestamp}
            </div>
            <Link 
              href={`/latest/${id}`}
              className="text-xs text-neo-accent-a font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View Analysis →
            </Link>
          </div>
        </div>
      </div>
    </motion.div>

    {/* Video Player Modal */}
    {showPlayer && embedUrl && (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={() => setShowPlayer(false)}
      >
        <div 
          className="relative w-full max-w-6xl mx-4 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowPlayer(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    )}
    </>
  );
}
