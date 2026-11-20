import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Film, Music2, Heart, Trophy, AlertTriangle, Sparkles, Crown } from "lucide-react";
import { UploadShoot } from "@/components/boom/UploadShoot";
import { ShareWinner } from "@/components/boom/ShareWinner";
import { API } from "@/lib/api";
import { useT } from "@/lib/i18n";

const deviceId = () => {
  let id = localStorage.getItem("boomdrop-device");
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("boomdrop-device", id);
  }
  return id;
};

const KitLink = ({ id, testid }) => {
  const t = useT();
  return (
    <a href={`/?kit=${id}`} data-testid={testid}
      className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#FFD043] hover:text-white transition-colors">
      <Sparkles className="w-3 h-3" /> {t("openKit")}
    </a>
  );
};

const ClipOfWeek = ({ c, kind, onLike }) => {
  const t = useT();
  const [broken, setBroken] = useState(false);
  const win = kind === "winner";
  return (
    <div className="mt-4 rounded-3xl overflow-hidden border border-[#FFD043]/50 bg-[#131728] shadow-[0_0_40px_rgba(255,208,67,0.15)]" data-testid="clip-of-week-banner">
      <div className="flex items-center gap-1.5 px-3 py-2 font-mono-bd text-[10px] uppercase tracking-widest text-[#FFD043]">
        {win ? <Crown className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />} <span data-testid="clip-of-week-label">{win ? t("clipOfWeek") : t("freshDrop")}</span>
      </div>
      {!win && <p className="px-3 pb-2 text-xs text-slate-300" data-testid="clip-of-week-be-winner">{t("beWinner")}</p>}
      {broken ? (
        <div className="w-full aspect-[9/16] max-h-[70vh] grid place-items-center bg-black text-xs text-slate-400" data-testid="clip-of-week-error">
          <span><AlertTriangle className="w-5 h-5 mx-auto mb-1 text-[#FFD043]" />{t("clipBroken")}</span>
        </div>
      ) : (
        <video src={`${API}/clips/${c.id}/video`} className="w-full aspect-[9/16] max-h-[70vh] object-cover bg-black" controls playsInline preload="metadata"
          onError={() => setBroken(true)} data-testid="clip-of-week-video" />
      )}
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display font-black text-lg text-white truncate" data-testid="clip-of-week-crew">{c.crew}</div>
          {c.song && <div className="flex items-center gap-1 text-xs text-[#FF5E9F] truncate"><Music2 className="w-3 h-3 shrink-0" /> {c.song}</div>}
          {c.kit_id && <div><KitLink id={c.kit_id} testid="clip-of-week-open-kit" /></div>}
          {win && <ShareWinner c={c} />}
        </div>
        <button onClick={() => onLike(c)} disabled={c.liked} aria-label={t("like")} data-testid="clip-of-week-like"
          className={`shrink-0 flex items-center gap-1 text-sm font-mono-bd transition-colors ${c.liked ? "text-[#FF2A85]" : "text-slate-300 hover:text-[#FF5E9F]"}`}>
          <Heart className={`w-5 h-5 ${c.liked ? "fill-current" : ""}`} /> {c.week_likes}
        </button>
      </div>
    </div>
  );
};

