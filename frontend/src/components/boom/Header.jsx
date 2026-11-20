import { Sparkles } from "lucide-react";
import { CatalogSheet } from "@/components/boom/CatalogSheet";
import { useLang, useT } from "@/lib/i18n";

export const Header = () => {
  const t = useT();
  const { lang, setLang } = useLang();
  return (
  <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0D0F1A]/80 border-b border-white/10">
    <div className="max-w-md mx-auto h-16 px-5 flex items-center justify-between">
      <div className="flex items-center gap-2" data-testid="brand-logo">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF2A85] to-[#FFD043] grid place-items-center shadow-[0_0_18px_rgba(255,42,133,0.6)]">
          <Sparkles className="w-4 h-4 text-[#06070D]" />
        </div>
        <div className="leading-tight">
          <div className="font-display font-black text-lg tracking-tight">BoomDrop</div>
          <div className="font-mono-bd text-[10px] text-slate-500 uppercase tracking-wider">{t("rate")}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-10 p-1 rounded-full border border-white/10 bg-[#131728]" role="group" aria-label="Language">
          {[["en", "EN"], ["km", "ខ្មែរ"]].map(([k, label]) => (
            <button key={k} data-testid={`lang-toggle-${k}`} aria-pressed={lang === k} onClick={() => setLang(k)}
              className={`px-2.5 rounded-full text-[11px] font-semibold transition-colors ${lang === k ? "bg-[#FF2A85] text-white" : "text-slate-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
        <CatalogSheet />
      </div>
    </div>
  </header>
  );
};
