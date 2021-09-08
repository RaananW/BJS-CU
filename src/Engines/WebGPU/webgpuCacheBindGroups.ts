import { Logger } from "../../Misc/logger";
import { WebGPUDataBuffer } from "../../Meshes/WebGPU/webgpuDataBuffer";
import { WebGPUCacheSampler } from "./webgpuCacheSampler";
import { WebGPUMaterialContext } from "./webgpuMaterialContext";
import { WebGPUPipelineContext } from "./webgpuPipelineContext";
import { WebGPUEngine } from "../webgpuEngine";
import { WebGPUHardwareTexture } from "./webgpuHardwareTexture";
import { InternalTexture } from "../../Materials/Textures/internalTexture";
import { ExternalTexture } from "../../Materials/Textures/externalTexture";

class WebGPUBindGroupCacheNode {
    public values: { [id: number]: WebGPUBindGroupCacheNode };
    public bindGroups: GPUBindGroup[];

    constructor() {
        this.values = {};
    }
}

/** @hidden */
export class WebGPUCacheBindGroups {

    public static NumBindGroupsCreatedTotal = 0;
    public static NumBindGroupsCreatedLastFrame = 0;

    private static _Cache: WebGPUBindGroupCacheNode = new WebGPUBindGroupCacheNode();

    private static _NumBindGroupsCreatedCurrentFrame = 0;

    private _device: GPUDevice;
    private _cacheSampler: WebGPUCacheSampler;
    private _engine: WebGPUEngine;

    public disabled = false;

    constructor(device: GPUDevice, cacheSampler: WebGPUCacheSampler, engine: WebGPUEngine) {
        this._device = device;
        this._cacheSampler = cacheSampler;
        this._engine = engine;
    }

    public endFrame(): void {
        WebGPUCacheBindGroups.NumBindGroupsCreatedLastFrame = WebGPUCacheBindGroups._NumBindGroupsCreatedCurrentFrame;
        WebGPUCacheBindGroups._NumBindGroupsCreatedCurrentFrame = 0;
    }

