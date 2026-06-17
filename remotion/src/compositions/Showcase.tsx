import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { PartsTurntable } from "../components/PartsTurntable";
import { FeatureHighlight } from "../components/FeatureHighlight";

export type ShowcaseProps = {
  modelSrc?: string;
};

export const showcaseDefaults: ShowcaseProps = {
  modelSrc: undefined,
};

// Timeline (at 30fps): intro 3s, turntable 8s, features 6s, outro 3s = 20s.
export const SHOWCASE_DURATION = 600;

export const Showcase: React.FC<ShowcaseProps> = ({ modelSrc }) => {
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={90}>
        <TitleCard
          title="PartCrafter"
          subtitle="Structured 3D Mesh Generation via Compositional Latent Diffusion"
          tag="arXiv:2506.05573"
        />
      </Sequence>

      <Sequence from={90} durationInFrames={240}>
        <PartsTurntable modelSrc={modelSrc} turns={1} />
      </Sequence>

      <Sequence from={330} durationInFrames={180}>
        <FeatureHighlight
          heading="What it does"
          features={[
            "One RGB image in → multiple parts out",
            "Joint multi-part & multi-object generation",
            "Compositional latent diffusion transformer",
            "Structured 3D meshes in a single shot",
          ]}
        />
      </Sequence>

      <Sequence from={510} durationInFrames={90}>
        <TitleCard
          title="PartCrafter"
          subtitle="Inference scripts, checkpoints & demo coming soon"
          tag="github.com/kahif/partcrafter"
        />
      </Sequence>
    </AbsoluteFill>
  );
};