const ClipCard = ({ c, i, onLike }) => {
  const t = useT();
  const [broken, setBroken] = useState(false);
  return (
    <figure className="rounded-2xl overflow-hidden bg-[#131728] border border-[#FF2A85]/20" data-testid={`crew-clip-${i}`}>
      <div className="relative aspect-[9/16] bg-black">
        {broken ? (
          <div className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-slate-400" data-testid={`crew-clip-error-${i}`}>
            <span><AlertTriangle className="w-5 h-5 mx-auto mb-1 text-[#FFD043]" />{t("clipBroken")}</span>
          </div>
        ) : (
          <video src={`${API}/clips/${c.id}/video`} className="w-full h-full object-cover" controls playsInline preload="metadata"
            onError={() => setBroken(true)} data-testid={`crew-clip-video-${i}`} />
        )}
      </div>
      <figcaption className="p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-white truncate">{c.crew}</div>
          <button onClick={() => onLike(c)} disabled={c.liked} aria-label={t("like")} data-testid={`crew-clip-like-${i}`}
            className={`shrink-0 flex items-center gap-1 text-[11px] font-mono-bd transition-colors ${c.liked ? "text-[#FF2A85]" : "text-slate-400 hover:text-[#FF5E9F]"}`}>
            <Heart className={`w-4 h-4 ${c.liked ? "fill-current" : ""}`} /> {c.week_likes}
          </button>
        </div>
        {c.kit_name && <div className="text-[10px] text-slate-400 truncate">{c.kit_name}</div>}
        {c.kit_id && <KitLink id={c.kit_id} testid={`crew-clip-open-kit-${i}`} />}
        {c.song && <div className="flex items-center gap-1 text-[10px] text-[#FF5E9F] truncate"><Music2 className="w-3 h-3 shrink-0" /> {c.song}</div>}
      </figcaption>
    </figure>
  );
};

export const CrewWall = () => {
  const t = useT();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    axios.get(`${API}/clips`, { params: { device_id: deviceId() } })
      .then((r) => { setData(r.data); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("boomdrop:clip-posted", load);
    return () => window.removeEventListener("boomdrop:clip-posted", load);
  }, [load]);

  const like = async (c) => {
    const bump = (x) => (x.id === c.id ? { ...x, liked: true, week_likes: x.week_likes + 1 } : x);
    setData((d) => ({ ...d, clips: d.clips.map(bump), clip_of_week: d.clip_of_week && bump(d.clip_of_week) }));
    try {
      await axios.post(`${API}/clips/${c.id}/like`, { device_id: deviceId() });
    } finally {
      load();
    }
  };

  const clips = data?.clips;
  return (
    <section className="mt-12 rise" data-testid="crew-video-wall">
      <h2 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <Film className="w-5 h-5 text-[#FF2A85]" /> {t("wallTitle")}
      </h2>
      <p className="text-sm text-slate-400 mt-1">{t("wallSub")}</p>

      <UploadShoot />

      {data?.clip_of_week && <ClipOfWeek key={data.clip_of_week.id} c={data.clip_of_week} kind={data.featured_kind} onLike={like} />}
      {data && !data.clip_of_week && (
        <div className="mt-4 rounded-3xl border border-dashed border-[#FFD043]/50 bg-[#FFD043]/5 p-5" data-testid="clip-of-week-empty-banner">
          <div className="flex items-center gap-1.5 font-mono-bd text-[10px] uppercase tracking-widest text-[#FFD043]"><Crown className="w-4 h-4" /> {t("clipOfWeek")}</div>
          <p className="mt-2 text-sm text-slate-200" data-testid="clip-of-week-be-winner">{t("beWinner")}</p>
        </div>
      )}

      {data?.top_crews?.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" data-testid="top-crews-strip">
          <span className="shrink-0 flex items-center gap-1 font-mono-bd text-[10px] uppercase tracking-widest text-[#FFD043]"><Trophy className="w-3.5 h-3.5" /> {t("topCrews")}</span>
          {data.top_crews.map((c, i) => (
            <span key={c.crew} className="shrink-0 px-3 py-1 rounded-full bg-[#FF2A85]/15 border border-[#FF2A85]/30 text-xs" data-testid={`top-crew-${i}`}>
              #{i + 1} {c.crew} · {c.likes} {t("likes")}
            </span>
          ))}
        </div>
      )}

      {failed && <div className="mt-4 text-sm text-[#FFD043]" data-testid="crew-wall-error">{t("wallLoadFail")}</div>}
      {clips && clips.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400" data-testid="crew-wall-empty">{t("wallEmpty")}</div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {!clips && !failed && [0, 1].map((i) => <div key={i} className="aspect-[9/16] rounded-2xl bg-white/5 animate-pulse" />)}
        {clips?.map((c, i) => <ClipCard key={c.id} c={c} i={i} onLike={like} />)}
      </div>
    </section>
  );
};
