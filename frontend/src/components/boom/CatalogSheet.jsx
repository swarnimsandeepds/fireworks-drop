import { useEffect, useState } from "react";
import axios from "axios";
import { BookOpen } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { API } from "@/lib/api";

export const CatalogSheet = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    axios.get(`${API}/catalog`).then((r) => setItems(r.data.items)).catch(() => {});
  }, []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          data-testid="open-catalog-button"
          className="flex items-center gap-1.5 px-3 h-10 rounded-full border border-[#FFD043]/40 text-[#FFD043] text-xs font-semibold hover:bg-[#FFD043]/10 transition-colors"
        >
          <BookOpen className="w-4 h-4" /> Catalog
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="bg-[#0D0F1A]/95 backdrop-blur-xl border-t border-[#FF2A85]/30 max-h-[80vh] overflow-y-auto rounded-t-3xl" data-testid="catalog-sheet">
        <SheetHeader>
          <SheetTitle className="font-display text-white text-left">The Stand</SheetTitle>
        </SheetHeader>
        <ul className="mt-4 divide-y divide-white/5">
          {items.map((i) => (
            <li key={i.id} className="py-3 flex items-center justify-between gap-3" data-testid={`catalog-item-${i.id}`}>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{i.name}</div>
                <div className="font-mono-bd text-[10px] uppercase tracking-wider text-[#FF5E9F]">#{i.id} · {i.effect}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono-bd text-sm text-[#FFD043]">${i.price_usd.toFixed(2)}</div>
                <div className="font-mono-bd text-[10px] text-slate-500">{i.price_khr.toLocaleString()} KHR</div>
              </div>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
};
