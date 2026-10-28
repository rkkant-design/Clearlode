"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PlayCircle, ArrowRight, Play } from "lucide-react";

interface Video {
  id: string;
  title: string;
  source: string;
  thumbnailUrl: string;
  videoUrl: string;
  insights?: string[];
  tags?: string[];
  timestamp?: string;
}

export function RecentUploads() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';
        const res = await fetch(`${API_BASE_URL}/api/videos?limit=3`);
        const data = await res.json();
        console.log('Recent Uploads API Response:', data);
        if (data.success && data.data.videos) {
          console.log('Videos fetched:', data.data.videos);
          console.log('First video thumbnail:', data.data.videos[0]?.thumbnailUrl);
          setVideos(data.data.videos);
        }
      } catch (error) {
        console.error('Failed to fetch recent videos:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}?autoplay=1` : null;
  };

  const handlePlayClick = (videoUrl: string | undefined) => {
    if (!videoUrl) return;
    const embedUrl = getYouTubeEmbedUrl(videoUrl);
    if (embedUrl) {
      setSelectedVideoUrl(embedUrl);
      setShowPlayer(true);
    }
  };

  if (loading) {
    return (
      <section className="py-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-neo-accent-b"></div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-neo-accent-b">
              Recent Uploads
            </h2>
          </div>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[300px] rounded-2xl border border-neo-divider bg-neo-panel p-5 animate-pulse">
              <div className="h-4 bg-neo-divider rounded mb-3"></div>
              <div className="h-16 bg-neo-divider rounded mb-3"></div>
              <div className="h-3 bg-neo-divider rounded"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-neo-accent-b"></div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-neo-accent-b">
              Recent Uploads
            </h2>
          </div>
          <Link href="/latest" className="text-[11px] self-start font-medium text-neo-text-secondary hover:text-neo-accent-a transition-colors">
            VIEW ARCHIVE
          </Link>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
          {videos.map((video, i) => (
            <motion.div 
              key={video.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              whileHover={{ y: -4 }}
              className="min-w-[300px] rounded-2xl border border-neo-divider bg-neo-panel overflow-hidden text-xs text-neo-text-secondary backdrop-blur-sm transition-colors hover:bg-neo-panel-hover group"
            >
              {/* Thumbnail */}
              <div 
                className="relative h-40 bg-gradient-to-br from-indigo-900 to-blue-950 overflow-hidden cursor-pointer"
                onClick={() => handlePlayClick(video.videoUrl)}
              >
                {video.thumbnailUrl && (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neo-bg via-transparent to-transparent opacity-60" />
                
                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-neo-accent-a/90 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>

                {/* Vendor Badge */}
                <div className="absolute top-3 left-3">
                  <span className="rounded-md bg-neo-accent-a/10 px-2 py-1 text-[10px] font-medium text-neo-accent-a border border-neo-accent-a/20">
                    {video.source}
                  </span>
                </div>
                
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                    <PlayCircle className="h-3 w-3" /> Auto‑parsed
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="min-h-[3rem]">
                  <div className="line-clamp-2 text-[14px] font-semibold text-neo-text-primary group-hover:text-neo-accent-b transition-colors leading-snug">
                    {video.title}
                  </div>
                </div>
                
                {video.insights && video.insights.length > 0 && (
                  <p className="mt-3 text-[11px] leading-relaxed text-neo-text-secondary border-t border-neo-divider pt-3 line-clamp-2">
                    {video.insights[0]}
                  </p>
                )}
                
                <Link 
                  href={`/latest/${video.id}`}
                  className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-neo-accent-a hover:text-neo-accent-a/80 transition-colors"
                >
                  View intelligence <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Video Player Modal */}
      {showPlayer && selectedVideoUrl && (
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
              src={selectedVideoUrl}
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

