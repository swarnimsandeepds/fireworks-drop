import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { EFFECTS, TYPE_BY_ID } from "./effects";

const POOL = 4;
const v = new THREE.Vector3();
const fresh = () => ({ fired: new Set(), emitters: [], ls: Array.from({ length: POOL }, () => ({ i: 0, d: 4 })), rr: 0, shake: 0, flash: 0, strobe: 0 });

// Fires each cue at its second, runs emitters, colored lights, drop shake and bloom flash.
export function Director({ kit, getTime, runId, addRef, normRef, handsRef, worldRef, bloomRef, mobile }) {
  const lights = useRef([]);
  const strobe = useRef();
  const st = useRef(fresh());

  useEffect(() => {
    st.current = fresh();
    addRef.current?.reset();
    normRef.current?.reset();
  }, [runId, addRef, normRef]);

  const fire = (s, c, i, now) => {
    const drop = Math.abs(c.second - kit.drop_second) < 0.6;
    if (drop) {
      s.shake = 1;
      s.flash = 1;
    }
    const x = {
      A: addRef.current, N: normRef.current, t0: c.second, i, drop, item: c.item_id,
      s: drop ? 3 : 1, sz: drop ? 1.6 : 1, m: mobile ? 0.5 : 1,
      hands: () => (handsRef.current || []).filter(Boolean).map((o) => { o.getWorldPosition(v); return [v.x, v.y, v.z]; }),
      emit: (dur, tick, done) => s.emitters.push({ end: now + dur, tick, done }),
      slot: () => (s.rr = (s.rr + 1) % POOL),
      light: (k, pos, col, inten, decay) => {
        const pl = lights.current[k];
        if (!pl) return;
        pl.position.set(...pos);
        pl.color.setRGB(...col);
        s.ls[k] = { i: inten, d: decay };
      },
      flash: (a) => { s.flash = Math.min(1.5, s.flash + a); },
      strobe: (val) => { s.strobe = val; },
    };
    const type = c.effect_type || TYPE_BY_ID[c.item_id] || "sparkle";
    (EFFECTS[type] || EFFECTS.sparkle)(x);
  };

  useFrame((_, rawDt) => {
    const s = st.current;
    const dt = Math.min(rawDt, 0.05);
    const t = getTime();
    if (t === s.lastT) return;
    s.lastT = t;
    kit.cues.forEach((c, i) => {
      if (!s.fired.has(i) && t >= c.second) {
        s.fired.add(i);
        fire(s, c, i, t);
      }
    });
    s.emitters = s.emitters.filter((e) => {
      if (t >= e.end || t >= 15) { e.done?.(); return false; }
      e.tick(t, dt);
      return true;
    });
    s.ls.forEach((L, k) => {
      L.i *= Math.exp(-L.d * dt);
      if (lights.current[k]) lights.current[k].intensity = L.i;
    });
    if (strobe.current) strobe.current.intensity = s.strobe;
    if (worldRef.current) {
      const a = 0.18 * s.shake;
      worldRef.current.position.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, 0);
    }
    s.shake = Math.max(0, s.shake - dt * 1.4);
    s.flash = Math.max(0, s.flash - dt * 2.2);
    if (bloomRef.current) bloomRef.current.intensity = 1.1 + s.flash * 3.5;
  });

  return (
    <>
      {Array.from({ length: POOL }, (_, k) => (
        <pointLight key={k} ref={(el) => { lights.current[k] = el; }} intensity={0} distance={18} decay={1.5} />
      ))}
      <pointLight ref={strobe} position={[0, 3.5, 4]} intensity={0} distance={30} decay={1.2} color="#ffffff" />
    </>
  );
}
