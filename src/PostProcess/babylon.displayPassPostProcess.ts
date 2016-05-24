﻿module BABYLON {
    export class DisplayPassPostProcess extends PostProcess {
        constructor(name: string, ratio: number | PostProcessOptions, camera: Camera, samplingMode?: number, engine?: Engine, reusable?: boolean) {
            super(name, "displayPass", ["passSampler"], ["passSampler"], ratio, camera, samplingMode, engine, reusable);
        }
    }
}