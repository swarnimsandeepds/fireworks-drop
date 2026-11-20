import { lazy, Suspense, useEffect, useState } from "react";
import axios from "axios";
import { BookOpen } from "lucide-react";
import { API } from "@/lib/api";
import { useT } from "@/lib/i18n";

const StandPage = lazy(() => import("@/components/stand/StandPage"));

export const CatalogSheet = () => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (open && !items.length) axios.get(`${API}/catalog`).then((r) => setItems(r.data.items)).catch(() => {});
  }, [open, items.length]);

  return (
    <>
      <button
        data-testid="open-catalog-button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 h-10 rounded-full border border-[#FFD043]/40 text-[#FFD043] text-xs font-semibold hover:bg-[#FFD043]/10 transition-colors"
      >
        <BookOpen className="w-4 h-4" /> {t("catalog")}
      </button>
      {open && (
        <Suspense fallback={null}>
          <StandPage items={items} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
};
