import { Logger } from "../Misc/logger";
import { Nullable, DataArray, IndicesArray, FloatArray, Immutable } from "../types";
import { Color4 } from "../Maths/math";
import { Engine } from "../Engines/engine";
import { InstancingAttributeInfo } from "../Engines/instancingAttributeInfo";
import { RenderTargetCreationOptions } from "../Materials/Textures/renderTargetCreationOptions";
import { InternalTexture, InternalTextureSource } from "../Materials/Textures/internalTexture";
import { IEffectCreationOptions, Effect } from "../Materials/effect";
import { EffectFallbacks } from "../Materials/effectFallbacks";
import { _TimeToken } from "../Instrumentation/timeToken";
import { Constants } from "./constants";
import * as WebGPUConstants from './WebGPU/webgpuConstants';
import { VertexBuffer } from "../Meshes/buffer";
import { WebGPUPipelineContext, IWebGPUPipelineContextVertexInputsCache, IWebGPURenderPipelineStageDescriptor } from './WebGPU/webgpuPipelineContext';
import { IPipelineContext } from './IPipelineContext';
import { DataBuffer } from '../Meshes/dataBuffer';
import { WebGPUDataBuffer } from '../Meshes/WebGPU/webgpuDataBuffer';
import { BaseTexture } from "../Materials/Textures/baseTexture";
import { IShaderProcessor } from "./Processors/iShaderProcessor";
import { WebGPUShaderProcessor } from "./WebGPU/webgpuShaderProcessors";
import { ShaderProcessingContext } from "./Processors/shaderProcessingOptions";
import { WebGPUShaderProcessingContext } from "./WebGPU/webgpuShaderProcessingContext";
import { Tools } from "../Misc/tools";
import { WebGPUTextureHelper } from './WebGPU/webgpuTextureHelper';
import { ISceneLike, ThinEngine } from './thinEngine';
import { Scene } from '../scene';
import { WebGPUBufferManager } from './WebGPU/webgpuBufferManager';
import { DepthTextureCreationOptions } from './depthTextureCreationOptions';
import { HardwareTextureWrapper } from '../Materials/Textures/hardwareTextureWrapper';
import { WebGPUHardwareTexture } from './WebGPU/webgpuHardwareTexture';
import { IColor4Like } from '../Maths/math.like';
import { IWebRequest } from '../Misc/interfaces/iWebRequest';
import { UniformBuffer } from '../Materials/uniformBuffer';

declare type VideoTexture = import("../Materials/Textures/videoTexture").VideoTexture;
declare type RenderTargetTexture = import("../Materials/Textures/renderTargetTexture").RenderTargetTexture;

// TODO WEBGPU remove when not needed anymore
function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg);
    }
}

const dbgShowShaderCode = false;
const dbgSanityChecks = true;
const dbgGenerateLogs = true;
const dbgVerboseLogsForFirstFrames = true;
const dbgVerboseLogsNumFrames = 20;
const dbgShowWarningsNotImplemented = true;
export const dbgShowDebugInliningProcess = false;

/**
 * Options to load the associated Glslang library
 */
export interface GlslangOptions {
    /**
     * Defines an existing instance of Glslang (usefull in modules who do not access the global instance).
     */
    glslang?: any;
    /**
     * Defines the URL of the glslang JS File.
     */
    jsPath?: string;
    /**
     * Defines the URL of the glslang WASM File.
     */
    wasmPath?: string;
}

/**
 * Options to create the WebGPU engine
 */
export interface WebGPUEngineOptions extends GPURequestAdapterOptions {

    /**
     * If delta time between frames should be constant
     * @see https://doc.babylonjs.com/babylon101/animations#deterministic-lockstep
     */
    deterministicLockstep?: boolean;

    /**
     * Maximum about of steps between frames (Default: 4)
     * @see https://doc.babylonjs.com/babylon101/animations#deterministic-lockstep
     */
    lockstepMaxSteps?: number;

    /**
     * Defines the seconds between each deterministic lock step
     */
    timeStep?: number;

    /**
     * Defines that engine should ignore modifying touch action attribute and style
     * If not handle, you might need to set it up on your side for expected touch devices behavior.
     */
    doNotHandleTouchAction?: boolean;

    /**
     * Defines if webaudio should be initialized as well
     * @see http://doc.babylonjs.com/how_to/playing_sounds_and_music
     */
    audioEngine?: boolean;

    /**
     * Defines the category of adapter to use.
     * Is it the discrete or integrated device.
     */
    powerPreference?: GPUPowerPreference;

    /**
     * Defines the device descriptor used to create a device.
     */
    deviceDescriptor?: GPUDeviceDescriptor;

    /**
     * Defines the requested Swap Chain Format.
     */
    swapChainFormat?: GPUTextureFormat;

    /**
     * Defines wether MSAA is enabled on the canvas.
     */
    antialiasing?: boolean;

    /**
     * Defines wether the stencil buffer should be enabled.
     */
    stencil?: boolean;
}

/**
 * The web GPU engine class provides support for WebGPU version of babylon.js.
 */
export class WebGPUEngine extends Engine {
    // Default glslang options.
    private static readonly _glslangDefaultOptions: GlslangOptions = {
        jsPath: "https://preview.babylonjs.com/glslang/glslang.js",
        wasmPath: "https://preview.babylonjs.com/glslang/glslang.wasm"
    };

    // Page Life cycle and constants
    private readonly _uploadEncoderDescriptor = { label: "upload" };
    private readonly _renderEncoderDescriptor = { label: "render" };
    private readonly _renderTargetEncoderDescriptor = { label: "renderTarget" };
    private readonly _clearDepthValue = 1;
    private readonly _clearReverseDepthValue = 0;
    private readonly _clearStencilValue = 0;
    private readonly _defaultSampleCount = 4; // Only supported value for now.

    // Engine Life Cycle
    private _canvas: HTMLCanvasElement;
    private _options: WebGPUEngineOptions;
    private _glslang: any = null;
    private _adapter: GPUAdapter;
    private _adapterSupportedExtensions: GPUExtensionName[];
    private _device: GPUDevice;
    private _deviceEnabledExtensions: GPUExtensionName[];
    private _context: GPUCanvasContext;
    private _swapChain: GPUSwapChain;
    private _swapChainTexture: GPUTexture;
    private _mainPassSampleCount: number;
    private _textureHelper: WebGPUTextureHelper;
    private _bufferManager: WebGPUBufferManager;
    private _deferredReleaseTextures: Array<[InternalTexture, Nullable<HardwareTextureWrapper>, Nullable<BaseTexture>, Nullable<InternalTexture>]> = [];
    private _counters: {
        numPipelineDescriptorCreation: number;
        numBindGroupsCreation: number;
    } = {
        numPipelineDescriptorCreation: 0,
        numBindGroupsCreation: 0,
    };

    // Some of the internal state might change during the render pass.
    // This happens mainly during clear for the state
    // And when the frame starts to swap the target texture from the swap chain
    private _mainTexture: GPUTexture;
    private _depthTexture: GPUTexture;
    private _mainColorAttachments: GPURenderPassColorAttachmentDescriptor[];
    private _mainTextureExtends: GPUExtent3D;
    private _mainDepthAttachment: GPURenderPassDepthStencilAttachmentDescriptor;
    private _depthTextureFormat: GPUTextureFormat | undefined;
    private _colorFormat: GPUTextureFormat;

    // Frame Life Cycle (recreated each frame)
    private _uploadEncoder: GPUCommandEncoder;
    private _renderEncoder: GPUCommandEncoder;
    private _renderTargetEncoder: GPUCommandEncoder;

    private _commandBuffers: GPUCommandBuffer[] = [null as any, null as any, null as any];

    // Frame Buffer Life Cycle (recreated for each render target pass)
    private _currentRenderPass: Nullable<GPURenderPassEncoder> = null;
    private _mainRenderPass: Nullable<GPURenderPassEncoder> = null;
    private _currentRenderTargetColorAttachmentViewDescriptor: GPUTextureViewDescriptor;
    private _currentRenderTargetDepthAttachmentViewDescriptor: GPUTextureViewDescriptor;

    // DrawCall Life Cycle
    // Effect is on the parent class
    // protected _currentEffect: Nullable<Effect> = null;
    private _currentVertexBuffers: Nullable<{ [key: string]: Nullable<VertexBuffer> }> = null;
    private _currentIndexBuffer: Nullable<DataBuffer> = null;
    private __colorWrite = true;
    private _uniformsBuffers: { [name: string]: WebGPUDataBuffer } = {};

    // Caches
    private _compiledShaders: { [key: string]: {
        stages: IWebGPURenderPipelineStageDescriptor,
        availableAttributes: { [key: string]: number },
        availableUBOs: { [key: string]: { setIndex: number, bindingIndex: number} },
        availableSamplers: { [key: string]: { setIndex: number, bindingIndex: number} },
        orderedAttributes: string[],
        orderedUBOsAndSamplers: { name: string, isSampler: boolean }[][],
        leftOverUniforms: { name: string, type: string, length: number }[],
        leftOverUniformsByName: { [name: string]: string },
        sources: {
            vertex: string,
            fragment: string,
            rawVertex: string,
            rawFragment: string,
        }
    } } = {};

    /**
     * Gets a boolean indicating that the engine supports uniform buffers
     * @see http://doc.babylonjs.com/features/webgl2#uniform-buffer-objets
     */
    public get supportsUniformBuffers(): boolean {
        return true;
    }

    /** Gets the supported extensions by the WebGPU adapter */
    public get supportedExtensions(): Immutable<GPUExtensionName[]> {
        return this._adapterSupportedExtensions;
    }

    /** Gets the currently enabled extensions on the WebGPU device */
    public get enabledExtensions(): Immutable<GPUExtensionName[]> {
        return this._deviceEnabledExtensions;
    }

    /**
     * Create a new instance of the gpu engine.
     * @param canvas Defines the canvas to use to display the result
     * @param options Defines the options passed to the engine to create the GPU context dependencies
     */
    public constructor(canvas: HTMLCanvasElement, options: WebGPUEngineOptions = {}) {
        super(null);

        ThinEngine.Features.forceBitmapOverHTMLImageElement = true;
        ThinEngine.Features.supportRenderAndCopyToLodForFloatTextures = true;
        ThinEngine.Features.framebuffersHaveYTopToBottom = true;
        ThinEngine.Features.supportDepthStencilTexture = true;
        ThinEngine.Features.supportShadowSamplers = true;
        ThinEngine.Features.uniformBufferHardCheckMatrix = true;
        ThinEngine.Features.allowTexturePrefiltering = true;
        ThinEngine.Features.trackUbosInFrame = true;
        ThinEngine.Features._collectUbosUpdatedInFrame = true;

        options.deviceDescriptor = options.deviceDescriptor || { };
        options.swapChainFormat = options.swapChainFormat || WebGPUConstants.TextureFormat.BGRA8Unorm;
        options.antialiasing = false; //options.antialiasing === undefined ? true : options.antialiasing;
        options.stencil = options.stencil ?? true;

        Logger.Log(`Babylon.js v${Engine.Version} - WebGPU engine`);
        if (!navigator.gpu) {
            Logger.Error("WebGPU is not supported by your browser.");
            return;
        }

        this._isWebGPU = true;
        this._shaderPlatformName = "WEBGPU";

        if (options.deterministicLockstep === undefined) {
            options.deterministicLockstep = false;
        }

        if (options.lockstepMaxSteps === undefined) {
            options.lockstepMaxSteps = 4;
        }

        if (options.audioEngine === undefined) {
            options.audioEngine = true;
        }

        this._deterministicLockstep = options.deterministicLockstep;
        this._lockstepMaxSteps = options.lockstepMaxSteps;
        this._timeStep = options.timeStep || 1 / 60;

        this._doNotHandleContextLost = true;

        this._canvas = canvas;
        this._options = options;
        this.premultipliedAlpha = false;

        this._hardwareScalingLevel = 1;
        this._mainPassSampleCount = options.antialiasing ? this._defaultSampleCount : 1;
        this._isStencilEnable = options.stencil;

        this._depthCullingState.depthTest = true;
        this._depthCullingState.depthFunc = Constants.LEQUAL;
        this._depthCullingState.depthMask = true;

        this._sharedInit(canvas, !!options.doNotHandleTouchAction, options.audioEngine);

        // TODO. WEBGPU. Use real way to do it.
        this._canvas.style.transform = "scaleY(-1)";
    }

    //------------------------------------------------------------------------------
    //                              Initialization
    //------------------------------------------------------------------------------

    /**
     * Initializes the WebGPU context and dependencies.
     * @param glslangOptions Defines the GLSLang compiler options if necessary
     * @returns a promise notifying the readiness of the engine.
     */
    public initAsync(glslangOptions?: GlslangOptions): Promise<void> {
        return this._initGlslang(glslangOptions)
            .then((glslang: any) => {
                this._glslang = glslang;
                return navigator.gpu!.requestAdapter(this._options);
            })
            .then((adapter: GPUAdapter | null) => {
                this._adapter = adapter!;
                this._adapterSupportedExtensions = this._adapter.extensions.slice(0);

                const deviceDescriptor = this._options.deviceDescriptor;

                if (deviceDescriptor?.extensions) {
                    const requestedExtensions = deviceDescriptor.extensions;
                    const validExtensions = [];

                    const iterator = requestedExtensions[Symbol.iterator]();
                    while (true) {
                        const { done, value : extension } = iterator.next();
                        if (done) {
                            break;
                        }
                        if (this._adapterSupportedExtensions.indexOf(extension) >= 0) {
                            validExtensions.push(extension);
                        }
                    }

                    deviceDescriptor.extensions = validExtensions;
                }

                return this._adapter.requestDevice(this._options.deviceDescriptor);
            })
            .then((device: GPUDevice | null) => {
                this._device = device!;
                this._deviceEnabledExtensions = this._device.extensions.slice(0);
            })
            .then(() => {
                this._bufferManager = new WebGPUBufferManager(this._device);
                this._textureHelper = new WebGPUTextureHelper(this._device, this._glslang, this._bufferManager);

                if (dbgVerboseLogsForFirstFrames) {
                    if ((this as any)._count === undefined) {
                        (this as any)._count = 0;
                        console.log("frame #" + (this as any)._count + " - begin");
                    }
                }

                this._uploadEncoder = this._device.createCommandEncoder(this._uploadEncoderDescriptor);
                this._renderEncoder = this._device.createCommandEncoder(this._renderEncoderDescriptor);
                this._renderTargetEncoder = this._device.createCommandEncoder(this._renderTargetEncoderDescriptor);

                this._initializeLimits();
                this._initializeContextAndSwapChain();
                this._initializeMainAttachments();
                this.resize();
            })
            .catch((e: any) => {
                Logger.Error("Can not create WebGPU Device and/or context.");
                Logger.Error(e);
            });
    }

    private _initGlslang(glslangOptions?: GlslangOptions): Promise<any> {
        glslangOptions = glslangOptions || { };
        glslangOptions = {
            ...WebGPUEngine._glslangDefaultOptions,
            ...glslangOptions
        };

        if (glslangOptions.glslang) {
            return Promise.resolve(glslangOptions.glslang);
        }

        if ((window as any).glslang) {
            return (window as any).glslang(glslangOptions!.wasmPath);
        }

        if (glslangOptions.jsPath && glslangOptions.wasmPath) {
            return Tools.LoadScriptAsync(glslangOptions.jsPath)
                .then(() => {
                    return (window as any).glslang(glslangOptions!.wasmPath);
                });
        }

        return Promise.reject("gslang is not available.");
    }

    private _initializeLimits(): void {
        // Init caps
        // TODO WEBGPU Real Capability check once limits will be working.

        this._caps = {
            maxTexturesImageUnits: 16,
            maxVertexTextureImageUnits: 16,
            maxCombinedTexturesImageUnits: 32,
            maxTextureSize: 2048,
            maxCubemapTextureSize: 2048,
            maxRenderTextureSize: 2048,
            maxVertexAttribs: 16,
            maxVaryingVectors: 16,
            maxFragmentUniformVectors: 1024,
            maxVertexUniformVectors: 1024,
            standardDerivatives: true,
            astc: null,
            s3tc: (this._deviceEnabledExtensions.indexOf(WebGPUConstants.ExtensionName.TextureCompressionBC) >= 0 ? true : undefined) as any,
            pvrtc: null,
            etc1: null,
            etc2: null,
            bptc: this._deviceEnabledExtensions.indexOf(WebGPUConstants.ExtensionName.TextureCompressionBC) >= 0 ? true : undefined,
            maxAnisotropy: 0,  // TODO: Retrieve this smartly. Currently set to D3D11 maximum allowable value.
            uintIndices: true,
            fragmentDepthSupported: true,
            highPrecisionShaderSupported: true,
            colorBufferFloat: true,
            textureFloat: true,
            textureFloatLinearFiltering: true,
            textureFloatRender: true,
            textureHalfFloat: true,
            textureHalfFloatLinearFiltering: true,
            textureHalfFloatRender: true,
            textureLOD: true,
            drawBuffersExtension: true,
            depthTextureExtension: true,
            vertexArrayObject: false,
            instancedArrays: true,
            canUseTimestampForTimerQuery: false,
            blendMinMax: true,
            maxMSAASamples: 8 // TODO WEBGPU what is the right value?
        };

        this._caps.parallelShaderCompile = null as any;
    }

    private _initializeContextAndSwapChain(): void {
        this._context = this._canvas.getContext('gpupresent') as unknown as GPUCanvasContext;
        this._swapChain = this._context.configureSwapChain({
            device: this._device,
            format: this._options.swapChainFormat!,
            usage: WebGPUConstants.TextureUsage.OutputAttachment | WebGPUConstants.TextureUsage.CopySrc,
        });
        this._colorFormat = this._options.swapChainFormat!;
        if (dbgGenerateLogs) {
            this._context.getSwapChainPreferredFormat(this._device).then((format) => {
                console.log("Swap chain preferred format:", format);
            });
        }
    }

    // Set default values as WebGL with depth and stencil attachment for the broadest Compat.
    private _initializeMainAttachments(): void {
        this._mainTextureExtends = {
            width: this.getRenderWidth(),
            height: this.getRenderHeight(),
            depth: 1
        };

        if (this._options.antialiasing) {
            const mainTextureDescriptor: GPUTextureDescriptor = {
                size: this._mainTextureExtends,
                mipLevelCount: 1,
                sampleCount: this._mainPassSampleCount,
                dimension: WebGPUConstants.TextureDimension.E2d,
                format: WebGPUConstants.TextureFormat.BGRA8Unorm,
                usage: WebGPUConstants.TextureUsage.OutputAttachment,
            };

            if (this._mainTexture) {
                this._mainTexture.destroy();
            }
            this._mainTexture = this._device.createTexture(mainTextureDescriptor);
            this._mainColorAttachments = [{
                attachment: this._mainTexture.createView(),
                loadValue: new Color4(0, 0, 0, 1),
                storeOp: WebGPUConstants.StoreOp.Clear // Better than "Store" as we don't need to reuse the content of the multisampled texture
            }];
        }
        else {
            this._mainColorAttachments = [{
                attachment: undefined as any,
                loadValue: new Color4(0, 0, 0, 1),
                storeOp: WebGPUConstants.StoreOp.Store
            }];
        }

        this._depthTextureFormat = this._getMainDepthTextureFormat();

        const depthTextureDescriptor: GPUTextureDescriptor = {
            size: this._mainTextureExtends,
            mipLevelCount: 1,
            sampleCount: this._mainPassSampleCount,
            dimension: WebGPUConstants.TextureDimension.E2d,
            format: this._depthTextureFormat,
            usage:  WebGPUConstants.TextureUsage.OutputAttachment
        };

        if (this._depthTexture) {
            this._depthTexture.destroy();
        }
        this._depthTexture = this._device.createTexture(depthTextureDescriptor);
        this._mainDepthAttachment = {
            attachment: this._depthTexture.createView(),

            depthLoadValue: this._clearDepthValue,
            depthStoreOp: WebGPUConstants.StoreOp.Store,
            stencilLoadValue: this._clearStencilValue,
            stencilStoreOp: WebGPUConstants.StoreOp.Store,
        };

        if (this._mainRenderPass !== null) {
            this._endMainRenderPass();
        }
    }

