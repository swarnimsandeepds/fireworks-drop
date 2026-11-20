// Web Audio beat at 120 BPM that builds into drop_second.
export function createBeat(ctx) {
  let master = null;
  let muted = false;
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const env = (g, t, v, dec) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  };
  const tone = (t, type, f0, f1, v, dec, filt) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + 0.12);
    env(g, t, v, dec);
    let node = o;
    if (filt) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filt;
      node = o.connect(f);
    }
    node.connect(g).connect(master);
    o.start(t);
    o.stop(t + dec + 0.05);
  };
  const hit = (t, v, dec, type, freq) => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    env(g, t, v, dec);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + dec + 0.05);
  };
  const kick = (t, v) => tone(t, "sine", 150, 45, v, 0.35);
  const hat = (t) => hit(t, 0.1, 0.05, "highpass", 7000);
  const snare = (t, v) => hit(t, v, 0.15, "bandpass", 1800);
  const riser = (t0, t1) => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(300, t0);
    f.frequency.exponentialRampToValueAtTime(6000, t1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.3, t1 - 0.02);
    g.gain.setValueAtTime(0.0001, t1);
    s.connect(f).connect(g).connect(master);
    s.start(t0);
    s.stop(t1);
  };

  function stop() {
    if (!master) return;
    const m = master;
    m.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
    setTimeout(() => m.disconnect(), 200);
    master = null;
  }

  function play(drop) {
    stop();
    if (ctx.state === "closed") return;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    master.connect(ctx.destination);
    const base = ctx.currentTime + 0.03;
    const at = (st, fn) => st >= 0 && st <= 15 && fn(base + st);
    for (let k = -40; k < 40; k++) {
      const st = drop + k * 0.5;
      if (st < 0 || st > 15) continue;
      if (st < drop - 0.5) {
        at(st, (t) => kick(t, 0.5));
        at(st + 0.25, hat);
      } else if (st >= drop) {
        at(st, (t) => kick(t, 1));
        at(st + 0.25, hat);
        at(st + 0.25, (t) => tone(t, "sawtooth", k % 4 === 1 ? 65 : 55, 0, 0.22, 0.22, 500));
        if (k % 2 !== 0) at(st, (t) => snare(t, 0.35));
      }
    }
    for (let st = Math.max(0, drop - 2); st < drop - 0.25; st += drop - st > 1 ? 0.125 : 0.0625) {
      const v = 0.12 + 0.25 * (1 - (drop - st) / 2);
      at(st, (t) => snare(t, v));
    }
    if (drop > 0.5) riser(base + Math.max(0, drop - 4), base + drop - 0.25);
    at(drop, (t) => hit(t, 0.5, 1.8, "highpass", 3000));
    at(drop, (t) => tone(t, "sine", 55, 0, 0.7, 0.9));
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.7;
  }

  return { play, stop, setMuted };
}
