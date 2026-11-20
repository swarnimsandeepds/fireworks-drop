import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Volume2, VolumeX, Move3d } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { createBeat } from "./audio";
import Fallback2D from "./Fallback2D";
import { TikTokOverlay } from "./TikTokOverlay";
import { PreviewControls } from "./PreviewControls";

const Scene3D = lazy(() => import("./Scene3D"));

const hasWebGL = () => {
  if (new URLSearchParams(window.location.search).has("fallback2d")) return false;
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
};

class GLBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function ShotPreview({ kit, audioCtx, onClose }) {
  const t = useT();
  const frameRef = useRef();
  const [recording, setRecording] = useState(false);
  const recRef = useRef(false);
  const mobile = useMemo(() => /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.hardwareConcurrency || 8) <= 4, []);
  const webgl = useMemo(hasWebGL, []);
  const beat = useMemo(() => (audioCtx ? createBeat(audioCtx) : null), [audioCtx]);
  const drop = kit.drop_second;
  const cutAt = Math.max(2, Math.min(4.5, drop - 1.5));
  const start = useRef(performance.now());
  const autoCut = useRef(false);
  const barRef = useRef();
  const [runId, setRunId] = useState(0);
  const [mode, setMode] = useState("stage");
  const [sec, setSec] = useState(0);
  const [dropOn, setDropOn] = useState(false);
  const [done, setDone] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(!webgl);
  const readyRef = useRef(!webgl);
  const getTime = useCallback(() => (readyRef.current ? Math.min(15, (performance.now() - start.current) / 1000) : 0), []);

  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;
    start.current = performance.now();
    readyRef.current = true;
    autoCut.current = false;
    beat?.play(drop);
    return () => beat?.stop();
  }, [beat, drop, ready]);

  useEffect(() => {
    let raf;
    const tick = () => {
      const t = getTime();
      if (barRef.current) barRef.current.style.width = `${(t / 15) * 100}%`;
      setSec(Math.floor(t));
      setDropOn(t >= drop && t < drop + 1.4);
      setDone(t >= 15);
      if (!autoCut.current && t >= cutAt) {
        autoCut.current = true;
        setMode("phone");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getTime, drop, cutAt]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && !recRef.current && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const replay = (keepPhone) => {
    start.current = performance.now();
    autoCut.current = keepPhone === true;
    if (keepPhone !== true) setMode("stage");
    setRunId((r) => r + 1);
    audioCtx?.resume();
    beat?.play(drop);
  };
  const record = () => {
    const canvas = frameRef.current?.querySelector("canvas");
    if (!canvas?.captureStream || !window.MediaRecorder) return toast.error(t("recordUnsupported"));
    pickMode("phone");
    setRecording(true);
    recRef.current = true;
    const fail = () => { recRef.current = false; setRecording(false); toast.error(t("recordUnsupported")); };
    setTimeout(() => requestAnimationFrame(() => { try {
      const stream = canvas.captureStream(30);
      beat?.stream?.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      const mime = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const type = rec.mimeType || "video/webm";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(chunks, { type }));
        a.download = `boomdrop-${kit.kit_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "kit"}.${type.includes("mp4") ? "mp4" : "webm"}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        recRef.current = false;
        setRecording(false);
        toast.success(t("clipSaved"));
      };
      rec.onerror = fail;
      replay(true);
      rec.start(500);
      setTimeout(() => rec.state !== "inactive" && rec.stop(), 15300);
    } catch { fail(); } }), 350);
  };
  const pickMode = (m) => { autoCut.current = true; setMode(m); };
  const toggleMute = () => { beat?.setMuted(!muted); audioCtx?.resume(); setMuted(!muted); };

  const fallback = <Fallback2D kit={kit} getTime={getTime} runId={runId} />;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#06070D] flex flex-col" data-testid="shot-preview-overlay">
      <div className="h-14 shrink-0 px-3 flex items-center gap-2 border-b border-white/10 bg-[#0D0F1A]/95">
        <button onClick={onClose} aria-label="Close preview" data-testid="preview-close-btn" disabled={recording} className="w-10 h-10 grid place-items-center rounded-full hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-mono-bd text-[10px] uppercase tracking-widest text-[#FFD043]">{t("shotPreview")}</div>
          <div className="font-display font-bold text-sm truncate">{kit.kit_name}</div>
        </div>
        <button onClick={toggleMute} aria-label="Toggle sound" data-testid="preview-mute-btn" className="w-10 h-10 grid place-items-center rounded-full hover:bg-white/10 transition-colors">
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-[#FF5E9F]" />}
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden p-0" data-testid="preview-stage-area">
        <div
          ref={frameRef}
          data-testid={`preview-frame-${mode}`}
          className={mode === "phone"
            ? "relative h-[calc(100%-16px)] max-w-full aspect-[9/16] rounded-[28px] border-[5px] border-[#1E2640] overflow-hidden shadow-[0_0_40px_rgba(255,42,133,0.35)]"
            : "absolute inset-0"}
        >
          {webgl ? (
            <GLBoundary fallback={<Fallback2D kit={kit} getTime={getTime} runId={runId} onMount={onReady} />}>
              <Suspense fallback={<div className="w-full h-full grid place-items-center font-mono-bd text-xs text-slate-400">{t("loadingStage")}</div>}>
                <Scene3D kit={kit} getTime={getTime} runId={runId} mode={mode} mobile={mobile} onReady={onReady} />
              </Suspense>
            </GLBoundary>
          ) : fallback}
          {mode === "phone" && <TikTokOverlay kit={kit} />}
        </div>
        {mode === "stage" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0D0F1A]/80 backdrop-blur-md text-[11px] text-slate-300 pointer-events-none">
            <Move3d className="w-3.5 h-3.5" /> {t("dragOrbit")}
          </div>
        )}
        {dropOn && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none" data-testid="preview-drop-label">
            <span className="drop-pop font-display font-black text-7xl sm:text-8xl text-[#FFD043] tracking-tight [text-shadow:0_0_30px_rgba(255,42,133,0.9),0_0_60px_rgba(255,208,67,0.6)]">DROP</span>
          </div>
        )}
      </div>

      <PreviewControls kit={kit} sec={sec} barRef={barRef} mode={mode} onMode={pickMode} onReplay={replay} done={done} onRecord={record} recording={recording} />
    </div>,
    document.body
  );
}

