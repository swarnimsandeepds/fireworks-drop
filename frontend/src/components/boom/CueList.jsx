const fmt = (s) => `0:${String(Math.round(s)).padStart(2, "0")}`;

const Timeline = ({ cues, drop }) => (
  <div className="relative h-8 mb-6" data-testid="cue-timeline-15s">
    <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full bg-[#1E2640]" />
    <div
      className="absolute top-1/2 w-4 h-4 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#FFD043] shadow-[0_0_16px_rgba(255,208,67,0.9)]"
      style={{ left: `${(drop / 15) * 100}%` }}
    />
    {cues.map((c, i) => (
      <div key={i} className="absolute top-1/2 w-2 h-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#FF2A85]" style={{ left: `${(c.second / 15) * 100}%` }} />
    ))}
    <span className="absolute -bottom-3 left-0 font-mono-bd text-[10px] text-slate-500">0:00</span>
    <span className="absolute -bottom-3 right-0 font-mono-bd text-[10px] text-slate-500">0:15</span>
  </div>
);

export const CueList = ({ cues, drop }) => (
  <section className="p-5">
    <h3 className="font-display font-bold text-lg mb-4">Cue sheet</h3>
    <Timeline cues={cues} drop={drop} />
    <ol className="relative border-l border-[#1E2640] ml-3 space-y-5">
      {cues.map((c, i) => {
        const isDrop = Math.abs(c.second - drop) < 0.6;
        return (
          <li key={i} className="pl-6 relative" data-testid={`cue-timeline-item-${i}`}>
            <span
              className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                isDrop ? "bg-[#FFD043] border-[#FFD043] shadow-[0_0_14px_rgba(255,208,67,0.9)]" : "bg-[#06070D] border-[#FF2A85]"
              }`}
            />
            <div className="flex items-center gap-2">
              <span className={`font-mono-bd font-bold text-xs ${isDrop ? "text-[#FFD043]" : "text-[#FF5E9F]"}`}>{fmt(c.second)}</span>
              {isDrop && <span className="font-mono-bd text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFD043] text-[#06070D] font-bold">Drop</span>}
            </div>
            <div className="text-sm font-semibold text-white mt-0.5">{c.item_name}</div>
            <div className="text-xs text-[#FF5E9F] capitalize">{c.effect}</div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{c.placement_tip}</p>
          </li>
        );
      })}
    </ol>
  </section>
);
