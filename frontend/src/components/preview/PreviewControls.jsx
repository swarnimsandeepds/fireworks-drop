import { RotateCcw, Smartphone, Clapperboard } from "lucide-react";

const fmt = (s) => `0:${String(s).padStart(2, "0")}`;

export const PreviewControls = ({ kit, sec, barRef, mode, onMode, onReplay, done }) => (
  <div className="shrink-0 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] space-y-3 bg-[#0D0F1A]/95 border-t border-white/10">
    <div className="max-w-2xl mx-auto space-y-3">
    <div className="flex items-center gap-3">
      <span className="font-mono-bd text-xs text-white whitespace-nowrap shrink-0" data-testid="preview-second-counter">
        {fmt(sec)} <span className="text-slate-500">/ 0:15</span>
      </span>
      <div className="relative flex-1 h-2 rounded-full bg-[#1E2640]" data-testid="preview-progress-bar">
        <div ref={barRef} className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#FF2A85] to-[#FFD043]" style={{ width: 0 }} />
        {kit.cues.map((c, i) => (
          <span key={i} className="absolute -top-0.5 w-0.5 h-3 bg-white/60 rounded" style={{ left: `${(c.second / 15) * 100}%` }} />
        ))}
        <span
          className="absolute top-1/2 w-3.5 h-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#FFD043] shadow-[0_0_12px_rgba(255,208,67,0.9)]"
          style={{ left: `${(kit.drop_second / 15) * 100}%` }}
          data-testid="preview-drop-marker"
        />
      </div>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex flex-1 p-1 rounded-full bg-[#131728] border border-white/10">
        {[["stage", "Stage view", Clapperboard], ["phone", "Phone view", Smartphone]].map(([m, label, Icon]) => (
          <button
            key={m}
            data-testid={`preview-${m}-view-btn`}
            onClick={() => onMode(m)}
            className={`flex-1 h-10 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              mode === m ? "bg-[#FF2A85] text-white shadow-[0_0_16px_rgba(255,42,133,0.5)]" : "text-slate-400 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      <button
        data-testid="preview-replay-btn"
        onClick={onReplay}
        aria-label="Replay"
        className={`h-12 px-4 rounded-full font-semibold text-xs flex items-center gap-1.5 transition-colors ${
          done ? "bg-[#FFD043] text-[#06070D]" : "border border-[#FFD043]/40 text-[#FFD043] hover:bg-[#FFD043]/10"
        }`}
      >
        <RotateCcw className="w-4 h-4" /> Replay
      </button>
    </div>
    </div>
  </div>
);