    /**
     * Gets a shader processor implementation fitting with the current engine type.
     * @returns The shader processor implementation.
     */
    protected _getShaderProcessor(): Nullable<IShaderProcessor> {
        return new WebGPUShaderProcessor();
    }

    /** @hidden */
    public _getShaderProcessingContext(): Nullable<ShaderProcessingContext> {
        return new WebGPUShaderProcessingContext();
    }

    //------------------------------------------------------------------------------
    //                          Static Pipeline WebGPU States
    //------------------------------------------------------------------------------

    public wipeCaches(bruteForce?: boolean): void {
        if (this.preventCacheWipeBetweenFrames && !bruteForce) {
            return;
        }
        this.resetTextureCache();

        //this._currentEffect = null; // can't reset _currentEffect, else some crashes can occur (for eg in ProceduralTexture which calls bindFrameBuffer (which calls wipeCaches) after having called enableEffect and before drawing into the texture)
        this._currentIndexBuffer = null;
        this._currentVertexBuffers = null;

        if (bruteForce) {
            this._currentProgram = null;

            this._stencilState.reset();

            this._depthCullingState.reset();
            this._depthCullingState.depthFunc = Constants.LEQUAL;

            this._alphaState.reset();
            this._alphaMode = Constants.ALPHA_ADD;
            this._alphaEquation = Constants.ALPHA_DISABLE;

            this.__colorWrite = true;
        }

        this._cachedVertexBuffers = null;
        this._cachedIndexBuffer = null;
        this._cachedEffectForVertexBuffers = null;
    }

    public setColorWrite(enable: boolean): void {
        this.__colorWrite = enable;
    }

    public getColorWrite(): boolean {
        return this.__colorWrite;
    }

    //------------------------------------------------------------------------------
    //                              Dynamic WebGPU States
    //------------------------------------------------------------------------------

    private _viewportsCurrent: Array<{ x: number, y: number, w: number, h: number }> = [{ x: 0, y: 0, w: 0, h: 0 }, { x: 0, y: 0, w: 0, h: 0 }];

    private _resetCurrentViewport(index: number) {
        this._viewportsCurrent[index].x = 0;
        this._viewportsCurrent[index].y = 0;
        this._viewportsCurrent[index].w = 0;
        this._viewportsCurrent[index].h = 0;
    }

    private _applyViewport(renderPass: GPURenderPassEncoder): void {
        const index = renderPass === this._mainRenderPass ? 0 : 1;

        const x = this._viewportCached.x,
              y = this._viewportCached.y,
              w = this._viewportCached.z,
              h = this._viewportCached.w;

        if (this._viewportsCurrent[index].x !== x || this._viewportsCurrent[index].y !== y ||
            this._viewportsCurrent[index].w !== w || this._viewportsCurrent[index].h !== h)
        {
            this._viewportsCurrent[index].x = x;
            this._viewportsCurrent[index].y = y;
            this._viewportsCurrent[index].w = w;
            this._viewportsCurrent[index].h = h;

            renderPass.setViewport(x, y, w, h, 0, 1);

            if (dbgVerboseLogsForFirstFrames) {
                if (!(this as any)._count || (this as any)._count < dbgVerboseLogsNumFrames) {
                    console.log("frame #" + (this as any)._count + " - _viewport applied - (", x, y, w, h, ") current pass is main pass=" + (renderPass === this._mainRenderPass));
                }
            }
        }
    }

    /** @hidden */
    public _viewport(x: number, y: number, width: number, height: number): void {
        this._viewportCached.x = x;
        this._viewportCached.y = y;
        this._viewportCached.z = width;
        this._viewportCached.w = height;
    }

    public enableScissor(x: number, y: number, width: number, height: number): void {
        const renderPass = this._getCurrentRenderPass();

        renderPass.setScissorRect(x, y, width, height);
    }

    public disableScissor() {
        const renderPass = this._getCurrentRenderPass();

        renderPass.setScissorRect(0, 0, this.getRenderWidth(), this.getRenderHeight());
    }

    public clear(color: Nullable<IColor4Like>, backBuffer: boolean, depth: boolean, stencil: boolean = false): void {
        // Some PGs are using color3...
        if (color && color.a === undefined) {
            color.a = 1;
        }

        // We need to recreate the render pass so that the new parameters for clear color / depth / stencil are taken into account
        if (this._currentRenderTarget) {
            if (this._currentRenderPass) {
                this._endRenderTargetRenderPass();
            }
            this._startRenderTargetRenderPass(this._currentRenderTarget!, backBuffer ? color : null, depth, stencil);
        } else {
            if (this.useReverseDepthBuffer) {
                this._depthCullingState.depthFunc = Constants.GREATER;
            }

            this._mainColorAttachments[0].loadValue = backBuffer && color ? color : WebGPUConstants.LoadOp.Load;

            this._mainDepthAttachment.depthLoadValue = depth ? (this.useReverseDepthBuffer ? this._clearReverseDepthValue : this._clearDepthValue) : WebGPUConstants.LoadOp.Load;
            this._mainDepthAttachment.stencilLoadValue = stencil ? this._clearStencilValue : WebGPUConstants.LoadOp.Load;

            if (this._mainRenderPass) {
                this._endMainRenderPass();
            }

            this._startMainRenderPass();
        }
    }

    //------------------------------------------------------------------------------
    //                              Vertex/Index Buffers
    //------------------------------------------------------------------------------

    public createVertexBuffer(data: DataArray): DataBuffer {
        let view: ArrayBufferView;

        if (data instanceof Array) {
            view = new Float32Array(data);
        }
        else if (data instanceof ArrayBuffer) {
            view = new Uint8Array(data);
        }
        else {
            view = data;
        }

        const dataBuffer = this._bufferManager.createBuffer(view, WebGPUConstants.BufferUsage.Vertex | WebGPUConstants.BufferUsage.CopyDst);
        return dataBuffer;
    }

    public createDynamicVertexBuffer(data: DataArray): DataBuffer {
        return this.createVertexBuffer(data);
    }

    public updateDynamicVertexBuffer(vertexBuffer: DataBuffer, data: DataArray, byteOffset?: number, byteLength?: number): void {
        const dataBuffer = vertexBuffer as WebGPUDataBuffer;
        if (byteOffset === undefined) {
            byteOffset = 0;
        }

        let view: ArrayBufferView;
        if (byteLength === undefined) {
            if (data instanceof Array) {
                view = new Float32Array(data);
            }
            else if (data instanceof ArrayBuffer) {
                view = new Uint8Array(data);
            }
            else {
                view = data;
            }
            byteLength = view.byteLength;
        } else {
            if (data instanceof Array) {
                view = new Float32Array(data);
            }
            else if (data instanceof ArrayBuffer) {
                view = new Uint8Array(data);
            }
            else {
                view = data;
            }
        }

        this._bufferManager.setSubData(dataBuffer, byteOffset, view, 0, byteLength);
    }

    public createIndexBuffer(data: IndicesArray): DataBuffer {
        let is32Bits = true;
        let view: ArrayBufferView;

        if (data instanceof Uint32Array || data instanceof Int32Array) {
            view = data;
        }
        else if (data instanceof Uint16Array) {
            view = data;
            is32Bits = false;
        }
        else {
            if (data.length > 65535) {
                view = new Uint32Array(data);
            }
            else {
                view = new Uint16Array(data);
                is32Bits = false;
            }
        }

        const dataBuffer = this._bufferManager.createBuffer(view, WebGPUConstants.BufferUsage.Index | WebGPUConstants.BufferUsage.CopyDst);
        dataBuffer.is32Bits = is32Bits;
        return dataBuffer;
    }

    public updateDynamicIndexBuffer(indexBuffer: DataBuffer, indices: IndicesArray, offset: number = 0): void {
        const gpuBuffer = indexBuffer as WebGPUDataBuffer;

        var view: ArrayBufferView;
        if (indices instanceof Uint16Array) {
            if (indexBuffer.is32Bits) {
                view = Uint32Array.from(indices);
            }
            else {
                view = indices;
            }
        }
        else if (indices instanceof Uint32Array) {
            if (indexBuffer.is32Bits) {
                view = indices;
            }
            else {
                view = Uint16Array.from(indices);
            }
        }
        else {
            if (indexBuffer.is32Bits) {
                view = new Uint32Array(indices);
            }
            else {
                view = new Uint16Array(indices);
            }
        }

        this._bufferManager.setSubData(gpuBuffer, offset, view);
    }

    public bindBuffersDirectly(vertexBuffer: DataBuffer, indexBuffer: DataBuffer, vertexDeclaration: number[], vertexStrideSize: number, effect: Effect): void {
        throw "Not implemented on WebGPU so far.";
    }

    public updateAndBindInstancesBuffer(instancesBuffer: DataBuffer, data: Float32Array, offsetLocations: number[] | InstancingAttributeInfo[]): void {
        throw "Not implemented on WebGPU so far.";
    }

    public bindBuffers(vertexBuffers: { [key: string]: Nullable<VertexBuffer> }, indexBuffer: Nullable<DataBuffer>, effect: Effect): void {
        this._currentIndexBuffer = indexBuffer;
        this._currentVertexBuffers = vertexBuffers;
    }

    /** @hidden */
    public _releaseBuffer(buffer: DataBuffer): boolean {
        return this._bufferManager.releaseBuffer(buffer);
    }

    //------------------------------------------------------------------------------
    //                              UBO
    //------------------------------------------------------------------------------

    public createUniformBuffer(elements: FloatArray): DataBuffer {
        let view: Float32Array;
        if (elements instanceof Array) {
            view = new Float32Array(elements);
        }
        else {
            view = elements;
        }

        const dataBuffer = this._bufferManager.createBuffer(view, WebGPUConstants.BufferUsage.Uniform | WebGPUConstants.BufferUsage.CopyDst);
        return dataBuffer;
    }

    public createDynamicUniformBuffer(elements: FloatArray): DataBuffer {
        return this.createUniformBuffer(elements);
    }

    public updateUniformBuffer(uniformBuffer: DataBuffer, elements: FloatArray, offset?: number, count?: number): void {
        if (offset === undefined) {
            offset = 0;
        }

        const dataBuffer = uniformBuffer as WebGPUDataBuffer;
        let view: Float32Array;
        if (count === undefined) {
            if (elements instanceof Float32Array) {
                view = elements;
            } else {
                view = new Float32Array(elements);
            }
            count = view.byteLength;
        } else {
            if (elements instanceof Float32Array) {
                view = elements;
            } else {
                view = new Float32Array(elements);
            }
        }

        this._bufferManager.setSubData(dataBuffer, offset, view, 0, count);
    }

    public bindUniformBufferBase(buffer: DataBuffer, location: number, name: string): void {
        this._uniformsBuffers[name] = buffer as WebGPUDataBuffer;
    }

    //------------------------------------------------------------------------------
    //                              Effects
    //------------------------------------------------------------------------------

    public createEffect(baseName: any, attributesNamesOrOptions: string[] | IEffectCreationOptions, uniformsNamesOrEngine: string[] | Engine, samplers?: string[], defines?: string, fallbacks?: EffectFallbacks,
        onCompiled?: Nullable<(effect: Effect) => void>, onError?: Nullable<(effect: Effect, errors: string) => void>, indexParameters?: any): Effect {
        const vertex = baseName.vertexElement || baseName.vertex || baseName.vertexToken || baseName.vertexSource || baseName;
        const fragment = baseName.fragmentElement || baseName.fragment || baseName.fragmentToken || baseName.fragmentSource || baseName;

        const name = vertex + "+" + fragment + "@" + (defines ? defines : (<IEffectCreationOptions>attributesNamesOrOptions).defines);
        /*const shader = this._compiledShaders[name];
        if (shader) {
            return new Effect(baseName, attributesNamesOrOptions, uniformsNamesOrEngine, samplers, this, defines, fallbacks, onCompiled, onError, indexParameters, name, shader.sources);
        }
        else {
            return new Effect(baseName, attributesNamesOrOptions, uniformsNamesOrEngine, samplers, this, defines, fallbacks, onCompiled, onError, indexParameters, name);
        }*/
        if (this._compiledEffects[name]) {
            var compiledEffect = <Effect>this._compiledEffects[name];
            if (onCompiled && compiledEffect.isReady()) {
                onCompiled(compiledEffect);
            }

            return compiledEffect;
        }
        var effect = new Effect(baseName, attributesNamesOrOptions, uniformsNamesOrEngine, samplers, this, defines, fallbacks, onCompiled, onError, indexParameters, name);
        this._compiledEffects[name] = effect;

        return effect;
    }

    private _compileRawShaderToSpirV(source: string, type: string): Uint32Array {
        return this._glslang.compileGLSL(source, type);
    }

    private _compileShaderToSpirV(source: string, type: string, defines: Nullable<string>, shaderVersion: string): Uint32Array {
        return this._compileRawShaderToSpirV(shaderVersion + (defines ? defines + "\n" : "") + source, type);
    }

    private _createPipelineStageDescriptor(vertexShader: Uint32Array, fragmentShader: Uint32Array): IWebGPURenderPipelineStageDescriptor {
        return {
            vertexStage: {
                module: this._device.createShaderModule({
                    code: vertexShader,
                }),
                entryPoint: "main",
            },
            fragmentStage: {
                module: this._device.createShaderModule({
                    code: fragmentShader,
                }),
                entryPoint: "main"
            }
        };
    }

    private _compileRawPipelineStageDescriptor(vertexCode: string, fragmentCode: string): IWebGPURenderPipelineStageDescriptor {
        var vertexShader = this._compileRawShaderToSpirV(vertexCode, "vertex");
        var fragmentShader = this._compileRawShaderToSpirV(fragmentCode, "fragment");

        return this._createPipelineStageDescriptor(vertexShader, fragmentShader);
    }

    private _compilePipelineStageDescriptor(vertexCode: string, fragmentCode: string, defines: Nullable<string>): IWebGPURenderPipelineStageDescriptor {
        this.onBeforeShaderCompilationObservable.notifyObservers(this);

        var shaderVersion = "#version 450\n";
        var vertexShader = this._compileShaderToSpirV(vertexCode, "vertex", defines, shaderVersion);
        var fragmentShader = this._compileShaderToSpirV(fragmentCode, "fragment", defines, shaderVersion);

        let program = this._createPipelineStageDescriptor(vertexShader, fragmentShader);

        this.onAfterShaderCompilationObservable.notifyObservers(this);

        return program;
    }

    public createRawShaderProgram(pipelineContext: IPipelineContext, vertexCode: string, fragmentCode: string, context?: WebGLRenderingContext, transformFeedbackVaryings: Nullable<string[]> = null): WebGLProgram {
        throw "Not available on WebGPU";
    }

    public createShaderProgram(pipelineContext: IPipelineContext, vertexCode: string, fragmentCode: string, defines: Nullable<string>, context?: WebGLRenderingContext, transformFeedbackVaryings: Nullable<string[]> = null): WebGLProgram {
        throw "Not available on WebGPU";
    }

    public createPipelineContext(shaderProcessingContext: Nullable<ShaderProcessingContext>): IPipelineContext {
        var pipelineContext = new WebGPUPipelineContext(shaderProcessingContext! as WebGPUShaderProcessingContext, this);
        pipelineContext.engine = this;
        return pipelineContext;
    }

    /** @hidden */
    public _preparePipelineContext(pipelineContext: IPipelineContext, vertexSourceCode: string, fragmentSourceCode: string, createAsRaw: boolean, rawVertexSourceCode: string, rawFragmentSourceCode: string,
        rebuildRebind: any,
        defines: Nullable<string>,
        transformFeedbackVaryings: Nullable<string[]>,
        key: string) {
        const webGpuContext = pipelineContext as WebGPUPipelineContext;

        // TODO WEBGPU. Check if caches could be reuse from piepline ???
        const shader = this._compiledShaders[key];
        if (shader) {
            webGpuContext.stages = shader.stages;
            webGpuContext.availableAttributes = shader.availableAttributes;
            webGpuContext.availableUBOs = shader.availableUBOs;
            webGpuContext.availableSamplers = shader.availableSamplers;
            webGpuContext.orderedAttributes = shader.orderedAttributes;
            webGpuContext.orderedUBOsAndSamplers = shader.orderedUBOsAndSamplers;
            webGpuContext.leftOverUniforms = shader.leftOverUniforms;
            webGpuContext.leftOverUniformsByName = shader.leftOverUniformsByName;
            webGpuContext.sources = shader.sources;
        }
        else {
            if (dbgShowShaderCode) {
                console.log(defines);
                console.log(vertexSourceCode);
                console.log(fragmentSourceCode);
            }

            webGpuContext.sources = {
                fragment: fragmentSourceCode,
                vertex: vertexSourceCode,
                rawVertex: rawVertexSourceCode,
                rawFragment: rawFragmentSourceCode,
            };

            if (createAsRaw) {
                webGpuContext.stages = this._compileRawPipelineStageDescriptor(vertexSourceCode, fragmentSourceCode);
            }
            else {
                webGpuContext.stages = this._compilePipelineStageDescriptor(vertexSourceCode, fragmentSourceCode, defines);
            }

            this._compiledShaders[key] = {
                stages: webGpuContext.stages,
                availableAttributes: webGpuContext.availableAttributes,
                availableUBOs: webGpuContext.availableUBOs,
                availableSamplers: webGpuContext.availableSamplers,
                orderedAttributes: webGpuContext.orderedAttributes,
                orderedUBOsAndSamplers: webGpuContext.orderedUBOsAndSamplers,
                leftOverUniforms: webGpuContext.leftOverUniforms,
                leftOverUniformsByName: webGpuContext.leftOverUniformsByName,
                sources: webGpuContext.sources
            };
        }
    }

    public getAttributes(pipelineContext: IPipelineContext, attributesNames: string[]): number[] {
        const results = new Array(attributesNames.length);
        const gpuPipelineContext = (pipelineContext as WebGPUPipelineContext);

        // TODO WEBGPU. Hard coded for WebGPU until an introspection lib is available.
        // Should be done at processing time, not need to double the work in here.
        for (let i = 0; i < attributesNames.length; i++) {
            const attributeName = attributesNames[i];
            const attributeLocation = gpuPipelineContext.availableAttributes[attributeName];
            if (attributeLocation === undefined) {
                continue;
            }

            results[i] = attributeLocation;
        }

        return results;
    }

