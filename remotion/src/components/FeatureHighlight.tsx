import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "./Background";
import { COLORS, FONT_FAMILY } from "../lib/theme";

export type FeatureHighlightProps = {
  heading: string;
  features: string[];
};

export const featureHighlightDefaults: FeatureHighlightProps = {
  heading: "What it does",
  features: [
    "One RGB image in → multiple parts out",
    "Joint multi-part & multi-object generation",
    "Compositional latent diffusion transformer",
    "Structured 3D meshes in a single shot",
  ],
};

const FeatureRow: React.FC<{ text: string; index: number }> = ({
  text,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - 15 - index * 10,
    fps,
    config: { damping: 200 },
  });
  const x = interpolate(s, [0, 1], [-60, 0]);

  return (
    <div
      style={{
        opacity: s,
        transform: `translateX(${x}px)`,
        display: "flex",
        alignItems: "center",
        gap: 28,
        marginBottom: 36,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 6,
          background: COLORS.highlight,
          boxShadow: `0 0 24px ${COLORS.highlight}`,
          flexShrink: 0,
        }}
      />
      <span style={{ color: COLORS.text, fontSize: 52, fontWeight: 600 }}>
        {text}
      </span>
    </div>
  );
};

export const FeatureHighlight: React.FC<FeatureHighlightProps> = ({
  heading,
  features,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headingSpring = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          fontFamily: FONT_FAMILY,
          justifyContent: "center",
          padding: "0 14%",
        }}
      >
        <h2
          style={{
            opacity: headingSpring,
            color: COLORS.accentSoft,
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 56,
          }}
        >
          {heading}
        </h2>
        {features.map((f, i) => (
          <FeatureRow key={i} text={f} index={i} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
