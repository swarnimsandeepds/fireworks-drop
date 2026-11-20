import { useState } from "react";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { Header } from "@/components/boom/Header";
import { MicButton } from "@/components/boom/MicButton";
import { RequestInput } from "@/components/boom/RequestInput";
import { ShotKitCard } from "@/components/boom/ShotKitCard";

import { API } from "@/lib/api";

function App() {
  const [text, setText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(false);

  const onTranscript = (t) => {
    setTranscript(t);
    setText(t);
  };

  const buildKit = async () => {
    if (text.trim().length < 3) return toast.error("Tell us your dance, song, spot, crew size and budget.");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/shot-kit`, { request: text.trim() });
      setKit(data);
      setTimeout(() => document.getElementById("shot-kit")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not build your Shot Kit. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sky min-h-screen relative overflow-x-hidden">
      <div className="stars absolute inset-0 pointer-events-none" />
      <Toaster theme="dark" position="top-center" />
      <Header />
      <main className="relative z-10 max-w-md mx-auto px-5 pb-16">
        <section className="pt-8 pb-6 rise">
          <p className="font-display uppercase tracking-[0.2em] text-xs text-[#FFD043]" data-testid="tagline">
            Fireworks that hit on the drop.
          </p>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight mt-2 leading-[1.05]">
            Say your dance.<br />
            <span className="text-[#FF2A85]">We'll light the drop.</span>
          </h1>
          <p className="text-sm text-slate-400 mt-3">
            Hold the mic and tell us your song, spot in Phnom Penh, crew size and budget.
          </p>
        </section>
        <MicButton onTranscript={onTranscript} disabled={loading} />
        <RequestInput transcript={transcript} text={text} setText={setText} onSubmit={buildKit} loading={loading} />
        {kit && <ShotKitCard kit={kit} />}
      </main>
    </div>
  );
}

export default App;
