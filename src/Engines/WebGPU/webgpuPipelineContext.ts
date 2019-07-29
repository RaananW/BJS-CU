import { IPipelineContext } from '../IPipelineContext';
import { Nullable } from '../../types';
import { WebGPUEngine } from '../webgpuEngine';
import { InternalTexture } from '../../Materials/Textures/internalTexture';
import { Effect } from '../../Materials/effect';
import { WebGPUShaderProcessingContext } from './webgpuShaderProcessingContext';

/** @hidden */
export interface IWebGPUPipelineContextSamplerCache {
    setIndex: number;

    textureBinding: number;

    samplerBinding: number;

    texture: InternalTexture;
}

/** @hidden */
export interface IWebGPUPipelineContextVertexInputsCache {
    indexBuffer: Nullable<GPUBuffer>;
    indexOffset: number;

    vertexStartSlot: number;
    vertexBuffers: GPUBuffer[];
    vertexOffsets: number[];
}

/** @hidden */
export class WebGPUPipelineContext implements IPipelineContext {
    public engine: WebGPUEngine;

    public availableAttributes: { [key: string]: number };
    public availableUBOs: { [key: string]: { setIndex: number, bindingIndex: number} };
    public availableSamplers: { [key: string]: { setIndex: number, bindingIndex: number} };

    public orderedAttributes: string[];
    public orderedUBOsAndSamplers: { name: string, isSampler: boolean }[][];

    public sources: {
        vertex: string
        fragment: string,
    };

    public stages: Nullable<GPURenderPipelineStageDescriptor>;

    public samplers: { [name: string]: Nullable<IWebGPUPipelineContextSamplerCache> } = { };

    public vertexInputs: IWebGPUPipelineContextVertexInputsCache;

    public bindGroupLayouts: (GPUBindGroupLayout | undefined)[];
    public bindGroups: GPUBindGroup[];

    public renderPipeline: GPURenderPipeline;

    // Default implementation.
    public onCompiled?: () => void;

    public get isAsync() {
        return false;
    }

    public get isReady(): boolean {
        if (this.stages) {
            return true;
        }

        return false;
    }

    constructor(shaderProcessingContext: WebGPUShaderProcessingContext) {
        this.availableAttributes = shaderProcessingContext.availableAttributes;
        this.availableUBOs = shaderProcessingContext.availableUBOs;
        this.availableSamplers = shaderProcessingContext.availableSamplers;
        this.orderedAttributes = shaderProcessingContext.orderedAttributes;
        this.orderedUBOsAndSamplers = shaderProcessingContext.orderedUBOsAndSamplers;
    }

    public _handlesSpectorRebuildCallback(onCompiled: (program: any) => void): void {
        // Nothing to do yet for spector.
    }

    public _fillEffectInformation(effect: Effect, uniformBuffersNames: { [key: string]: number }, uniformsNames: string[], uniforms: { [key: string]: Nullable<WebGLUniformLocation> }, samplerList: string[], samplers: { [key: string]: number }, attributesNames: string[], attributes: number[]) {
        const engine = this.engine;

        // TODO WEBGPU. Cleanup SEB on this entire function. Should not need anything in here or almost.
        let effectAvailableUniforms = engine.getUniforms(this, uniformsNames);
        effectAvailableUniforms.forEach((uniform, index) => {
            uniforms[uniformsNames[index]] = uniform;
        });

        // Prevent Memory Leak by reducing the number of string, refer to the string instead of copy.
        effect._fragmentSourceCode = "";
        effect._vertexSourceCode = "";
        // this._fragmentSourceCodeOverride = "";
        // this._vertexSourceCodeOverride = "";

        const foundSamplers = this.availableSamplers;
        let index: number;
        for (index = 0; index < samplerList.length; index++) {
            const name = samplerList[index];
            const sampler = foundSamplers[samplerList[index]];

            if (sampler == null || sampler == undefined) {
                samplerList.splice(index, 1);
                index--;
            }
            else {
                samplers[name] = index;
            }
        }

        attributes.push(...engine.getAttributes(this, attributesNames));
    }
}