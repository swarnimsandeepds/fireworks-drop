import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const M = ({ c, e, ei = 0.6, metal = 0.2 }) => (
  <meshStandardMaterial color={c} emissive={e || "#000"} emissiveIntensity={e ? ei : 0} roughness={0.45} metalness={metal} flatShading />
);
const Glow = ({ c }) => <meshBasicMaterial color={c} toneMapped={false} />;

function Heart() {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.5);
    s.bezierCurveTo(-0.9, 0.1, -0.5, 0.75, 0, 0.35);
    s.bezierCurveTo(0.5, 0.75, 0.9, 0.1, 0, -0.5);
    return new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false });
  }, []);
  return <mesh geometry={geo} position={[0, 1.9, -0.06]}><Glow c={[2, 0.4, 1]} /></mesh>;
}

const Cyl = ({ args, y = 0, children, rot }) => (
  <mesh position={[0, y, 0]} rotation={rot}><cylinderGeometry args={args} />{children}</mesh>
);

const MODELS = {
  1: () => (<><Cyl args={[0.04, 0.04, 2.2, 6]} y={1.1}><M c="#9aa3b8" metal={0.7} /></Cyl><mesh position={[0, 2.25, 0]}><sphereGeometry args={[0.12, 8, 8]} /><Glow c={[2, 1.6, 0.8]} /></mesh></>),
  2: () => (<><Cyl args={[0.35, 0.5, 0.9, 10]} y={0.45}><M c="#c8102e" e="#ffb020" ei={0.15} /></Cyl><Cyl args={[0.36, 0.36, 0.15, 10]} y={0.95}><M c="#ffd043" metal={0.6} /></Cyl></>),
  3: () => (<><Cyl args={[0.35, 0.5, 1.8, 10]} y={0.9}><M c="#c8102e" e="#ffb020" ei={0.15} /></Cyl><Cyl args={[0.36, 0.36, 0.15, 10]} y={1.85}><M c="#ffd043" metal={0.6} /></Cyl></>),
  4: () => (<><Cyl args={[0.12, 0.12, 1.8, 8]} y={0.9}><M c="#ff2a85" e="#ff2a85" ei={0.3} /></Cyl><Cyl args={[0.05, 0.05, 0.5, 6]} y={2.05}><M c="#222" /></Cyl></>),
  5: () => (<><Cyl args={[0.12, 0.12, 1.8, 8]} y={0.9}><M c="#3a6bff" e="#3a6bff" ei={0.3} /></Cyl><Cyl args={[0.05, 0.05, 0.5, 6]} y={2.05}><M c="#222" /></Cyl></>),
  6: () => (<mesh position={[0, 0.9, 0]}><coneGeometry args={[0.45, 1.5, 10]} /><M c="#ff2a85" e="#ffd043" ei={0.12} /></mesh>),
  7: () => (<group position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]}><mesh><torusGeometry args={[0.7, 0.08, 6, 24]} /><M c="#c0c8d8" metal={0.9} /></mesh><mesh><cylinderGeometry args={[0.15, 0.15, 0.25, 10]} /><M c="#7a8296" metal={0.8} /></mesh></group>),
  8: () => (<group position={[0, 0.5, 0]}><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.8, 0.22, 8, 20]} /><M c="#3a2a10" e="#ffd043" ei={0.2} /></mesh>{[0, 1, 2, 3, 4, 5].map((k) => <mesh key={k} position={[Math.cos(k) * 0.8, 0.25, Math.sin(k) * 0.8]}><sphereGeometry args={[0.06, 6, 6]} /><Glow c={[2, 1.8, 1]} /></mesh>)}</group>),
  9: () => (<><Cyl args={[0.035, 0.035, 1.5, 6]} y={0.75}><M c="#9aa3b8" metal={0.7} /></Cyl><Heart /></>),
  10: () => (<><Cyl args={[0.55, 0.6, 0.8, 12]} y={0.4}><M c="#1a1a24" /></Cyl><Cyl args={[0.5, 0.5, 0.04, 12]} y={0.82}><Glow c={[2.2, 2.2, 2.4]} /></Cyl></>),
  11: () => (<group position={[0, 1, 0]} rotation={[0, 0, 0.35]}><Cyl args={[0.32, 0.38, 2, 12]}><M c="#ffd043" e="#ff2a85" ei={0.15} metal={0.5} /></Cyl><Cyl args={[0.34, 0.34, 0.12, 12]} y={0.7}><M c="#ff2a85" /></Cyl></group>),
  12: () => (<group position={[0, 0.7, 0]}><mesh><boxGeometry args={[1.8, 1.2, 1]} /><M c="#2b1a44" e="#ff2a85" ei={0.2} /></mesh><mesh position={[0, 0, 0.51]}><planeGeometry args={[1.6, 0.25]} /><Glow c={[2, 1.5, 0.4]} /></mesh></group>),
};

export const ItemModel = ({ id }) => {
  const g = useRef();
  const Model = MODELS[id] || MODELS[1];
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.rotation.y = clock.elapsedTime * 0.8 + id;
    g.current.position.y = Math.sin(clock.elapsedTime * 1.5 + id) * 0.08;
  });
  return <group ref={g}><Model /></group>;
};
