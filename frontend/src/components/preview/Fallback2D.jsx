import { useEffect, useRef } from "react";
import { TYPE_BY_ID } from "./effects";

const MAX = 700;
const COUNTS = { sparkle: 60, fountain: 90, smoke: 18, confetti: 70, spinner: 60, crackle: 80, strobe: 0, bundle: 120 };
const CONF = ["#ff3d8c", "#ffcc40", "#4de6ff", "#ffffff", "#b366ff"];
const rnd = (a, b) => a + Math.random() * (b - a);

function makeParticle(type, i, s, now, item) {
  const a = Math.random() * Math.PI * 2;
  const side = i % 2 ? 1 : -1;
  const base = { born: now, drag: 1, g: 1, size: 0.06, kind: "spark", color: "#fff2c0", life: 0.8 };
  switch (type) {
    case "fountain":
    case "bundle":
      return { ...base, x: side * 2.4, y: 0.3, vx: rnd(-0.6, 0.6) * s, vy: rnd(5, 7) * Math.sqrt(s), born: now + rnd(0, 2.4), life: 1.3, g: 9.8, drag: 0.2, color: "#ffc043" };
    case "smoke":
      return { ...base, x: side * 1.4, y: 0.4, vx: rnd(0.3, 0.6), vy: 0.7, born: now + rnd(0, 2.5), life: 3.5, g: -0.05, size: 0.5 * s, kind: "smoke", color: item === 5 ? "77,128,255" : "255,77,160" };
    case "confetti":
      return { ...base, x: 0, y: 0.4, vx: rnd(-1.5, 1.5) * s, vy: rnd(5, 7) * Math.sqrt(s), drag: 1.4, g: 2, life: 3.5, kind: "conf", color: CONF[i % 5], size: 0.12 };
    case "spinner":
      return { ...base, x: side * 2.2 + Math.cos(a) * 0.35 * s, y: 1.3 + Math.sin(a) * 0.35 * s, vx: -Math.sin(a) * 3 * s, vy: Math.cos(a) * 3 * s, born: now + rnd(0, 2), life: 0.6, drag: 1.5, color: "#cfe0ff" };
    case "crackle":
      return { ...base, x: rnd(-1.5, 1.5) * s, y: rnd(0.3, 2.7) * s, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2, born: now + rnd(0, 1.6), life: 0.25, drag: 3, g: 0.5, color: "#ffffff" };
    default:
      return { ...base, x: side * 0.4, y: 2, vx: Math.cos(a) * 2 * s, vy: Math.sin(a) * 2 * s, drag: 2, g: 1 };
  }
}

