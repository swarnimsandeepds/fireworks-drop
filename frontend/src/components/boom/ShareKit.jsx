import { Share2, Send, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/lib/i18n";

export const ShareKit = ({ kit }) => {
  const t = useT();
  const url = `${window.location.origin}/?kit=${kit.id}`;
  const text = `${t("shareText")}: ${kit.kit_name}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    toast.success(t("copied"));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          data-testid="share-kit-button"
          className="mt-2 w-full h-11 rounded-full border border-white/15 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 hover:border-[#FFD043]/50 hover:text-[#FFD043] transition-colors"
        >
          <Share2 className="w-4 h-4" /> {t("share")}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-[#0D0F1A]/95 backdrop-blur-xl border border-[#FF2A85]/30 text-white rounded-2xl p-2" data-testid="share-kit-popover">
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="share-telegram-link"
          className="flex items-center gap-2 h-11 px-3 rounded-xl text-sm hover:bg-white/5 transition-colors"
        >
          <Send className="w-4 h-4 text-[#2AABEE]" /> {t("telegram")}
        </a>
        <button onClick={copy} data-testid="share-copy-link-btn" className="w-full flex items-center gap-2 h-11 px-3 rounded-xl text-sm hover:bg-white/5 transition-colors">
          <Link2 className="w-4 h-4 text-[#FFD043]" /> {t("copyLink")}
        </button>
        <p className="px-3 pb-1 font-mono-bd text-[10px] text-slate-500 truncate" data-testid="share-url">{url}</p>
      </PopoverContent>
    </Popover>
  );
};
