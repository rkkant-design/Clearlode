"use client";

import React from "react";
import Link from "next/link";
import { Compass, Layers, Video, Search, BarChart3, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { TopNav } from "@/components/TopNav";
import { AskNeo } from "@/components/AskNeo";
import { RecentUploads } from "@/components/RecentUploads";

const quickNav = [{
  label: "Latest Records",
  icon: Compass,
  path: "/latest",
  enabled: true
}, {
  label: "Feed",
  icon: Search,
  path: "/feed",
  enabled: true
}, {
  label: "Company Explorer",
  icon: Layers,
  path: "/vendors",
  enabled: true
}, {
  label: "Compare Deployments",
  icon: Video,
  path: "/demo-candidates",
  enabled: true
}, {
  label: "Benchmarks",
  icon: BarChart3,
  path: "/use-case-explorer",
  enabled: true
}] as any[];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neo-bg font-sans text-neo-text-primary selection:bg-neo-accent-a/30">
      <TopNav />
      
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.10),_transparent_55%)]" />
      
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />

      <main className="relative z-10 pt-16">
        <div className="neo-container pt-8">
          <section className="flex flex-col gap-10 pb-12 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 rounded-full border border-neo-divider bg-neo-panel px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-neo-accent-a mb-6"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-accent-a opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-neo-accent-a"></span>
                </span>
                Firsthand Only
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-neo-text-primary via-neo-accent-b to-neo-text-primary bg-clip-text text-transparent md:text-4xl"
              >
                The firsthand record of what enterprises actually did with AI.
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="mt-3 text-sm text-neo-text-secondary"
              >
                Every record is a named operator describing their own deployment, with the
                evidence and the caveats intact. Launch focus: customer support.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-8"
              >
                <Link href="/latest" className="group relative overflow-hidden rounded-full bg-neo-accent-a px-6 py-2.5 text-[12px] font-semibold tracking-wide text-white hover:bg-neo-accent-a/90 transition-all shadow-[0_0_20px_rgba(58,108,244,0.4)] hover:shadow-[0_0_30px_rgba(58,108,244,0.6)] inline-block">
                  <span className="relative z-10">Explore the Records</span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 ease-in-out" />
                </Link>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="w-full max-w-sm rounded-3xl border border-neo-divider bg-neo-panel p-5 text-[11px] shadow-[0_0_50px_-10px_rgba(58,108,244,0.2)] backdrop-blur-md relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neo-accent-a/5 to-transparent opacity-0 group-hover:opacity-100 h-1/2 w-full -translate-y-full group-hover:animate-scan pointer-events-none transition-opacity duration-500" />
              <div className="grid grid-cols-3 gap-3 text-center relative z-10">
                <div className="rounded-2xl bg-neo-panel-hover border border-neo-divider px-3 py-3 hover:bg-neo-panel transition-colors">
                  <div className="text-[10px] uppercase tracking-wider text-neo-text-secondary font-semibold">
                    Firsthand
                  </div>
                  <div className="mt-1.5 text-xl font-bold text-neo-text-primary">100%</div>
                  <div className="mt-1 text-[9px] text-neo-text-secondary">named operators</div>
                </div>
                <div className="rounded-2xl bg-neo-panel-hover border border-neo-divider px-3 py-3 hover:bg-neo-panel transition-colors">
                  <div className="text-[10px] uppercase tracking-wider text-neo-text-secondary font-semibold">
                    Domain
                  </div>
                  <div className="mt-1.5 text-xl font-bold text-neo-text-primary">CS</div>
                  <div className="mt-1 text-[9px] text-neo-text-secondary">customer support</div>
                </div>
                <div className="rounded-2xl bg-neo-panel-hover border border-neo-divider px-3 py-3 hover:bg-neo-panel transition-colors">
                  <div className="text-[10px] uppercase tracking-wider text-neo-text-secondary font-semibold">
                    Evidence
                  </div>
                  <div className="mt-1.5 text-xl font-bold text-neo-text-primary">A–D</div>
                  <div className="mt-1 text-[9px] text-neo-text-secondary">graded</div>
                </div>
              </div>
            </motion.div>
          </section>

          <section className="pb-8">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-neo-text-secondary border-b border-neo-divider pb-2">
              <span className="font-semibold uppercase tracking-wider text-neo-accent-b">FieldNote Modules</span>
              <span className="text-neo-text-secondary">Browse the firsthand library.</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {quickNav.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.05 }}
                >
                  {item.enabled ? (
                    <Link
                      href={item.path}
                      className="group relative flex cursor-pointer flex-col items-start gap-3 rounded-2xl border border-neo-divider bg-neo-panel p-4 text-left text-xs text-neo-text-secondary transition-all hover:border-neo-accent-a/40 hover:bg-neo-panel-hover hover:shadow-[0_4px_20px_-4px_rgba(58,108,244,0.15)]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neo-accent-a/10 text-neo-accent-a group-hover:bg-neo-accent-a group-hover:text-white transition-colors duration-300">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <ArrowRight className="h-3 w-3 text-neo-text-secondary group-hover:text-neo-accent-a transition-colors" />
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-neo-text-primary group-hover:text-neo-accent-b transition-colors">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-neo-text-secondary leading-normal">
                        {item.label === "Latest Records" && "Newest firsthand deployment records."}
                        {item.label === "Feed" && "Firsthand accounts, filter by company and workflow."}
                        {item.label === "Company Explorer" && "Browse deployments by company."}
                        {item.label === "Compare Deployments" && "Compare records side by side."}
                        {item.label === "Benchmarks" && "Outcome metrics across records."}
                      </div>
                    </Link>
                  ) : (
                    <div className="group relative flex flex-col items-start gap-3 rounded-2xl border border-neo-divider/50 bg-neo-panel/30 p-4 text-left text-xs text-neo-text-secondary cursor-not-allowed overflow-hidden">
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-neo-accent-b/30 bg-neo-accent-b/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neo-accent-b">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-accent-b opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neo-accent-b"></span>
                          </span>
                          Launching Soon
                        </span>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neo-accent-a/5 text-neo-accent-a/50">
                          <item.icon className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-neo-text-primary/70">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-neo-text-secondary/70 leading-normal">
                        {item.label === "Company Explorer" && "Browse deployments by company."}
                        {item.label === "Compare Deployments" && "Compare records side by side."}
                        {item.label === "Benchmarks" && "Outcome metrics across records."}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>

          <RecentUploads />
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(200%); }
          }
          .animate-scan {
            animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
        `
      }} />
      <AskNeo />
    </div>
  );
}
