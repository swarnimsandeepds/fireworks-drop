import { useState } from "react";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";

const fit = (ctx, text, max, size, weight = 900) => {
  let s = size;
  do { ctx.font = `${weight} ${s}px Outfit, "Noto Sans Khmer", sans-serif`; s -= 4; } while (ctx.measureText(text).width > max && s > 24);
};

export const drawCard = async (c, label) => {
  await document.fonts?.ready;
  const cv = document.createElement("canvas");
  cv.width = 1080; cv.height = 1350;
  const x = cv.getContext("2d");
  x.fillStyle = "#06070D"; x.fillRect(0, 0, 1080, 1350);
  const g = x.createRadialGradient(540, 420, 40, 540, 420, 700);
  g.addColorStop(0, "rgba(255,208,67,0.35)"); g.addColorStop(1, "rgba(255,42,133,0)");
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  for (let i = 0; i < 140; i++) {
    x.fillStyle = i % 3 ? "rgba(255,208,67,0.8)" : "rgba(255,94,159,0.8)";
    const a = (i / 140) * Math.PI * 2, r = 180 + ((i * 37) % 260);
    x.beginPath(); x.arc(540 + Math.cos(a) * r, 420 + Math.sin(a) * r, 3 + (i % 4), 0, 7); x.fill();
  }
  x.strokeStyle = "#FFD043"; x.lineWidth = 8; x.strokeRect(40, 40, 1000, 1270);
  x.textAlign = "center";
  x.fillStyle = "#FFD043"; x.font = '700 40px "JetBrains Mono", monospace';
  x.fillText(label.toUpperCase(), 540, 160);
  x.fillStyle = "#FFFFFF"; fit(x, c.crew, 900, 130); x.fillText(c.crew, 540, 460);
  x.fillStyle = "#FF2A85"; x.font = '800 90px Outfit, sans-serif'; x.fillText(`♥ ${c.week_likes}`, 540, 640);
  x.fillStyle = "#E2E8F0";
  if (c.song) { fit(x, c.song, 900, 52, 600); x.fillText(c.song, 540, 800); }
  if (c.kit_name) { x.fillStyle = "#FFD043"; fit(x, c.kit_name, 900, 52, 700); x.fillText(c.kit_name, 540, 890); }
  x.fillStyle = "#FFFFFF"; x.font = '900 72px Outfit, sans-serif'; x.fillText("BoomDrop", 540, 1150);
  x.fillStyle = "#94A3B8"; x.font = '500 36px "Plus Jakarta Sans", sans-serif'; x.fillText("Fireworks that hit on the drop · Phnom Penh", 540, 1215);
  return new Promise((res) => cv.toBlob(res, "image/png"));
};

export const ShareWinner = ({ c }) => {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const url = c.kit_id ? `${window.location.origin}/?kit=${c.kit_id}` : window.location.origin;
  const text = `${c.crew} ${t("winText")} ${c.week_likes} ♥ ${c.kit_name ? `— ${c.kit_name}` : ""}`.trim();

  const share = async () => {
    setBusy(true);
    try {
      const blob = await drawCard(c, t("clipOfWeek"));
      const file = new File([blob], "boomdrop-winner.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text}\n${url}` });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank", "noopener");
        toast.success(t("cardSaved"));
      }
    } catch (e) {
      if (e?.name !== "AbortError") toast.error(t("postFail"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={share} disabled={busy} data-testid="clip-of-week-share-btn"
      className="mt-2 h-9 px-4 rounded-full bg-[#2AABEE] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#1f97d4] transition-colors disabled:opacity-60">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t("shareWin")}
    </button>
  );
};