    public enableEffect(effect: Nullable<Effect>): void {
        if (!effect || effect === this._currentEffect) {
            return;
        }

        this._currentEffect = effect;

        if (effect.onBind) {
            effect.onBind(effect);
        }
        if (effect._onBindObservable) {
            effect._onBindObservable.notifyObservers(effect);
        }
    }

    public _releaseEffect(effect: Effect): void {
        // Effect gets garbage collected without explicit destroy in WebGPU.
    }

    /**
     * Force the engine to release all cached effects. This means that next effect compilation will have to be done completely even if a similar effect was already compiled
     */
    public releaseEffects() {
        // Effect gets garbage collected without explicit destroy in WebGPU.
    }

    public _deletePipelineContext(pipelineContext: IPipelineContext): void {
        const webgpuPipelineContext = pipelineContext as WebGPUPipelineContext;
        if (webgpuPipelineContext) {
            pipelineContext.dispose();
        }
    }

    //------------------------------------------------------------------------------
    //                              Textures
    //------------------------------------------------------------------------------

    public get needPOTTextures(): boolean {
        return false;
    }

    private _getMainDepthTextureFormat(): GPUTextureFormat {
        return this.isStencilEnable ? WebGPUConstants.TextureFormat.Depth24PlusStencil8 : WebGPUConstants.TextureFormat.Depth32Float;
    }

    /** @hidden */
    public _createHardwareTexture(): HardwareTextureWrapper {
        return new WebGPUHardwareTexture();
    }

    /** @hidden */
    public _releaseTexture(texture: InternalTexture): void {
        const hardwareTexture = texture._hardwareTexture;
        const irradianceTexture = texture._irradianceTexture;
        const depthStencilTexture = texture._depthStencilTexture;

        const index = this._internalTexturesCache.indexOf(texture);
        if (index !== -1) {
            this._internalTexturesCache.splice(index, 1);
        }

        // We can't destroy the objects just now because they could be used in the current frame - we delay the destroying after the end of the frame
        this._deferredReleaseTextures.push([texture, hardwareTexture, irradianceTexture, depthStencilTexture]);
    }

    private _getSamplerFilterDescriptor(internalTexture: InternalTexture): {
        magFilter: GPUFilterMode,
        minFilter: GPUFilterMode,
        mipmapFilter: GPUFilterMode
    } {
        let magFilter: GPUFilterMode, minFilter: GPUFilterMode, mipmapFilter: GPUFilterMode;
        switch (internalTexture.samplingMode) {
            case Engine.TEXTURE_BILINEAR_SAMPLINGMODE:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Linear;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                break;
            case Engine.TEXTURE_TRILINEAR_SAMPLINGMODE:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Linear;
                mipmapFilter = WebGPUConstants.FilterMode.Linear;
                break;
            case Engine.TEXTURE_NEAREST_SAMPLINGMODE:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                mipmapFilter = WebGPUConstants.FilterMode.Linear;
                break;
            case Engine.TEXTURE_NEAREST_NEAREST_MIPNEAREST:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                break;
            case Engine.TEXTURE_NEAREST_LINEAR_MIPNEAREST:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Linear;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                break;
            case Engine.TEXTURE_NEAREST_LINEAR_MIPLINEAR:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Linear;
                mipmapFilter = WebGPUConstants.FilterMode.Linear;
                break;
            case Engine.TEXTURE_NEAREST_LINEAR:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Linear;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                break;
            case Engine.TEXTURE_NEAREST_NEAREST:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                break;
            case Engine.TEXTURE_LINEAR_NEAREST_MIPNEAREST:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                break;
            case Engine.TEXTURE_LINEAR_NEAREST_MIPLINEAR:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                mipmapFilter = WebGPUConstants.FilterMode.Linear;
                break;
            case Engine.TEXTURE_LINEAR_LINEAR:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Linear;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                break;
            case Engine.TEXTURE_LINEAR_NEAREST:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                break;
            default:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Linear;
                mipmapFilter = WebGPUConstants.FilterMode.Linear;
                break;
        }

        return {
            magFilter,
            minFilter,
            mipmapFilter
        };
    }

    /** @hidden */
    public _getWebGPUInternalFormat(format: number): GPUTextureFormat {
        let internalFormat = WebGPUConstants.TextureFormat.RGBA8Unorm;

        switch (format) {
            case Constants.TEXTUREFORMAT_ALPHA:
                throw "TEXTUREFORMAT_ALPHA format not supported in WebGPU";
            case Constants.TEXTUREFORMAT_LUMINANCE:
                throw "TEXTUREFORMAT_LUMINANCE format not supported in WebGPU";
            case Constants.TEXTUREFORMAT_LUMINANCE_ALPHA:
                throw "TEXTUREFORMAT_LUMINANCE_ALPHA format not supported in WebGPU";
            case Constants.TEXTUREFORMAT_RED:
                internalFormat = WebGPUConstants.TextureFormat.R8Snorm;
            case Constants.TEXTUREFORMAT_RG:
                internalFormat = WebGPUConstants.TextureFormat.RG8Snorm;
            case Constants.TEXTUREFORMAT_RGB:
                throw "RGB format not supported in WebGPU";
            case Constants.TEXTUREFORMAT_RGBA:
                internalFormat = WebGPUConstants.TextureFormat.RGBA8Unorm;
        }

        return internalFormat;
    }

    /** @hidden */
    public _getRGBABufferInternalSizedFormat(type: number, format?: number): number {
        return Constants.TEXTUREFORMAT_RGBA;
    }

