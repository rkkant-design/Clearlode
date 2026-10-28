import React, { useState } from 'react';
import { LayoutDashboard, Radio, Database, Settings, LogOut, Layers, Hexagon } from 'lucide-react';
import { Dashboard } from './views/Dashboard';
import { Ingestion } from './views/Ingestion';
import { Repository } from './views/Repository';
import { Settings as SettingsView } from './views/Settings';
import { cn } from './components/ui/Shared';
import { motion, AnimatePresence } from 'motion/react';

const SidebarItem = ({ icon: Icon, label, active, onClick, count }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
      active 
        ? "bg-zinc-800/80 text-cyan-400 shadow-inner" 
        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
    )}
  >
    <Icon size={18} className={cn("transition-colors", active ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-300")} />
    <span>{label}</span>
    {active && <motion.div layoutId="active-pill" className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-500 rounded-r-full" />}
    {count && (
      <span className="ml-auto bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] px-1.5 py-0.5 rounded-md min-w-[20px] text-center group-hover:border-zinc-700 group-hover:text-zinc-400">
        {count}
      </span>
    )}
  </button>
);

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'ingestion' | 'repository' | 'settings'>('dashboard');

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-900/80 bg-[#09090b] flex flex-col z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-900/20">
             <Hexagon size={20} className="text-white fill-white/20" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-none text-white">FieldNote</h1>
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">Curator Console</span>
          </div>
        </div>

        <div className="flex-1 px-3 py-4 space-y-1">
          <div className="text-xs font-semibold text-zinc-600 px-3 mb-2 uppercase tracking-wider">Platform</div>
          <SidebarItem icon={LayoutDashboard} label="Overview" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <SidebarItem icon={Radio} label="Ingestion Hub" active={currentView === 'ingestion'} onClick={() => setCurrentView('ingestion')} count={42} />
          <SidebarItem icon={Database} label="Repository" active={currentView === 'repository'} onClick={() => setCurrentView('repository')} />
          
          <div className="mt-8 text-xs font-semibold text-zinc-600 px-3 mb-2 uppercase tracking-wider">System</div>
          <SidebarItem icon={Layers} label="Pipeline" active={false} onClick={() => {}} />
          <SidebarItem icon={Settings} label="Settings" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
        </div>

        <div className="p-4 border-t border-zinc-900">
          <button className="flex items-center gap-3 w-full p-2 hover:bg-zinc-900 rounded-lg transition-colors group">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:border-zinc-600 group-hover:text-zinc-200">AD</div>
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-zinc-300 group-hover:text-white">Admin User</div>
              <div className="text-[10px] text-zinc-500">Super Admin</div>
            </div>
            <LogOut size={14} className="text-zinc-600 group-hover:text-zinc-400" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Ambient Background Gradient */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-zinc-900/30 to-transparent pointer-events-none" />
        <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] bg-indigo-900/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-[200px] -left-[200px] w-[600px] h-[600px] bg-cyan-900/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Header */}
        <header className="h-16 border-b border-zinc-900/80 flex items-center justify-between px-6 z-10 bg-zinc-950/50 backdrop-blur-md">
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <span className="text-zinc-300 font-medium">
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
            </span>
          </div>

        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-8 relative z-10 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto pb-10">
            <div className="mb-8 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                  {currentView === 'dashboard' ? 'System Overview' : 
                   currentView === 'ingestion' ? 'Video Ingestion Hub' :
                   currentView === 'repository' ? 'Content Repository' : 'System Settings'}
                </h2>
                <p className="text-zinc-500 text-sm">
                   {currentView === 'dashboard' ? 'Real-time monitoring of extraction pipeline and quality metrics.' : 
                   currentView === 'ingestion' ? 'Review, score, and approve incoming video content.' :
                   currentView === 'repository' ? 'Manage published videos and processing status.' : 'Configure scoring algorithms and thresholds.'}
                </p>
              </div>
              
              {currentView === 'ingestion' && (
                <div className="flex gap-2">
                   <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Auto-fetch active
                   </div>
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {currentView === 'dashboard' && <Dashboard />}
                {currentView === 'ingestion' && <Ingestion />}
                {currentView === 'repository' && <Repository />}
                {currentView === 'settings' && <SettingsView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
