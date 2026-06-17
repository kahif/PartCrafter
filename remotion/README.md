# PartCrafter — Remotion Video Library

Programmatic videos for PartCrafter, built with [Remotion](https://www.remotion.dev/)
(video-as-React-code). Use it to produce teaser/title cards and 3D **turntable
showcases** of generated parts — rendered to MP4 from code, fully reproducible.

## Setup

```bash
cd remotion
npm install
```

## Preview (Remotion Studio)

```bash
npm run dev
```

Opens a live editor at <http://localhost:3000> where you can scrub, tweak props,
and preview every composition.

## Compositions (the "library")

| ID                | What it is                                              |
| ----------------- | ------------------------------------------------------- |
| `Showcase`        | Full 20s reel: intro → 3D turntable → features → outro  |
| `PartsTurntable`  | Rotating 3D view of a parts cluster or a real `.glb`    |
| `TitleCard`       | Animated title/teaser card                              |
| `FeatureHighlight`| Animated bullet list of capabilities                    |

All compositions are defined in [`src/Root.tsx`](./src/Root.tsx) and built from
reusable components in [`src/components`](./src/components).

## Render to MP4

```bash
npm run render             # Showcase  -> out/showcase.mp4
npm run render:turntable   # Turntable -> out/turntable.mp4
npm run render:title       # Title     -> out/title.mp4
```

The first render downloads a headless Chromium automatically. The turntable uses
WebGL via three.js; `remotion.config.ts` selects the ANGLE GL backend so it works
in headless / GPU-less environments.

### Render a real PartCrafter mesh

Put a `.glb`/`.gltf` in [`public/models/`](./public/models/) and pass its path
(relative to `public/`):

```bash
npm run render:turntable -- --props='{"modelSrc":"models/chair.glb"}'
```

The model is auto-centered and scaled to fit. With no model, a procedural
"compositional parts" cluster is shown.

## Type check

```bash
npm run typecheck
```

## Layout

```
remotion/
├── remotion.config.ts        # render defaults (format, GL backend)
├── src/
│   ├── index.ts              # registerRoot
│   ├── Root.tsx              # all <Composition> definitions
│   ├── lib/theme.ts          # colors / fonts / video constants
│   ├── components/           # Background, TitleCard, PartsTurntable, FeatureHighlight
│   └── compositions/Showcase.tsx
└── public/models/            # drop .glb outputs here
```
