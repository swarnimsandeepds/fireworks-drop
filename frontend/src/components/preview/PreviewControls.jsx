import { RotateCcw, Smartphone, Clapperboard, Video, Circle, Pause, Play } from "lucide-react";
import { useT } from "@/lib/i18n";

const fmt = (s) => `0:${String(s).padStart(2, "0")}`;

export const PreviewControls = ({ kit, sec, barRef, mode, onMode, onReplay, done, onRecord, recording, paused, onPause }) => {
  const t = useT();
  return (
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
        {[["stage", t("stageView"), Clapperboard], ["phone", t("phoneView"), Smartphone]].map(([m, label, Icon]) => (
          <button
            key={m}
            data-testid={`preview-${m}-view-btn`}
            onClick={() => onMode(m)}
            disabled={recording}
            className={`flex-1 h-10 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              mode === m ? "bg-[#FF2A85] text-white shadow-[0_0_16px_rgba(255,42,133,0.5)]" : "text-slate-400 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      <button
        data-testid="preview-pause-btn"
        onClick={onPause}
        disabled={recording || done}
        aria-label={paused ? t("resume") : t("pause")}
        className="h-12 w-12 shrink-0 rounded-full border border-white/15 text-white grid place-items-center hover:bg-white/10 transition-colors disabled:opacity-40"
      >
        {paused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
      </button>
      <button
        data-testid="preview-replay-btn"
        onClick={onReplay}
        disabled={recording}
        aria-label="Replay"
        className={`h-12 px-4 rounded-full font-semibold text-xs flex items-center gap-1.5 transition-colors ${
          done ? "bg-[#FFD043] text-[#06070D]" : "border border-[#FFD043]/40 text-[#FFD043] hover:bg-[#FFD043]/10"
        }`}
      >
        <RotateCcw className="w-4 h-4" /> {t("replay")}
      </button>
    </div>
    <button
      data-testid="preview-record-btn"
      onClick={onRecord}
      disabled={recording}
      className="w-full h-11 rounded-full border border-[#FF2A85]/50 text-[#FF5E9F] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#FF2A85]/10 transition-colors disabled:opacity-80"
    >
      {recording ? <><Circle className="w-3.5 h-3.5 fill-[#FF2A85] text-[#FF2A85] animate-pulse" /> {t("recording")}</> : <><Video className="w-4 h-4" /> {t("record")}</>}
    </button>
    </div>
  </div>
  );
};