// 2D canvas preview used when WebGL is unavailable.
export default function Fallback2D({ kit, getTime, runId }) {
  const ref = useRef();
  useEffect(() => {
    const cv = ref.current;
    const g = cv.getContext("2d");
    let raf;
    let ps = [];
    let flash = 0;
    let shake = 0;
    let strobeUntil = -1;
    const fired = new Set();
    const stars = Array.from({ length: 90 }, () => [Math.random(), Math.random() * 0.55, Math.random() * 1.4 + 0.3]);
    const blds = Array.from({ length: 28 }, () => [0.04 + Math.random() * 0.14, Math.random()]);

    const fire = (c, i, now) => {
      const drop = Math.abs(c.second - kit.drop_second) < 0.6;
      const s = drop ? 3 : 1;
      if (drop) { flash = 1; shake = 1; }
      const type = c.effect_type || TYPE_BY_ID[c.item_id] || "sparkle";
      if (type === "strobe") strobeUntil = now + 2;
      const n = (COUNTS[type] ?? 60) * (drop ? 2 : 1);
      for (let k = 0; k < n && ps.length < MAX; k++) ps.push(makeParticle(type, k + i, s, now, c.item_id));
    };

    const loop = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr)) { cv.width = w * dpr; cv.height = h * dpr; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = getTime();
      kit.cues.forEach((c, i) => { if (!fired.has(i) && t >= c.second) { fired.add(i); fire(c, i, c.second); } });
      const u = h / 9;
      const gy = h * 0.82;
      const hz = h * 0.58;
      const X = (x) => w / 2 + x * u;
      const Y = (y) => gy - y * u;
      g.save();
      if (shake > 0) g.translate((Math.random() - 0.5) * 14 * shake, (Math.random() - 0.5) * 14 * shake);
      const sky = g.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, "#05060c");
      sky.addColorStop(1, "#170e28");
      g.fillStyle = sky;
      g.fillRect(-20, -20, w + 40, h + 40);
      g.fillStyle = "#fff";
      stars.forEach(([sx, sy, r]) => { g.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + sx * 30); g.fillRect(sx * w, sy * h, r, r); });
      g.globalAlpha = 1;
      blds.forEach(([bh, wr], i) => {
        const bw = w / 28;
        g.fillStyle = "#0b0e1c";
        g.fillRect(i * bw, hz - bh * h, bw - 2, bh * h);
        g.globalAlpha = 0.18;
        g.fillRect(i * bw, hz, bw - 2, bh * h * 0.5);
        g.globalAlpha = 1;
        g.fillStyle = wr > 0.3 ? "#ffc670" : "#9ad";
        for (let yy = hz - bh * h + 6; yy < hz - 6; yy += 9) if ((yy * 7 + i * 13) % 3 < 1) g.fillRect(i * bw + 4, yy, 3, 4);
      });
      g.fillStyle = "rgba(6,10,22,0.85)";
      g.fillRect(0, hz, w, h * 0.12);
      g.fillStyle = "#14141f";
      g.fillRect(0, hz + h * 0.12, w, h);
      g.fillStyle = "#141026";
      g.beginPath(); g.ellipse(X(0), gy, 2.2 * u, 0.35 * u, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#ff2a85"; g.lineWidth = 2; g.stroke();
      const b = t * Math.PI * 2;
      const hype = t >= kit.drop_second ? 1 : 0.5;
      const hy = 0.95 - Math.abs(Math.sin(b)) * 0.1 * hype;
      g.save();
      g.shadowColor = "#ff2a85"; g.shadowBlur = 22; g.strokeStyle = "#3a2260"; g.lineCap = "round"; g.lineWidth = u * 0.13;
      const line = (pts) => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); };
      line([[-0.15 + Math.sin(b) * 0.1 * hype, 0], [-0.1, hy * 0.5], [-0.08, hy]]);
      line([[0.15 - Math.sin(b) * 0.1 * hype, 0], [0.1, hy * 0.5], [0.08, hy]]);
      line([[0, hy], [0, hy + 0.6]]);
      const la = 0.4 + hype * (1 + Math.sin(b));
      const ra = 0.4 + hype * (1 + Math.sin(b + Math.PI));
      line([[0, hy + 0.55], [-0.3 - Math.sin(la) * 0.2, hy + 0.55 - Math.cos(la) * 0.3], [-0.4, hy + 0.55 + (la - 1) * 0.4]]);
      line([[0, hy + 0.55], [0.3 + Math.sin(ra) * 0.2, hy + 0.55 - Math.cos(ra) * 0.3], [0.4, hy + 0.55 + (ra - 1) * 0.4]]);
      g.fillStyle = "#3a2260"; g.beginPath(); g.arc(X(0), Y(hy + 0.8), u * 0.14, 0, Math.PI * 2); g.fill();
      g.restore();
      ps = ps.filter((p) => t - p.born <= p.life);
      ps.forEach((p) => {
        const a = t - p.born;
        if (a < 0) return;
        const k = (1 - Math.exp(-p.drag * a)) / p.drag;
        const x = p.x + p.vx * k;
        const y = p.y + p.vy * k - 0.5 * p.g * a * a;
        const fade = 1 - a / p.life;
        if (p.kind === "smoke") {
          g.globalCompositeOperation = "source-over";
          g.fillStyle = `rgba(${p.color},${0.25 * fade})`;
          g.beginPath(); g.arc(X(x), Y(y), (p.size + a * 0.4) * u, 0, Math.PI * 2); g.fill();
        } else if (p.kind === "conf") {
          g.globalCompositeOperation = "source-over";
          g.save(); g.translate(X(x), Y(y)); g.rotate(a * 6); g.fillStyle = p.color; g.globalAlpha = fade;
          g.fillRect(-p.size * u * Math.abs(Math.cos(a * 5)) / 2, -p.size * u / 4, p.size * u * Math.abs(Math.cos(a * 5)), p.size * u / 2);
          g.restore();
        } else {
          g.globalCompositeOperation = "lighter";
          g.globalAlpha = fade;
          g.fillStyle = p.color;
          g.beginPath(); g.arc(X(x), Y(y), p.size * u * (0.5 + fade * 0.5), 0, Math.PI * 2); g.fill();
        }
      });
      g.globalAlpha = 1;
      g.globalCompositeOperation = "lighter";
      const strobeOn = t < strobeUntil && Math.floor(t * 12) % 2 === 0;
      if (strobeOn || flash > 0) { g.fillStyle = `rgba(255,255,255,${strobeOn ? 0.3 : flash * 0.4})`; g.fillRect(-20, -20, w + 40, h + 40); }
      g.globalCompositeOperation = "source-over";
      g.restore();
      flash = Math.max(0, flash - 0.03);
      shake = Math.max(0, shake - 0.025);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [kit, getTime, runId]);
  return <canvas ref={ref} className="w-full h-full block" data-testid="preview-2d-canvas" />;
}
