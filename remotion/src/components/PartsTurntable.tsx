import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Background } from "./Background";
import { PART_COLORS } from "../lib/theme";

export type PartsTurntableProps = {
  /**
   * Optional path (relative to the `public/` folder) to a .glb / .gltf mesh,
   * e.g. a PartCrafter output. When omitted, a procedural "compositional
   * parts" cluster is shown so the composition renders with no assets.
   */
  modelSrc?: string;
  /** Full turns over the whole composition. */
  turns?: number;
};

export const partsTurntableDefaults: PartsTurntableProps = {
  modelSrc: undefined,
  turns: 1,
};

type PartDef = {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
};

// A compact abstract sculpture assembled from distinct parts — a nod to
// PartCrafter generating multiple parts that compose into one object.
const PARTS: PartDef[] = [
  { position: [0, -1.1, 0], size: [1.5, 0.5, 1.5], color: PART_COLORS[0] },
  { position: [0, -0.4, 0], size: [0.95, 1.1, 0.95], color: PART_COLORS[1] },
  { position: [0, 0.55, 0], size: [0.7, 0.65, 0.7], color: PART_COLORS[2] },
  { position: [-0.85, -0.35, 0], size: [0.4, 0.95, 0.4], color: PART_COLORS[3] },
  { position: [0.85, -0.35, 0], size: [0.4, 0.95, 0.4], color: PART_COLORS[4] },
  { position: [0, -0.4, 0.62], size: [0.32, 0.32, 0.32], color: PART_COLORS[5] },
  { position: [0.5, 0.65, 0.35], size: [0.26, 0.26, 0.26], color: PART_COLORS[6] },
];

const Part: React.FC<{ def: PartDef; index: number }> = ({ def, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Staggered "assemble from an exploded layout" entrance.
  const s = spring({
    frame: frame - index * 3,
    fps,
    config: { damping: 14, mass: 0.7 },
  });
  const explode = 1 - s;
  const dir = new THREE.Vector3(...def.position).normalize();
  const pos: [number, number, number] = [
    def.position[0] + dir.x * 2.6 * explode,
    def.position[1] + dir.y * 2.6 * explode,
    def.position[2] + dir.z * 2.6 * explode,
  ];

  return (
    <mesh position={pos} scale={s} castShadow receiveShadow>
      <boxGeometry args={def.size} />
      <meshStandardMaterial color={def.color} metalness={0.35} roughness={0.45} />
    </mesh>
  );
};

const ProceduralCluster: React.FC = () => (
  <group>
    {PARTS.map((def, i) => (
      <Part key={i} def={def} index={i} />
    ))}
  </group>
);

const GLBModel: React.FC<{ src: string }> = ({ src }) => {
  const [object, setObject] = useState<THREE.Object3D | null>(null);
  const [handle] = useState(() => delayRender(`Loading model ${src}`));

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        // Center and normalize scale so any mesh fits the frame.
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        gltf.scene.position.sub(center);
        gltf.scene.scale.setScalar(2.4 / maxDim);
        setObject(gltf.scene);
        continueRender(handle);
      },
      undefined,
      (err) => {
        // eslint-disable-next-line no-console
        console.error(`Failed to load ${src}`, err);
        continueRender(handle);
      },
    );
  }, [src, handle]);

  if (!object) return null;
  return <primitive object={object} />;
};

export const PartsTurntable: React.FC<PartsTurntableProps> = ({
  modelSrc,
  turns = 1,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const rotationY = (frame / durationInFrames) * Math.PI * 2 * turns;

  return (
    <AbsoluteFill>
      <Background />
      <ThreeCanvas
        width={width}
        height={height}
        style={{ position: "absolute" }}
        camera={{ position: [0, 0.6, 6.5], fov: 35 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.4} castShadow />
        <pointLight position={[-6, 2, -4]} intensity={0.8} color="#22d3ee" />
        <group rotation={[0.12, rotationY, 0]}>
          {modelSrc ? (
            <GLBModel src={staticFile(modelSrc)} />
          ) : (
            <ProceduralCluster />
          )}
        </group>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
