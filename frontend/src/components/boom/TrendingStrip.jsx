import { useEffect, useState } from "react";
import axios from "axios";
import { Music2, MapPin, Radio } from "lucide-react";
import { API } from "@/lib/api";

export const TrendingStrip = ({ onAdd }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`${API}/trends`).then((r) => setData(r.data)).catch(() => setData({ sounds: [], events: [], live: false }));
  }, []);

  const chips = data
    ? [
        ...data.sounds.map((s) => ({ key: `s-${s.title}`, icon: Music2, label: s.title, sub: s.artist, text: `dancing to "${s.title}"${s.artist ? ` by ${s.artist}` : ""}` })),
        ...data.events.map((e) => ({ key: `e-${e.name}`, icon: MapPin, label: e.name, sub: e.place, text: `near ${e.name}${e.place ? ` at ${e.place}` : ""}` })),
      ]
    : [];

  return (
    <section className="pb-2 rise" style={{ animationDelay: "0.05s" }} data-testid="trending-strip">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 font-mono-bd text-[10px] uppercase tracking-widest text-[#FFD043]">
          <Radio className="w-3.5 h-3.5" /> Trending tonight
        </span>
        {data && (
          <span className="font-mono-bd text-[9px] uppercase tracking-wider text-slate-500" data-testid="trending-source-label">
            {data.live ? "Live · You.com" : "House picks"}
          </span>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {!data && [0, 1, 2].map((i) => <div key={i} className="shrink-0 h-12 w-32 rounded-2xl bg-white/5 animate-pulse" />)}
        {chips.map((c, i) => (
          <button
            key={c.key}
            data-testid={`trend-chip-${i}`}
            onClick={() => onAdd(c.text)}
            className="shrink-0 max-w-[200px] text-left px-3 py-2 rounded-2xl border border-[#FF2A85]/30 bg-[#FF2A85]/10 hover:border-[#FFD043]/60 hover:bg-[#FFD043]/10 active:scale-95 transition-[background-color,border-color,transform]"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-white truncate">
              <c.icon className="w-3.5 h-3.5 shrink-0 text-[#FF5E9F]" /> <span className="truncate">{c.label}</span>
            </span>
            {c.sub && <span className="block text-[10px] text-slate-400 truncate">{c.sub}</span>}
          </button>
        ))}
      </div>
    </section>
  );
};
