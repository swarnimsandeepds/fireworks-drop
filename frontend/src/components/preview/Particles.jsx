import { useImperativeHandle, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const VERT = `
uniform float uTime; uniform float uScale; uniform float uMode;
attribute vec3 aVel; attribute vec3 aColor; attribute vec4 aP; attribute vec4 aX;
varying vec3 vColor; varying float vAlpha; varying float vAng; varying float vFlip; varying float vShape;
void main(){
  vAng = 0.0; vFlip = 1.0; vShape = 0.0; vColor = aColor; vAlpha = 0.0;
  float t = uTime - aP.x - aX.y;
  if (t < 0.0 || t > aP.y) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
  float age = t / aP.y;
  float k = aP.w;
  vec3 disp = k > 0.0 ? aVel * (1.0 - exp(-k * t)) / k : aVel * t;
  vec3 p = position + disp + vec3(0.0, -4.9 * aX.x * t * t, 0.0);
  float size = aP.z;
  float alpha = aX.w;
  if (uMode < 0.5) {
    alpha *= pow(1.0 - age, 1.6);
    if (aX.z > 0.0) alpha *= step(0.45, fract(sin(dot(position.xz, vec2(12.9, 78.2)) + t * 70.0) * 43758.5));
    size *= 1.0 - age * 0.6;
  } else if (aX.z < 0.0) {
    size *= 1.0 + age * 2.5;
    alpha *= smoothstep(0.0, 0.15, age) * (1.0 - age);
  } else {
    vShape = 1.0;
    p.x += sin(t * 3.0 + position.z * 9.0) * 0.25 * age;
    alpha *= 1.0 - smoothstep(0.8, 1.0, age);
    vAng = t * aX.z; vFlip = abs(cos(t * aX.z * 0.7));
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(size * uScale / -mv.z, 280.0);
  vAlpha = alpha;
}`;

const FRAG = `
uniform float uMode;
varying vec3 vColor; varying float vAlpha; varying float vAng; varying float vFlip; varying float vShape;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  if (uMode < 0.5) {
    float a = smoothstep(0.5, 0.0, length(c));
    gl_FragColor = vec4(vColor * 2.0, a * a * vAlpha);
  } else if (vShape < 0.5) {
    gl_FragColor = vec4(vColor, smoothstep(0.5, 0.1, length(c)) * vAlpha * 0.5);
  } else {
    float cs = cos(vAng), sn = sin(vAng);
    vec2 r = vec2(cs * c.x - sn * c.y, sn * c.x + cs * c.y);
    if (abs(r.x) > 0.35 * vFlip + 0.03 || abs(r.y) > 0.2) discard;
    gl_FragColor = vec4(vColor * (0.6 + 0.4 * vFlip), vAlpha);
  }
}`;

// GPU particle ring buffer: motion is computed in the vertex shader, CPU only writes spawns.
export function Particles({ ref, max, mode, getTime }) {
  const sys = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const mk = (name, size) => {
      const a = new THREE.BufferAttribute(new Float32Array(max * size), size);
      a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, a);
      return a;
    };
    const attrs = { pos: mk("position", 3), vel: mk("aVel", 3), col: mk("aColor", 3), p: mk("aP", 4), x: mk("aX", 4) };
    for (let i = 0; i < max; i++) attrs.p.array[i * 4] = 1e6;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 }, uScale: { value: 400 }, uMode: { value: mode } },
      transparent: true,
      depthWrite: false,
      blending: mode === 0 ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    return { geo, mat, attrs, idx: 0, lo: Infinity, hi: -1 };
  }, [max, mode]);

  useImperativeHandle(ref, () => ({
    spawn(o) {
      const i = sys.idx;
      sys.idx = (i + 1) % max;
      const { pos, vel, col, p, x } = sys.attrs;
      pos.array.set(o.o, i * 3);
      vel.array.set(o.v, i * 3);
      col.array.set(o.c, i * 3);
      p.array.set([o.t0, o.life, o.size, o.drag ?? 0], i * 4);
      x.array.set([o.grav ?? 1, o.trail ?? 0, o.spin ?? o.flick ?? 0, o.alpha ?? 1], i * 4);
      sys.lo = Math.min(sys.lo, i);
      sys.hi = Math.max(sys.hi, i);
    },
    reset() {
      for (let i = 0; i < max; i++) sys.attrs.p.array[i * 4] = 1e6;
      sys.lo = 0;
      sys.hi = max - 1;
    },
  }), [sys, max]);

  useFrame(({ size, camera, gl }) => {
    const u = sys.mat.uniforms;
    u.uTime.value = getTime();
    u.uScale.value = (size.height * gl.getPixelRatio() * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    if (sys.hi < 0) return;
    for (const a of Object.values(sys.attrs)) {
      a.clearUpdateRanges();
      a.addUpdateRange(sys.lo * a.itemSize, (sys.hi - sys.lo + 1) * a.itemSize);
      a.needsUpdate = true;
    }
    sys.lo = Infinity;
    sys.hi = -1;
  });

  return <points geometry={sys.geo} material={sys.mat} frustumCulled={false} renderOrder={mode === 0 ? 2 : 1} />;
}
