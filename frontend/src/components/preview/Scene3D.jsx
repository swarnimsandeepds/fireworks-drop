import { useLayoutEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { World } from "./World";
import { Dancer } from "./Dancer";
import { Particles } from "./Particles";
import { Director } from "./Director";

function CameraRig({ mode }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    if (mode === "stage") camera.position.set(6, 4, 12);
    camera.fov = mode === "stage" ? 50 : 62;
    camera.updateProjectionMatrix();
  }, [mode, camera]);
  useFrame(() => {
    if (mode !== "phone") return;
    camera.position.set(0, 1.38, 5.4);
    camera.lookAt(0, 1.9, 0);
  });
  return null;
}

function Content({ kit, getTime, runId, mode, mobile }) {
  const world = useRef();
  const add = useRef();
  const norm = useRef();
  const hands = useRef([]);
  const bloom = useRef();
  return (
    <>
      <color attach="background" args={["#05060c"]} />
      <fog attach="fog" args={["#0a0c1d", 25, 95]} />
      <group ref={world}>
        <World mobile={mobile} />
        <Dancer getTime={getTime} drop={kit.drop_second} handsRef={hands} />
        <Particles ref={add} max={mobile ? 5000 : 14000} mode={0} getTime={getTime} />
        <Particles ref={norm} max={mobile ? 900 : 2500} mode={1} getTime={getTime} />
        <Director kit={kit} getTime={getTime} runId={runId} addRef={add} normRef={norm} handsRef={hands} worldRef={world} bloomRef={bloom} mobile={mobile} />
      </group>
      <CameraRig mode={mode} />
      {mode === "stage" && (
        <OrbitControls target={[0, 1.6, 0]} enablePan={false} minDistance={5} maxDistance={22} maxPolarAngle={Math.PI / 2.05} autoRotate autoRotateSpeed={1.5} enableDamping />
      )}
      <EffectComposer multisampling={0}>
        <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.2} intensity={1.1} radius={0.7} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  );
}

export default function Scene3D(props) {
  return (
    <Canvas
      data-testid="preview-3d-canvas"
      dpr={props.mobile ? [1, 1.5] : [1, 2]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ position: [6, 4, 12], fov: 50, near: 0.1, far: 200 }}
    >
      <Content {...props} />
    </Canvas>
  );
}
