import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MapPin, Clock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { API } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { MockQR } from "@/components/boom/MockQR";
import { OrderConfirmation } from "@/components/boom/OrderConfirmation";

const SPOTS = ["Riverside", "Koh Pich", "Wat Phnom", "Independence Monument", "Night Market"];
const defaultTime = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const OrderFlow = ({ kit, open, onOpenChange, delivery }) => {
  const t = useT();
  const [step, setStep] = useState("spot");
  const [spot, setSpot] = useState("");
  const [time, setTime] = useState(defaultTime);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("spot");
    setOrder(null);
    setSpot(delivery?.spot || "");
    setTime(delivery?.time || defaultTime());
  }, [open, delivery]);

  const pay = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/orders`, { kit_id: kit.id, spot, time });
      setOrder(data);
      setStep("done");
    } catch {
      toast.error(t("orderFail"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0D0F1A] border border-[#FF2A85]/30 text-white max-w-sm rounded-3xl max-h-[90vh] overflow-y-auto" data-testid="order-dialog">
        {step === "spot" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{t("whereTitle")}</DialogTitle>
              <DialogDescription className="text-slate-400">{t("whereDesc")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 mt-2">
              {SPOTS.map((s) => (
                <button
                  key={s}
                  data-testid={`order-spot-${s.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setSpot(s)}
                  className={`h-12 px-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 transition-colors ${
                    spot === s ? "border-[#FF2A85] bg-[#FF2A85]/15 text-white" : "border-white/10 bg-white/5 text-slate-300 hover:border-white/30"
                  }`}
                >
                  <MapPin className={`w-4 h-4 ${spot === s ? "text-[#FF2A85]" : "text-slate-500"}`} /> {t("spots")[s]}
                </button>
              ))}
            </div>
            <label className="mt-3 block">
              <span className="flex items-center gap-1.5 font-mono-bd text-[10px] uppercase tracking-widest text-slate-400 mb-1.5"><Clock className="w-3.5 h-3.5" /> {t("deliveryTime")}</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                data-testid="order-time-input"
                className="w-full h-12 rounded-2xl bg-[#131728] border border-[#1E2640] px-4 text-white [color-scheme:dark] focus:outline-none focus:border-[#FF2A85]"
              />
            </label>
            <button
              data-testid="order-continue-btn"
              disabled={!spot || !time}
              onClick={() => setStep("pay")}
              className="mt-4 w-full h-12 rounded-full bg-[#FFD043] text-[#06070D] font-display font-black uppercase tracking-wider disabled:opacity-40 transition-opacity"
            >
              {t("continuePay")}
            </button>
          </>
        )}
        {step === "pay" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{t("scanTitle")}</DialogTitle>
              <DialogDescription className="text-slate-400">{t("spots")[spot]} · {time}</DialogDescription>
            </DialogHeader>
            <div className="mt-2 rounded-2xl overflow-hidden border border-white/10 bg-white text-[#06070D]" data-testid="khqr-card">
              <div className="bg-[#E1232E] text-white font-display font-black text-center py-2 tracking-widest">KHQR</div>
              <div className="p-4 flex flex-col items-center">
                <div className="text-xs font-semibold text-slate-500">{t("merchant")}</div>
                <div className="font-display font-black text-2xl mt-1" data-testid="khqr-amount-khr">{kit.total_khr.toLocaleString()} KHR</div>
                <div className="text-xs text-slate-500 mb-3">${kit.total_usd.toFixed(2)} USD</div>
                <MockQR seed={`${kit.id}-${spot}-${time}`} />
              </div>
            </div>
            <p className="text-[11px] text-center text-[#FFD043] font-mono-bd uppercase tracking-wider mt-2" data-testid="mock-payment-note">{t("demoNote")}</p>
            <button
              data-testid="order-paid-btn"
              onClick={pay}
              disabled={busy}
              className="mt-3 w-full h-12 rounded-full bg-[#FF2A85] text-white font-display font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} {t("paid")}
            </button>
            <button onClick={() => setStep("spot")} data-testid="order-back-btn" className="mt-2 w-full h-10 text-xs text-slate-400 hover:text-white transition-colors">{t("back")}</button>
          </>
        )}
        {step === "done" && order && <OrderConfirmation order={order} kit={kit} />}
      </DialogContent>
    </Dialog>
  );
};
