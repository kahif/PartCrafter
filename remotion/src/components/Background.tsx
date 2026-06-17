import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../lib/theme";

/**
 * Animated gradient backdrop with a slow drifting glow. Used behind every
 * composition so the library has a consistent look.
 */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const glowX = interpolate(frame, [0, durationInFrames], [30, 70], {
    extrapolateRight: "clamp",
  });
  const glowY = interpolate(
    Math.sin((frame / durationInFrames) * Math.PI * 2),
    [-1, 1],
    [35, 65],
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(closest-side at ${glowX}% ${glowY}%, ${COLORS.accent}55, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(closest-side at ${100 - glowX}% ${100 - glowY}%, ${COLORS.highlight}33, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};
