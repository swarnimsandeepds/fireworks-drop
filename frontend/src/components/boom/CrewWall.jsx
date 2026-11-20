import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Film, Music2 } from "lucide-react";
import { API } from "@/lib/api";
import { useT } from "@/lib/i18n";

export const CrewWall = () => {
  const t = useT();
  const [clips, setClips] = useState(null);
  const load = useCallback(() => {
    axios.get(`${API}/clips`).then((r) => setClips(r.data)).catch(() => setClips([]));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("boomdrop:clip-posted", load);
    return () => window.removeEventListener("boomdrop:clip-posted", load);
  }, [load]);

  return (
    <section className="mt-12 rise" data-testid="crew-video-wall">
      <h2 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <Film className="w-5 h-5 text-[#FF2A85]" /> {t("wallTitle")}
      </h2>
      <p className="text-sm text-slate-400 mt-1">{t("wallSub")}</p>
      {clips && clips.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400" data-testid="crew-wall-empty">{t("wallEmpty")}</div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {!clips && [0, 1].map((i) => <div key={i} className="aspect-[9/16] rounded-2xl bg-white/5 animate-pulse" />)}
        {clips?.map((c, i) => (
          <figure key={c.id} className="rounded-2xl overflow-hidden bg-[#131728] border border-[#FF2A85]/20" data-testid={`crew-clip-${i}`}>
            <video
              src={`${API}/clips/${c.id}/video`}
              className="w-full aspect-[9/16] object-cover bg-black"
              controls
              playsInline
              preload="metadata"
              data-testid={`crew-clip-video-${i}`}
            />
            <figcaption className="p-2.5">
              <div className="text-xs font-semibold text-white truncate">{c.crew}</div>
              <div className="text-[10px] text-slate-400 truncate">{c.kit_name}</div>
              <div className="flex items-center gap-1 text-[10px] text-[#FF5E9F] truncate"><Music2 className="w-3 h-3 shrink-0" /> {c.song}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};