    /**
     * Cache is currently based on the uniform buffers, samplers and textures used by the binding groups.
     * Note that all uniform buffers have an offset of 0 in Babylon and we don't have a use case where we would have the same buffer used with different capacity values:
     * that means we don't need to factor in the offset/size of the buffer in the cache, only the id
     */
    public getBindGroups(webgpuPipelineContext: WebGPUPipelineContext, materialContext: WebGPUMaterialContext, uniformsBuffers: { [name: string]: WebGPUDataBuffer }): GPUBindGroup[] {
        let bindGroups: GPUBindGroup[] | undefined = undefined;
        let node = WebGPUCacheBindGroups._Cache;

        // If there is at least one external texture to bind, we must recreate the bind groups each time because we need to retrieve a new texture each frame (by calling device.importExternalTexture)
        const cacheIsDisabled = this.disabled || materialContext.numExternalTextures > 0;
        if (!cacheIsDisabled) {
            for (const bufferName of webgpuPipelineContext.shaderProcessingContext.uniformBufferNames) {
                const uboId = uniformsBuffers[bufferName].uniqueId;
                let nextNode = node.values[uboId];
                if (!nextNode) {
                    nextNode = new WebGPUBindGroupCacheNode();
                    node.values[uboId] = nextNode;
                }
                node = nextNode;
            }

            for (const samplerName of webgpuPipelineContext.shaderProcessingContext.samplerNames) {
                const samplerHashCode = materialContext.samplers[samplerName]?.hashCode ?? 0;
                let nextNode = node.values[samplerHashCode];
                if (!nextNode) {
                    nextNode = new WebGPUBindGroupCacheNode();
                    node.values[samplerHashCode] = nextNode;
                }
                node = nextNode;
            }

            for (const textureName of webgpuPipelineContext.shaderProcessingContext.textureNames) {
                const textureId = materialContext.textures[textureName]?.texture?.uniqueId ?? 0;
                let nextNode = node.values[textureId];
                if (!nextNode) {
                    nextNode = new WebGPUBindGroupCacheNode();
                    node.values[textureId] = nextNode;
                }
                node = nextNode;
            }

            bindGroups = node.bindGroups;
        }

        if (bindGroups) {
            return bindGroups;
        }

        bindGroups = [];

        if (!cacheIsDisabled) {
            node.bindGroups = bindGroups;
        }

        WebGPUCacheBindGroups.NumBindGroupsCreatedTotal++;
        WebGPUCacheBindGroups._NumBindGroupsCreatedCurrentFrame++;

        const bindGroupLayouts = webgpuPipelineContext.bindGroupLayouts;
        for (let i = 0; i < webgpuPipelineContext.shaderProcessingContext.bindGroupLayoutEntries.length; i++) {
            const setDefinition = webgpuPipelineContext.shaderProcessingContext.bindGroupLayoutEntries[i];

            const entries: GPUBindGroupEntry[] = [];
            for (let j = 0; j < setDefinition.length; j++) {
                const entry = webgpuPipelineContext.shaderProcessingContext.bindGroupLayoutEntries[i][j];
                const entryInfo = webgpuPipelineContext.shaderProcessingContext.bindGroupLayoutEntryInfo[i][entry.binding];
                const name = entryInfo.nameInArrayOfTexture ?? entryInfo.name;

                if (entry.sampler) {
                    const bindingInfo = materialContext.samplers[name];
                    if (bindingInfo) {
                        const sampler = bindingInfo.sampler;
                        if (!sampler) {
                            if (this._engine.dbgSanityChecks) {
                                Logger.Error(`Trying to bind a null sampler! entry=${JSON.stringify(entry)}, bindingInfo=${JSON.stringify(bindingInfo, (key: string, value: any) => key === 'texture' ? '<no dump>' : value)}`, 50);
                            }
                            continue;
                        }
                        entries.push({
                            binding: entry.binding,
                            resource: this._cacheSampler.getSampler(sampler, false, bindingInfo.hashCode),
                        });
                    } else {
                        Logger.Error(`Sampler "${name}" could not be bound. entry=${JSON.stringify(entry)}, materialContext=${JSON.stringify(materialContext, (key: string, value: any) => key === 'texture' || key === 'sampler' ? '<no dump>' : value)}`, 50);
                    }
                } else if (entry.texture) {
                    const bindingInfo = materialContext.textures[name];
                    if (bindingInfo) {
                        if (this._engine.dbgSanityChecks && bindingInfo.texture === null) {
                            Logger.Error(`Trying to bind a null texture! entry=${JSON.stringify(entry)}, bindingInfo=${JSON.stringify(bindingInfo, (key: string, value: any) => key === 'texture' ? '<no dump>' : value)}`, 50);
                            continue;
                        }
                        const hardwareTexture = (bindingInfo.texture as InternalTexture)._hardwareTexture as WebGPUHardwareTexture;

                        if (this._engine.dbgSanityChecks && (!hardwareTexture || !hardwareTexture.view)) {
                            Logger.Error(`Trying to bind a null gpu texture! entry=${JSON.stringify(entry)}, bindingInfo=${JSON.stringify(bindingInfo, (key: string, value: any) => key === 'texture' ? '<no dump>' : value)}, isReady=${bindingInfo.texture?.isReady}`, 50);
                            continue;
                        }

                        entries.push({
                            binding: entry.binding,
                            resource: hardwareTexture.view!,
                        });
                    } else {
                        Logger.Error(`Texture "${name}" could not be bound. entry=${JSON.stringify(entry)}, materialContext=${JSON.stringify(materialContext, (key: string, value: any) => key === 'texture' || key === 'sampler' ? '<no dump>' : value)}`, 50);
                    }
                } else if (entry.externalTexture) {
                    const bindingInfo = materialContext.textures[name];
                    if (bindingInfo) {
                        if (this._engine.dbgSanityChecks && bindingInfo.texture === null) {
                            Logger.Error(`Trying to bind a null external texture! entry=${JSON.stringify(entry)}, bindingInfo=${JSON.stringify(bindingInfo, (key: string, value: any) => key === 'texture' ? '<no dump>' : value)}`, 50);
                            continue;
                        }
                        const externalTexture = (bindingInfo.texture as ExternalTexture).underlyingResource;

                        if (this._engine.dbgSanityChecks && !externalTexture) {
                            Logger.Error(`Trying to bind a null gpu external texture! entry=${JSON.stringify(entry)}, bindingInfo=${JSON.stringify(bindingInfo, (key: string, value: any) => key === 'texture' ? '<no dump>' : value)}, isReady=${bindingInfo.texture?.isReady}`, 50);
                            continue;
                        }

                        entries.push({
                            binding: entry.binding,
                            resource: externalTexture,
                        });
                    } else {
                        Logger.Error(`Texture "${name}" could not be bound. entry=${JSON.stringify(entry)}, materialContext=${JSON.stringify(materialContext, (key: string, value: any) => key === 'texture' || key === 'sampler' ? '<no dump>' : value)}`, 50);
                    }
                } else if (entry.buffer) {
                    const dataBuffer = uniformsBuffers[name];
                    if (dataBuffer) {
                        const webgpuBuffer = dataBuffer.underlyingResource as GPUBuffer;
                        entries.push({
                            binding: entry.binding,
                            resource: {
                                buffer: webgpuBuffer,
                                offset: 0,
                                size: dataBuffer.capacity,
                            },
                        });
                    } else {
                        Logger.Error(`Can't find UBO "${name}". entry=${JSON.stringify(entry)}, _uniformsBuffers=${JSON.stringify(uniformsBuffers)}`, 50);
                    }
                }
            }

            let groupLayout = bindGroupLayouts[i];
            bindGroups[i] = this._device.createBindGroup({
                layout: groupLayout,
                entries,
            });
        }

        return bindGroups;
    }
}
