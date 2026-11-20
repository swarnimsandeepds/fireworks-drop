import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { useT } from "@/lib/i18n";
import { StandCard } from "./StandCard";

export default function StandPage({ items, onClose }) {
  const t = useT();
  const root = useRef();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return createPortal(
    <div ref={root} className="fixed inset-0 z-50 sky overflow-y-auto" data-testid="catalog-sheet" role="dialog" aria-label={t("standTitle")}>
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#0D0F1A]/90 border-b border-white/10">
        <div className="max-w-3xl mx-auto h-16 px-5 flex items-center justify-between">
          <div>
            <h2 className="font-display font-black text-xl tracking-tight">{t("standTitle")}</h2>
            <p className="text-[11px] text-slate-400">{t("standSub")}</p>
          </div>
          <button onClick={onClose} aria-label={t("close")} data-testid="catalog-close-btn" className="w-10 h-10 grid place-items-center rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="relative z-0 max-w-3xl mx-auto px-4 py-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.length === 0 && Array.from({ length: 6 }, (_, i) => <div key={i} className="h-60 rounded-3xl bg-white/5 animate-pulse" />)}
        {items.map((item) => <StandCard key={item.id} item={item} />)}
      </div>
      <Canvas
        eventSource={root}
        className="!fixed inset-0 pointer-events-none"
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
      >
        <View.Port />
      </Canvas>
    </div>,
    document.body
  );
}
