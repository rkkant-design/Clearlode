"use client";

import { TopNav } from "@/components/TopNav";
import { AskNeo } from "@/components/AskNeo";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFeedPage = pathname === "/feed";

  return (
    <div className="min-h-screen bg-neo-bg font-sans text-neo-text-primary selection:bg-neo-accent-a/30">
      {isFeedPage && (
        <>
          <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.10),_transparent_55%)]" />
          <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
        </>
      )}
      <TopNav />
      <main className="pt-16 min-h-screen transition-all duration-300 ease-in-out pb-12">
        <div className={clsx(
          "mx-auto animate-in fade-in duration-700 w-full",
          isFeedPage ? "px-4 sm:px-6 lg:px-8" : "neo-container pt-8"
        )}
        >
          {children}
        </div>
      </main>
      <AskNeo />
    </div>
  );
}
