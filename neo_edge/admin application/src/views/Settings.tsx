import React, { useState } from 'react';
import { Card, Button, Badge, cn } from '../components/ui/Shared';
import { Sliders, Shield, Zap, Bell, CheckCircle, Save } from 'lucide-react';
import { motion } from 'motion/react';

const Slider = ({ label, value, onChange, min = 0, max = 100, suffix = '%' }: any) => (
  <div className="mb-6">
    <div className="flex justify-between mb-2">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <span className="text-sm font-mono text-cyan-400">{value}{suffix}</span>
    </div>
    <div className="relative h-2 bg-zinc-800 rounded-full">
      <div 
        className="absolute top-0 left-0 h-full bg-cyan-600 rounded-full" 
        style={{ width: `${((value - min) / (max - min)) * 100}%` }} 
      />
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
      />
    </div>
  </div>
);

const Toggle = ({ label, description, active, onToggle }: any) => (
  <div className="flex items-start justify-between py-4 border-b border-zinc-800 last:border-0">
    <div>
      <div className="text-sm font-medium text-zinc-200">{label}</div>
      <div className="text-xs text-zinc-500 mt-1">{description}</div>
    </div>
    <button 
      onClick={onToggle}
      className={cn("w-10 h-5 rounded-full relative transition-colors", active ? "bg-cyan-600" : "bg-zinc-700")}
    >
      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm", active ? "left-6" : "left-1")} />
    </button>
  </div>
);

export const Settings = () => {
  const [minScore, setMinScore] = useState(75);
  const [weights, setWeights] = useState({
    engagement: 40,
    credibility: 30,
    relevance: 30
  });
  const [toggles, setToggles] = useState({
    autoPublish: false,
    strictMode: true,
    notify: true
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Scoring Algorithm */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6 text-zinc-100 font-semibold text-lg">
              <Sliders size={20} className="text-cyan-400" />
              <h3>Quality Algorithm Weights</h3>
            </div>
            
            <Slider 
              label="Engagement Metrics (Views/Likes)" 
              value={weights.engagement} 
              onChange={(v: number) => setWeights({...weights, engagement: v})} 
            />
            <Slider 
              label="Channel Credibility" 
              value={weights.credibility} 
              onChange={(v: number) => setWeights({...weights, credibility: v})} 
            />
            <Slider 
              label="Content Relevance" 
              value={weights.relevance} 
              onChange={(v: number) => setWeights({...weights, relevance: v})} 
            />
            
            <div className="mt-6 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 text-xs text-zinc-400 flex gap-2">
              <Shield size={14} className="mt-0.5 shrink-0 text-amber-500" />
              Total weight must equal 100%. Current total: {weights.engagement + weights.credibility + weights.relevance}%
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6 text-zinc-100 font-semibold text-lg">
              <Zap size={20} className="text-amber-400" />
              <h3>Automation Rules</h3>
            </div>
            
            <Slider 
              label="Minimum Quality Score for Approval" 
              value={minScore} 
              min={50}
              max={95}
              suffix=""
              onChange={setMinScore} 
            />
            
            <div className="mt-4">
              <Toggle 
                label="Auto-Publish High Quality Content" 
                description="Automatically publish videos with score > 90" 
                active={toggles.autoPublish} 
                onToggle={() => setToggles({...toggles, autoPublish: !toggles.autoPublish})} 
              />
              <Toggle 
                label="Strict Mode" 
                description="Require manual review for unverified channels" 
                active={toggles.strictMode} 
                onToggle={() => setToggles({...toggles, strictMode: !toggles.strictMode})} 
              />
            </div>
          </Card>
        </div>

        {/* System Prefs */}
        <div className="space-y-6">
          <Card className="p-6">
             <div className="flex items-center gap-2 mb-6 text-zinc-100 font-semibold text-lg">
              <Bell size={20} className="text-violet-400" />
              <h3>Notifications</h3>
            </div>
             <Toggle 
                label="Daily Digest" 
                description="Email summary of ingestion stats" 
                active={toggles.notify} 
                onToggle={() => setToggles({...toggles, notify: !toggles.notify})} 
              />
          </Card>

          <div className="flex justify-end pt-4">
             <Button variant="primary" size="lg" className="w-full md:w-auto">
                <Save size={16} className="mr-2" /> Save Configuration
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
