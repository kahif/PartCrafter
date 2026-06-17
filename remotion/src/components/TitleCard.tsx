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

export type TitleCardProps = {
  title: string;
  subtitle: string;
  tag: string;
};

export const titleCardDefaults: TitleCardProps = {
  title: "PartCrafter",
  subtitle: "Structured 3D Mesh Generation via Compositional Latent Diffusion",
  tag: "arXiv:2506.05573",
};

/**
 * Opening / closing title card. Title and subtitle spring in, the tag fades up.
 */
export const TitleCard: React.FC<TitleCardProps> = ({ title, subtitle, tag }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const subtitleSpring = spring({
    frame: frame - 12,
    fps,
    config: { damping: 200 },
  });

  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);
  const subtitleY = interpolate(subtitleSpring, [0, 1], [30, 0]);
  const tagOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          fontFamily: FONT_FAMILY,
          padding: "0 12%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            opacity: tagOpacity,
            color: COLORS.highlight,
            letterSpacing: 6,
            fontSize: 28,
            fontWeight: 600,
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          {tag}
        </div>
        <h1
          style={{
            opacity: titleSpring,
            transform: `translateY(${titleY}px)`,
            color: COLORS.text,
            fontSize: 150,
            fontWeight: 800,
            margin: 0,
            lineHeight: 1,
            background: `linear-gradient(90deg, ${COLORS.text}, ${COLORS.accentSoft})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            opacity: subtitleSpring,
            transform: `translateY(${subtitleY}px)`,
            color: COLORS.textDim,
            fontSize: 42,
            fontWeight: 500,
            maxWidth: 1200,
            marginTop: 28,
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
