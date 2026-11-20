import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Film, Music2, Heart, Upload, Loader2, Trophy, AlertTriangle } from "lucide-react";
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
        {c.song && <div className="flex items-center gap-1 text-[10px] text-[#FF5E9F] truncate"><Music2 className="w-3 h-3 shrink-0" /> {c.song}</div>}
      </figcaption>
    </figure>
  );
};

export const CrewWall = () => {
  const t = useT();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [crew, setCrew] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef();

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
    setData((d) => ({ ...d, clips: d.clips.map((x) => (x.id === c.id ? { ...x, liked: true, week_likes: x.week_likes + 1 } : x)) }));
    try {
      await axios.post(`${API}/clips/${c.id}/like`, { device_id: deviceId() });
    } catch {
      load();
    }
  };

  const upload = async (f) => {
    if (!f) return;
    if (f.size > 60 * 1024 * 1024) return toast.error(t("uploadFail"));
    setBusy(true);
    const fd = new FormData();
    fd.append("video", f);
    fd.append("crew", crew);
    fd.append("source", "shoot");
    try {
      await axios.post(`${API}/clips`, fd, { timeout: 240000 });
      toast.success(t("sentReview"));
      setCrew("");
    } catch {
      toast.error(t("uploadFail"));
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };

  const clips = data?.clips;
  return (
    <section className="mt-12 rise" data-testid="crew-video-wall">
      <h2 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <Film className="w-5 h-5 text-[#FF2A85]" /> {t("wallTitle")}
      </h2>
      <p className="text-sm text-slate-400 mt-1">{t("wallSub")}</p>

      <div className="mt-4 rounded-2xl border border-[#FFD043]/30 bg-[#FFD043]/5 p-3" data-testid="upload-shoot-panel">
        <div className="font-mono-bd text-[10px] uppercase tracking-widest text-[#FFD043] mb-2">{t("uploadShoot")}</div>
        <div className="flex gap-2">
          <input value={crew} onChange={(e) => setCrew(e.target.value.slice(0, 40))} placeholder={t("crewName")} data-testid="upload-shoot-crew-input"
            className="flex-1 min-w-0 h-11 rounded-full bg-[#131728] border border-[#1E2640] px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF2A85]" />
          <input ref={file} type="file" accept="video/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} data-testid="upload-shoot-file-input" />
          <button onClick={() => file.current?.click()} disabled={busy} data-testid="upload-shoot-btn"
            className="h-11 px-4 rounded-full bg-[#FFD043] text-[#06070D] text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("uploading")}</> : <><Upload className="w-4 h-4" /> {t("pickVideo")}</>}
          </button>
        </div>
      </div>

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
