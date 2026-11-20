import { lazy, Suspense, useState } from "react";
import { Music2, Video, Play, ShoppingCart } from "lucide-react";
import { WhyThisKit } from "@/components/boom/WhyThisKit";
import { OrderFlow } from "@/components/boom/OrderFlow";
import { CueList } from "@/components/boom/CueList";
import { Cart } from "@/components/boom/Cart";

const ShotPreview = lazy(() => import("@/components/preview/ShotPreview"));

export const ShotKitCard = ({ kit }) => {
  const [preview, setPreview] = useState(null);
  const [ordering, setOrdering] = useState(false);

  const open = () => {
    let ctx = null;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
    } catch {
      ctx = null;
    }
    setPreview({ ctx });
  };
  const close = () => {
    preview?.ctx?.close().catch(() => {});
    setPreview(null);
  };

  return (
    <article
      id="shot-kit"
      data-testid="shot-kit-card"
      className="mt-10 rounded-3xl bg-[#131728] border border-[#FF2A85]/25 shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden rise"
    >
      <header className="p-5 bg-gradient-to-br from-[#FF2A85]/20 via-transparent to-[#FFD043]/10 border-b border-white/5">
        <p className="font-mono-bd text-[10px] uppercase tracking-widest text-[#FFD043]">Your Shot Kit · 15s</p>
        <h2 className="font-display font-black text-2xl tracking-tight mt-1" data-testid="kit-name">{kit.kit_name}</h2>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-300" data-testid="kit-song">
            <Music2 className="w-3.5 h-3.5 text-[#FF5E9F]" /> {kit.song}
          </span>
          <span className="font-mono-bd font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-[#FF2A85] text-white tracking-wider" data-testid="drop-second-badge">
            Drop @ 0:{String(Math.round(kit.drop_second)).padStart(2, "0")}
          </span>
        </div>
        <button
          onClick={open}
          data-testid="preview-my-shot-button"
          className="mt-4 w-full h-12 rounded-full bg-[#FF2A85] text-white font-display font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,42,133,0.5)] hover:bg-[#FF529D] active:scale-[0.98] transition-[background-color,transform]"
        >
          <Play className="w-4 h-4 fill-current" /> Preview my shot
        </button>
      </header>
      <CueList cues={kit.cues} drop={kit.drop_second} />
      <div className="mx-5 mb-5 rounded-2xl border border-[#FFD043]/30 bg-[#FFD043]/10 p-4" data-testid="filming-tip-box">
        <div className="flex items-center gap-1.5 font-mono-bd text-[10px] uppercase tracking-widest text-[#FFD043] mb-1.5">
          <Video className="w-3.5 h-3.5" /> Filming tip
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">{kit.filming_tip}</p>
      </div>
      <WhyThisKit kit={kit} />
      <Cart kit={kit} />
      <div className="px-5 pb-5 bg-[#0D0F1A]">
        <button
          onClick={() => setOrdering(true)}
          data-testid="order-kit-button"
          className="w-full h-14 rounded-full bg-[#FFD043] text-[#06070D] font-display font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(255,208,67,0.45)] hover:bg-[#FFE07D] active:scale-[0.98] transition-[background-color,transform]"
        >
          <ShoppingCart className="w-5 h-5" /> Order this kit
        </button>
      </div>
      <OrderFlow kit={kit} open={ordering} onOpenChange={setOrdering} />
      {preview && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-[#06070D] grid place-items-center font-mono-bd text-xs text-slate-400">Loading preview…</div>}>
          <ShotPreview kit={kit} audioCtx={preview.ctx} onClose={close} />
        </Suspense>
      )}
    </article>
  );
};
