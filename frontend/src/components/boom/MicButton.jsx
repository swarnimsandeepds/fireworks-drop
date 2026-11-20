import { useRef, useState } from "react";
import axios from "axios";
import { Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/lib/api";
import { useLang, useT } from "@/lib/i18n";

export const MicButton = ({ onTranscript, disabled, editMode, busy }) => {
  const t = useT();
  const { lang } = useLang();
  const [state, setState] = useState("idle");
  const recRef = useRef(null);
  const chunks = useRef([]);
  const startedAt = useRef(0);
  const pressed = useRef(false);

  const start = async () => {
    if (state !== "idle" || disabled) return;
    pressed.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!pressed.current) {
        stream.getTracks().forEach((t) => t.stop());
        return toast(t("holdWhile"));
      }
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        upload(new Blob(chunks.current, { type: rec.mimeType || "audio/webm" }), rec.mimeType);
      };
      rec.start();
      recRef.current = rec;
      startedAt.current = Date.now();
      setState("recording");
    } catch {
      toast.error(t("micBlocked"));
    }
  };

  const stop = () => {
    pressed.current = false;
    if (state !== "recording") return;
    setState("processing");
    recRef.current?.stop();
  };

  const upload = async (blob, mime) => {
    if (Date.now() - startedAt.current < 700) {
      setState("idle");
      return toast(t("holdWhile"));
    }
    const ext = (mime || "").includes("mp4") ? "mp4" : "webm";
    const fd = new FormData();
    fd.append("audio", blob, `speech.${ext}`);
    fd.append("language", lang);
    try {
      const { data } = await axios.post(`${API}/transcribe`, fd);
      if (!data.text) toast(t("noCatch"));
      else onTranscript(data.text);
    } catch {
      toast.error(t("sttFail"));
    } finally {
      setState("idle");
    }
  };

  const label = busy ? t("editing") : { idle: t(editMode ? "holdEdit" : "holdTalk"), recording: t("listening"), processing: t("transcribing") }[state];

  return (
    <section className="flex flex-col items-center py-6 rise" style={{ animationDelay: "0.1s" }}>
      <div className="relative w-36 h-36 grid place-items-center">
        {state === "recording" && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-[#FF2A85] ring-out" />
            <span className="absolute inset-0 rounded-full border-2 border-[#FFD043] ring-out-2" />
          </>
        )}
        <button
          data-testid="push-to-talk-mic-button"
          aria-label="Push to talk"
          disabled={disabled || state === "processing"}
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onContextMenu={(e) => e.preventDefault()}
          className={`mic-btn relative w-36 h-36 rounded-full grid place-items-center transition-transform duration-200 disabled:opacity-60 ${
            state === "recording"
              ? "bg-[#FF2A85] scale-110 shadow-[0_0_60px_rgba(255,42,133,0.9)]"
              : "bg-gradient-to-tr from-[#FF2A85] via-[#E11D48] to-[#FFD043] shadow-[0_0_40px_rgba(255,42,133,0.55)] hover:scale-105 active:scale-95"
          }`}
        >
          {state === "processing" ? <Loader2 className="w-12 h-12 animate-spin text-white" /> : <Mic className="w-14 h-14 text-white" strokeWidth={2.2} />}
        </button>
      </div>
      <p className="mt-5 font-mono-bd text-xs uppercase tracking-widest text-slate-300" data-testid="mic-status">{label}</p>
      {editMode && state === "idle" && !busy && <p className="mt-2 text-[11px] text-slate-500 text-center max-w-xs" data-testid="mic-edit-hint">{t("editHint")}</p>}
    </section>
  );
};
