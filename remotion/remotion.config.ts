import { Config } from "@remotion/cli/config";

// Rendering defaults for the PartCrafter video library.
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(2);

// WebGL is needed for the three.js turntable compositions. Use the ANGLE
// software/GL backend so renders work in headless / GPU-less environments.
Config.setChromiumOpenGlRenderer("angle");
