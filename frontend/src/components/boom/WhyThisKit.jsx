import { Search, ExternalLink } from "lucide-react";

export const WhyThisKit = ({ kit }) => (
  <section className="mx-5 mb-5 rounded-2xl border border-white/10 bg-[#0D0F1A] p-4" data-testid="why-this-kit">
    <div className="flex items-center gap-1.5 font-mono-bd text-[10px] uppercase tracking-widest text-[#FF5E9F] mb-2">
      <Search className="w-3.5 h-3.5" /> Why this kit
    </div>
    {kit.sources?.length ? (
      <ul className="space-y-1.5">
        {kit.sources.slice(0, 3).map((s, i) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`why-source-link-${i}`}
              className="flex items-start gap-1.5 text-sm text-slate-200 hover:text-[#FFD043] transition-colors break-words"
            >
              <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" /> <span className="min-w-0">{s.title}</span>
            </a>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-slate-400">Built from tonight's BoomDrop house picks while live search catches up.</p>
    )}
    {kit.fallback && <p className="text-xs text-slate-500 mt-2" data-testid="fallback-kit-note">Quick-built from our catalog to keep you on schedule.</p>}
    <p className="font-mono-bd text-[10px] text-slate-500 mt-3" data-testid="you-com-label">Built from live search, powered by You.com</p>
  </section>
);
