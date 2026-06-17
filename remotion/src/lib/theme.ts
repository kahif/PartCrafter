// Shared visual language for the PartCrafter video library.

export const COLORS = {
  bgTop: "#0b1020",
  bgBottom: "#1a1033",
  accent: "#7c5cff",
  accentSoft: "#a48bff",
  highlight: "#22d3ee",
  text: "#f5f7ff",
  textDim: "#aab1d6",
};

// Palette used for the procedural "compositional parts" cluster so that each
// generated part reads as a distinct piece, echoing PartCrafter's multi-part
// generation.
export const PART_COLORS = [
  "#7c5cff",
  "#22d3ee",
  "#f472b6",
  "#fbbf24",
  "#34d399",
  "#60a5fa",
  "#fb7185",
];

export const FONT_FAMILY =
  '"Inter", "SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif';

export const VIDEO = {
  fps: 30,
  width: 1920,
  height: 1080,
} as const;
