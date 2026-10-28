"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home,
  Rss,
  PlayCircle,
  Menu,
  X
} from "lucide-react";
import { clsx } from "clsx";
import { ThemeToggle } from "./ThemeToggle";
import { useState } from "react";

const navItems = [
  { name: "Home", path: "/", icon: Home },
  { name: "Latest Records", path: "/latest", icon: PlayCircle },
  { name: "Feed", path: "/feed", icon: Rss },
];

export function TopNav() {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
    <header className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-4 sm:px-6 border-b border-neo-divider bg-neo-bg/80 backdrop-blur-md transition-colors duration-300">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3.5 hover:opacity-95 transition-all duration-300 group">
        <div className="relative">
          {/* Animated glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-neo-accent-a/40 via-neo-accent-b/50 to-neo-accent-c/40 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500 animate-pulse"></div>
          
          {/* Main logo container */}
          <div className="relative w-11 h-11 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_30px_rgba(58,108,244,0.3)] group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_40px_rgba(224,185,115,0.5)] transition-all duration-500 border border-white/5 group-hover:border-neo-accent-b/30 overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-neo-accent-a/20 via-neo-accent-b/30 to-neo-accent-c/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Geometric symbol - interconnected nodes representing intelligence network */}
            <div className="relative z-10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="group-hover:scale-110 transition-transform duration-300">
                {/* Central node */}
                <circle cx="12" cy="12" r="3" fill="url(#logoGradient)" className="drop-shadow-[0_0_8px_rgba(224,185,115,0.6)]" />
                {/* Top node */}
                <circle cx="12" cy="5" r="2" fill="url(#logoGradient)" opacity="0.8" />
                {/* Right node */}
                <circle cx="19" cy="12" r="2" fill="url(#logoGradient)" opacity="0.8" />
                {/* Bottom node */}
                <circle cx="12" cy="19" r="2" fill="url(#logoGradient)" opacity="0.8" />
                {/* Left node */}
                <circle cx="5" cy="12" r="2" fill="url(#logoGradient)" opacity="0.8" />
                {/* Connection lines */}
                <line x1="12" y1="7" x2="12" y2="9" stroke="url(#logoGradient)" strokeWidth="1.5" opacity="0.6" />
                <line x1="15" y1="12" x2="17" y2="12" stroke="url(#logoGradient)" strokeWidth="1.5" opacity="0.6" />
                <line x1="12" y1="15" x2="12" y2="17" stroke="url(#logoGradient)" strokeWidth="1.5" opacity="0.6" />
                <line x1="7" y1="12" x2="9" y2="12" stroke="url(#logoGradient)" strokeWidth="1.5" opacity="0.6" />
                
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3A6CF4" stopOpacity="1" />
                    <stop offset="50%" stopColor="#E0B973" stopOpacity="1" />
                    <stop offset="100%" stopColor="#42C7A0" stopOpacity="1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
        
        {/* Wordmark */}
        <div className="flex flex-col justify-center">
          <span className="text-2xl font-extrabold tracking-[-0.02em] bg-gradient-to-r from-white via-neo-accent-b to-white bg-clip-text text-transparent leading-none drop-shadow-[0_0_20px_rgba(224,185,115,0.3)] group-hover:drop-shadow-[0_0_30px_rgba(224,185,115,0.5)] transition-all duration-300">
            FieldNote
          </span>
          <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-neo-accent-b/60 mt-0.5 font-medium">
            FIRSTHAND
          </span>
      </div>
      </Link>

      {/* Navigation Items - Moved to Right */}
      <div className="flex items-center gap-4 sm:gap-6">
      <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
          const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium group relative",
                isActive 
                  ? "text-neo-text-primary bg-neo-panel" 
                  : "text-neo-text-secondary hover:text-neo-text-primary hover:bg-neo-panel-hover"
              )}
            >
              <Icon size={16} className={clsx(
                isActive ? "text-neo-accent-a" : "text-neo-text-secondary group-hover:text-neo-accent-a transition-colors"
              )} />
              <span>{item.name}</span>
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-neo-accent-a rounded-t-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          className="inline-flex lg:hidden items-center justify-center rounded-full border border-neo-divider bg-neo-panel p-2 text-neo-text-secondary hover:text-white hover:bg-neo-panel-hover transition"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
        <ThemeToggle />
        </div>
      </div>
    </header>
    {/* Mobile nav panel */}
    {mobileNavOpen && (
      <div className="lg:hidden fixed inset-0 z-40">
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setMobileNavOpen(false)}
        />
        <div className="absolute top-16 inset-x-0 bottom-0 bg-neo-bg border-t border-neo-divider overflow-y-auto px-4 py-6 space-y-4">
          <div className="text-[11px] uppercase tracking-[0.4em] text-neo-text-tertiary">
            Navigate
          </div>
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={clsx(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                    isActive
                      ? "border-neo-accent-a text-white bg-neo-accent-a/20"
                      : "border-neo-divider text-neo-text-secondary bg-neo-panel hover:border-neo-accent-a/40 hover:text-white"
                  )}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <Icon size={16} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
