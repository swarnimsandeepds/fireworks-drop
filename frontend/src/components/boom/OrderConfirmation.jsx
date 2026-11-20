import { useEffect, useState } from "react";
import { CheckCircle2, Package, Bike, MapPinCheck, Volume2 } from "lucide-react";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";

const STEPS = [["Packed", Package], ["On the tuk-tuk", Bike], ["Arrived", MapPinCheck]];

const speak = (order) => {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(
    `Your BoomDrop order ${order.order_no.split("").join(" ")} is confirmed. ` +
      `We'll bring your fireworks by tuk-tuk to ${order.spot} at ${order.time}. ` +
      `Total ${order.total_khr.toLocaleString()} riel. Get ready to hit the drop!`
  );
  u.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
};

export const OrderConfirmation = ({ order }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    speak(order);
    const a = setTimeout(() => setStage(1), 4000);
    const b = setTimeout(() => setStage(2), 9000);
    return () => { clearTimeout(a); clearTimeout(b); window.speechSynthesis?.cancel(); };
  }, [order]);

  return (
    <div data-testid="order-confirmation">
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="w-14 h-14 text-[#FFD043] drop-shadow-[0_0_16px_rgba(255,208,67,0.7)]" />
        <DialogTitle className="font-display font-black text-2xl mt-2">Order confirmed</DialogTitle>
        <DialogDescription className="text-slate-400 text-sm">{order.spot} · {order.time}</DialogDescription>
        <div className="font-mono-bd text-lg text-[#FF5E9F] mt-2" data-testid="order-number">{order.order_no}</div>
        <div className="text-xs text-slate-500">{order.total_khr.toLocaleString()} KHR · ${order.total_usd.toFixed(2)}</div>
      </div>
      <ol className="mt-5 space-y-3" data-testid="order-status-steps">
        {STEPS.map(([label, Icon], i) => (
          <li key={label} className="flex items-center gap-3" data-testid={`order-step-${i}`}>
            <span className={`w-9 h-9 rounded-full grid place-items-center border-2 transition-colors ${i <= stage ? "bg-[#FF2A85] border-[#FF2A85] text-white" : "border-[#1E2640] text-slate-600"}`}>
              <Icon className="w-4 h-4" />
            </span>
            <span className={`text-sm font-semibold ${i <= stage ? "text-white" : "text-slate-500"}`}>{label}</span>
            {i === stage && <span className="ml-auto font-mono-bd text-[10px] uppercase tracking-wider text-[#FFD043]">Now</span>}
          </li>
        ))}
      </ol>
      <p className="text-[10px] text-slate-500 text-center mt-4">Delivery tracking is simulated for this demo.</p>
      <button
        data-testid="order-read-aloud-btn"
        onClick={() => speak(order)}
        className="mt-3 w-full h-11 rounded-full border border-[#FFD043]/40 text-[#FFD043] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#FFD043]/10 transition-colors"
      >
        <Volume2 className="w-4 h-4" /> Read aloud again
      </button>
    </div>
  );
};
