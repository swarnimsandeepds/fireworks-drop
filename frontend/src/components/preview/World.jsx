import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Line, MeshReflectorMaterial, Stars } from "@react-three/drei";

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function Instances({ items, children }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      m.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(...(it.s || [1, 1, 1])));
      ref.current.setMatrixAt(i, m);
      if (it.c) ref.current.setColorAt(i, col.setRGB(...it.c));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [items]);
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>{children}</instancedMesh>;
}

function Skyline({ mobile }) {
  const { blds, wins } = useMemo(() => {
    const r = rng(7);
    const blds = [];
    const wins = [];
    const maxW = mobile ? 260 : 600;
    for (let x = -62; x < 62;) {
      const w = 2 + r() * 4;
      const h = 3 + r() * 13 * (Math.abs(x) < 25 ? 1.2 : 0.8);
      const z = -44 - r() * 6;
      blds.push({ p: [x + w / 2, h / 2 - 0.3, z], s: [w, h, 3] });
      for (let wy = 1; wy < h - 0.6; wy += 0.9)
        for (let wx = x + 0.5; wx < x + w - 0.4; wx += 0.7)
          if (r() < 0.32 && wins.length < maxW) wins.push({ p: [wx + 0.15, wy, z + 1.52], c: r() < 0.75 ? [1.6, 1.05, 0.45] : [0.6, 0.9, 1.5] });
      x += w + 0.2 + r() * 1.2;
    }
    return { blds, wins };
  }, [mobile]);
  return (
    <group>
      <Instances items={blds}><boxGeometry /><meshStandardMaterial color="#0b0e1c" roughness={1} /></Instances>
      <Instances items={wins}><planeGeometry args={[0.28, 0.4]} /><meshBasicMaterial toneMapped={false} /></Instances>
      <group position={[-20, 0, -42]}>
        <mesh position={[0, 3, 0]}><cylinderGeometry args={[2.2, 2.6, 6, 8]} /><meshStandardMaterial color="#0d1020" /></mesh>
        <mesh position={[0, 8.5, 0]}><coneGeometry args={[1.6, 5, 8]} /><meshStandardMaterial color="#0d1020" /></mesh>
        <mesh position={[0, 11.2, 0]}><sphereGeometry args={[0.25, 8, 8]} /><meshBasicMaterial color={[2, 1.5, 0.5]} toneMapped={false} /></mesh>
      </group>
      <mesh position={[16, 14, -48]}><boxGeometry args={[4, 28, 4]} /><meshStandardMaterial color="#0b0e1c" /></mesh>
      <mesh position={[16, 14, -45.98]}><planeGeometry args={[0.25, 27]} /><meshBasicMaterial color={[2, 1.4, 0.5]} toneMapped={false} /></mesh>
    </group>
  );
}

const PALMS = [[-6, -2.6, 0.22], [-11, -2.2, 0.15], [-16, -3, -0.1], [6.5, -2.8, -0.22], [11.5, -2.4, -0.15], [16.5, -3, 0.1]];
const H = 5;
const crown = ([x, z, lean]) => [x + lean * H * 0.84, H, z];

