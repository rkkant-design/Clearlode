"use client";

import { usePathname } from "next/navigation";
import { Filter, ChevronDown, Layers, Calendar, Tag, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  
  const renderContent = () => {
    if (isCollapsed) return null;

    if (pathname.startsWith('/latest')) {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold text-neo-accent-b uppercase tracking-wider px-2">Filters</h3>
            <div className="space-y-1">
               {[
                 { name: 'Vendor', icon: Globe },
                 { name: 'Category', icon: Layers },
                 { name: 'Date', icon: Calendar },
                 { name: 'Innovation Level', icon: Tag }
               ].map((filter) => (
                   <button key={filter.name} className="w-full flex items-center justify-between px-3 py-2 text-sm text-neo-text-secondary hover:text-neo-text-primary hover:bg-neo-panel rounded-md transition-colors group">
                       <div className="flex items-center gap-3">
                           <filter.icon size={14} className="text-neo-text-secondary group-hover:text-neo-accent-a" />
                           <span>{filter.name}</span>
                       </div>
                       <ChevronDown size={14} className="opacity-50 group-hover:opacity-100" />
                   </button>
               ))}
            </div>
          </div>
          
           <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold text-neo-text-secondary uppercase tracking-wider px-2">Saved Views</h3>
            <div className="space-y-1">
                <button className="w-full text-left px-3 py-2 text-sm text-neo-text-secondary hover:text-neo-text-primary hover:bg-neo-panel rounded-md">
                    My Morning Brief
                </button>
                 <button className="w-full text-left px-3 py-2 text-sm text-neo-text-secondary hover:text-neo-text-primary hover:bg-neo-panel rounded-md">
                    Finance AI Updates
                </button>
            </div>
           </div>
        </div>
      );
    }
    
    if (pathname.startsWith('/vendors')) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-semibold text-neo-accent-b uppercase tracking-wider px-2">Vendors</h3>
                <div className="space-y-1">
                    {['Oracle', 'SAP', 'Salesforce', 'Workday', 'Microsoft', 'ServiceNow'].map((vendor) => (
                        <button key={vendor} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neo-text-secondary hover:text-neo-text-primary hover:bg-neo-panel rounded-md transition-colors group">
                            <div className="w-1.5 h-1.5 rounded-full bg-neo-text-secondary/30 group-hover:bg-neo-accent-a transition-colors" />
                            <span>{vendor}</span>
                        </button>
                    ))}
                </div>
              </div>
            </div>
        )
    }

    if (pathname.startsWith('/feature-explorer')) {
         return (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-semibold text-neo-accent-b uppercase tracking-wider px-2">Explorer</h3>
                <div className="space-y-1">
                    {['Product', 'Function', 'Module', 'Maturity'].map((filter) => (
                        <button key={filter} className="w-full flex items-center justify-between px-3 py-2 text-sm text-neo-text-secondary hover:text-neo-text-primary hover:bg-neo-panel rounded-md transition-colors">
                             <span>{filter}</span>
                             <ChevronDown size={14} />
                        </button>
                    ))}
                </div>
              </div>
            </div>
        )
    }

    if (pathname.startsWith('/playbook')) {
         return (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-semibold text-neo-accent-b uppercase tracking-wider px-2">Industry</h3>
                <div className="space-y-1">
                    {['Retail', 'Manufacturing', 'BFSI', 'Healthcare', 'Technology'].map((ind) => (
                        <button key={ind} className="w-full text-left px-3 py-2 text-sm text-neo-text-secondary hover:text-neo-text-primary hover:bg-neo-panel rounded-md">
                             <span>{ind}</span>
                        </button>
                    ))}
                </div>
              </div>
            </div>
        )
    }

    return (
        <div className="p-4 text-sm text-neo-text-secondary italic">
            Contextual navigation
        </div>
    );
  };

  return (
    <aside 
      className={clsx(
        "fixed top-16 left-0 bottom-0 bg-neo-bg/50 backdrop-blur-sm border-r border-neo-divider z-40 hidden md:block transition-all duration-300 ease-in-out",
        isCollapsed ? "w-12" : "w-64"
      )}
    >
      <div className={clsx("p-6 overflow-y-auto h-full", isCollapsed && "px-2")}>
        <div className="relative">
            {/* Collapse Toggle */}
            <button 
                onClick={toggleSidebar}
                className={clsx(
                    "absolute top-0 z-50 p-1 rounded bg-neo-panel border border-neo-divider text-neo-text-secondary hover:text-neo-text-primary hover:bg-neo-panel-hover transition-all",
                    isCollapsed ? "left-1/2 -translate-x-1/2" : "right-0"
                )}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className={clsx("mt-8 transition-opacity duration-300", isCollapsed ? "opacity-0 invisible" : "opacity-100 visible")}>
                {renderContent()}
            </div>
        </div>
      </div>
    </aside>
  );
}
