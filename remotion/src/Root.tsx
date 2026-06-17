import React from "react";
import { Composition } from "remotion";
import { VIDEO } from "./lib/theme";
import { TitleCard, titleCardDefaults } from "./components/TitleCard";
import {
  PartsTurntable,
  partsTurntableDefaults,
} from "./components/PartsTurntable";
import {
  FeatureHighlight,
  featureHighlightDefaults,
} from "./components/FeatureHighlight";
import {
  Showcase,
  showcaseDefaults,
  SHOWCASE_DURATION,
} from "./compositions/Showcase";

/**
 * The PartCrafter video library. Each <Composition> is an independently
 * renderable, reusable video. Edit `defaultProps` (or pass --props on the CLI)
 * to retarget any of them — e.g. point the turntable at a real .glb output.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Showcase"
        component={Showcase}
        durationInFrames={SHOWCASE_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
        defaultProps={showcaseDefaults}
      />
      <Composition
        id="TitleCard"
        component={TitleCard}
        durationInFrames={90}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
        defaultProps={titleCardDefaults}
      />
      <Composition
        id="PartsTurntable"
        component={PartsTurntable}
        durationInFrames={240}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
        defaultProps={partsTurntableDefaults}
      />
      <Composition
        id="FeatureHighlight"
        component={FeatureHighlight}
        durationInFrames={180}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
        defaultProps={featureHighlightDefaults}
      />
    </>
  );
};