function Palm({ x, z, lean }) {
  const segs = 6;
  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: segs }, (_, i) => (
        <mesh key={i} position={[Math.pow(i / segs, 2) * lean * H, (i + 0.5) * (H / segs), 0]} rotation={[0, 0, -lean * 1.2 * (i / segs)]}>
          <cylinderGeometry args={[0.13 - i * 0.01, 0.16 - i * 0.01, H / segs + 0.05, 6]} />
          <meshStandardMaterial color="#1c1510" roughness={1} flatShading />
        </mesh>
      ))}
      <group position={[lean * H * 0.84, H, 0]}>
        {Array.from({ length: 8 }, (_, k) => (
          <group key={k} rotation={[0, (k * Math.PI) / 4, 0]}>
            <mesh position={[0.9, -0.25, 0]} rotation={[0, 0, -0.45]}>
              <boxGeometry args={[1.9, 0.04, 0.38]} />
              <meshStandardMaterial color="#0e2a1b" roughness={0.9} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function StringLights() {
  const { wires, bulbs } = useMemo(() => {
    const pairs = [[0, 3], [1, 0], [3, 4]];
    const wires = [];
    const bulbs = [];
    pairs.forEach(([a, b], j) => {
      const A = crown(PALMS[a]);
      const B = crown(PALMS[b]);
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const p = [A[0] + (B[0] - A[0]) * u, A[1] - 0.4 + (B[1] - A[1]) * u - 1.4 * 4 * u * (1 - u), A[2] + (B[2] - A[2]) * u];
        pts.push(p);
        if (i % 2 === 1) bulbs.push({ p: [p[0], p[1] - 0.08, p[2]], c: (i + j) % 4 === 1 ? [2, 0.4, 1] : [2, 1.4, 0.5] });
      }
      wires.push(pts);
    });
    return { wires, bulbs };
  }, []);
  return (
    <group>
      {wires.map((pts, i) => <Line key={i} points={pts} color="#2a2a33" lineWidth={1} />)}
      <Instances items={bulbs}><sphereGeometry args={[0.07, 6, 6]} /><meshBasicMaterial toneMapped={false} /></Instances>
    </group>
  );
}

function Tripod() {
  const legs = [0, 2.09, 4.19];
  return (
    <group position={[0, 0, 5.5]}>
      {legs.map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.22, 0.6, Math.sin(a) * 0.22]} rotation={[Math.sin(a) * -0.35, 0, Math.cos(a) * 0.35]}>
          <cylinderGeometry args={[0.015, 0.015, 1.25, 5]} />
          <meshStandardMaterial color="#3a3f55" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 1.25, 0]}><boxGeometry args={[0.06, 0.06, 0.06]} /><meshStandardMaterial color="#3a3f55" /></mesh>
      <mesh position={[0, 1.38, 0]}><boxGeometry args={[0.09, 0.17, 0.012]} /><meshStandardMaterial color="#111" metalness={0.5} /></mesh>
      <mesh position={[0, 1.38, 0.007]}><planeGeometry args={[0.08, 0.155]} /><meshBasicMaterial color={[1.4, 0.3, 0.8]} toneMapped={false} /></mesh>
    </group>
  );
}

export function World({ mobile }) {
  return (
    <>
      <hemisphereLight args={["#2a2f6a", "#120a18", 0.45]} />
      <ambientLight intensity={0.08} />
      <Stars radius={90} depth={40} count={mobile ? 1500 : 3000} factor={3} fade speed={0.5} />
      <mesh position={[-28, 26, -80]}><sphereGeometry args={[2, 16, 16]} /><meshBasicMaterial color={[1.3, 1.2, 1]} toneMapped={false} fog={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 8]}>
        <planeGeometry args={[90, 24]} />
        <meshStandardMaterial color="#15151f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.4, -3.95]}><boxGeometry args={[90, 0.1, 0.1]} /><meshStandardMaterial color="#2a2a38" metalness={0.5} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, -34]}>
        <planeGeometry args={[160, 60]} />
        <MeshReflectorMaterial resolution={mobile ? 256 : 512} mixBlur={1} mixStrength={2.5} blur={mobile ? [0, 0] : [300, 80]} roughness={0.6} depthScale={0} color="#060a16" metalness={0.6} mirror={0.75} />
      </mesh>
      <Skyline mobile={mobile} />
      {PALMS.map(([x, z, lean]) => <Palm key={x} x={x} z={z} lean={lean} />)}
      <StringLights />
      <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[2.2, 2.3, 0.3, 24]} /><meshStandardMaterial color="#141026" roughness={0.6} /></mesh>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.2, 0.03, 6, 48]} /><meshBasicMaterial color={[2, 0.3, 0.9]} toneMapped={false} /></mesh>
      <Tripod />
    </>
  );
}