    private _getWebGPUTextureFormat(type: number, format: number): GPUTextureFormat {
        switch (format) {
            case Constants.TEXTUREFORMAT_DEPTH24_STENCIL8:
                return WebGPUConstants.TextureFormat.Depth24PlusStencil8;
            case Constants.TEXTUREFORMAT_DEPTH32_FLOAT:
                return WebGPUConstants.TextureFormat.Depth32Float;

            case Constants.TEXTUREFORMAT_COMPRESSED_RGBA_BPTC_UNORM:
                return WebGPUConstants.TextureFormat.BC7RGBAUnorm;
            case Constants.TEXTUREFORMAT_COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT:
                return WebGPUConstants.TextureFormat.BC6HRGBUFloat;
            case Constants.TEXTUREFORMAT_COMPRESSED_RGB_BPTC_SIGNED_FLOAT:
                return WebGPUConstants.TextureFormat.BC6HRGBSFloat;
            case Constants.TEXTUREFORMAT_COMPRESSED_RGBA_S3TC_DXT5:
                return WebGPUConstants.TextureFormat.BC3RGBAUnorm;
            case Constants.TEXTUREFORMAT_COMPRESSED_RGBA_S3TC_DXT3:
                return WebGPUConstants.TextureFormat.BC2RGBAUnorm;
            case Constants.TEXTUREFORMAT_COMPRESSED_RGBA_S3TC_DXT1:
                return WebGPUConstants.TextureFormat.BC1RGBAUNorm;
        }

        switch (type) {
            case Constants.TEXTURETYPE_BYTE:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED:
                        return WebGPUConstants.TextureFormat.R8Snorm;
                    case Constants.TEXTUREFORMAT_RG:
                        return WebGPUConstants.TextureFormat.RG8Snorm;
                    case Constants.TEXTUREFORMAT_RGB:
                        throw "RGB format not supported in WebGPU";
                    case Constants.TEXTUREFORMAT_RED_INTEGER:
                        return WebGPUConstants.TextureFormat.R8Sint;
                    case Constants.TEXTUREFORMAT_RG_INTEGER:
                        return WebGPUConstants.TextureFormat.RG8Sint;
                    case Constants.TEXTUREFORMAT_RGB_INTEGER:
                        throw "RGB_INTEGER format not supported in WebGPU";
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return WebGPUConstants.TextureFormat.RGBA8Sint;
                    default:
                        return WebGPUConstants.TextureFormat.RGBA8Snorm;
                }
            case Constants.TEXTURETYPE_UNSIGNED_BYTE:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED:
                        return WebGPUConstants.TextureFormat.R8Unorm;
                    case Constants.TEXTUREFORMAT_RG:
                        return WebGPUConstants.TextureFormat.RG8Unorm;
                    case Constants.TEXTUREFORMAT_RGB:
                        throw "TEXTUREFORMAT_RGB format not supported in WebGPU";
                    case Constants.TEXTUREFORMAT_RGBA:
                        return WebGPUConstants.TextureFormat.RGBA8Unorm;
                    case Constants.TEXTUREFORMAT_BGRA:
                        return WebGPUConstants.TextureFormat.BGRA8Unorm;
                    case Constants.TEXTUREFORMAT_RED_INTEGER:
                        return WebGPUConstants.TextureFormat.R8Uint;
                    case Constants.TEXTUREFORMAT_RG_INTEGER:
                        return WebGPUConstants.TextureFormat.RG8Uint;
                    case Constants.TEXTUREFORMAT_RGB_INTEGER:
                        throw "RGB_INTEGER format not supported in WebGPU";
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return WebGPUConstants.TextureFormat.RGBA8Uint;
                    case Constants.TEXTUREFORMAT_ALPHA:
                        throw "TEXTUREFORMAT_ALPHA format not supported in WebGPU";
                    case Constants.TEXTUREFORMAT_LUMINANCE:
                        throw "TEXTUREFORMAT_LUMINANCE format not supported in WebGPU";
                    case Constants.TEXTUREFORMAT_LUMINANCE_ALPHA:
                        throw "TEXTUREFORMAT_LUMINANCE_ALPHA format not supported in WebGPU";
                    default:
                        return WebGPUConstants.TextureFormat.RGBA8Unorm;
                }
            case Constants.TEXTURETYPE_SHORT:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED_INTEGER:
                        return WebGPUConstants.TextureFormat.R16Sint;
                    case Constants.TEXTUREFORMAT_RG_INTEGER:
                        return WebGPUConstants.TextureFormat.RG16Sint;
                    case Constants.TEXTUREFORMAT_RGB_INTEGER:
                        throw "TEXTUREFORMAT_RGB_INTEGER format not supported in WebGPU";
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return WebGPUConstants.TextureFormat.RGBA16Sint;
                    default:
                        return WebGPUConstants.TextureFormat.RGBA16Sint;
                }
            case Constants.TEXTURETYPE_UNSIGNED_SHORT:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED_INTEGER:
                        return WebGPUConstants.TextureFormat.R16Uint;
                    case Constants.TEXTUREFORMAT_RG_INTEGER:
                        return WebGPUConstants.TextureFormat.RG16Uint;
                    case Constants.TEXTUREFORMAT_RGB_INTEGER:
                        throw "TEXTUREFORMAT_RGB_INTEGER format not supported in WebGPU";
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return WebGPUConstants.TextureFormat.RGBA16Uint;
                    default:
                        return WebGPUConstants.TextureFormat.RGBA16Uint;
                }
            case Constants.TEXTURETYPE_INT:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED_INTEGER:
                        return WebGPUConstants.TextureFormat.R32Sint;
                    case Constants.TEXTUREFORMAT_RG_INTEGER:
                        return WebGPUConstants.TextureFormat.RG32Sint;
                    case Constants.TEXTUREFORMAT_RGB_INTEGER:
                        throw "TEXTUREFORMAT_RGB_INTEGER format not supported in WebGPU";
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return WebGPUConstants.TextureFormat.RGBA32Sint;
                    default:
                        return WebGPUConstants.TextureFormat.RGBA32Sint;
                }
            case Constants.TEXTURETYPE_UNSIGNED_INTEGER: // Refers to UNSIGNED_INT
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED_INTEGER:
                        return WebGPUConstants.TextureFormat.R32Uint;
                    case Constants.TEXTUREFORMAT_RG_INTEGER:
                        return WebGPUConstants.TextureFormat.RG32Uint;
                    case Constants.TEXTUREFORMAT_RGB_INTEGER:
                        throw "TEXTUREFORMAT_RGB_INTEGER format not supported in WebGPU";
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return WebGPUConstants.TextureFormat.RGBA32Uint;
                    default:
                        return WebGPUConstants.TextureFormat.RGBA32Uint;
                }
            case Constants.TEXTURETYPE_FLOAT:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED:
                        return WebGPUConstants.TextureFormat.R32Float; // By default. Other possibility is R16Float.
                    case Constants.TEXTUREFORMAT_RG:
                        return WebGPUConstants.TextureFormat.RG32Float; // By default. Other possibility is RG16Float.
                    case Constants.TEXTUREFORMAT_RGB:
                        throw "TEXTUREFORMAT_RGB format not supported in WebGPU";
                    case Constants.TEXTUREFORMAT_RGBA:
                        return WebGPUConstants.TextureFormat.RGBA32Float; // By default. Other possibility is RGBA16Float.
                    default:
                        return WebGPUConstants.TextureFormat.RGBA32Float;
                }
            case Constants.TEXTURETYPE_HALF_FLOAT:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED:
                        return WebGPUConstants.TextureFormat.R16Float;
                    case Constants.TEXTUREFORMAT_RG:
                        return WebGPUConstants.TextureFormat.RG16Float;
                    case Constants.TEXTUREFORMAT_RGB:
                        throw "TEXTUREFORMAT_RGB format not supported in WebGPU";
                    case Constants.TEXTUREFORMAT_RGBA:
                        return WebGPUConstants.TextureFormat.RGBA16Float;
                    default:
                        return WebGPUConstants.TextureFormat.RGBA16Float;
                }
            case Constants.TEXTURETYPE_UNSIGNED_SHORT_5_6_5:
                throw "TEXTURETYPE_UNSIGNED_SHORT_5_6_5 format not supported in WebGPU";
            case Constants.TEXTURETYPE_UNSIGNED_INT_10F_11F_11F_REV:
                throw "TEXTURETYPE_UNSIGNED_INT_10F_11F_11F_REV format not supported in WebGPU";
            case Constants.TEXTURETYPE_UNSIGNED_INT_5_9_9_9_REV:
                throw "TEXTURETYPE_UNSIGNED_INT_5_9_9_9_REV format not supported in WebGPU";
            case Constants.TEXTURETYPE_UNSIGNED_SHORT_4_4_4_4:
                throw "TEXTURETYPE_UNSIGNED_SHORT_4_4_4_4 format not supported in WebGPU";
            case Constants.TEXTURETYPE_UNSIGNED_SHORT_5_5_5_1:
                throw "TEXTURETYPE_UNSIGNED_SHORT_5_5_5_1 format not supported in WebGPU";
            case Constants.TEXTURETYPE_UNSIGNED_INT_2_10_10_10_REV:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RGBA:
                        return WebGPUConstants.TextureFormat.RGB10A2Unorm;
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        throw "TEXTUREFORMAT_RGBA_INTEGER format not supported in WebGPU when type is TEXTURETYPE_UNSIGNED_INT_2_10_10_10_REV";
                    default:
                        return WebGPUConstants.TextureFormat.RGB10A2Unorm;
                }
        }

        return WebGPUConstants.TextureFormat.RGBA8Unorm;
    }

    private _getWrappingMode(mode: number): GPUAddressMode {
        switch (mode) {
            case Engine.TEXTURE_WRAP_ADDRESSMODE:
                return WebGPUConstants.AddressMode.Repeat;
            case Engine.TEXTURE_CLAMP_ADDRESSMODE:
                return WebGPUConstants.AddressMode.ClampToEdge;
            case Engine.TEXTURE_MIRROR_ADDRESSMODE:
                return WebGPUConstants.AddressMode.MirrorRepeat;
        }
        return WebGPUConstants.AddressMode.Repeat;
    }

    private _getSamplerWrappingDescriptor(internalTexture: InternalTexture): {
        addressModeU: GPUAddressMode,
        addressModeV: GPUAddressMode,
        addressModeW: GPUAddressMode
    } {
        return {
            addressModeU: this._getWrappingMode(internalTexture._cachedWrapU!),
            addressModeV: this._getWrappingMode(internalTexture._cachedWrapV!),
            addressModeW: this._getWrappingMode(internalTexture._cachedWrapR!),
        };
    }

    private _getSamplerDescriptor(internalTexture: InternalTexture): GPUSamplerDescriptor {
        return {
            ...this._getSamplerFilterDescriptor(internalTexture),
            ...this._getSamplerWrappingDescriptor(internalTexture),
            compare: internalTexture._comparisonFunction ? this._getCompareFunction(internalTexture._comparisonFunction) : undefined,
        };
    }

    public createTexture(url: Nullable<string>, noMipmap: boolean, invertY: boolean, scene: Nullable<ISceneLike>, samplingMode: number = Constants.TEXTURE_TRILINEAR_SAMPLINGMODE,
        onLoad: Nullable<() => void> = null, onError: Nullable<(message: string, exception: any) => void> = null,
        buffer: Nullable<string | ArrayBuffer | ArrayBufferView | HTMLImageElement | Blob | ImageBitmap> = null, fallback: Nullable<InternalTexture> = null, format: Nullable<number> = null,
        forcedExtension: Nullable<string> = null, mimeType?: string): InternalTexture {

        // TODO WEBGPU. this._options.textureSize
        return this._createTextureBase(
            url, noMipmap, invertY, scene, samplingMode, onLoad, onError,
            (texture: InternalTexture, extension: string, scene: Nullable<ISceneLike>, img: HTMLImageElement | ImageBitmap | { width: number, height: number }, invertY: boolean, noMipmap: boolean, isCompressed: boolean,
                processFunction: (width: number, height: number, img: HTMLImageElement | ImageBitmap | { width: number, height: number }, extension: string, texture: InternalTexture, continuationCallback: () => void) => boolean, samplingMode: number) => {
                    const imageBitmap = img as (ImageBitmap | { width: number, height: number}); // we will never get an HTMLImageElement in WebGPU

                    texture.baseWidth = imageBitmap.width;
                    texture.baseHeight = imageBitmap.height;
                    texture.width = imageBitmap.width;
                    texture.height = imageBitmap.height;
                    texture.format = format ?? -1;

                    processFunction(texture.width, texture.height, imageBitmap, extension, texture, () => {});

                    if (!texture._hardwareTexture?.underlyingResource) { // the texture could have been created before reaching this point so don't recreate it if already existing
                        const gpuTextureWrapper = this._createGPUTextureForInternalTexture(texture, imageBitmap.width, imageBitmap.height);

                        if (this._textureHelper.isImageBitmap(imageBitmap)) {
                            this._textureHelper.updateTexture(imageBitmap, gpuTextureWrapper.underlyingResource!, imageBitmap.width, imageBitmap.height, gpuTextureWrapper.format, 0, 0, invertY, false, 0, 0, this._uploadEncoder);
                            if (!noMipmap && !isCompressed) {
                                this._generateMipmaps(texture);
                            }
                        }
                    } else if (!noMipmap && !isCompressed) {
                        this._generateMipmaps(texture);
                    }

                    if (scene) {
                        scene._removePendingData(texture);
                    }

                    texture.isReady = true;

                    texture.onLoadedObservable.notifyObservers(texture);
                    texture.onLoadedObservable.clear();
            },
            () => false,
            buffer, fallback, format, forcedExtension, mimeType
        );
    }

    /** @hidden */
    public _setCubeMapTextureParams(texture: InternalTexture, loadMipmap: boolean) {
        texture.samplingMode = loadMipmap ? Engine.TEXTURE_TRILINEAR_SAMPLINGMODE : Engine.TEXTURE_BILINEAR_SAMPLINGMODE;
        texture._cachedWrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        texture._cachedWrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
    }

    public createCubeTexture(rootUrl: string, scene: Nullable<Scene>, files: Nullable<string[]>, noMipmap?: boolean, onLoad: Nullable<(data?: any) => void> = null,
        onError: Nullable<(message?: string, exception?: any) => void> = null, format?: number, forcedExtension: any = null, createPolynomials: boolean = false, lodScale: number = 0, lodOffset: number = 0, fallback: Nullable<InternalTexture> = null): InternalTexture {

        return this.createCubeTextureBase(
            rootUrl, scene, files, !!noMipmap, onLoad, onError, format, forcedExtension, createPolynomials, lodScale, lodOffset, fallback,
            null,
            (texture: InternalTexture, imgs: HTMLImageElement[] | ImageBitmap[]) => {
                const imageBitmaps = imgs as ImageBitmap[]; // we will always get an ImageBitmap array in WebGPU
                const width = imageBitmaps[0].width;
                const height = width;

                this._setCubeMapTextureParams(texture, !noMipmap);
                texture.format = format ?? -1;

                const gpuTextureWrapper = this._createGPUTextureForInternalTexture(texture, width, height);

                this._textureHelper.updateCubeTextures(imageBitmaps, gpuTextureWrapper.underlyingResource!, width, height, gpuTextureWrapper.format, false, false, 0, 0, this._uploadEncoder);

                if (!noMipmap) {
                    this._generateMipmaps(texture);
                }

                texture.isReady = true;

                texture.onLoadedObservable.notifyObservers(texture);
                texture.onLoadedObservable.clear();

                if (onLoad) {
                    onLoad();
                }
            }
        );
    }

    public createRawTexture(data: Nullable<ArrayBufferView>, width: number, height: number, format: number, generateMipMaps: boolean, invertY: boolean, samplingMode: number,
        compression: Nullable<string> = null, type: number = Constants.TEXTURETYPE_UNSIGNED_INT): InternalTexture
    {
        const texture = new InternalTexture(this, InternalTextureSource.Raw);
        texture.baseWidth = width;
        texture.baseHeight = height;
        texture.width = width;
        texture.height = height;
        texture.format = format;
        texture.generateMipMaps = generateMipMaps;
        texture.samplingMode = samplingMode;
        texture.invertY = invertY;
        texture._compression = compression;
        texture.type = type;

        if (!this._doNotHandleContextLost) {
            texture._bufferView = data;
        }

        this._createGPUTextureForInternalTexture(texture, width, height);

        this.updateRawTexture(texture, data, format, invertY, compression, type);

        this._internalTexturesCache.push(texture);

        return texture;
    }

    public createRawCubeTexture(data: Nullable<ArrayBufferView[]>, size: number, format: number, type: number,
        generateMipMaps: boolean, invertY: boolean, samplingMode: number,
        compression: Nullable<string> = null): InternalTexture
    {
        const texture = new InternalTexture(this, InternalTextureSource.CubeRaw);
        texture.isCube = true;
        texture.format = format === Constants.TEXTUREFORMAT_RGB ? Constants.TEXTUREFORMAT_RGBA : format;
        texture.type = type;
        texture.generateMipMaps = generateMipMaps;
        texture.width = size;
        texture.height = size;
        if (!this._doNotHandleContextLost) {
            texture._bufferViewArray = data;
        }

        this._createGPUTextureForInternalTexture(texture);

        if (data) {
            this.updateRawCubeTexture(texture, data, format, type, invertY, compression);
        }

        return texture;
    }

    public createRawCubeTextureFromUrl(url: string, scene: Nullable<Scene>, size: number, format: number, type: number, noMipmap: boolean,
        callback: (ArrayBuffer: ArrayBuffer) => Nullable<ArrayBufferView[]>,
        mipmapGenerator: Nullable<((faces: ArrayBufferView[]) => ArrayBufferView[][])>,
        onLoad: Nullable<() => void> = null,
        onError: Nullable<(message?: string, exception?: any) => void> = null,
        samplingMode: number = Constants.TEXTURE_TRILINEAR_SAMPLINGMODE,
        invertY: boolean = false): InternalTexture
    {
        const texture = this.createRawCubeTexture(null, size, format, type, !noMipmap, invertY, samplingMode, null);
        scene?._addPendingData(texture);
        texture.url = url;

        this._internalTexturesCache.push(texture);

        const onerror = (request?: IWebRequest, exception?: any) => {
            scene?._removePendingData(texture);
            if (onError && request) {
                onError(request.status + " " + request.statusText, exception);
            }
        };

        const internalCallback = (data: any) => {
            const width = texture.width;
            const faceDataArrays = callback(data);

            if (!faceDataArrays) {
                return;
            }

            const faces = [0, 2, 4, 1, 3, 5];

            if (mipmapGenerator) {
                const needConversion = format === Constants.TEXTUREFORMAT_RGB;
                const mipData = mipmapGenerator(faceDataArrays);
                const gpuTextureWrapper = texture._hardwareTexture as WebGPUHardwareTexture;
                const faces = [0, 1, 2, 3, 4, 5];
                for (let level = 0; level < mipData.length; level++) {
                    const mipSize = width >> level;
                    const allFaces = [];
                    for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
                        let mipFaceData = mipData[level][faces[faceIndex]];
                        if (needConversion) {
                            mipFaceData = _convertRGBtoRGBATextureData(mipFaceData, mipSize, mipSize, type);
                        }
                        allFaces.push(new Uint8Array(mipFaceData.buffer, mipFaceData.byteOffset, mipFaceData.byteLength));
                    }
                    this._textureHelper.updateCubeTextures(allFaces, gpuTextureWrapper.underlyingResource!, mipSize, mipSize, gpuTextureWrapper.format, invertY, false, 0, 0, this._uploadEncoder);
                }
            }
            else {
                const allFaces = [];
                for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
                    allFaces.push(faceDataArrays[faces[faceIndex]]);
                }
                this.updateRawCubeTexture(texture, allFaces, format, type, invertY);
            }

            texture.isReady = true;
            scene?._removePendingData(texture);

            if (onLoad) {
                onLoad();
            }
        };

        this._loadFile(url, (data) => {
            internalCallback(data);
        }, undefined, scene?.offlineProvider, true, onerror);

        return texture;
    }

    public createRawTexture2DArray(data: Nullable<ArrayBufferView>, width: number, height: number, depth: number, format: number, generateMipMaps: boolean, invertY: boolean, samplingMode: number,
        compression: Nullable<string> = null, textureType: number = Constants.TEXTURETYPE_UNSIGNED_INT): InternalTexture
    {
        var source = InternalTextureSource.Raw2DArray;
        var texture = new InternalTexture(this, source);

        if (dbgShowWarningsNotImplemented) {
            console.warn("createRawTexture2DArray not implemented yet in WebGPU");
        }

        return texture;
    }

    public createRawTexture3D(data: Nullable<ArrayBufferView>, width: number, height: number, depth: number, format: number, generateMipMaps: boolean, invertY: boolean, samplingMode: number,
        compression: Nullable<string> = null, textureType: number = Constants.TEXTURETYPE_UNSIGNED_INT): InternalTexture
    {
        var source = InternalTextureSource.Raw2DArray;
        var texture = new InternalTexture(this, source);

        if (dbgShowWarningsNotImplemented) {
            console.warn("createRawTexture3D not implemented yet in WebGPU");
        }

        return texture;
    }

    public generateMipMapsForCubemap(texture: InternalTexture, unbind = true) {
        if (texture.generateMipMaps) {
            let gpuTexture = texture._hardwareTexture?.underlyingResource;

            if (!gpuTexture) {
                this._createGPUTextureForInternalTexture(texture);
            }

            this._generateMipmaps(texture);
        }
    }

    public updateTextureSamplingMode(samplingMode: number, texture: InternalTexture, generateMipMaps: boolean = false): void {
        if (generateMipMaps) {
            texture.generateMipMaps = true;
            this._generateMipmaps(texture);
        }

        texture.samplingMode = samplingMode;
    }

    public updateTextureWrappingMode(texture: InternalTexture, wrapU: Nullable<number>, wrapV: Nullable<number> = null, wrapR: Nullable<number> = null): void {
        if (wrapU !== null) {
            texture._cachedWrapU = wrapU;
        }
        if (wrapV !== null) {
            texture._cachedWrapV = wrapV;
        }
        if ((texture.is2DArray || texture.is3D) && (wrapR !== null)) {
            texture._cachedWrapR = wrapR;
        }
    }

    private _setInternalTexture(name: string, internalTexture: Nullable<InternalTexture>): void {
        if (this._currentEffect) {
            const webgpuPipelineContext = this._currentEffect._pipelineContext as WebGPUPipelineContext;

            if (webgpuPipelineContext.samplers[name]) {
                if (webgpuPipelineContext.samplers[name]!.texture !== internalTexture) {
                    webgpuPipelineContext.bindGroups = null as any; // the bind groups need to be rebuilt (at least the bind group owning this texture, but it's easier to just have them all rebuilt)
                }
                webgpuPipelineContext.samplers[name]!.texture = internalTexture!;
            }
            else {
                // TODO WEBGPU. 121 mapping samplers <-> availableSamplers
                const availableSampler = webgpuPipelineContext.availableSamplers[name];
                if (availableSampler) {
                    webgpuPipelineContext.samplers[name] = {
                        setIndex: availableSampler.setIndex,
                        textureBinding: availableSampler.bindingIndex,
                        samplerBinding: availableSampler.bindingIndex + 1,
                        texture: internalTexture!
                    };
                }
            }
        }
    }

    public setTexture(channel: number, _: Nullable<WebGLUniformLocation>, texture: Nullable<BaseTexture>, name: string): void {
        this._setTexture(channel, texture, false, false, name);
    }

    protected _setTexture(channel: number, texture: Nullable<BaseTexture>, isPartOfTextureArray = false, depthStencilTexture = false, name = ""): boolean {
        if (this._currentEffect) {
            const webgpuPipelineContext = this._currentEffect._pipelineContext as WebGPUPipelineContext;
            if (!texture) {
                if (webgpuPipelineContext.samplers[name] && webgpuPipelineContext.samplers[name]!.texture) {
                    webgpuPipelineContext.bindGroups = null as any; // the bind groups need to be rebuilt (at least the bind group owning this texture, but it's easier to just have them all rebuilt)
                }
                webgpuPipelineContext.samplers[name] = null;
                return false;
            }

            // Video
            if ((<VideoTexture>texture).video) {
                this._activeChannel = channel;
                (<VideoTexture>texture).update();
            } else if (texture.delayLoadState === Constants.DELAYLOADSTATE_NOTLOADED) { // Delay loading
                texture.delayLoad();
                return false;
            }

            let internalTexture: Nullable<InternalTexture> = null;
            if (depthStencilTexture) {
                internalTexture = (<RenderTargetTexture>texture).depthStencilTexture!;
            }
            else if (texture.isReady()) {
                internalTexture = <InternalTexture>texture.getInternalTexture();
            }
            else if (texture.isCube) {
                internalTexture = this.emptyCubeTexture;
                if (dbgGenerateLogs) {
                    console.log("Using a temporary empty cube texture. internalTexture.uniqueId=", texture.uniqueId, texture);
                }
            }
            else if (texture.is3D) {
                internalTexture = this.emptyTexture3D;
                if (dbgGenerateLogs) {
                    console.log("Using a temporary empty 3D texture. internalTexture.uniqueId=", texture.uniqueId, texture);
                }
            }
            else if (texture.is2DArray) {
                internalTexture = this.emptyTexture2DArray;
                if (dbgGenerateLogs) {
                    console.log("Using a temporary empty 2D array texture. internalTexture.uniqueId=", texture.uniqueId, texture);
                }
            }
            else {
                internalTexture = this.emptyTexture;
                if (dbgGenerateLogs) {
                    console.log("Using a temporary empty texture. internalTexture.uniqueId=", texture.uniqueId, texture);
                }
            }

            if (internalTexture && !internalTexture.isMultiview) {
                // CUBIC_MODE and SKYBOX_MODE both require CLAMP_TO_EDGE.  All other modes use REPEAT.
                if (internalTexture.isCube && internalTexture._cachedCoordinatesMode !== texture.coordinatesMode) {
                    internalTexture._cachedCoordinatesMode = texture.coordinatesMode;

                    const textureWrapMode = (texture.coordinatesMode !== Constants.TEXTURE_CUBIC_MODE && texture.coordinatesMode !== Constants.TEXTURE_SKYBOX_MODE) ? Constants.TEXTURE_WRAP_ADDRESSMODE : Constants.TEXTURE_CLAMP_ADDRESSMODE;
                    texture.wrapU = textureWrapMode;
                    texture.wrapV = textureWrapMode;
                }

                this._setAnisotropicLevel(0, internalTexture, texture.anisotropicFilteringLevel);
            }

            if (internalTexture) {
                internalTexture._cachedWrapU = texture.wrapU;
                internalTexture._cachedWrapV = texture.wrapV;
                internalTexture._cachedWrapR = texture.wrapR;
            }

            if (dbgSanityChecks && internalTexture && (internalTexture as any)._released) {
                console.error("using a released texture in engine.setTexture!", internalTexture);
                debugger;
            }

            this._setInternalTexture(name, internalTexture);
        } else {
            if (dbgVerboseLogsForFirstFrames) {
                if (!(this as any)._count || (this as any)._count < dbgVerboseLogsNumFrames) {
                    console.log("frame #" + (this as any)._count + " - _setTexture called with a null _currentEffect! texture=", texture);
                }
            }
        }

        return true;
    }

    /** @hidden */
    public _setAnisotropicLevel(target: number, internalTexture: InternalTexture, anisotropicFilteringLevel: number) {
        if (internalTexture.samplingMode !== Constants.TEXTURE_LINEAR_LINEAR_MIPNEAREST
            && internalTexture.samplingMode !== Constants.TEXTURE_LINEAR_LINEAR_MIPLINEAR
            && internalTexture.samplingMode !== Constants.TEXTURE_LINEAR_LINEAR) {
            anisotropicFilteringLevel = 1; // Forcing the anisotropic to 1 because else webgl will force filters to linear
        }

        if (internalTexture._cachedAnisotropicFilteringLevel !== anisotropicFilteringLevel) {
            //this._setTextureParameterFloat(target, anisotropicFilterExtension.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(anisotropicFilteringLevel, this._caps.maxAnisotropy), internalTexture);
            internalTexture._cachedAnisotropicFilteringLevel = anisotropicFilteringLevel;
            if (dbgShowWarningsNotImplemented) {
                console.warn("_setAnisotropicLevel not implemented yet");
            }
        }
    }

    public bindSamplers(effect: Effect): void { }

    public _bindTextureDirectly(target: number, texture: InternalTexture, forTextureDataUpdate = false, force = false): boolean {
        if (this._boundTexturesCache[this._activeChannel] !== texture) {
            this._boundTexturesCache[this._activeChannel] = texture;
            return true;
        }
        return false;
    }

    /** @hidden */
    public _bindTexture(channel: number, texture: InternalTexture, name: string): void {
        if (channel === undefined) {
            return;
        }

        if (texture) {
            texture._associatedChannel = channel;
        }

        this._activeChannel = channel;

        this._setInternalTexture(name, texture);
    }

    private _createGPUTextureForInternalTexture(texture: InternalTexture, width?: number, height?: number): WebGPUHardwareTexture {
        if (!texture._hardwareTexture) {
            texture._hardwareTexture = this._createHardwareTexture();
        }

        if (width === undefined) {
            width = texture.width;
        }
        if (height === undefined) {
            height = texture.height;
        }

        const gpuTextureWrapper = texture._hardwareTexture as WebGPUHardwareTexture;

        gpuTextureWrapper.format = this._getWebGPUTextureFormat(texture.type, texture.format);

        const textureUsages =
            texture._source === InternalTextureSource.RenderTarget ? WebGPUConstants.TextureUsage.Sampled | WebGPUConstants.TextureUsage.CopySrc | WebGPUConstants.TextureUsage.OutputAttachment :
            texture._source === InternalTextureSource.Depth ? WebGPUConstants.TextureUsage.Sampled | WebGPUConstants.TextureUsage.OutputAttachment : -1;

        const generateMipMaps = texture._source === InternalTextureSource.RenderTarget ? false : texture.generateMipMaps;

        if (texture.isCube) {
            const gpuTexture = this._textureHelper.createCubeTexture({ width, height }, texture.generateMipMaps, texture.generateMipMaps, texture.invertY, false, gpuTextureWrapper.format, texture.samples || 1, this._uploadEncoder, textureUsages);

            gpuTextureWrapper.set(gpuTexture);
            gpuTextureWrapper.createView({
                dimension: WebGPUConstants.TextureViewDimension.Cube,
                mipLevelCount: generateMipMaps ? WebGPUTextureHelper.computeNumMipmapLevels(width!, height!) : 1,
                baseArrayLayer: 0,
                baseMipLevel: 0,
                aspect: WebGPUConstants.TextureAspect.All
            });
        } else {
            const gpuTexture = this._textureHelper.createTexture({ width, height }, texture.generateMipMaps, texture.generateMipMaps, texture.invertY, false, gpuTextureWrapper.format, texture.samples || 1, this._uploadEncoder, textureUsages);

            gpuTextureWrapper.set(gpuTexture);
            gpuTextureWrapper.createView({
                dimension: WebGPUConstants.TextureViewDimension.E2d,
                mipLevelCount: generateMipMaps ? WebGPUTextureHelper.computeNumMipmapLevels(width!, height!) : 1,
                baseArrayLayer: 0,
                baseMipLevel: 0,
                aspect: WebGPUConstants.TextureAspect.All
            });
        }

        texture.width = texture.baseWidth = width;
        texture.height = texture.baseHeight = height;

        return gpuTextureWrapper;
    }

    private _generateMipmaps(texture: InternalTexture) {
        const gpuTexture = texture._hardwareTexture?.underlyingResource;

        if (!gpuTexture) {
            return;
        }

        const format = (texture._hardwareTexture as WebGPUHardwareTexture).format;
        const mipmapCount = WebGPUTextureHelper.computeNumMipmapLevels(texture.width, texture.height);

        if (dbgVerboseLogsForFirstFrames) {
            if (!(this as any)._count || (this as any)._count < dbgVerboseLogsNumFrames) {
                console.log("frame #" + (this as any)._count + " - generate mipmaps called - width=", texture.width, "height=", texture.height, "isCube=", texture.isCube);
            }
        }

        if (texture.isCube) {
            this._textureHelper.generateCubeMipmaps(gpuTexture, format, mipmapCount, this._uploadEncoder);
        } else {
            this._textureHelper.generateMipmaps(gpuTexture, format, mipmapCount, 0, this._uploadEncoder);
        }
    }

    public updateDynamicTexture(texture: Nullable<InternalTexture>, canvas: HTMLCanvasElement | OffscreenCanvas, invertY: boolean, premulAlpha: boolean = false, format?: number, forceBindTexture?: boolean): void {
        if (!texture) {
            return;
        }

        const width = canvas.width, height = canvas.height;

        let gpuTextureWrapper = texture._hardwareTexture as WebGPUHardwareTexture;

        if (!texture._hardwareTexture?.underlyingResource) {
            gpuTextureWrapper = this._createGPUTextureForInternalTexture(texture, width, height);
        }

        if (dbgSanityChecks && (texture as any)._released) {
            console.error("Using a released texture in updateDynamicTexture!", texture, gpuTextureWrapper);
        }

        createImageBitmap(canvas).then((bitmap) => {
            this._textureHelper.updateTexture(bitmap, gpuTextureWrapper.underlyingResource!, width, height, gpuTextureWrapper.format, 0, 0, invertY, premulAlpha, 0, 0, this._uploadEncoder);
            if (texture.generateMipMaps) {
                this._generateMipmaps(texture);
            }

            texture.isReady = true;
        });
    }

    public updateTextureData(texture: InternalTexture, imageData: ArrayBufferView, xOffset: number, yOffset: number, width: number, height: number, faceIndex: number = 0, lod: number = 0): void {
        let gpuTextureWrapper = texture._hardwareTexture as WebGPUHardwareTexture;

        if (!texture._hardwareTexture?.underlyingResource) {
            gpuTextureWrapper = this._createGPUTextureForInternalTexture(texture);
        }

        const data = new Uint8Array(imageData.buffer, imageData.byteOffset, imageData.byteLength);

        this._textureHelper.updateTexture(data, gpuTextureWrapper.underlyingResource!, width, height, gpuTextureWrapper.format, faceIndex, lod, texture.invertY, false, xOffset, yOffset, this._uploadEncoder);
    }

    public updateVideoTexture(texture: Nullable<InternalTexture>, video: HTMLVideoElement, invertY: boolean): void {
        if (!texture || texture._isDisabled) {
            return;
        }

        if (this._videoTextureSupported === undefined) {
            this._videoTextureSupported = true;
        }

        let gpuTextureWrapper = texture._hardwareTexture as WebGPUHardwareTexture;

        if (!texture._hardwareTexture?.underlyingResource) {
            gpuTextureWrapper = this._createGPUTextureForInternalTexture(texture);
        }

        createImageBitmap(video).then((bitmap) => {
            this._textureHelper.updateTexture(bitmap, gpuTextureWrapper.underlyingResource!, texture.width, texture.height, gpuTextureWrapper.format, 0, 0, !invertY, false, 0, 0, this._uploadEncoder);
            if (texture.generateMipMaps) {
                this._generateMipmaps(texture);
            }

            texture.isReady = true;
        }).catch((msg) => {
            // Sometimes createImageBitmap(video) fails with "Failed to execute 'createImageBitmap' on 'Window': The provided element's player has no current data."
            // Just keep going on
            texture.isReady = true;
        });
    }

    /** @hidden */
    public _uploadCompressedDataToTextureDirectly(texture: InternalTexture, internalFormat: number, width: number, height: number, imageData: ArrayBufferView, faceIndex: number = 0, lod: number = 0) {
        let gpuTextureWrapper = texture._hardwareTexture as WebGPUHardwareTexture;

        if (!texture._hardwareTexture?.underlyingResource) {
            texture.format = internalFormat;
            gpuTextureWrapper = this._createGPUTextureForInternalTexture(texture, width, height);
        }

        const data = new Uint8Array(imageData.buffer, imageData.byteOffset, imageData.byteLength);

        this._textureHelper.updateTexture(data, gpuTextureWrapper.underlyingResource!, width, height, gpuTextureWrapper.format, faceIndex, lod, texture.invertY, false, 0, 0, this._uploadEncoder);
    }

    /** @hidden */
    public _uploadDataToTextureDirectly(texture: InternalTexture, imageData: ArrayBufferView, faceIndex: number = 0, lod: number = 0, babylonInternalFormat?: number, useTextureWidthAndHeight = false): void {
        // TODO WEBPU babylonInternalFormat not handled.
        // Note that it is used only by BasisTools.LoadTextureFromTranscodeResult when transcoding could not be done, and in that case the texture format used (TEXTURETYPE_UNSIGNED_SHORT_5_6_5) is not compatible with WebGPU...
        const lodMaxWidth = Math.round(Math.log(texture.width) * Math.LOG2E);
        const lodMaxHeight = Math.round(Math.log(texture.height) * Math.LOG2E);

        const width = useTextureWidthAndHeight ? texture.width : Math.pow(2, Math.max(lodMaxWidth - lod, 0));
        const height = useTextureWidthAndHeight ? texture.height : Math.pow(2, Math.max(lodMaxHeight - lod, 0));

        let gpuTextureWrapper = texture._hardwareTexture as WebGPUHardwareTexture;

        if (!texture._hardwareTexture?.underlyingResource) {
            gpuTextureWrapper = this._createGPUTextureForInternalTexture(texture, width, height);
        }

        const data = new Uint8Array(imageData.buffer, imageData.byteOffset, imageData.byteLength);

        this._textureHelper.updateTexture(data, gpuTextureWrapper.underlyingResource!, width, height, gpuTextureWrapper.format, faceIndex, lod, texture.invertY, false, 0, 0, this._uploadEncoder);
    }

    /** @hidden */
    public _uploadArrayBufferViewToTexture(texture: InternalTexture, imageData: ArrayBufferView, faceIndex: number = 0, lod: number = 0): void {
        this._uploadDataToTextureDirectly(texture, imageData, faceIndex, lod);
    }

    /** @hidden */
    public _uploadImageToTexture(texture: InternalTexture, image: HTMLImageElement | ImageBitmap, faceIndex: number = 0, lod: number = 0) {
        let gpuTextureWrapper = texture._hardwareTexture as WebGPUHardwareTexture;

        if (!texture._hardwareTexture?.underlyingResource) {
            gpuTextureWrapper = this._createGPUTextureForInternalTexture(texture);
        }

        const bitmap = image as ImageBitmap; // in WebGPU we will always get an ImageBitmap, not an HTMLImageElement

        const width = Math.ceil(texture.width / (1 << lod));
        const height = Math.ceil(texture.height / (1 << lod));

        this._textureHelper.updateTexture(bitmap, gpuTextureWrapper.underlyingResource!, width, height, gpuTextureWrapper.format, faceIndex, lod, texture.invertY, false, 0, 0, this._uploadEncoder);
    }

    public updateRawTexture(texture: Nullable<InternalTexture>, bufferView: Nullable<ArrayBufferView>, format: number, invertY: boolean, compression: Nullable<string> = null, type: number = Constants.TEXTURETYPE_UNSIGNED_INT): void {
        if (!texture) {
            return;
        }

        if (!this._doNotHandleContextLost) {
            texture._bufferView = bufferView;
            texture.invertY = invertY;
            texture._compression = compression;
        }

        if (bufferView) {
            const gpuTextureWrapper = texture._hardwareTexture as WebGPUHardwareTexture;
            const needConversion = format === Constants.TEXTUREFORMAT_RGB;

            if (needConversion) {
                bufferView = _convertRGBtoRGBATextureData(bufferView, texture.width, texture.height, type);
            }

            const data = new Uint8Array(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);

            this._textureHelper.updateTexture(data, gpuTextureWrapper.underlyingResource!, texture.width, texture.height, gpuTextureWrapper.format, 0, 0, invertY, false, 0, 0, this._uploadEncoder);
            if (texture.generateMipMaps) {
                this._generateMipmaps(texture);
            }
        }

        texture.isReady = true;
    }

    public updateRawCubeTexture(texture: InternalTexture, bufferView: ArrayBufferView[], format: number, type: number, invertY: boolean, compression: Nullable<string> = null, level: number = 0): void {
        texture._bufferViewArray = bufferView;
        texture.invertY = invertY;
        texture._compression = compression;

        const gpuTextureWrapper = texture._hardwareTexture as WebGPUHardwareTexture;
        const needConversion = format === Constants.TEXTUREFORMAT_RGB;

        const data = [];
        for (let i = 0; i < bufferView.length; ++i) {
            let faceData = bufferView[i];
            if (needConversion) {
                faceData = _convertRGBtoRGBATextureData(bufferView[i], texture.width, texture.height, type);
            }
            data.push(new Uint8Array(faceData.buffer, faceData.byteOffset, faceData.byteLength));
        }

        this._textureHelper.updateCubeTextures(data, gpuTextureWrapper.underlyingResource!, texture.width, texture.height, gpuTextureWrapper.format, invertY, false, 0, 0, this._uploadEncoder);
        if (texture.generateMipMaps) {
            this._generateMipmaps(texture);
        }

        texture.isReady = true;
    }

    public updateRawTexture2DArray(texture: InternalTexture, data: Nullable<ArrayBufferView>, format: number, invertY: boolean, compression: Nullable<string> = null, textureType: number = Constants.TEXTURETYPE_UNSIGNED_INT): void {
        if (dbgShowWarningsNotImplemented) {
            console.warn("updateRawTexture2DArray not implemented yet in WebGPU");
        }
    }

    public updateRawTexture3D(texture: InternalTexture, data: Nullable<ArrayBufferView>, format: number, invertY: boolean, compression: Nullable<string> = null, textureType: number = Constants.TEXTURETYPE_UNSIGNED_INT): void {
        if (dbgShowWarningsNotImplemented) {
            console.warn("updateRawTexture2DArray not implemented yet in WebGPU");
        }
    }

    public readPixels(x: number, y: number, width: number, height: number, hasAlpha = true): Promise<ArrayBufferView> {
        return this._textureHelper.readPixels(this._swapChainTexture, x, y, width, height, this._options.swapChainFormat!);
    }

    /** @hidden */
    public _readTexturePixels(texture: InternalTexture, width: number, height: number, faceIndex = -1, level = 0, buffer: Nullable<ArrayBufferView> = null): Promise<ArrayBufferView> {
        let gpuTextureWrapper = texture._hardwareTexture as WebGPUHardwareTexture;

        return this._textureHelper.readPixels(gpuTextureWrapper.underlyingResource!, 0, 0, width, height, gpuTextureWrapper.format, faceIndex, level, buffer);
    }

    //------------------------------------------------------------------------------
    //                              Render Target Textures
    //------------------------------------------------------------------------------

    public createRenderTargetTexture(size: any, options: boolean | RenderTargetCreationOptions): InternalTexture {
        let fullOptions = new RenderTargetCreationOptions();

        if (options !== undefined && typeof options === "object") {
            fullOptions.generateMipMaps = options.generateMipMaps;
            fullOptions.generateDepthBuffer = options.generateDepthBuffer === undefined ? true : options.generateDepthBuffer;
            fullOptions.generateStencilBuffer = fullOptions.generateDepthBuffer && options.generateStencilBuffer;
            fullOptions.type = options.type === undefined ? Constants.TEXTURETYPE_UNSIGNED_INT : options.type;
            fullOptions.samplingMode = options.samplingMode === undefined ? Constants.TEXTURE_TRILINEAR_SAMPLINGMODE : options.samplingMode;
            fullOptions.format = options.format === undefined ? Constants.TEXTUREFORMAT_RGBA : options.format;
            fullOptions.samples = options.samples ?? this._mainPassSampleCount;
        } else {
            fullOptions.generateMipMaps = <boolean>options;
            fullOptions.generateDepthBuffer = true;
            fullOptions.generateStencilBuffer = false;
            fullOptions.type = Constants.TEXTURETYPE_UNSIGNED_INT;
            fullOptions.samplingMode = Constants.TEXTURE_TRILINEAR_SAMPLINGMODE;
            fullOptions.format = Constants.TEXTUREFORMAT_RGBA;
            fullOptions.samples = this._mainPassSampleCount;
        }

        const texture = new InternalTexture(this, InternalTextureSource.RenderTarget);

        const width = size.width || size;
        const height = size.height || size;
        const layers = size.layers || 0;

        texture._depthStencilBuffer = {};
        texture._framebuffer = {};
        texture.baseWidth = width;
        texture.baseHeight = height;
        texture.width = width;
        texture.height = height;
        texture.depth = layers;
        texture.isReady = true;
        texture.samples = fullOptions.samples;
        texture.generateMipMaps = fullOptions.generateMipMaps ? true : false;
        texture.samplingMode = fullOptions.samplingMode;
        texture.type = fullOptions.type;
        texture.format = fullOptions.format;
        texture._generateDepthBuffer = fullOptions.generateDepthBuffer;
        texture._generateStencilBuffer = fullOptions.generateStencilBuffer ? true : false;

        this._internalTexturesCache.push(texture);

        if (texture._generateDepthBuffer || texture._generateStencilBuffer) {
            texture._depthStencilTexture = this.createDepthStencilTexture({ width, height, layers }, {
                bilinearFiltering:
                    fullOptions.samplingMode === undefined ||
                    fullOptions.samplingMode === Constants.TEXTURE_BILINEAR_SAMPLINGMODE || fullOptions.samplingMode === Constants.TEXTURE_LINEAR_LINEAR ||
                    fullOptions.samplingMode === Constants.TEXTURE_TRILINEAR_SAMPLINGMODE || fullOptions.samplingMode === Constants.TEXTURE_LINEAR_LINEAR_MIPLINEAR ||
                    fullOptions.samplingMode === Constants.TEXTURE_NEAREST_LINEAR_MIPNEAREST || fullOptions.samplingMode === Constants.TEXTURE_NEAREST_LINEAR_MIPLINEAR ||
                    fullOptions.samplingMode === Constants.TEXTURE_NEAREST_LINEAR || fullOptions.samplingMode === Constants.TEXTURE_LINEAR_LINEAR_MIPNEAREST,
                comparisonFunction: 0,
                generateStencil: texture._generateStencilBuffer,
                isCube: texture.isCube,
                samples: texture.samples,
            });
        }

        if (options !== undefined && typeof options === "object" && options.createMipMaps && !fullOptions.generateMipMaps) {
            texture.generateMipMaps = true;
        }

        this._createGPUTextureForInternalTexture(texture);

        if (options !== undefined && typeof options === "object" && options.createMipMaps && !fullOptions.generateMipMaps) {
            texture.generateMipMaps = false;
        }

        return texture;
    }

    public createRenderTargetCubeTexture(size: number, options?: Partial<RenderTargetCreationOptions>): InternalTexture {
        let fullOptions = {
            generateMipMaps: true,
            generateDepthBuffer: true,
            generateStencilBuffer: false,
            type: Constants.TEXTURETYPE_UNSIGNED_INT,
            samplingMode: Constants.TEXTURE_TRILINEAR_SAMPLINGMODE,
            format: Constants.TEXTUREFORMAT_RGBA,
            samples: this._mainPassSampleCount,
            ...options
        };
        fullOptions.generateStencilBuffer = fullOptions.generateDepthBuffer && fullOptions.generateStencilBuffer;

        const texture = new InternalTexture(this, InternalTextureSource.RenderTarget);

        texture.width = size;
        texture.height = size;
        texture.depth = 0;
        texture.isReady = true;
        texture.isCube = true;
        texture.samples = fullOptions.samples;
        texture.generateMipMaps = fullOptions.generateMipMaps;
        texture.samplingMode = fullOptions.samplingMode;
        texture.type = fullOptions.type;
        texture.format = fullOptions.format;
        texture._generateDepthBuffer = fullOptions.generateDepthBuffer;
        texture._generateStencilBuffer = fullOptions.generateStencilBuffer;

        this._internalTexturesCache.push(texture);

        if (texture._generateDepthBuffer || texture._generateStencilBuffer) {
            texture._depthStencilTexture = this.createDepthStencilTexture({ width: texture.width, height: texture.height, layers: texture.depth }, {
                bilinearFiltering:
                    fullOptions.samplingMode === undefined ||
                    fullOptions.samplingMode === Constants.TEXTURE_BILINEAR_SAMPLINGMODE || fullOptions.samplingMode === Constants.TEXTURE_LINEAR_LINEAR ||
                    fullOptions.samplingMode === Constants.TEXTURE_TRILINEAR_SAMPLINGMODE || fullOptions.samplingMode === Constants.TEXTURE_LINEAR_LINEAR_MIPLINEAR ||
                    fullOptions.samplingMode === Constants.TEXTURE_NEAREST_LINEAR_MIPNEAREST || fullOptions.samplingMode === Constants.TEXTURE_NEAREST_LINEAR_MIPLINEAR ||
                    fullOptions.samplingMode === Constants.TEXTURE_NEAREST_LINEAR || fullOptions.samplingMode === Constants.TEXTURE_LINEAR_LINEAR_MIPNEAREST,
                comparisonFunction: 0,
                generateStencil: texture._generateStencilBuffer,
                isCube: texture.isCube,
                samples: texture.samples,
            });
        }

        if (options && options.createMipMaps && !fullOptions.generateMipMaps) {
            texture.generateMipMaps = true;
        }

        this._createGPUTextureForInternalTexture(texture);

        if (options && options.createMipMaps && !fullOptions.generateMipMaps) {
            texture.generateMipMaps = false;
        }

        return texture;
    }

    /** @hidden */
    public _setupDepthStencilTexture(internalTexture: InternalTexture, size: number | { width: number, height: number, layers?: number }, generateStencil: boolean, bilinearFiltering: boolean, comparisonFunction: number, samples = 1): void {
        const width = (<{ width: number, height: number, layers?: number }>size).width || <number>size;
        const height = (<{ width: number, height: number, layers?: number }>size).height || <number>size;
        const layers = (<{ width: number, height: number, layers?: number }>size).layers || 0;

        internalTexture.baseWidth = width;
        internalTexture.baseHeight = height;
        internalTexture.width = width;
        internalTexture.height = height;
        internalTexture.is2DArray = layers > 0;
        internalTexture.depth = layers;
        internalTexture.isReady = true;
        internalTexture.samples = samples;
        internalTexture.generateMipMaps = false;
        internalTexture._generateDepthBuffer = true;
        internalTexture._generateStencilBuffer = generateStencil;
        internalTexture.samplingMode = bilinearFiltering ? Constants.TEXTURE_BILINEAR_SAMPLINGMODE : Constants.TEXTURE_NEAREST_SAMPLINGMODE;
        internalTexture.type = Constants.TEXTURETYPE_UNSIGNED_INT;
        internalTexture._comparisonFunction = comparisonFunction;
    }

    /** @hidden */
    public _createDepthStencilTexture(size: number | { width: number, height: number, layers?: number }, options: DepthTextureCreationOptions): InternalTexture {
        const internalTexture = new InternalTexture(this, InternalTextureSource.Depth);

        const internalOptions = {
            bilinearFiltering: false,
            comparisonFunction: 0,
            generateStencil: false,
            samples: this._mainPassSampleCount,
            ...options
        };

        internalTexture.format = internalOptions.generateStencil ? Constants.TEXTUREFORMAT_DEPTH24_STENCIL8 : Constants.TEXTUREFORMAT_DEPTH32_FLOAT;

        this._setupDepthStencilTexture(internalTexture, size, internalOptions.generateStencil, internalOptions.bilinearFiltering, internalOptions.comparisonFunction, internalOptions.samples);

        this._createGPUTextureForInternalTexture(internalTexture);

        return internalTexture;
    }

    /** @hidden */
    public _createDepthStencilCubeTexture(size: number, options: DepthTextureCreationOptions): InternalTexture {
        const internalTexture = new InternalTexture(this, InternalTextureSource.Depth);

        internalTexture.isCube = true;

        const internalOptions = {
            bilinearFiltering: false,
            comparisonFunction: 0,
            generateStencil: false,
            samples: this._mainPassSampleCount,
            ...options
        };

        internalTexture.format = internalOptions.generateStencil ? Constants.TEXTUREFORMAT_DEPTH24_STENCIL8 : Constants.TEXTUREFORMAT_DEPTH32_FLOAT;

        this._setupDepthStencilTexture(internalTexture, size, internalOptions.generateStencil, internalOptions.bilinearFiltering, internalOptions.comparisonFunction, internalOptions.samples);

        this._createGPUTextureForInternalTexture(internalTexture);

        return internalTexture;
    }

    public updateRenderTargetTextureSampleCount(texture: Nullable<InternalTexture>, samples: number): number {
        // samples is used at creation time in WebGPU, you can't change it afterwards

        return samples;
    }

    //------------------------------------------------------------------------------
    //                              Render Commands
    //------------------------------------------------------------------------------

    /**
     * Begin a new frame
     */
    public beginFrame(): void {
        super.beginFrame();
    }

    /**
     * End the current frame
     */
    public endFrame() {
        this._endMainRenderPass();

        this.flushFramebuffer();

        if (dbgVerboseLogsForFirstFrames) {
            if (!(this as any)._count || (this as any)._count < dbgVerboseLogsNumFrames) {
                console.log("frame #" + (this as any)._count + " - counters - numPipelineDescriptorCreation=", this._counters.numPipelineDescriptorCreation, ", numBindGroupsCreation=", this._counters.numBindGroupsCreation);
            }
        }

        for (let i = 0; i < this._deferredReleaseTextures.length; ++i) {
            const [texture, hardwareTexture, irradianceTexture, depthStencilTexture] = this._deferredReleaseTextures[i];

            hardwareTexture?.release();
            irradianceTexture?.dispose();
            depthStencilTexture?.dispose();

            // TODO WEBGPU remove debug code
            if ((texture as any)._swapped) {
                delete (texture as any)._swapped;
            } else {
                (texture as any)._released = true;
            }
        }

        this._deferredReleaseTextures.length = 0;

        this._bufferManager.destroyDeferredBuffers();

        if (ThinEngine.Features._collectUbosUpdatedInFrame) {
            if (dbgVerboseLogsForFirstFrames) {
                if (!(this as any)._count || (this as any)._count < dbgVerboseLogsNumFrames) {
                    const list: Array<string> = [];
                    for (const name in UniformBuffer._updatedUbosInFrame) {
                        list.push(name + ":" + UniformBuffer._updatedUbosInFrame[name]);
                    }
                    console.log("frame #" + (this as any)._count + " - updated ubos -", list.join(", "));
                }
            }
            UniformBuffer._updatedUbosInFrame = {};
        }

        this._counters.numPipelineDescriptorCreation = 0;
        this._counters.numBindGroupsCreation = 0;

        super.endFrame();

        if (dbgVerboseLogsForFirstFrames) {
            if ((this as any)._count < dbgVerboseLogsNumFrames) {
                console.log("frame #" + (this as any)._count + " - end");
            }
            if ((this as any)._count < dbgVerboseLogsNumFrames) {
                (this as any)._count++;
                if ((this as any)._count !== dbgVerboseLogsNumFrames) {
                    console.log("frame #" + (this as any)._count + " - begin");
                    }
            }
        }
    }

    //------------------------------------------------------------------------------
    //                              Render Pass
    //------------------------------------------------------------------------------

    private _startRenderTargetRenderPass(internalTexture: InternalTexture, clearColor: Nullable<IColor4Like>, clearDepth: boolean, clearStencil: boolean = false) {
        const gpuTexture = (internalTexture._hardwareTexture as WebGPUHardwareTexture).underlyingResource!;
        const depthStencilTexture = internalTexture._depthStencilTexture;
        const gpuDepthStencilTexture = depthStencilTexture?._hardwareTexture?.underlyingResource as Nullable<GPUTexture>;

        const colorTextureView = gpuTexture.createView(this._currentRenderTargetColorAttachmentViewDescriptor);
        const depthTextureView = gpuDepthStencilTexture?.createView(this._currentRenderTargetDepthAttachmentViewDescriptor);

        this._renderTargetEncoder.pushDebugGroup("start render target rendering");

        const renderPassDescriptor = {
            colorAttachments: [{
                attachment: colorTextureView,
                loadValue: clearColor !== null ? clearColor : WebGPUConstants.LoadOp.Load,
                storeOp: WebGPUConstants.StoreOp.Store
            }],
            depthStencilAttachment: depthStencilTexture && gpuDepthStencilTexture ? {
                attachment: depthTextureView!,
                depthLoadValue: clearDepth && depthStencilTexture._generateDepthBuffer ? this._clearDepthValue : WebGPUConstants.LoadOp.Load,
                depthStoreOp: WebGPUConstants.StoreOp.Store,
                stencilLoadValue: clearStencil && depthStencilTexture._generateStencilBuffer ? this._clearStencilValue : WebGPUConstants.LoadOp.Load,
                stencilStoreOp: WebGPUConstants.StoreOp.Store,
            } : undefined
        };
        const renderPass = this._renderTargetEncoder.beginRenderPass(renderPassDescriptor);

        if (dbgVerboseLogsForFirstFrames) {
            if (!(this as any)._count || (this as any)._count < dbgVerboseLogsNumFrames) {
                console.log("frame #" + (this as any)._count + " - render target begin pass - internalTexture.uniqueId=", internalTexture.uniqueId, renderPassDescriptor);
            }
        }

        this._currentRenderPass = renderPass;

        this._resetCurrentViewport(1);
    }

    private _endRenderTargetRenderPass() {
        if (this._currentRenderPass) {
            this._currentRenderPass.endPass();
            if (dbgVerboseLogsForFirstFrames) {
                if (!(this as any)._count || (this as any)._count < dbgVerboseLogsNumFrames) {
                    console.log("frame #" + (this as any)._count + " - render target end pass - internalTexture.uniqueId=", this._currentRenderTarget?.uniqueId);
                }
            }
            this._renderTargetEncoder.popDebugGroup();
            this._resetCurrentViewport(1);
        }
    }

    private _getCurrentRenderPass(): GPURenderPassEncoder {
        if (this._currentRenderTarget && !this._currentRenderPass) {
            this._startRenderTargetRenderPass(this._currentRenderTarget, null, false, false);
        } else if (!this._currentRenderPass) {
            this._startMainRenderPass();
        }

        return this._currentRenderPass!;
    }

    private _startMainRenderPass(): void {
        if (this._mainRenderPass) {
            this._endMainRenderPass();
        }

        this._swapChainTexture = this._swapChain.getCurrentTexture();

        // Resolve in case of MSAA
        if (this._options.antialiasing) {
            this._mainColorAttachments[0].resolveTarget = this._swapChainTexture.createView();
        }
        else {
            this._mainColorAttachments[0].attachment = this._swapChainTexture.createView();
        }

        if (dbgVerboseLogsForFirstFrames) {
            if (!(this as any)._count || (this as any)._count < dbgVerboseLogsNumFrames) {
                console.log("frame #" + (this as any)._count + " - main begin pass - texture width=" + (this._mainTextureExtends as any).width, " height=" + (this._mainTextureExtends as any).height, this._mainColorAttachments, this._mainDepthAttachment);
            }
        }

        this._renderEncoder.pushDebugGroup("start main rendering");

        this._currentRenderPass = this._renderEncoder.beginRenderPass({
            colorAttachments: this._mainColorAttachments,
            depthStencilAttachment: this._mainDepthAttachment
        });

        this._mainRenderPass = this._currentRenderPass;

        this._resetCurrentViewport(0);
    }

    private _endMainRenderPass(): void {
        if (this._mainRenderPass !== null) {
            this._mainRenderPass.endPass();
            if (dbgVerboseLogsForFirstFrames) {
                if (!(this as any)._count || (this as any)._count < dbgVerboseLogsNumFrames) {
                    console.log("frame #" + (this as any)._count + " - main end pass");
                }
            }
            this._renderEncoder.popDebugGroup();
            this._resetCurrentViewport(0);
            if (this._mainRenderPass === this._currentRenderPass) {
                this._currentRenderPass = null;
            }
            this._mainRenderPass = null;
        }
    }

    public bindFramebuffer(texture: InternalTexture, faceIndex: number = 0, requiredWidth?: number, requiredHeight?: number, forceFullscreenViewport?: boolean, lodLevel = 0, layer = 0): void {
        const hardwareTexture = texture._hardwareTexture as Nullable<WebGPUHardwareTexture>;
        const gpuTexture = hardwareTexture?.underlyingResource as Nullable<GPUTexture>;

        if (!hardwareTexture || !gpuTexture) {
            if (dbgSanityChecks) {
                console.error("bindFramebuffer: Trying to bind a texture that does not have a hardware texture or that has a webgpu texture empty!", texture, hardwareTexture, gpuTexture);
            }
            return;
        }

        if (this._currentRenderTarget) {
            this.unBindFramebuffer(this._currentRenderTarget);
        }
        this._currentRenderTarget = texture;

        this._setDepthTextureFormat(this._currentRenderTarget._depthStencilTexture ? this._getWebGPUTextureFormat(-1, this._currentRenderTarget._depthStencilTexture.format) : undefined);
        this._setColorFormat(this._getWebGPUTextureFormat(this._currentRenderTarget.type, this._currentRenderTarget.format));

        // TODO WEBGPU handle array layer
        this._currentRenderTargetColorAttachmentViewDescriptor = {
            format: this._colorFormat,
            dimension: WebGPUConstants.TextureViewDimension.E2d,
            mipLevelCount: 1,
            baseArrayLayer: faceIndex,
            baseMipLevel: lodLevel,
            arrayLayerCount: 1,
            aspect: WebGPUConstants.TextureAspect.All
        };

        this._currentRenderTargetDepthAttachmentViewDescriptor = {
            format: this._depthTextureFormat,
            dimension: WebGPUConstants.TextureViewDimension.E2d,
            mipLevelCount: 1,
            baseArrayLayer: 0,
            baseMipLevel: 0,
            arrayLayerCount: 1,
            aspect: WebGPUConstants.TextureAspect.All
        };

        if (dbgVerboseLogsForFirstFrames) {
            if (!(this as any)._count || (this as any)._count < dbgVerboseLogsNumFrames) {
                console.log("frame #" + (this as any)._count + " - bindFramebuffer called - face=", faceIndex, "lodLevel=", lodLevel, this._currentRenderTargetColorAttachmentViewDescriptor, this._currentRenderTargetDepthAttachmentViewDescriptor);
            }
        }

        this._currentRenderPass = null; // lazy creation of the render pass, hoping the render pass will be created by a call to clear()...

        if (this._cachedViewport && !forceFullscreenViewport) {
            this.setViewport(this._cachedViewport, requiredWidth, requiredHeight);
        } else {
            if (!requiredWidth) {
                requiredWidth = texture.width;
                if (lodLevel) {
                    requiredWidth = requiredWidth / Math.pow(2, lodLevel);
                }
            }
            if (!requiredHeight) {
                requiredHeight = texture.height;
                if (lodLevel) {
                    requiredHeight = requiredHeight / Math.pow(2, lodLevel);
                }
            }

            this._viewport(0, 0, requiredWidth, requiredHeight);
        }

        this.wipeCaches();
    }

    public unBindFramebuffer(texture: InternalTexture, disableGenerateMipMaps = false, onBeforeUnbind?: () => void): void {
        // TODO WEBGPU remove the assert debugging code
        assert(this._currentRenderTarget === null || (this._currentRenderTarget !== null && texture === this._currentRenderTarget), "unBindFramebuffer - the texture we wan't to unbind is not the same than the currentRenderTarget! texture=" + texture + ", this._currentRenderTarget=" + this._currentRenderTarget);

        if (this._currentRenderPass && this._currentRenderPass !== this._mainRenderPass) {
            this._endRenderTargetRenderPass();
        }

        this._currentRenderTarget = null;

        if (texture.generateMipMaps && !disableGenerateMipMaps && !texture.isCube) {
            this._generateMipmaps(texture);
        }

        if (onBeforeUnbind) {
            onBeforeUnbind();
        }

        this._currentRenderPass = this._mainRenderPass;
        this._setDepthTextureFormat(this._getMainDepthTextureFormat());
        this._setColorFormat(this._options.swapChainFormat!);
    }

    public flushFramebuffer(): void {
        this._commandBuffers[0] = this._uploadEncoder.finish();
        this._commandBuffers[1] = this._renderTargetEncoder.finish();
        this._commandBuffers[2] = this._renderEncoder.finish();

        this._device.defaultQueue.submit(this._commandBuffers);

        this._uploadEncoder = this._device.createCommandEncoder(this._uploadEncoderDescriptor);
        this._renderEncoder = this._device.createCommandEncoder(this._renderEncoderDescriptor);
        this._renderTargetEncoder = this._device.createCommandEncoder(this._renderTargetEncoderDescriptor);
    }

    public restoreDefaultFramebuffer(): void {
        if (this._currentRenderTarget) {
            this.unBindFramebuffer(this._currentRenderTarget);
        } else {
            this._currentRenderPass = this._mainRenderPass;
            this._setDepthTextureFormat(this._getMainDepthTextureFormat());
            this._setColorFormat(this._options.swapChainFormat!);
        }
        if (this._currentRenderPass) {
            if (this._cachedViewport) {
                this.setViewport(this._cachedViewport);
            }
        }

        this.wipeCaches();
    }

    /** @hidden */
    public _releaseFramebufferObjects(texture: InternalTexture): void {
    }

    //------------------------------------------------------------------------------
    //                              Render
    //------------------------------------------------------------------------------

    public setZOffset(value: number): void {
        if (value !== this._depthCullingState.zOffset) {
            this._depthCullingState.zOffset = value;
        }
    }

    private _setColorFormat(format: GPUTextureFormat): void {
        if (this._colorFormat === format) {
            return;
        }
        this._colorFormat = format;
    }

    private _setDepthTextureFormat(format: GPUTextureFormat | undefined): void {
        if (this._depthTextureFormat === format) {
            return;
        }
        this._depthTextureFormat = format;
    }

    public setDepthBuffer(enable: boolean): void {
        if (this._depthCullingState.depthTest !== enable) {
            this._depthCullingState.depthTest = enable;
        }
    }

    public setDepthWrite(enable: boolean): void {
        if (this._depthCullingState.depthMask !== enable) {
            this._depthCullingState.depthMask = enable;
        }
    }

    public setStencilBuffer(enable: boolean): void {
        if (this._stencilState.stencilTest !== enable) {
            this._stencilState.stencilTest = enable;
        }
    }

    public setStencilMask(mask: number): void {
        if (this._stencilState.stencilMask !== mask) {
            this._stencilState.stencilMask = mask;
        }
    }

    public setStencilFunction(stencilFunc: number) {
        if (this._stencilState.stencilFunc !== stencilFunc) {
            this._stencilState.stencilFunc = stencilFunc;
        }
    }

    public setStencilFunctionReference(reference: number) {
        if (this._stencilState.stencilFuncRef !== reference) {
            this._stencilState.stencilFuncRef = reference;
        }
    }

    public setStencilFunctionMask(mask: number) {
        if (this._stencilState.stencilFuncMask !== mask) {
            this._stencilState.stencilFuncMask = mask;
        }
    }

    public setStencilOperationFail(operation: number): void {
        if (this._stencilState.stencilOpStencilFail !== operation) {
            this._stencilState.stencilOpStencilFail = operation;
        }
    }

    public setStencilOperationDepthFail(operation: number): void {
        if (this._stencilState.stencilOpDepthFail !== operation) {
            this._stencilState.stencilOpDepthFail = operation;
        }
    }

    public setStencilOperationPass(operation: number): void {
        if (this._stencilState.stencilOpStencilDepthPass !== operation) {
            this._stencilState.stencilOpStencilDepthPass = operation;
        }
    }

    public setDitheringState(value: boolean): void {
        // Does not exist in WebGPU
    }

    public setRasterizerState(value: boolean): void {
        // Does not exist in WebGPU
    }

    public setDepthFunction(depthFunc: number) {
        if (this._depthCullingState.depthFunc !== depthFunc) {
            this._depthCullingState.depthFunc = depthFunc;
        }
    }

    public setDepthFunctionToGreater(): void {
        if (this._depthCullingState.depthFunc !== Constants.GREATER) {
            this._depthCullingState.depthFunc = Constants.GREATER;
        }
    }

    public setDepthFunctionToGreaterOrEqual(): void {
        if (this._depthCullingState.depthFunc !== Constants.GEQUAL) {
            this._depthCullingState.depthFunc = Constants.GEQUAL;
        }
    }

    public setDepthFunctionToLess(): void {
        if (this._depthCullingState.depthFunc !== Constants.LESS) {
            this._depthCullingState.depthFunc = Constants.LESS;
        }
    }

    public setDepthFunctionToLessOrEqual(): void {
        if (this._depthCullingState.depthFunc !== Constants.LEQUAL) {
            this._depthCullingState.depthFunc = Constants.LEQUAL;
        }
    }

    private _indexFormatInRenderPass(topology: GPUPrimitiveTopology): boolean {
        return  topology === WebGPUConstants.PrimitiveTopology.PointList ||
                topology === WebGPUConstants.PrimitiveTopology.LineList ||
                topology === WebGPUConstants.PrimitiveTopology.TriangleList;
    }

    private _getTopology(fillMode: number): GPUPrimitiveTopology {
        switch (fillMode) {
            // Triangle views
            case Constants.MATERIAL_TriangleFillMode:
                return WebGPUConstants.PrimitiveTopology.TriangleList;
            case Constants.MATERIAL_PointFillMode:
                return WebGPUConstants.PrimitiveTopology.PointList;
            case Constants.MATERIAL_WireFrameFillMode:
                return WebGPUConstants.PrimitiveTopology.LineList;
            // Draw modes
            case Constants.MATERIAL_PointListDrawMode:
                return WebGPUConstants.PrimitiveTopology.PointList;
            case Constants.MATERIAL_LineListDrawMode:
                return WebGPUConstants.PrimitiveTopology.LineList;
            case Constants.MATERIAL_LineLoopDrawMode:
                // return this._gl.LINE_LOOP;
                // TODO WEBGPU. Line Loop Mode Fallback at buffer load time.
                throw "LineLoop is an unsupported fillmode in WebGPU";
            case Constants.MATERIAL_LineStripDrawMode:
                return WebGPUConstants.PrimitiveTopology.LineStrip;
            case Constants.MATERIAL_TriangleStripDrawMode:
                return WebGPUConstants.PrimitiveTopology.TriangleStrip;
            case Constants.MATERIAL_TriangleFanDrawMode:
                // return this._gl.TRIANGLE_FAN;
                // TODO WEBGPU. Triangle Fan Mode Fallback at buffer load time.
                throw "TriangleFan is an unsupported fillmode in WebGPU";
            default:
                return WebGPUConstants.PrimitiveTopology.TriangleList;
        }
    }

    private _getCompareFunction(compareFunction: Nullable<number>): GPUCompareFunction {
        switch (compareFunction) {
            case Constants.ALWAYS:
                return WebGPUConstants.CompareFunction.Always;
            case Constants.EQUAL:
                return WebGPUConstants.CompareFunction.Equal;
            case Constants.GREATER:
                return WebGPUConstants.CompareFunction.Greater;
            case Constants.GEQUAL:
                return WebGPUConstants.CompareFunction.GreaterEqual;
            case Constants.LESS:
                return WebGPUConstants.CompareFunction.Less;
            case Constants.LEQUAL:
                return WebGPUConstants.CompareFunction.LessEqual;
            case Constants.NEVER:
                return WebGPUConstants.CompareFunction.Never;
            case Constants.NOTEQUAL:
                return WebGPUConstants.CompareFunction.NotEqual;
            default:
                return WebGPUConstants.CompareFunction.Less;
        }
    }

    private _getOpFunction(operation: Nullable<number>, defaultOp: GPUStencilOperation): GPUStencilOperation {
        switch (operation) {
            case Constants.KEEP:
                return WebGPUConstants.StencilOperation.Keep;
            case Constants.ZERO:
                return WebGPUConstants.StencilOperation.Zero;
            case Constants.REPLACE:
                return WebGPUConstants.StencilOperation.Replace;
            case Constants.INVERT:
                return WebGPUConstants.StencilOperation.Invert;
            case Constants.INCR:
                return WebGPUConstants.StencilOperation.IncrementClamp;
            case Constants.DECR:
                return WebGPUConstants.StencilOperation.DecrementClamp;
            case Constants.INCR_WRAP:
                return WebGPUConstants.StencilOperation.IncrementWrap;
            case Constants.DECR_WRAP:
                return WebGPUConstants.StencilOperation.DecrementWrap;
            default:
                return defaultOp;
        }
    }

    private _getDepthStencilStateDescriptor(): GPUDepthStencilStateDescriptor | undefined {
        if (this._depthTextureFormat === undefined) {
            return undefined;
        }

        const stencilFrontBack: GPUStencilStateFaceDescriptor = {
            compare: this._getCompareFunction(this._stencilState.stencilFunc),
            depthFailOp: this._getOpFunction(this._stencilState.stencilOpDepthFail, WebGPUConstants.StencilOperation.Keep),
            failOp: this._getOpFunction(this._stencilState.stencilOpStencilFail, WebGPUConstants.StencilOperation.Keep),
            passOp: this._getOpFunction(this._stencilState.stencilOpStencilDepthPass, WebGPUConstants.StencilOperation.Replace)
        };

        return {
            depthWriteEnabled: this.getDepthWrite(),
            depthCompare: this.getDepthBuffer() ? this._getCompareFunction(this.getDepthFunction()) : WebGPUConstants.CompareFunction.Always,
            format: this._depthTextureFormat,
            stencilFront: stencilFrontBack,
            stencilBack: stencilFrontBack,
            stencilReadMask: this._stencilState.stencilFuncMask,
            stencilWriteMask: this._stencilState.stencilMask,
        };
    }

    /**
     * Set various states to the webGL context
     * @param culling defines backface culling state
     * @param zOffset defines the value to apply to zOffset (0 by default)
     * @param force defines if states must be applied even if cache is up to date
     * @param reverseSide defines if culling must be reversed (CCW instead of CW and CW instead of CCW)
     */
    public setState(culling: boolean, zOffset: number = 0, force?: boolean, reverseSide = false): void {
        // Culling
        if (this._depthCullingState.cull !== culling || force) {
            this._depthCullingState.cull = culling;
        }

        // Cull face
        // var cullFace = this.cullBackFaces ? this._gl.BACK : this._gl.FRONT;
        var cullFace = this.cullBackFaces ? 1 : 2;
        if (this._depthCullingState.cullFace !== cullFace || force) {
            this._depthCullingState.cullFace = cullFace;
        }

        // Z offset
        this.setZOffset(zOffset);

        // Front face
        // var frontFace = reverseSide ? this._gl.CW : this._gl.CCW;
        var frontFace = reverseSide ? 1 : 2;
        if (this._depthCullingState.frontFace !== frontFace || force) {
            this._depthCullingState.frontFace = frontFace;
        }
    }

    private _getFrontFace(): GPUFrontFace {
        switch (this._depthCullingState.frontFace) {
            case 1:
                return WebGPUConstants.FrontFace.CCW;
            default:
                return WebGPUConstants.FrontFace.CW;
        }
    }

    private _getCullMode(): GPUCullMode {
        if (this._depthCullingState.cull === false) {
            return WebGPUConstants.CullMode.None;
        }

        if (this._depthCullingState.cullFace === 2) {
            return WebGPUConstants.CullMode.Front;
        }
        else {
            return WebGPUConstants.CullMode.Back;
        }
    }

    private _getRasterizationStateDescriptor(): GPURasterizationStateDescriptor {
        return {
            frontFace: this._getFrontFace(),
            cullMode: this._getCullMode(),
            depthBias: 0,
            depthBiasClamp: 0,
            depthBiasSlopeScale: this._depthCullingState.zOffset,
        };
    }

    private _getWriteMask(): number {
        if (this.__colorWrite) {
            return WebGPUConstants.ColorWrite.All;
        }
        return 0;
    }

    /**
     * Sets the current alpha mode
     * @param mode defines the mode to use (one of the Engine.ALPHA_XXX)
     * @param noDepthWriteChange defines if depth writing state should remains unchanged (false by default)
     * @see http://doc.babylonjs.com/resources/transparency_and_how_meshes_are_rendered
     */
    public setAlphaMode(mode: number, noDepthWriteChange: boolean = false): void {
        if (this._alphaMode === mode) {
            return;
        }

        switch (mode) {
            case Engine.ALPHA_DISABLE:
                this._alphaState.alphaBlend = false;
                break;
            case Engine.ALPHA_PREMULTIPLIED:
                // this._alphaState.setAlphaBlendFunctionParameters(this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE);
                this._alphaState.setAlphaBlendFunctionParameters(1, 0x0303, 1, 1);
                this._alphaState.alphaBlend = true;
                break;
            case Engine.ALPHA_PREMULTIPLIED_PORTERDUFF:
                // this._alphaState.setAlphaBlendFunctionParameters(this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA);
                this._alphaState.setAlphaBlendFunctionParameters(1, 0x0303, 1, 0x0303);
                this._alphaState.alphaBlend = true;
                break;
            case Engine.ALPHA_COMBINE:
                // this._alphaState.setAlphaBlendFunctionParameters(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE);
                this._alphaState.setAlphaBlendFunctionParameters(0x0302, 0x0303, 1, 1);
                this._alphaState.alphaBlend = true;
                break;
            case Engine.ALPHA_ONEONE:
                // this._alphaState.setAlphaBlendFunctionParameters(this._gl.ONE, this._gl.ONE, this._gl.ZERO, this._gl.ONE);
                this._alphaState.setAlphaBlendFunctionParameters(1, 1, 0, 1);
                this._alphaState.alphaBlend = true;
                break;
            case Engine.ALPHA_ADD:
                // this._alphaState.setAlphaBlendFunctionParameters(this._gl.SRC_ALPHA, this._gl.ONE, this._gl.ZERO, this._gl.ONE);
                this._alphaState.setAlphaBlendFunctionParameters(0x0302, 1, 0, 1);
                this._alphaState.alphaBlend = true;
                break;
            case Engine.ALPHA_SUBTRACT:
                // this._alphaState.setAlphaBlendFunctionParameters(this._gl.ZERO, this._gl.ONE_MINUS_SRC_COLOR, this._gl.ONE, this._gl.ONE);
                this._alphaState.setAlphaBlendFunctionParameters(0, 0x0301, 1, 1);
                this._alphaState.alphaBlend = true;
                break;
            case Engine.ALPHA_MULTIPLY:
                // this._alphaState.setAlphaBlendFunctionParameters(this._gl.DST_COLOR, this._gl.ZERO, this._gl.ONE, this._gl.ONE);
                this._alphaState.setAlphaBlendFunctionParameters(0x0306, 0, 1, 1);
                this._alphaState.alphaBlend = true;
                break;
            case Engine.ALPHA_MAXIMIZED:
                // this._alphaState.setAlphaBlendFunctionParameters(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_COLOR, this._gl.ONE, this._gl.ONE);
                this._alphaState.setAlphaBlendFunctionParameters(0x0302, 0x0301, 1, 1);
                this._alphaState.alphaBlend = true;
                break;
            case Engine.ALPHA_INTERPOLATE:
                // this._alphaState.setAlphaBlendFunctionParameters(this._gl.CONSTANT_COLOR, this._gl.ONE_MINUS_CONSTANT_COLOR, this._gl.CONSTANT_ALPHA, this._gl.ONE_MINUS_CONSTANT_ALPHA);
                this._alphaState.setAlphaBlendFunctionParameters(0x8001, 0x8002, 0x8003, 0x8004);
                this._alphaState.alphaBlend = true;
                break;
            case Engine.ALPHA_SCREENMODE:
                // this._alphaState.setAlphaBlendFunctionParameters(this._gl.ONE, this._gl.ONE_MINUS_SRC_COLOR, this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA);
                this._alphaState.setAlphaBlendFunctionParameters(1, 0x0301, 1, 0x0303);
                this._alphaState.alphaBlend = true;
                break;
        }
        if (!noDepthWriteChange) {
            this.setDepthWrite(mode === Engine.ALPHA_DISABLE);
        }
        this._alphaMode = mode;
    }

    private _getAphaBlendOperation(operation: Nullable<number>): GPUBlendOperation {
        switch (operation) {
            case 0x8006:
                return WebGPUConstants.BlendOperation.Add;
            case 0x800A:
                return WebGPUConstants.BlendOperation.Subtract;
            case 0x800B:
                return WebGPUConstants.BlendOperation.ReverseSubtract;
            default:
                return WebGPUConstants.BlendOperation.Add;
        }
    }

    private _getAphaBlendFactor(factor: Nullable<number>): GPUBlendFactor {
        switch (factor) {
            case 0:
                return WebGPUConstants.BlendFactor.Zero;
            case 1:
                return WebGPUConstants.BlendFactor.One;
            case 0x0300:
                return WebGPUConstants.BlendFactor.SrcColor;
            case 0x0301:
                return WebGPUConstants.BlendFactor.OneMinusSrcColor;
            case 0x0302:
                return WebGPUConstants.BlendFactor.SrcAlpha;
            case 0x0303:
                return WebGPUConstants.BlendFactor.OneMinusSrcAlpha;
            case 0x0304:
                return WebGPUConstants.BlendFactor.DstAlpha;
            case 0x0305:
                return WebGPUConstants.BlendFactor.OneMinusDstAlpha;
            case 0x0306:
                return WebGPUConstants.BlendFactor.DstColor;
            case 0x0307:
                return WebGPUConstants.BlendFactor.OneMinusDstColor;
            case 0x0308:
                return WebGPUConstants.BlendFactor.SrcAlphaSaturated;
            case 0x8001:
                return WebGPUConstants.BlendFactor.BlendColor;
            case 0x8002:
                return WebGPUConstants.BlendFactor.OneMinusBlendColor;
            case 0x8003:
                return WebGPUConstants.BlendFactor.BlendColor;
            case 0x8004:
                return WebGPUConstants.BlendFactor.OneMinusBlendColor;
            default:
                return WebGPUConstants.BlendFactor.One;
        }
    }

    private _getAphaBlendState(): GPUBlendDescriptor {
        if (!this._alphaState.alphaBlend) {
            return { };
        }

        return {
            srcFactor: this._getAphaBlendFactor(this._alphaState._blendFunctionParameters[2]),
            dstFactor: this._getAphaBlendFactor(this._alphaState._blendFunctionParameters[3]),
            operation: this._getAphaBlendOperation(this._alphaState._blendEquationParameters[1]),
        };
    }

    private _getColorBlendState(): GPUBlendDescriptor {
        if (!this._alphaState.alphaBlend) {
            return { };
        }

        return {
            srcFactor: this._getAphaBlendFactor(this._alphaState._blendFunctionParameters[0]),
            dstFactor: this._getAphaBlendFactor(this._alphaState._blendFunctionParameters[1]),
            operation: this._getAphaBlendOperation(this._alphaState._blendEquationParameters[0]),
        };
    }

    private _getColorStateDescriptors(): GPUColorStateDescriptor[] {
        return [{
            format: this._colorFormat,
            alphaBlend: this._getAphaBlendState(),
            colorBlend: this._getColorBlendState(),
            writeMask: this._getWriteMask(),
        }];
    }

    private _getStages(): IWebGPURenderPipelineStageDescriptor {
        const webgpuPipelineContext = this._currentEffect!._pipelineContext as WebGPUPipelineContext;
        return webgpuPipelineContext.stages!;
    }

    private _getVertexInputDescriptorFormat(vertexBuffer: VertexBuffer): GPUVertexFormat {
        const kind = vertexBuffer.getKind();
        const type = vertexBuffer.type;
        const normalized = vertexBuffer.normalized;
        const size = vertexBuffer.getSize();

        switch (type) {
            case VertexBuffer.BYTE:
                switch (size) {
                    case 2:
                        return normalized ? WebGPUConstants.VertexFormat.Char2Norm : WebGPUConstants.VertexFormat.Char2;
                    case 4:
                        return normalized ? WebGPUConstants.VertexFormat.Char4Norm : WebGPUConstants.VertexFormat.Char4;
                }
            case VertexBuffer.UNSIGNED_BYTE:
                switch (size) {
                    case 2:
                        return normalized ? WebGPUConstants.VertexFormat.Uchar2Norm : WebGPUConstants.VertexFormat.Uchar2;
                    case 4:
                        return normalized ? WebGPUConstants.VertexFormat.Uchar4Norm : WebGPUConstants.VertexFormat.Uchar4;
                }
            case VertexBuffer.SHORT:
                switch (size) {
                    case 2:
                        return normalized ? WebGPUConstants.VertexFormat.Short2Norm : WebGPUConstants.VertexFormat.Short2;
                    case 4:
                        return normalized ? WebGPUConstants.VertexFormat.Short4Norm : WebGPUConstants.VertexFormat.Short4;
                }
            case VertexBuffer.UNSIGNED_SHORT:
                switch (size) {
                    case 2:
                        return normalized ? WebGPUConstants.VertexFormat.Ushort2Norm : WebGPUConstants.VertexFormat.Ushort2;
                    case 4:
                        return normalized ? WebGPUConstants.VertexFormat.Ushort4Norm : WebGPUConstants.VertexFormat.Ushort4;
                }
            case VertexBuffer.INT:
                switch (size) {
                    case 1:
                        return WebGPUConstants.VertexFormat.Int;
                    case 2:
                        return WebGPUConstants.VertexFormat.Int2;
                    case 3:
                        return WebGPUConstants.VertexFormat.Int3;
                    case 4:
                        return WebGPUConstants.VertexFormat.Int4;
                }
            case VertexBuffer.UNSIGNED_INT:
                switch (size) {
                    case 1:
                        return WebGPUConstants.VertexFormat.Uint;
                    case 2:
                        return WebGPUConstants.VertexFormat.Uint2;
                    case 3:
                        return WebGPUConstants.VertexFormat.Uint3;
                    case 4:
                        return WebGPUConstants.VertexFormat.Uint4;
                }
            case VertexBuffer.FLOAT:
                switch (size) {
                    case 1:
                        return WebGPUConstants.VertexFormat.Float;
                    case 2:
                        return WebGPUConstants.VertexFormat.Float2;
                    case 3:
                        return WebGPUConstants.VertexFormat.Float3;
                    case 4:
                        return WebGPUConstants.VertexFormat.Float4;
                }
        }

        throw new Error("Invalid Format '" + kind + "'");
    }

    private _getVertexInputDescriptor(topology: GPUPrimitiveTopology): GPUVertexStateDescriptor {
        const descriptors: GPUVertexBufferLayoutDescriptor[] = [];
        const effect = this._currentEffect!;
        const attributes = effect.getAttributesNames();
        for (var index = 0; index < attributes.length; index++) {
            const location = effect.getAttributeLocation(index);

            if (location >= 0) {
                const vertexBuffer = this._currentVertexBuffers![attributes[index]];
                if (!vertexBuffer) {
                    continue;
                }

                const positionAttributeDescriptor: GPUVertexAttributeDescriptor = {
                    shaderLocation: location,
                    offset: 0, // not available in WebGL
                    format: this._getVertexInputDescriptorFormat(vertexBuffer),
                };

                // TODO WEBGPU. Factorize the one with the same underlying buffer.
                const vertexBufferDescriptor: GPUVertexBufferLayoutDescriptor = {
                    arrayStride: vertexBuffer.byteStride,
                    stepMode: vertexBuffer.getIsInstanced() ? WebGPUConstants.InputStepMode.Instance : WebGPUConstants.InputStepMode.Vertex,
                    attributes: [positionAttributeDescriptor]
                };

               descriptors.push(vertexBufferDescriptor);
            }
        }

        if (!this._currentIndexBuffer) {
            return {
                indexFormat: !this._indexFormatInRenderPass(topology) ? WebGPUConstants.IndexFormat.Uint32 : undefined,
                vertexBuffers: descriptors
            };
        }

        const inputStateDescriptor: GPUVertexStateDescriptor = {
            vertexBuffers: descriptors
        };

        if (!this._indexFormatInRenderPass(topology)) {
            inputStateDescriptor.indexFormat = this._currentIndexBuffer!.is32Bits ? WebGPUConstants.IndexFormat.Uint32 : WebGPUConstants.IndexFormat.Uint16;
        }

        return inputStateDescriptor;
    }

    private _getPipelineLayout(): GPUPipelineLayout {
        const bindGroupLayouts: GPUBindGroupLayout[] = [];
        const webgpuPipelineContext = this._currentEffect!._pipelineContext as WebGPUPipelineContext;

        for (let i = 0; i < webgpuPipelineContext.orderedUBOsAndSamplers.length; i++) {
            const setDefinition = webgpuPipelineContext.orderedUBOsAndSamplers[i];
            if (setDefinition === undefined) {
                const entries: GPUBindGroupLayoutEntry[] = [];
                const uniformsBindGroupLayout = this._device.createBindGroupLayout({
                    entries,
                });
                bindGroupLayouts[i] = uniformsBindGroupLayout;
                continue;
            }

            const entries: GPUBindGroupLayoutEntry[] = [];
            for (let j = 0; j < setDefinition.length; j++) {
                const bindingDefinition = webgpuPipelineContext.orderedUBOsAndSamplers[i][j];
                if (bindingDefinition === undefined) {
                    continue;
                }

                // TODO WEBGPU. Optimize shared samplers visibility for vertex/framgent.
                if (bindingDefinition.isSampler) {
                    entries.push({
                        binding: j,
                        visibility: WebGPUConstants.ShaderStage.Vertex | WebGPUConstants.ShaderStage.Fragment,
                        type: WebGPUConstants.BindingType.SampledTexture,
                        viewDimension: bindingDefinition.textureDimension,
                        // TODO WEBGPU. Handle texture component type properly.
                        // textureComponentType?: GPUTextureComponentType,
                        // multisampled?: boolean;
                        // hasDynamicOffset?: boolean;
                        // storageTextureFormat?: GPUTextureFormat;
                        // minBufferBindingSize?: number;
                    }, {
                        // TODO WEBGPU. No Magic + 1 (coming from current 1 texture 1 sampler startegy).
                        binding: j + 1,
                        visibility: WebGPUConstants.ShaderStage.Vertex | WebGPUConstants.ShaderStage.Fragment,
                        type: bindingDefinition.isComparisonSampler ? WebGPUConstants.BindingType.ComparisonSampler : WebGPUConstants.BindingType.Sampler
                    });
                }
                else {
                    entries.push({
                        binding: j,
                        visibility: WebGPUConstants.ShaderStage.Vertex | WebGPUConstants.ShaderStage.Fragment,
                        type: WebGPUConstants.BindingType.UniformBuffer,
                    });
                }
            }

            if (entries.length > 0) {
                const uniformsBindGroupLayout = this._device.createBindGroupLayout({
                    entries,
                });
                bindGroupLayouts[i] = uniformsBindGroupLayout;
            }
        }

        webgpuPipelineContext.bindGroupLayouts = bindGroupLayouts;
        return this._device.createPipelineLayout({ bindGroupLayouts });
    }

    private _getRenderPipeline(topology: GPUPrimitiveTopology): GPURenderPipeline {
        // This is wrong to cache this way but workarounds the need of cache in the simple demo context.
        const webgpuPipelineContext = this._currentEffect!._pipelineContext as WebGPUPipelineContext;
        /*if (webgpuPipelineContext.renderPipeline) {
            return webgpuPipelineContext.renderPipeline;
        }*/

        this._counters.numPipelineDescriptorCreation++;

        // Unsupported at the moment but needs to be extracted from the MSAA param.
        const rasterizationStateDescriptor = this._getRasterizationStateDescriptor();
        const depthStateDescriptor = this._getDepthStencilStateDescriptor();
        const colorStateDescriptors = this._getColorStateDescriptors();
        const stages = this._getStages();
        const inputStateDescriptor = this._getVertexInputDescriptor(topology);
        const pipelineLayout = this._getPipelineLayout();

        webgpuPipelineContext.renderPipeline = this._device.createRenderPipeline({
            sampleCount: this._currentRenderTarget ? this._currentRenderTarget.samples : this._mainPassSampleCount,
            primitiveTopology: topology,
            rasterizationState: rasterizationStateDescriptor,
            depthStencilState: depthStateDescriptor,
            colorStates: colorStateDescriptors,

            ...stages,
            vertexState: inputStateDescriptor,
            layout: pipelineLayout,
        });
        return webgpuPipelineContext.renderPipeline;
    }

    private _getVertexInputsToRender(): IWebGPUPipelineContextVertexInputsCache {
        const effect = this._currentEffect!;
        const webgpuPipelineContext = this._currentEffect!._pipelineContext as WebGPUPipelineContext;

        let vertexInputs = webgpuPipelineContext.vertexInputs;
        /*!!if (vertexInputs) {
            return vertexInputs;
        }*/

        vertexInputs = {
            indexBuffer: null,
            indexOffset: 0,

            vertexStartSlot: 0,
            vertexBuffers: [],
            vertexOffsets: [],
        };
        webgpuPipelineContext.vertexInputs = vertexInputs;

        if (this._currentIndexBuffer) {
            // TODO WEBGPU. Check if cache would be worth it.
            vertexInputs.indexBuffer = this._currentIndexBuffer.underlyingResource;
            vertexInputs.indexOffset = 0;
        }
        else {
            vertexInputs.indexBuffer = null;
        }

        const attributes = effect.getAttributesNames();
        for (var index = 0; index < attributes.length; index++) {
            const order = effect.getAttributeLocation(index);

            if (order >= 0) {
                const vertexBuffer = this._currentVertexBuffers![attributes[index]];
                if (!vertexBuffer) {
                    continue;
                }

                var buffer = vertexBuffer.getBuffer();
                if (buffer) {
                    vertexInputs.vertexBuffers.push(buffer.underlyingResource);
                    vertexInputs.vertexOffsets.push(vertexBuffer.byteOffset);
                }
            }
        }

        // TODO WEBGPU. Optimize buffer reusability and types as more are now allowed.
        return vertexInputs;
    }

    private _getBindGroupsToRender(): GPUBindGroup[] {
        const webgpuPipelineContext = this._currentEffect!._pipelineContext as WebGPUPipelineContext;
        let bindGroups = webgpuPipelineContext.bindGroups;
        /*if (bindGroups) {
            if (webgpuPipelineContext.uniformBuffer) {
                webgpuPipelineContext.uniformBuffer.update();
            }
            return bindGroups;
        }*/

        this._counters.numBindGroupsCreation++;

        if (webgpuPipelineContext.uniformBuffer) {
            this.bindUniformBufferBase(webgpuPipelineContext.uniformBuffer.getBuffer()!, 0, "LeftOver");
            webgpuPipelineContext.uniformBuffer.update();
        }

        bindGroups = [];
        webgpuPipelineContext.bindGroups = bindGroups;

        const bindGroupLayouts = webgpuPipelineContext.bindGroupLayouts;

        for (let i = 0; i < webgpuPipelineContext.orderedUBOsAndSamplers.length; i++) {
            const setDefinition = webgpuPipelineContext.orderedUBOsAndSamplers[i];
            if (setDefinition === undefined) {
                let groupLayout: GPUBindGroupLayout;
                if (bindGroupLayouts && bindGroupLayouts[i]) {
                    groupLayout = bindGroupLayouts[i];
                }
                else {
                    groupLayout = webgpuPipelineContext.renderPipeline.getBindGroupLayout(i);
                }
                bindGroups[i] = this._device.createBindGroup({
                    layout: groupLayout,
                    entries: [],
                });
                continue;
            }

            const entries: GPUBindGroupEntry[] = [];
            for (let j = 0; j < setDefinition.length; j++) {
                const bindingDefinition = webgpuPipelineContext.orderedUBOsAndSamplers[i][j];
                if (bindingDefinition === undefined) {
                    continue;
                }

                // TODO WEBGPU. Authorize shared samplers and Vertex Textures.
                if (bindingDefinition.isSampler) {
                    const bindingInfo = webgpuPipelineContext.samplers[bindingDefinition.name];
                    if (bindingInfo) {
                        if (dbgSanityChecks && bindingInfo.texture === null) {
                            console.error("Trying to bind a null texture! bindingDefinition=", bindingDefinition, " | bindingInfo=", bindingInfo);
                            debugger;
                        }
                        const hardwareTexture = bindingInfo.texture._hardwareTexture as WebGPUHardwareTexture;
                        if (!hardwareTexture.sampler) {
                            const samplerDescriptor: GPUSamplerDescriptor = this._getSamplerDescriptor(bindingInfo.texture!);
                            const gpuSampler = this._device.createSampler(samplerDescriptor);
                            hardwareTexture.sampler = gpuSampler;
                        }

                        if (dbgSanityChecks && !hardwareTexture.view) {
                            console.error("Trying to bind a null gpu texture! bindingDefinition=", bindingDefinition, " | bindingInfo=", bindingInfo, " | isReady=", bindingInfo.texture.isReady);
                            debugger;
                        }

                        // TODO WEBGPU remove this code
                        if ((bindingInfo.texture as any)._released) {
                            console.error("Trying to bind a released texture!", bindingInfo.texture, bindingInfo);
                            debugger;
                        }

                        entries.push({
                            binding: bindingInfo.textureBinding,
                            resource: hardwareTexture.view!,
                        }, {
                            binding: bindingInfo.samplerBinding,
                            resource: hardwareTexture.sampler!,
                        });
                    }
                    else {
                        Logger.Error("Sampler has not been bound: " + bindingDefinition.name);
                    }
                }
                else {
                    const dataBuffer = this._uniformsBuffers[bindingDefinition.name];
                    if (dataBuffer) {
                        const webgpuBuffer = dataBuffer.underlyingResource as GPUBuffer;
                        entries.push({
                            binding: j,
                            resource: {
                                buffer: webgpuBuffer,
                                offset: 0,
                                size: dataBuffer.capacity,
                            },
                        });
                    }
                    else {
                        Logger.Error("UBO has not been bound: " + bindingDefinition.name);
                    }
                }
            }

            if (entries.length > 0) {
                let groupLayout: GPUBindGroupLayout;
                if (bindGroupLayouts && bindGroupLayouts[i]) {
                    groupLayout = bindGroupLayouts[i];
                }
                else {
                    groupLayout = webgpuPipelineContext.renderPipeline.getBindGroupLayout(i);
                }
                bindGroups[i] = this._device.createBindGroup({
                    layout: groupLayout,
                    entries,
                });
            }
        }

        return bindGroups;
    }

    private _bindVertexInputs(vertexInputs: IWebGPUPipelineContextVertexInputsCache, setIndexFormat: boolean): void {
        const renderPass = this._bundleEncoder || this._getCurrentRenderPass();

        if (vertexInputs.indexBuffer) {
            // TODO WEBGPU. Check if cache would be worth it.
            if (setIndexFormat) {
                renderPass.setIndexBuffer(vertexInputs.indexBuffer, this._currentIndexBuffer!.is32Bits ? WebGPUConstants.IndexFormat.Uint32 : WebGPUConstants.IndexFormat.Uint16, vertexInputs.indexOffset);
            } else {
                renderPass.setIndexBuffer(vertexInputs.indexBuffer, vertexInputs.indexOffset);
            }
        }

        // TODO WEBGPU. Optimize buffer reusability and types as more are now allowed.
        for (let i = 0; i < vertexInputs.vertexBuffers.length; i++) {
            const buf = vertexInputs.vertexBuffers[i];
            if (buf) {
                renderPass.setVertexBuffer(vertexInputs.vertexStartSlot + i, buf, vertexInputs.vertexOffsets[i]);
            }
        }
    }

    private _setRenderBindGroups(bindGroups: GPUBindGroup[]): void {
        // TODO WEBGPU. Only set groups if changes happened.
        const renderPass = this._bundleEncoder || this._getCurrentRenderPass();
        for (let i = 0; i < bindGroups.length; i++) {
            renderPass.setBindGroup(i, bindGroups[i]);
        }
    }

    private _setRenderPipeline(fillMode: number): void {
        const renderPass = this._bundleEncoder || this._getCurrentRenderPass();

        const topology = this._getTopology(fillMode);
        const setIndexFormatInRenderPass = this._indexFormatInRenderPass(topology);

        const pipeline = this._getRenderPipeline(topology);
        renderPass.setPipeline(pipeline);

        const vertexInputs = this._getVertexInputsToRender();
        this._bindVertexInputs(vertexInputs, setIndexFormatInRenderPass);

        const bindGroups = this._getBindGroupsToRender();
        this._setRenderBindGroups(bindGroups);

        if (this._stencilState.stencilTest) {
            this._getCurrentRenderPass().setStencilReference(this._stencilState.stencilFuncRef);
        }

        // TODO WebGPU add back the dirty mechanism, but we need to distinguish between the main render pass and the RTT pass (if any)
        if (this._alphaState.alphaBlend /* && this._alphaState._isBlendConstantsDirty*/ && renderPass !== this._bundleEncoder) {
            // TODO WebGPU. should use renderPass.
            this._getCurrentRenderPass().setBlendColor(this._alphaState._blendConstants as any);
        }

        if (renderPass !== this._bundleEncoder) {
            this._applyViewport(renderPass as GPURenderPassEncoder);
        }
    }

    public drawElementsType(fillMode: number, indexStart: number, indexCount: number, instancesCount: number = 1): void {
        const renderPass = this._bundleEncoder || this._getCurrentRenderPass();

        this._setRenderPipeline(fillMode);

        renderPass.drawIndexed(indexCount, instancesCount || 1, indexStart, 0, 0);
    }

    public drawArraysType(fillMode: number, verticesStart: number, verticesCount: number, instancesCount: number = 1): void {
        const renderPass = this._bundleEncoder || this._getCurrentRenderPass();

        this._currentIndexBuffer = null;

        this._setRenderPipeline(fillMode);

        renderPass.draw(verticesCount, instancesCount || 1, verticesStart, 0);
    }

    /**
     * Force a specific size of the canvas
     * @param width defines the new canvas' width
     * @param height defines the new canvas' height
     * @returns true if the size was changed
     */
    public setSize(width: number, height: number): boolean {
        if (!super.setSize(width, height)) {
            return false;
        }

        if (dbgVerboseLogsForFirstFrames) {
            if (!(this as any)._count || (this as any)._count < dbgVerboseLogsNumFrames) {
                console.log("frame #" + (this as any)._count + " - setSize called -", width, height);
            }
        }

        this._initializeMainAttachments();
        return true;
    }

    public applyStates() {
    }

    //------------------------------------------------------------------------------
    //                              Render Bundle
    //------------------------------------------------------------------------------

    private _bundleEncoder: Nullable<GPURenderBundleEncoder>;

    /**
     * Start recording all the gpu calls into a bundle.
     */
    public startRecordBundle(): void {
        // TODO. WebGPU. options should be dynamic.
        this._bundleEncoder = this._device.createRenderBundleEncoder({
            colorFormats: [ WebGPUConstants.TextureFormat.BGRA8Unorm ],
            depthStencilFormat: WebGPUConstants.TextureFormat.Depth24PlusStencil8,
            sampleCount: this._mainPassSampleCount,
        });
    }

    /**
     * Stops recording the bundle.
     * @returns the recorded bundle
     */
    public stopRecordBundle(): GPURenderBundle {
        const bundle = this._bundleEncoder!.finish();
        this._bundleEncoder = null;
        return bundle;
    }

    /**
     * Execute the previously recorded bundle.
     * @param bundles defines the bundle to replay
     */
    public executeBundles(bundles: GPURenderBundle[]): void {
        const renderPass = this._getCurrentRenderPass();

        renderPass.executeBundles(bundles);
    }

    //------------------------------------------------------------------------------
    //                              Dispose
    //------------------------------------------------------------------------------

    /**
     * Dispose and release all associated resources
     */
    public dispose(): void {
        this._compiledShaders = { };
        if (this._mainTexture) {
            this._mainTexture.destroy();
        }
        if (this._depthTexture) {
            this._depthTexture.destroy();
        }
        super.dispose();
    }

    //------------------------------------------------------------------------------
    //                              Misc
    //------------------------------------------------------------------------------

    public getRenderWidth(useScreen = false): number {
        if (!useScreen && this._currentRenderTarget) {
            return this._currentRenderTarget.width;
        }

        return this._canvas.width;
    }

    public getRenderHeight(useScreen = false): number {
        if (!useScreen && this._currentRenderTarget) {
            return this._currentRenderTarget.height;
        }

        return this._canvas.height;
    }

    public getRenderingCanvas(): Nullable<HTMLCanvasElement> {
        return this._canvas;
    }

    //------------------------------------------------------------------------------
    //                              Errors
    //------------------------------------------------------------------------------

    public getError(): number {
        // TODO WEBGPU. from the webgpu errors.
        return 0;
    }

    //------------------------------------------------------------------------------
    //                              Unused WebGPU
    //------------------------------------------------------------------------------
    public areAllEffectsReady(): boolean {
        // No parallel shader compilation.
        return true;
    }

    public _executeWhenRenderingStateIsCompiled(pipelineContext: IPipelineContext, action: () => void) {
        // No parallel shader compilation.
        // No Async, so direct launch
        action();
    }

    public _isRenderingStateCompiled(pipelineContext: IPipelineContext): boolean {
        // No parallel shader compilation.
        return true;
    }

    public _getUnpackAlignement(): number {
        return 1;
    }

    public _unpackFlipY(value: boolean) { }

    // TODO WEBGPU. All of the below should go once engine split with baseEngine.

    /** @hidden */
    public _getSamplingParameters(samplingMode: number, generateMipMaps: boolean): { min: number; mag: number } {
        throw "_getSamplingParameters is not available in WebGPU";
    }

    public bindUniformBlock(pipelineContext: IPipelineContext, blockName: string, index: number): void {
    }

    public getUniforms(pipelineContext: IPipelineContext, uniformsNames: string[]): Nullable<WebGLUniformLocation>[] {
        return [];
    }

    public setIntArray(uniform: WebGLUniformLocation, array: Int32Array): boolean {
        return false;
    }

    public setIntArray2(uniform: WebGLUniformLocation, array: Int32Array): boolean {
        return false;
    }

    public setIntArray3(uniform: WebGLUniformLocation, array: Int32Array): boolean {
        return false;
    }

    public setIntArray4(uniform: WebGLUniformLocation, array: Int32Array): boolean {
        return false;
    }

    public setArray(uniform: WebGLUniformLocation, array: number[]): boolean {
        return false;
    }

    public setArray2(uniform: WebGLUniformLocation, array: number[]): boolean {
        return false;
    }

    public setArray3(uniform: WebGLUniformLocation, array: number[]): boolean {
        return false;
    }

    public setArray4(uniform: WebGLUniformLocation, array: number[]): boolean {
        return false;
    }

    public setMatrices(uniform: WebGLUniformLocation, matrices: Float32Array): boolean {
        return false;
    }

    public setMatrix3x3(uniform: WebGLUniformLocation, matrix: Float32Array): boolean {
        return false;
    }

    public setMatrix2x2(uniform: WebGLUniformLocation, matrix: Float32Array): boolean {
        return false;
    }

    public setFloat(uniform: WebGLUniformLocation, value: number): boolean {
        return false;
    }

    public setFloat2(uniform: WebGLUniformLocation, x: number, y: number): boolean {
        return false;
    }

    public setFloat3(uniform: WebGLUniformLocation, x: number, y: number, z: number): boolean {
        return false;
    }

    public setFloat4(uniform: WebGLUniformLocation, x: number, y: number, z: number, w: number): boolean {
        return false;
    }
}

/** @hidden */
function _convertRGBtoRGBATextureData(rgbData: any, width: number, height: number, textureType: number): ArrayBufferView {
    // Create new RGBA data container.
    var rgbaData: any;
    if (textureType === Constants.TEXTURETYPE_FLOAT) {
        rgbaData = new Float32Array(width * height * 4);
    }
    else {
        rgbaData = new Uint32Array(width * height * 4);
    }

    // Convert each pixel.
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let index = (y * width + x) * 3;
            let newIndex = (y * width + x) * 4;

            // Map Old Value to new value.
            rgbaData[newIndex + 0] = rgbData[index + 0];
            rgbaData[newIndex + 1] = rgbData[index + 1];
            rgbaData[newIndex + 2] = rgbData[index + 2];

            // Add fully opaque alpha channel.
            rgbaData[newIndex + 3] = 1;
        }
    }

    return rgbaData;
}
