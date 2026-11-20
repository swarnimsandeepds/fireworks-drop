import { Heart, MessageCircle, Share2, Music2 } from "lucide-react";
import { useT } from "@/lib/i18n";

export const TikTokOverlay = ({ kit }) => {
  const t = useT();
  return (
  <div className="absolute inset-0 pointer-events-none text-white" data-testid="preview-tiktok-overlay">
    <div className="absolute top-3 inset-x-0 flex justify-center gap-4 text-[11px] font-semibold">
      <span className="opacity-60">{t("following")}</span>
      <span className="border-b-2 border-white pb-0.5">{t("forYou")}</span>
    </div>
    <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4 text-[10px]">
      {[[Heart, "12.4K"], [MessageCircle, "318"], [Share2, "Share"]].map(([Icon, n]) => (
        <div key={n} className="flex flex-col items-center gap-0.5">
          <Icon className="w-6 h-6 drop-shadow" />
          <span>{n}</span>
        </div>
      ))}
    </div>
    <div className="absolute left-3 right-14 bottom-4 text-[11px] leading-snug drop-shadow">
      <div className="font-bold">@yourcrew · Phnom Penh</div>
      <div className="opacity-90 truncate">{kit.kit_name} #boomdrop #fyp</div>
      <div className="flex items-center gap-1 mt-1 opacity-90 truncate"><Music2 className="w-3 h-3 shrink-0" /> {kit.song}</div>
    </div>
  </div>
  );
};
