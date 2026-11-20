import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Upload, Loader2, AlertTriangle } from "lucide-react";
import { API } from "@/lib/api";
import { useT } from "@/lib/i18n";

const MAX = 60 * 1024 * 1024;
const savedKits = () => JSON.parse(localStorage.getItem("boomdrop-kits") || "[]");

const videoLength = (f) => new Promise((resolve) => {
  const v = document.createElement("video");
  const url = URL.createObjectURL(f);
  const done = (d) => { URL.revokeObjectURL(url); resolve(d); };
  v.preload = "metadata";
  v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null);
  v.onerror = () => done(null);
  setTimeout(() => done(null), 8000);
  v.src = url;
});

const LongWarning = ({ secs, onPick }) => {
  const t = useT();
  return (
    <div className="mt-3 rounded-xl border border-[#FF2A85]/40 bg-[#FF2A85]/10 p-3" role="alert" data-testid="long-video-warning">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-white"><AlertTriangle className="w-4 h-4 text-[#FFD043]" /> {t("longTitle")} ({Math.round(secs)}s)</div>
      <p className="text-xs text-slate-300 mt-1">{t("longBody")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => onPick("first_minute")} data-testid="long-video-keep-minute-btn" className="h-9 px-3 rounded-full bg-[#FFD043] text-[#06070D] text-xs font-bold">{t("keepMinute")}</button>
        <button onClick={() => onPick("full")} data-testid="long-video-keep-full-btn" className="h-9 px-3 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors">{t("keepFull")}</button>
        <button onClick={() => onPick(null)} data-testid="long-video-cancel-btn" className="h-9 px-3 rounded-full text-slate-300 text-xs hover:text-white transition-colors">{t("cancel")}</button>
      </div>
    </div>
  );
};

const Progress = ({ pct }) => {
  const t = useT();
  return (
    <div className="mt-3" data-testid="upload-progress">
      <div className="flex justify-between text-[11px] font-mono-bd text-slate-300">
        <span>{pct < 100 ? t("uploading") : t("processing")}</span><span data-testid="upload-progress-pct">{pct}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#FF2A85] to-[#FFD043] transition-[width] duration-200" style={{ width: `${pct}%` }} data-testid="upload-progress-bar" />
      </div>
    </div>
  );
};

export const UploadShoot = () => {
  const t = useT();
  const [crew, setCrew] = useState("");
  const [kitId, setKitId] = useState("");
  const [kits, setKits] = useState(savedKits);
  const [pending, setPending] = useState(null);
  const [pct, setPct] = useState(null);
  const file = useRef();

  useEffect(() => {
    const sync = () => setKits(savedKits());
    window.addEventListener("boomdrop:kits", sync);
    return () => window.removeEventListener("boomdrop:kits", sync);
  }, []);

  const reset = () => { setPending(null); if (file.current) file.current.value = ""; };

  const send = async (f, keep) => {
    setPct(0);
    const fd = new FormData();
    fd.append("video", f);
    fd.append("crew", crew);
    fd.append("source", "shoot");
    fd.append("keep", keep);
    if (kitId) fd.append("kit_id", kitId);
    try {
      await axios.post(`${API}/clips`, fd, { timeout: 900000, onUploadProgress: (e) => e.total && setPct(Math.round((e.loaded / e.total) * 100)) });
      toast.success(t("sentReview"));
      setCrew("");
    } catch (e) {
      toast.error(e.response?.data?.detail || t("uploadFail"));
    } finally {
      setPct(null);
      reset();
    }
  };

  const pick = async (f) => {
    if (!f) return;
    if (f.size > MAX) { reset(); return toast.error(t("uploadFail")); }
    const secs = await videoLength(f);
    if (secs && secs > 60) return setPending({ f, secs });
    send(f, "full");
  };

  const busy = pct !== null;
  return (
    <div className="mt-4 rounded-2xl border border-[#FFD043]/30 bg-[#FFD043]/5 p-3" data-testid="upload-shoot-panel">
      <div className="font-mono-bd text-[10px] uppercase tracking-widest text-[#FFD043] mb-2">{t("uploadShoot")}</div>
      <div className="flex gap-2">
        <input value={crew} onChange={(e) => setCrew(e.target.value.slice(0, 40))} placeholder={t("crewName")} data-testid="upload-shoot-crew-input"
          className="flex-1 min-w-0 h-11 rounded-full bg-[#131728] border border-[#1E2640] px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF2A85]" />
        <input ref={file} type="file" accept="video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} data-testid="upload-shoot-file-input" />
        <button onClick={() => file.current?.click()} disabled={busy || !!pending} data-testid="upload-shoot-btn"
          className="h-11 px-4 rounded-full bg-[#FFD043] text-[#06070D] text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("uploading")}</> : <><Upload className="w-4 h-4" /> {t("pickVideo")}</>}
        </button>
      </div>
      {kits.length > 0 && (
        <select value={kitId} onChange={(e) => setKitId(e.target.value)} aria-label={t("linkKit")} data-testid="upload-shoot-kit-select"
          className="mt-2 w-full h-10 rounded-full bg-[#131728] border border-[#1E2640] px-4 text-xs text-white focus:outline-none focus:border-[#FF2A85]">
          <option value="">{t("linkKit")} — {t("noKit")}</option>
          {kits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
      )}
      {pending && <LongWarning secs={pending.secs} onPick={(keep) => (keep ? send(pending.f, keep) : reset())} />}
      {busy && <Progress pct={pct} />}
    </div>
  );
};
