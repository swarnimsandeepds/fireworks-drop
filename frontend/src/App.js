import { useEffect, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { Header } from "@/components/boom/Header";
import { MicButton } from "@/components/boom/MicButton";
import { RequestInput } from "@/components/boom/RequestInput";
import { ShotKitCard } from "@/components/boom/ShotKitCard";
import { TrendingStrip } from "@/components/boom/TrendingStrip";

import { API } from "@/lib/api";
import { LangContext, STR } from "@/lib/i18n";

function App() {
  const [text, setText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState("en");
  const [changes, setChanges] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [editing, setEditing] = useState(false);
  const t = (k) => STR[lang][k] ?? STR.en[k];

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("kit");
    if (!id) return;
    axios.get(`${API}/shot-kit/${id}`)
      .then((r) => { setKit(r.data); setTimeout(() => document.getElementById("shot-kit")?.scrollIntoView({ behavior: "smooth" }), 300); })
      .catch(() => toast.error(STR.en.kitLoadFail));
  }, []);
  useEffect(() => {
    if (!changes) return;
    const id = setTimeout(() => setChanges(null), 9000);
    return () => clearTimeout(id);
  }, [changes]);

  const editKit = async (command) => {
    setEditing(true);
    try {
      const { data } = await axios.post(`${API}/shot-kit/${kit.id}/edit`, { command, lang });
      if (!data.applied) return toast.error(t("editFail"));
      setChanges({ notes: data.changes, prev: kit });
      setKit(data.kit);
      if (data.delivery) setDelivery((d) => ({ ...d, ...Object.fromEntries(Object.entries(data.delivery).filter(([, v]) => v)) }));
    } catch {
      toast.error(t("editFail"));
    } finally {
      setEditing(false);
    }
  };

  const onTranscript = (tr) => {
    setTranscript(tr);
    if (kit) editKit(tr);
    else setText(tr);
  };

  const buildKit = async () => {
    if (text.trim().length < 3) return toast.error(t("tooShort"));
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/shot-kit`, { request: text.trim(), lang });
      setChanges(null);
      setDelivery(null);
      setKit(data);
      setTimeout(() => document.getElementById("shot-kit")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      toast.error(t("netError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LangContext.Provider value={{ lang, setLang }}>
    <div className="sky min-h-screen relative overflow-x-hidden">
      <div className="stars absolute inset-0 pointer-events-none" />
      <Toaster theme="dark" position="top-center" />
      <Header />
      <main className="relative z-10 max-w-md mx-auto px-5 pb-16">
        <section className="pt-8 pb-6 rise">
          <p className="font-display uppercase tracking-[0.2em] text-xs text-[#FFD043]" data-testid="tagline">
            {t("tagline")}
          </p>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed" data-testid="intro-copy">
            {t("intro")}
          </p>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight mt-2 leading-[1.05]">
            {t("h1a")}<br />
            <span className="text-[#FF2A85]">{t("h1b")}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-3">
            {t("sub")}
          </p>
        </section>
        <TrendingStrip onAdd={(c) => setText((cur) => (cur.trim() ? `${cur.trim().replace(/[.,]$/, "")}, ${c}` : c).slice(0, 2000))} />
        <MicButton onTranscript={onTranscript} disabled={loading || editing} editMode={!!kit} busy={editing} />
        <RequestInput transcript={transcript} text={text} setText={setText} onSubmit={buildKit} loading={loading || editing} />
        {kit && <ShotKitCard kit={kit} changes={changes} delivery={delivery} />}
      </main>
      <footer className="relative z-10 max-w-md mx-auto px-5 pb-10 text-center font-mono-bd text-[10px] uppercase tracking-widest text-slate-500" data-testid="app-footer">
        {t("footer")}
      </footer>
    </div>
    </LangContext.Provider>
  );
}

export default App;
