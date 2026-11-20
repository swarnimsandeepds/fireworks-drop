import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";
import { API } from "@/lib/api";
import { useT } from "@/lib/i18n";

export const PostClip = ({ clip, kit, onDone }) => {
  const t = useT();
  const [crew, setCrew] = useState("");
  const [busy, setBusy] = useState(false);

  const post = async () => {
    setBusy(true);
    const fd = new FormData();
    fd.append("video", clip.blob, `clip.${clip.type.includes("mp4") ? "mp4" : "webm"}`);
    fd.append("kit_id", kit.id);
    fd.append("crew", crew);
    try {
      await axios.post(`${API}/clips`, fd);
      toast.success(t("sentReview"));
      window.dispatchEvent(new Event("boomdrop:clip-posted"));
      onDone();
    } catch {
      toast.error(t("postFail"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-x-3 bottom-[170px] z-10 max-w-md mx-auto rounded-2xl border border-[#FFD043]/40 bg-[#0D0F1A]/95 backdrop-blur-xl p-3" data-testid="post-clip-panel">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono-bd text-[10px] uppercase tracking-widest text-[#FFD043]">{t("postWall")}</span>
        <button onClick={onDone} aria-label={t("close")} data-testid="post-clip-close-btn" className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex gap-2">
        <input
          value={crew}
          onChange={(e) => setCrew(e.target.value.slice(0, 40))}
          placeholder={t("crewName")}
          data-testid="post-clip-crew-input"
          className="flex-1 min-w-0 h-11 rounded-full bg-[#131728] border border-[#1E2640] px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF2A85]"
        />
        <button onClick={post} disabled={busy} data-testid="post-clip-submit-btn" className="h-11 px-4 rounded-full bg-[#FF2A85] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {t("post")}
        </button>
      </div>
    </div>
  );
};
