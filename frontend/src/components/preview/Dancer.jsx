import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

const Body = () => <meshStandardMaterial color="#2b1a44" roughness={0.45} metalness={0.1} emissive="#ff2a85" emissiveIntensity={0.22} flatShading />;
const Limb = ({ len, r = 0.06 }) => (
  <mesh position={[0, -len / 2, 0]}>
    <capsuleGeometry args={[r, len - r * 2, 2, 6]} />
    <Body />
  </mesh>
);

// Low poly humanoid with a procedural dance loop synced to 120 BPM.
export function Dancer({ getTime, drop, handsRef }) {
  const r = useRef({});
  const set = (k) => (el) => { r.current[k] = el; };
  const hand = (i) => (el) => {
    handsRef.current = handsRef.current || [];
    handsRef.current[i] = el;
  };

  useFrame(() => {
    const R = r.current;
    if (!R.hips) return;
    const t = getTime();
    const b = t * Math.PI * 2;
    const hype = t >= drop ? 1 : 0.35 + 0.5 * Math.min(1, t / Math.max(drop, 0.1));
    const sb = Math.sin(b);
    R.root.rotation.y = Math.sin(t * 0.7) * 0.3;
    R.hips.position.y = 0.95 - Math.abs(Math.sin(b)) * 0.1 * hype;
    R.torso.rotation.y = Math.sin(b / 2) * 0.5 * hype;
    R.torso.rotation.z = sb * 0.08 * hype;
    R.lS.rotation.z = -(0.2 + hype * (1.1 + Math.sin(b))) ;
    R.rS.rotation.z = 0.2 + hype * (1.1 + Math.sin(b + Math.PI));
    R.lS.rotation.x = sb * 0.6 * hype;
    R.rS.rotation.x = -sb * 0.6 * hype;
    R.lE.rotation.x = -(0.3 + 0.9 * Math.abs(sb)) * hype;
    R.rE.rotation.x = -(0.3 + 0.9 * Math.abs(Math.cos(b))) * hype;
    R.lH.rotation.x = sb * 0.45 * hype;
    R.rH.rotation.x = -sb * 0.45 * hype;
    R.lK.rotation.x = 0.2 + Math.max(0, sb) * 0.7 * hype;
    R.rK.rotation.x = 0.2 + Math.max(0, -sb) * 0.7 * hype;
  });

  const arm = (side, s, e, h, i) => (
    <group ref={set(s)} position={[side * 0.24, 0.55, 0]}>
      <Limb len={0.32} r={0.055} />
      <group ref={set(e)} position={[0, -0.32, 0]}>
        <Limb len={0.3} r={0.05} />
        <group ref={hand(i)} position={[0, -0.32, 0]}>
          <mesh><icosahedronGeometry args={[0.06, 0]} /><Body /></mesh>
        </group>
      </group>
    </group>
  );
  const leg = (side, hip, knee) => (
    <group ref={set(hip)} position={[side * 0.1, 0, 0]}>
      <Limb len={0.45} r={0.075} />
      <group ref={set(knee)} position={[0, -0.45, 0]}>
        <Limb len={0.45} r={0.065} />
        <mesh position={[0, -0.47, 0.06]}><boxGeometry args={[0.1, 0.06, 0.22]} /><Body /></mesh>
      </group>
    </group>
  );

  return (
    <group ref={set("root")} position={[0, 0.3, 0]}>
      <group ref={set("hips")} position={[0, 0.95, 0]}>
        <group ref={set("torso")}>
          <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.38, 0.6, 0.2]} /><Body /></mesh>
          <mesh position={[0, 0.8, 0]}><icosahedronGeometry args={[0.14, 0]} /><Body /></mesh>
          {arm(-1, "lS", "lE", "lHand", 0)}
          {arm(1, "rS", "rE", "rHand", 1)}
        </group>
        {leg(-1, "lH", "lK")}
        {leg(1, "rH", "rK")}
      </group>
    </group>
  );
}
