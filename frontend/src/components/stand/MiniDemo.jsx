import { useCallback, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Particles } from "@/components/preview/Particles";
import { EFFECTS } from "@/components/preview/effects";

// Small particle demo of one catalog effect, fired each time `trigger` increments.
export const MiniDemo = ({ id, type, trigger }) => {
  const A = useRef();
  const N = useRef();
  const light = useRef();
  const start = useRef(performance.now());
  const st = useRef({ emitters: [], li: 0, decay: 4 });
  const getTime = useCallback(() => (performance.now() - start.current) / 1000, []);

  useEffect(() => {
    if (!trigger || !A.current || !N.current) return;
    const s = st.current;
    const now = getTime();
    const x = {
      A: A.current, N: N.current, t0: now, i: trigger, drop: false, item: id, s: 1, sz: 1, m: 0.5,
      hands: () => [[-0.4, 1.8, 0], [0.4, 1.8, 0]],
      emit: (dur, tick, done) => s.emitters.push({ end: now + dur, tick, done }),
      slot: () => 0,
      light: (k, pos, col, inten, decay) => {
        if (!light.current) return;
        light.current.position.set(...pos);
        light.current.color.setRGB(...col);
        s.li = inten;
        s.decay = decay;
      },
      flash: () => {},
      strobe: (v) => { s.li = v; s.decay = 30; if (light.current) light.current.color.setRGB(1, 1, 1); },
    };
    (EFFECTS[type] || EFFECTS.sparkle)(x);
  }, [trigger, id, type, getTime]);

  useFrame((_, rawDt) => {
    const s = st.current;
    const dt = Math.min(rawDt, 0.05);
    const t = getTime();
    s.emitters = s.emitters.filter((e) => {
      if (t >= e.end) { e.done?.(); return false; }
      e.tick(t, dt);
      return true;
    });
    s.li *= Math.exp(-s.decay * dt);
    if (light.current) light.current.intensity = s.li;
  });

  return (
    <>
      <pointLight ref={light} intensity={0} distance={12} decay={1.5} />
      <Particles ref={A} max={1400} mode={0} getTime={getTime} />
      <Particles ref={N} max={300} mode={1} getTime={getTime} />
    </>
  );
};
