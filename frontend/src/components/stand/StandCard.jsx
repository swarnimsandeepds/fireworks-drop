import { useRef, useState } from "react";
import { View, PerspectiveCamera } from "@react-three/drei";
import { Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";
import { ItemModel } from "./ItemModel";
import { MiniDemo } from "./MiniDemo";

export const StandCard = ({ item }) => {
  const t = useT();
  const card = useRef();
  const [demo, setDemo] = useState(0);

  const tilt = (e) => {
    const r = card.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.current.style.transform = `perspective(700px) rotateY(${x * 16}deg) rotateX(${-y * 16}deg)`;
  };
  const reset = () => { card.current.style.transform = ""; };

  return (
    <button
      ref={card}
      data-testid={`catalog-item-${item.id}`}
      onPointerMove={tilt}
      onPointerLeave={reset}
      onPointerUp={(e) => e.pointerType !== "mouse" && reset()}
      onClick={() => setDemo((d) => d + 1)}
      className="relative text-left rounded-3xl bg-[#131728]/90 border border-[#FF2A85]/20 overflow-hidden transition-transform duration-150 ease-out will-change-transform hover:border-[#FFD043]/50"
      style={{ transformStyle: "preserve-3d", touchAction: "pan-y" }}
    >
      <div className="relative h-40 bg-gradient-to-b from-[#170E28] to-[#0B1021]">
        <View className="absolute inset-0">
          <PerspectiveCamera makeDefault position={[0, 2.4, 8.5]} fov={45} />
          <ambientLight intensity={0.5} />
          <pointLight position={[2.5, 4, 4]} intensity={40} decay={1.5} color="#ffd9a8" />
          <pointLight position={[-3, 2, 2]} intensity={20} decay={1.5} color="#ff2a85" />
          <ItemModel id={item.id} />
          <MiniDemo id={item.id} type={item.effect} trigger={demo} />
        </View>
        <span className="absolute top-2 left-2 font-mono-bd text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 text-[#FF5E9F]">
          #{item.id} · {t("effects")[item.effect]}
        </span>
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold text-white leading-tight min-h-[2.5em]">{item.name}</div>
        <div className="flex items-end justify-between mt-2">
          <div>
            <div className="font-mono-bd text-sm text-[#FFD043]" data-testid={`catalog-price-usd-${item.id}`}>${item.price_usd.toFixed(2)}</div>
            <div className="font-mono-bd text-[10px] text-slate-400" data-testid={`catalog-price-khr-${item.id}`}>{item.price_khr.toLocaleString()} KHR</div>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-slate-500"><Sparkles className="w-3 h-3" /> {t("tapDemo")}</span>
        </div>
      </div>
    </button>
  );
};
