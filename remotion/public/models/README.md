# Models

Drop PartCrafter mesh outputs (`.glb` / `.gltf`) here to render a real turntable.

Then point a composition at the file (path is relative to `public/`):

```bash
npm run render:turntable -- --props='{"modelSrc":"models/my_object.glb"}'
```

or set it in the Remotion Studio props panel, or edit `defaultProps` in
`src/Root.tsx`. With no model present, the turntable shows a procedural
"compositional parts" cluster.
