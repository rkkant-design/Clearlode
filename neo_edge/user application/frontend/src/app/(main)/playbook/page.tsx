import { BookOpen } from "lucide-react";

export default function PlaybookPage() {
  return (
    <div className="space-y-8">
      <div className="border-b border-neo-divider pb-6">
            <h1 className="text-3xl font-bold text-neo-text-primary tracking-tight">Playbook</h1>
            <p className="text-neo-text-secondary mt-2 text-lg font-light">
                Auto-generated reports, POVs, and advisory content.
            </p>
      </div>

      <div className="min-h-[400px] flex flex-col items-center justify-center border border-dashed border-neo-divider rounded-xl bg-neo-panel/50">
          <BookOpen size={48} className="text-neo-divider mb-4" />
          <p className="text-neo-text-secondary">Select industry to generate playbook.</p>
      </div>
    </div>
  );
}

