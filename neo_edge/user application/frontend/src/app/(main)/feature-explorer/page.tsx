import { Search } from "lucide-react";

export default function FeatureExplorerPage() {
  return (
    <div className="space-y-8">
      <div className="border-b border-neo-divider pb-6">
            <h1 className="text-3xl font-bold text-neo-text-primary tracking-tight">Feature Explorer</h1>
            <p className="text-neo-text-secondary mt-2 text-lg font-light">
                Cross-vendor AI feature intelligence and search.
            </p>
      </div>

      <div className="min-h-[400px] flex flex-col items-center justify-center border border-dashed border-neo-divider rounded-xl bg-neo-panel/50">
          <Search size={48} className="text-neo-divider mb-4" />
          <p className="text-neo-text-secondary">Feature search and comparison tools loading...</p>
      </div>
    </div>
  );
}

