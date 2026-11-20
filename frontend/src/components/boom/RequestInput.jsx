import { Loader2, Zap, AudioLines } from "lucide-react";

const PRESETS = [
  "5 of us at Koh Pich, dancing to APT. by Rosé & Bruno Mars, $35 budget",
  "Solo shuffle on Riverside to a phonk beat, $15 budget",
  "Couple dance at Independence Monument to Die With A Smile, $20",
];

export const RequestInput = ({ transcript, text, setText, onSubmit, loading }) => (
  <section className="space-y-4 rise" style={{ animationDelay: "0.2s" }}>
    {transcript && (
      <div className="rounded-2xl border border-[#FF2A85]/40 bg-[#FF2A85]/10 p-4" data-testid="voice-transcript-display">
        <div className="flex items-center gap-1.5 font-mono-bd text-[10px] uppercase tracking-widest text-[#FF5E9F] mb-1.5">
          <AudioLines className="w-3.5 h-3.5" /> You said
        </div>
        <p className="text-sm text-white leading-relaxed">“{transcript}”</p>
      </div>
    )}
    <div>
      <label htmlFor="req" className="font-mono-bd text-[10px] uppercase tracking-widest text-slate-400">Or type it</label>
      <textarea
        id="req"
        data-testid="manual-text-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="e.g. 4 dancers at Koh Pich, Espresso by Sabrina Carpenter, drop at 8s, $25 budget"
        className="mt-1.5 w-full rounded-2xl bg-[#131728] border border-[#1E2640] p-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF2A85] focus:ring-2 focus:ring-[#FF2A85]/30 transition-colors resize-none"
      />
      <div className="flex gap-2 overflow-x-auto pb-1 mt-2 -mx-1 px-1">
        {PRESETS.map((p, i) => (
          <button
            key={p}
            data-testid={`preset-chip-${i}`}
            onClick={() => setText(p)}
            className="shrink-0 text-xs px-3 py-2 rounded-full border border-white/10 bg-white/5 text-slate-300 hover:border-[#FFD043]/50 hover:text-[#FFD043] transition-colors"
          >
            {p.split(",")[0]}
          </button>
        ))}
      </div>
    </div>
    <button
      data-testid="generate-shot-kit-button"
      onClick={onSubmit}
      disabled={loading}
      className="w-full h-14 rounded-full bg-[#FFD043] text-[#06070D] font-display font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(255,208,67,0.45)] hover:bg-[#FFE07D] active:scale-[0.98] transition-[background-color,transform] disabled:opacity-70"
    >
      {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Building your kit…</> : <><Zap className="w-5 h-5" /> Build Shot Kit</>}
    </button>
  </section>
);
