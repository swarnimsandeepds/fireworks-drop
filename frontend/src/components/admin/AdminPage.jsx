import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, Navigate } from "react-router-dom";
import { Show, UserButton, useAuth } from "@clerk/react";
import { toast } from "sonner";
import { ArrowLeft, Check, X, Loader2, ShieldCheck } from "lucide-react";
import { API } from "@/lib/api";

const AdminVideo = ({ clip, getToken }) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let u;
    (async () => {
      try {
        const r = await fetch(`${API}/admin/clips/${clip.id}/video`, { headers: { Authorization: `Bearer ${await getToken()}` } });
        if (r.ok) { u = URL.createObjectURL(await r.blob()); setUrl(u); }
      } catch {}
    })();
    return () => u && URL.revokeObjectURL(u);
  }, [clip.id, getToken]);
  return url
    ? <video src={url} controls playsInline className="w-full aspect-[9/16] object-cover bg-black" />
    : <div className="w-full aspect-[9/16] bg-black grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>;
};

function ReviewQueue({ getToken }) {
  const [clips, setClips] = useState(null);
  const auth = useCallback(async () => ({ headers: { Authorization: `Bearer ${await getToken()}` } }), [getToken]);
  const load = useCallback(async () => {
    const { data } = await axios.get(`${API}/admin/clips`, await auth());
    setClips(data);
  }, [auth]);
  useEffect(() => { load().catch(() => setClips([])); }, [load]);

  const act = async (id, action) => {
    try {
      await axios.post(`${API}/admin/clips/${id}/${action}`, {}, await auth());
      setClips((c) => c.filter((x) => x.id !== id));
      toast.success(action === "approve" ? "Approved and live on the wall" : "Rejected");
    } catch {
      toast.error("Couldn't update that clip");
    }
  };

  return (
    <section data-testid="admin-review-queue">
      <h2 className="font-display font-black text-xl">Clips waiting for review</h2>
      {clips?.length === 0 && <p className="text-sm text-slate-400 mt-2" data-testid="admin-queue-empty">Nothing to review. New uploads land here first.</p>}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {clips?.map((c, i) => (
          <div key={c.id} className="rounded-2xl overflow-hidden bg-[#131728] border border-white/10" data-testid={`admin-clip-${i}`}>
            <AdminVideo clip={c} getToken={getToken} />
            <div className="p-2.5 space-y-1">
              <div className="text-xs font-semibold truncate">{c.crew}</div>
              <div className="text-[10px] text-slate-400">{c.source === "shoot" ? "Real shoot upload" : "Preview recording"} · {new Date(c.created_at).toLocaleString()}</div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => act(c.id, "approve")} data-testid={`admin-approve-${i}`} className="flex-1 h-9 rounded-full bg-[#FFD043] text-[#06070D] text-xs font-bold flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> Approve</button>
                <button onClick={() => act(c.id, "reject")} data-testid={`admin-reject-${i}`} className="flex-1 h-9 rounded-full border border-white/15 text-xs flex items-center justify-center gap-1 hover:bg-white/5"><X className="w-3.5 h-3.5" /> Reject</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UsersPanel({ getToken, me }) {
  const [data, setData] = useState(null);
  const auth = useCallback(async () => ({ headers: { Authorization: `Bearer ${await getToken()}` } }), [getToken]);
  const load = useCallback(async () => setData((await axios.get(`${API}/users`, await auth())).data), [auth]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const change = async (uid, role) => {
    try {
      await axios.patch(`${API}/users/${uid}/role`, { role }, await auth());
      toast.success("Role updated");
      load();
    } catch (e) {
      toast.error(e.response?.status === 409 ? "Keep at least one admin" : "Couldn't change the role");
    }
  };
  return (
    <section className="mt-10" data-testid="admin-users-panel">
      <h2 className="font-display font-black text-xl">Users</h2>
      <ul className="mt-3 divide-y divide-white/5">
        {data?.users.map((u) => (
          <li key={u.user_id} className="py-2.5 flex items-center justify-between gap-3 text-sm" data-testid={`admin-user-${u.user_id}`}>
            <span className="font-mono-bd text-xs text-slate-300 truncate">{u.user_id}{u.user_id === me.user_id ? " (you)" : ""}</span>
            <select value={u.role} onChange={(e) => change(u.user_id, e.target.value)} data-testid={`admin-role-select-${u.user_id}`}
              className="h-9 rounded-full bg-[#131728] border border-white/10 px-3 text-xs">
              {data.roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdminInner() {
  const { getToken } = useAuth();
  const [me, setMe] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${await getToken()}` } });
        setMe(data);
      } catch {
        setMe({ role: "none" });
      }
    })();
  }, [getToken]);
  if (!me) return <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>;
  if (me.role !== "admin") return <p className="py-16 text-center text-slate-400" data-testid="admin-no-access">Your account doesn't have admin access.</p>;
  return (<><ReviewQueue getToken={getToken} /><UsersPanel getToken={getToken} me={me} /></>);
}

export default function AdminPage() {
  return (
    <div className="sky min-h-screen" data-testid="admin-page">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0D0F1A]/80 border-b border-white/10">
        <div className="max-w-4xl mx-auto h-16 px-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white" data-testid="admin-back-link"><ArrowLeft className="w-4 h-4" /> BoomDrop</Link>
          <span className="flex items-center gap-1.5 font-display font-bold"><ShieldCheck className="w-4 h-4 text-[#FFD043]" /> Clip review</span>
          <Show when="signed-in"><UserButton /></Show>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-8">
        <Show when="signed-in"><AdminInner /></Show>
        <Show when="signed-out"><Navigate to="/sign-in" replace /></Show>
      </main>
    </div>
  );
}
