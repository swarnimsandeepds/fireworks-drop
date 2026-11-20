const rnd = (a, b) => a + Math.random() * (b - a);
const count = (rate, dt) => Math.floor(rate * dt + Math.random());
const sphere = (sp) => {
  const u = Math.random() * 2 - 1;
  const th = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return [r * Math.cos(th) * sp, u * sp, r * Math.sin(th) * sp];
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const trail = (A, p, n = 2) => {
  for (let k = 0; k <= n; k++) A.spawn({ ...p, trail: k * 0.035, alpha: (p.alpha ?? 1) * (1 - k * 0.32), size: p.size * (1 - k * 0.18) });
};

const WHITE = [1, 0.95, 0.85];
const GOLD = [1, 0.72, 0.28];
const SILVER = [0.75, 0.85, 1];
const CONFETTI = [[1, 0.2, 0.55], [1, 0.8, 0.25], [0.3, 0.9, 1], [1, 1, 1], [0.7, 0.4, 1]];

export const TYPE_BY_ID = { 1: "sparkle", 2: "fountain", 3: "fountain", 4: "smoke", 5: "smoke", 6: "confetti", 7: "spinner", 8: "crackle", 9: "sparkle", 10: "strobe", 11: "confetti", 12: "bundle" };

export const EFFECTS = {
  sparkle(x) {
    const { A, t0, s, m } = x;
    x.hands().forEach((h) => {
      for (let i = 0; i < 70 * m * s; i++) {
        trail(A, { o: h, v: sphere(rnd(1.5, 3.5) * s), c: Math.random() < 0.5 ? WHITE : GOLD, t0, life: rnd(0.5, 1), size: 0.09 * x.sz, drag: 2.5, grav: 0.25, flick: Math.random() < 0.3 ? 1 : 0 });
      }
    });
    const k = x.slot();
    x.emit(1.6, (t, dt) => {
      const hs = x.hands();
      hs.forEach((h) => {
        for (let i = count(70 * m, dt); i > 0; i--) A.spawn({ o: h, v: sphere(rnd(0.8, 1.6)), c: WHITE, t0: t, life: rnd(0.3, 0.6), size: 0.06, drag: 3, grav: 0.3, flick: 1 });
      });
      x.light(k, hs[1] || [0, 2, 0], [1, 0.85, 0.6], 18 * s * rnd(0.8, 1.1), 6);
    });
  },

  fountain(x) {
    const { A, s, m } = x;
    const sides = x.drop ? [-1.7, 1.7] : [x.i % 2 ? 1.7 : -1.7];
    sides.forEach((sx) => {
      const k = x.slot();
      x.emit(2.6, (t, dt) => {
        for (let i = count(160 * m, dt); i > 0; i--) {
          trail(A, { o: [sx + rnd(-0.05, 0.05), 0.35, 0.6], v: [rnd(-0.6, 0.6) * Math.sqrt(s), rnd(5.5, 7.5) * Math.sqrt(s), rnd(-0.6, 0.6) * Math.sqrt(s)], c: Math.random() < 0.8 ? GOLD : WHITE, t0: t, life: rnd(1, 1.5), size: 0.08 * x.sz, grav: 1, drag: 0.3 }, 1);
        }
        x.light(k, [sx, 1.2, 0.6], [1, 0.7, 0.3], 22 * s * rnd(0.85, 1.15), 8);
      });
    });
  },

  smoke(x) {
    const { N, s, m } = x;
    const color = x.item === 5 ? [0.3, 0.5, 1] : [1, 0.3, 0.62];
    const base = [x.i % 2 ? 1.6 : -1.6, 0.3, -1.2];
    const k = x.slot();
    x.emit(3.2, (t, dt) => {
      for (let i = count(22 * m * Math.sqrt(s), dt); i > 0; i--) {
        N.spawn({ o: [base[0] + rnd(-0.1, 0.1), base[1], base[2]], v: [rnd(-0.3, 0.3) * s + 0.25, rnd(0.5, 1) * Math.sqrt(s), rnd(-0.3, 0.3) * s], c: color, t0: t, life: rnd(3, 4), size: 0.9 * x.sz, grav: -0.02, drag: 0.4, spin: -1, alpha: 0.8 });
      }
      x.light(k, [base[0], 1, base[2]], color, 9 * s, 4);
    });
  },

  confetti(x) {
    const { N, t0, s, m } = x;
    const n = (x.item === 11 ? 200 : 120) * m * s;
    for (let i = 0; i < n; i++) {
      N.spawn({ o: [rnd(-0.2, 0.2), 0.4, 1.6], v: [rnd(-1.5, 1.5) * s, rnd(5, 7.5) * Math.sqrt(s), rnd(-1.5, 0.8) * s], c: pick(CONFETTI), t0, life: rnd(3, 4.5), size: 0.09 * x.sz, grav: 0.22, drag: 1.4, spin: rnd(4, 12) });
    }
    x.light(x.slot(), [0, 2, 1.6], [1, 0.5, 0.75], 30 * s, 3);
  },

  spinner(x) {
    const { A, s, m } = x;
    const c = [x.i % 2 ? -1.7 : 1.7, 1.3, 0.4];
    const R = 0.35 * s;
    let ang = 0;
    const k = x.slot();
    x.emit(2.2, (t, dt) => {
      ang += 18 * dt;
      for (let i = count(260 * m, dt); i > 0; i--) {
        const a = ang + (i % 3) * 2.094 + rnd(-0.1, 0.1);
        trail(A, { o: [c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R, c[2]], v: [-Math.sin(a) * 3 * s, Math.cos(a) * 3 * s, rnd(-0.3, 0.3)], c: Math.random() < 0.7 ? SILVER : WHITE, t0: t, life: rnd(0.4, 0.8), size: 0.07 * x.sz, drag: 1.5, grav: 0.6 });
      }
      x.light(k, c, [0.7, 0.8, 1], 18 * s * rnd(0.7, 1.2), 8);
    });
  },

  crackle(x) {
    const { A, t0, s, m } = x;
    for (let j = 0; j < 36 * s * m; j++) {
      const delay = rnd(0, 1.6);
      const o = [rnd(-1.6, 1.6) * s, rnd(0.3, 2.6) * Math.max(1, s * 0.8), rnd(-0.5, 1.8)];
      for (let i = 0; i < 8; i++) A.spawn({ o, v: sphere(rnd(0.8, 1.8)), c: Math.random() < 0.6 ? WHITE : GOLD, t0: t0 + delay, life: rnd(0.15, 0.35), size: 0.06 * x.sz, drag: 3, grav: 0.1, flick: 1 });
    }
    const k = x.slot();
    x.emit(1.8, () => x.light(k, [0, 1.2, 1], [1, 0.9, 0.7], Math.random() < 0.5 ? 25 * s : 2, 20));
  },

  strobe(x) {
    const { A, s } = x;
    let last = -1;
    const start = x.t0;
    x.emit(2, (t) => {
      const phase = Math.floor((t - start) * 12);
      const on = phase % 2 === 0;
      if (on && phase !== last) {
        A.spawn({ o: [0, 1.2, 1.8], v: [0, 0, 0], c: [1, 1, 1], t0: t, life: 0.08, size: 3 * x.sz, grav: 0 });
        x.flash(0.15 * s);
      }
      last = phase;
      x.strobe(on ? 80 * s : 0);
    }, () => x.strobe(0));
  },

  bundle(x) {
    EFFECTS.sparkle(x);
    EFFECTS.fountain({ ...x, drop: true });
  },
};
