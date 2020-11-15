// Copyright 2020 Brandon Jones
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
import * as WebGPUConstants from './webgpuConstants';
import { Scalar } from '../../Maths/math.scalar';
import { WebGPUBufferManager } from './webgpuBufferManager';
import { Constants } from '../constants';
import { Nullable } from '../../types';
import { InternalTexture, InternalTextureSource } from '../../Materials/Textures/internalTexture';
import { HardwareTextureWrapper } from '../../Materials/Textures/hardwareTextureWrapper';
import { BaseTexture } from '../../Materials/Textures/baseTexture';
import { Engine } from '../engine';
import { WebGPUHardwareTexture } from './webgpuHardwareTexture';

// TODO WEBGPU improve mipmap generation by not using the OutputAttachment flag
// see https://github.com/toji/web-texture-tool/tree/main/src

// TODO WEBGPU optimize, don't recreate things that can be cached (bind groups, descriptors, etc)

// TODO WEBGPU use WGSL instead of GLSL
const mipmapVertexSource = `
    const vec2 pos[4] = vec2[4](vec2(-1.0f, 1.0f), vec2(1.0f, 1.0f), vec2(-1.0f, -1.0f), vec2(1.0f, -1.0f));
    const vec2 tex[4] = vec2[4](vec2(0.0f, 0.0f), vec2(1.0f, 0.0f), vec2(0.0f, 1.0f), vec2(1.0f, 1.0f));

    layout(location = 0) out vec2 vTex;

    void main() {
        vTex = tex[gl_VertexIndex];
        gl_Position = vec4(pos[gl_VertexIndex], 0.0, 1.0);
    }
    `;

const mipmapFragmentSource = `
    layout(set = 0, binding = 0) uniform sampler imgSampler;
    layout(set = 0, binding = 1) uniform texture2D img;

    layout(location = 0) in vec2 vTex;
    layout(location = 0) out vec4 outColor;

    void main() {
        outColor = texture(sampler2D(img, imgSampler), vTex);
    }
    `;

const invertYPreMultiplyAlphaVertexSource = `
    const vec2 pos[4] = vec2[4](vec2(-1.0f, 1.0f), vec2(1.0f, 1.0f), vec2(-1.0f, -1.0f), vec2(1.0f, -1.0f));
    const vec2 tex[4] = vec2[4](vec2(0.0f, 0.0f), vec2(1.0f, 0.0f), vec2(0.0f, 1.0f), vec2(1.0f, 1.0f));

    layout(location = 0) out vec2 vTex;

    void main() {
        vTex = tex[gl_VertexIndex];
    #ifdef INVERTY
        vTex.y = 1.0 - vTex.y;
    #endif
        gl_Position = vec4(pos[gl_VertexIndex], 0.0, 1.0);
    }
    `;

const invertYPreMultiplyAlphaFragmentSource = `
    layout(set = 0, binding = 0) uniform sampler imgSampler;
    layout(set = 0, binding = 1) uniform texture2D img;

    layout(location = 0) in vec2 vTex;
    layout(location = 0) out vec4 outColor;

    void main() {
        vec4 color = texture(sampler2D(img, imgSampler), vTex);
    #ifdef PREMULTIPLYALPHA
        color.rgb *= color.a;
    #endif
        outColor = color;
    }
    `;

const filterToBits = [
    0 | 0 << 1 | 0 << 2, // not used
    0 | 0 << 1 | 0 << 2, // TEXTURE_NEAREST_SAMPLINGMODE / TEXTURE_NEAREST_NEAREST
    1 | 1 << 1 | 0 << 2, // TEXTURE_BILINEAR_SAMPLINGMODE / TEXTURE_LINEAR_LINEAR
    1 | 1 << 1 | 1 << 2, // TEXTURE_TRILINEAR_SAMPLINGMODE / TEXTURE_LINEAR_LINEAR_MIPLINEAR
    0 | 0 << 1 | 0 << 2, // TEXTURE_NEAREST_NEAREST_MIPNEAREST
    0 | 1 << 1 | 0 << 2, // TEXTURE_NEAREST_LINEAR_MIPNEAREST
    0 | 1 << 1 | 1 << 2, // TEXTURE_NEAREST_LINEAR_MIPLINEAR
    0 | 1 << 1 | 0 << 2, // TEXTURE_NEAREST_LINEAR
    0 | 0 << 1 | 1 << 2, // TEXTURE_NEAREST_NEAREST_MIPLINEAR
    1 | 0 << 1 | 0 << 2, // TEXTURE_LINEAR_NEAREST_MIPNEAREST
    1 | 0 << 1 | 1 << 2, // TEXTURE_LINEAR_NEAREST_MIPLINEAR
    1 | 1 << 1 | 0 << 2, // TEXTURE_LINEAR_LINEAR_MIPNEAREST
    1 | 0 << 1 | 0 << 2, // TEXTURE_LINEAR_NEAREST
];

// subtract 0x01FF from the comparison function value before indexing this array!
const comparisonFunctionToBits = [
    0 << 3 | 0 << 4 | 0 << 5 | 0 << 6, // undefined
    0 << 3 | 0 << 4 | 0 << 5 | 1 << 6, // NEVER
    0 << 3 | 0 << 4 | 1 << 5 | 0 << 6, // LESS
    0 << 3 | 0 << 4 | 1 << 5 | 1 << 6, // EQUAL
    0 << 3 | 1 << 4 | 0 << 5 | 0 << 6, // LEQUAL
    0 << 3 | 1 << 4 | 0 << 5 | 1 << 6, // GREATER
    0 << 3 | 1 << 4 | 1 << 5 | 0 << 6, // NOTEQUAL
    0 << 3 | 1 << 4 | 1 << 5 | 1 << 6, // GEQUAL
    1 << 3 | 0 << 4 | 0 << 5 | 0 << 6, // ALWAYS
];

const filterNoMipToBits = [
    0 << 7, // not used
    1 << 7, // TEXTURE_NEAREST_SAMPLINGMODE / TEXTURE_NEAREST_NEAREST
    1 << 7, // TEXTURE_BILINEAR_SAMPLINGMODE / TEXTURE_LINEAR_LINEAR
    0 << 7, // TEXTURE_TRILINEAR_SAMPLINGMODE / TEXTURE_LINEAR_LINEAR_MIPLINEAR
    0 << 7, // TEXTURE_NEAREST_NEAREST_MIPNEAREST
    0 << 7, // TEXTURE_NEAREST_LINEAR_MIPNEAREST
    0 << 7, // TEXTURE_NEAREST_LINEAR_MIPLINEAR
    1 << 7, // TEXTURE_NEAREST_LINEAR
    0 << 7, // TEXTURE_NEAREST_NEAREST_MIPLINEAR
    0 << 7, // TEXTURE_LINEAR_NEAREST_MIPNEAREST
    0 << 7, // TEXTURE_LINEAR_NEAREST_MIPLINEAR
    0 << 7, // TEXTURE_LINEAR_LINEAR_MIPNEAREST
    1 << 7, // TEXTURE_LINEAR_NEAREST
];

export class WebGPUTextureHelper {

    private _device: GPUDevice;
    private _glslang: any;
    private _bufferManager: WebGPUBufferManager;
    private _mipmapSampler: GPUSampler;
    private _invertYPreMultiplyAlphaSampler: GPUSampler;
    private _pipelines: { [format: string]: Array<GPURenderPipeline> } = {};
    private _compiledShaders: GPUShaderModule[][] = [];
    private _deferredReleaseTextures: Array<[Nullable<InternalTexture>, Nullable<HardwareTextureWrapper | GPUTexture>, Nullable<BaseTexture>, Nullable<InternalTexture>]> = [];
    private _samplers: { [hash: number]: GPUSampler } = {};
    private _commandEncoderForCreation: GPUCommandEncoder;

    public static computeNumMipmapLevels(width: number, height: number) {
        return Scalar.ILog2(Math.max(width, height)) + 1;
    }

    //------------------------------------------------------------------------------
    //                         Initialization / Helpers
    //------------------------------------------------------------------------------

    constructor(device: GPUDevice, glslang: any, bufferManager: WebGPUBufferManager) {
        this._device = device;
        this._glslang = glslang;
        this._bufferManager = bufferManager;

        this._mipmapSampler = device.createSampler({ minFilter: WebGPUConstants.FilterMode.Linear });
        this._invertYPreMultiplyAlphaSampler = device.createSampler({ minFilter: WebGPUConstants.FilterMode.Nearest, magFilter: WebGPUConstants.FilterMode.Nearest });

        this._getPipeline(WebGPUConstants.TextureFormat.RGBA8Unorm);
    }

    private _getPipeline(format: GPUTextureFormat, forMipMap = true, invertY = false, premultiplyAlpha = false): GPURenderPipeline {
        const index = (forMipMap ? 1 : 0) + ((invertY ? 1 : 0) << 1) + (premultiplyAlpha ? 1 : 0) << 2;
        if (!this._pipelines[format]) {
            this._pipelines[format] = [];
        }
        let pipeline = this._pipelines[format][index];
        if (!pipeline) {
            let defines = "#version 450\r\n";
            if (invertY) {
                defines += "#define INVERTY\r\n";
            }
            if (premultiplyAlpha) {
                defines += "define PREMULTIPLYALPHA\r\n";
            }
            let modules = this._compiledShaders[index];
            if (!modules) {
                const vertexModule = this._device.createShaderModule({
                    code: this._glslang.compileGLSL(forMipMap ? defines + mipmapVertexSource : defines + invertYPreMultiplyAlphaVertexSource, 'vertex')
                });
                const fragmentModule = this._device.createShaderModule({
                    code: this._glslang.compileGLSL(forMipMap ? defines + mipmapFragmentSource : defines + invertYPreMultiplyAlphaFragmentSource, 'fragment')
                });
                modules = this._compiledShaders[index] = [vertexModule, fragmentModule];
            }
            pipeline = this._pipelines[format][index] = this._device.createRenderPipeline({
                vertexStage: {
                    module: modules[0],
                    entryPoint: 'main'
                },
                fragmentStage: {
                    module: modules[1],
                    entryPoint: 'main'
                },
                primitiveTopology: WebGPUConstants.PrimitiveTopology.TriangleStrip,
                vertexState: {
                    indexFormat: WebGPUConstants.IndexFormat.Uint16
                },
                colorStates: [{
                    format,
                }]
            });
        }
        return pipeline;
    }

    private _getTextureTypeFromFormat(format: GPUTextureFormat): number {
        switch (format) {
            // One Component = 8 bits
            case WebGPUConstants.TextureFormat.R8Unorm:
            case WebGPUConstants.TextureFormat.R8Snorm:
            case WebGPUConstants.TextureFormat.R8Uint:
            case WebGPUConstants.TextureFormat.R8Sint:
            case WebGPUConstants.TextureFormat.RG8Unorm:
            case WebGPUConstants.TextureFormat.RG8Snorm:
            case WebGPUConstants.TextureFormat.RG8Uint:
            case WebGPUConstants.TextureFormat.RG8Sint:
            case WebGPUConstants.TextureFormat.RGBA8Unorm:
            case WebGPUConstants.TextureFormat.RGBA8UnormSRGB:
            case WebGPUConstants.TextureFormat.RGBA8Snorm:
            case WebGPUConstants.TextureFormat.RGBA8Uint:
            case WebGPUConstants.TextureFormat.RGBA8Sint:
            case WebGPUConstants.TextureFormat.BGRA8Unorm:
            case WebGPUConstants.TextureFormat.BGRA8UnormSRGB:
            case WebGPUConstants.TextureFormat.RGB10A2Unorm: // composite format - let's say it's byte...
            case WebGPUConstants.TextureFormat.RGB9E5UFloat: // composite format - let's say it's byte...
            case WebGPUConstants.TextureFormat.RG11B10UFloat: // composite format - let's say it's byte...
            case WebGPUConstants.TextureFormat.Depth24UnormStencil8: // composite format - let's say it's byte...
            case WebGPUConstants.TextureFormat.Depth32FloatStencil8: // composite format - let's say it's byte...
            case WebGPUConstants.TextureFormat.BC7RGBAUnorm:
            case WebGPUConstants.TextureFormat.BC7RGBAUnormSRGB:
            case WebGPUConstants.TextureFormat.BC6HRGBUFloat:
            case WebGPUConstants.TextureFormat.BC6HRGBFloat:
            case WebGPUConstants.TextureFormat.BC5RGUnorm:
            case WebGPUConstants.TextureFormat.BC5RGSnorm:
            case WebGPUConstants.TextureFormat.BC3RGBAUnorm:
            case WebGPUConstants.TextureFormat.BC3RGBAUnormSRGB:
            case WebGPUConstants.TextureFormat.BC2RGBAUnorm:
            case WebGPUConstants.TextureFormat.BC2RGBAUnormSRGB:
            case WebGPUConstants.TextureFormat.BC4RUnorm:
            case WebGPUConstants.TextureFormat.BC4RSnorm:
            case WebGPUConstants.TextureFormat.BC1RGBAUNorm:
            case WebGPUConstants.TextureFormat.BC1RGBAUnormSRGB:
                return Constants.TEXTURETYPE_UNSIGNED_BYTE;

            // One component = 16 bits
            case WebGPUConstants.TextureFormat.R16Uint:
            case WebGPUConstants.TextureFormat.R16Sint:
            case WebGPUConstants.TextureFormat.RG16Uint:
            case WebGPUConstants.TextureFormat.RG16Sint:
            case WebGPUConstants.TextureFormat.RGBA16Uint:
            case WebGPUConstants.TextureFormat.RGBA16Sint:
            case WebGPUConstants.TextureFormat.Depth16Unorm:
                return Constants.TEXTURETYPE_UNSIGNED_SHORT;

            case WebGPUConstants.TextureFormat.R16Float:
            case WebGPUConstants.TextureFormat.RG16Float:
            case WebGPUConstants.TextureFormat.RGBA16Float:
                return Constants.TEXTURETYPE_HALF_FLOAT;

            // One component = 32 bits
            case WebGPUConstants.TextureFormat.R32Uint:
            case WebGPUConstants.TextureFormat.R32Sint:
            case WebGPUConstants.TextureFormat.RG32Uint:
            case WebGPUConstants.TextureFormat.RG32Sint:
            case WebGPUConstants.TextureFormat.RGBA32Uint:
            case WebGPUConstants.TextureFormat.RGBA32Sint:
                return Constants.TEXTURETYPE_UNSIGNED_INTEGER;

            case WebGPUConstants.TextureFormat.R32Float:
            case WebGPUConstants.TextureFormat.RG32Float:
            case WebGPUConstants.TextureFormat.RGBA32Float:
            case WebGPUConstants.TextureFormat.Depth32Float:
                return Constants.TEXTURETYPE_FLOAT;

            case WebGPUConstants.TextureFormat.Stencil8:
                throw "No fixed size for Stencil8 format!";
            case WebGPUConstants.TextureFormat.Depth24Plus:
                throw "No fixed size for Depth24Plus format!";
            case WebGPUConstants.TextureFormat.Depth24PlusStencil8:
                throw "No fixed size for Depth24PlusStencil8 format!";
        }

        return Constants.TEXTURETYPE_UNSIGNED_BYTE;
    }

    private _getBlockInformationFromFormat(format: GPUTextureFormat): { width: number, height: number, length: number } {
        switch (format) {
            // 8 bits formats
            case WebGPUConstants.TextureFormat.R8Unorm:
            case WebGPUConstants.TextureFormat.R8Snorm:
            case WebGPUConstants.TextureFormat.R8Uint:
            case WebGPUConstants.TextureFormat.R8Sint:
                return { width: 1, height: 1, length: 1 };

            // 16 bits formats
            case WebGPUConstants.TextureFormat.R16Uint:
            case WebGPUConstants.TextureFormat.R16Sint:
            case WebGPUConstants.TextureFormat.R16Float:
            case WebGPUConstants.TextureFormat.RG8Unorm:
            case WebGPUConstants.TextureFormat.RG8Snorm:
            case WebGPUConstants.TextureFormat.RG8Uint:
            case WebGPUConstants.TextureFormat.RG8Sint:
                return { width: 1, height: 1, length: 2 };

            // 32 bits formats
            case WebGPUConstants.TextureFormat.R32Uint:
            case WebGPUConstants.TextureFormat.R32Sint:
            case WebGPUConstants.TextureFormat.R32Float:
            case WebGPUConstants.TextureFormat.RG16Uint:
            case WebGPUConstants.TextureFormat.RG16Sint:
            case WebGPUConstants.TextureFormat.RG16Float:
            case WebGPUConstants.TextureFormat.RGBA8Unorm:
            case WebGPUConstants.TextureFormat.RGBA8UnormSRGB:
            case WebGPUConstants.TextureFormat.RGBA8Snorm:
            case WebGPUConstants.TextureFormat.RGBA8Uint:
            case WebGPUConstants.TextureFormat.RGBA8Sint:
            case WebGPUConstants.TextureFormat.BGRA8Unorm:
            case WebGPUConstants.TextureFormat.BGRA8UnormSRGB:
            case WebGPUConstants.TextureFormat.RGB9E5UFloat:
            case WebGPUConstants.TextureFormat.RGB10A2Unorm:
            case WebGPUConstants.TextureFormat.RG11B10UFloat:
                return { width: 1, height: 1, length: 4 };

            // 64 bits formats
            case WebGPUConstants.TextureFormat.RG32Uint:
            case WebGPUConstants.TextureFormat.RG32Sint:
            case WebGPUConstants.TextureFormat.RG32Float:
            case WebGPUConstants.TextureFormat.RGBA16Uint:
            case WebGPUConstants.TextureFormat.RGBA16Sint:
            case WebGPUConstants.TextureFormat.RGBA16Float:
                return { width: 1, height: 1, length: 8 };

            // 128 bits formats
            case WebGPUConstants.TextureFormat.RGBA32Uint:
            case WebGPUConstants.TextureFormat.RGBA32Sint:
            case WebGPUConstants.TextureFormat.RGBA32Float:
                return { width: 1, height: 1, length: 16 };

            // Depth and stencil formats
            case WebGPUConstants.TextureFormat.Stencil8:
                throw "No fixed size for Stencil8 format!";
            case WebGPUConstants.TextureFormat.Depth16Unorm:
                return { width: 1, height: 1, length: 2 };
            case WebGPUConstants.TextureFormat.Depth24Plus:
                throw "No fixed size for Depth24Plus format!";
            case WebGPUConstants.TextureFormat.Depth24PlusStencil8:
                throw "No fixed size for Depth24PlusStencil8 format!";
            case WebGPUConstants.TextureFormat.Depth32Float:
                return { width: 1, height: 1, length: 4 };
            case WebGPUConstants.TextureFormat.Depth24UnormStencil8:
                return { width: 1, height: 1, length: 4 };
            case WebGPUConstants.TextureFormat.Depth32FloatStencil8:
                return { width: 1, height: 1, length: 5 };

            // BC compressed formats usable if "texture-compression-bc" is both
            // supported by the device/user agent and enabled in requestDevice.
            case WebGPUConstants.TextureFormat.BC7RGBAUnorm:
            case WebGPUConstants.TextureFormat.BC7RGBAUnormSRGB:
            case WebGPUConstants.TextureFormat.BC6HRGBUFloat:
            case WebGPUConstants.TextureFormat.BC6HRGBFloat:
            case WebGPUConstants.TextureFormat.BC5RGUnorm:
            case WebGPUConstants.TextureFormat.BC5RGSnorm:
            case WebGPUConstants.TextureFormat.BC3RGBAUnorm:
            case WebGPUConstants.TextureFormat.BC3RGBAUnormSRGB:
            case WebGPUConstants.TextureFormat.BC2RGBAUnorm:
            case WebGPUConstants.TextureFormat.BC2RGBAUnormSRGB:
                return { width: 4, height: 4, length: 16 };

            case WebGPUConstants.TextureFormat.BC4RUnorm:
            case WebGPUConstants.TextureFormat.BC4RSnorm:
            case WebGPUConstants.TextureFormat.BC1RGBAUNorm:
            case WebGPUConstants.TextureFormat.BC1RGBAUnormSRGB:
                return { width: 4, height: 4, length: 8 };
        }

        return { width: 1, height: 1, length: 4 };
    }

    private _isHardwareTexture(texture: HardwareTextureWrapper | GPUTexture): texture is HardwareTextureWrapper {
        return !!(texture as HardwareTextureWrapper).release;
    }

    private _isInternalTexture(texture: InternalTexture | GPUTexture): texture is InternalTexture {
        return !!(texture as InternalTexture).dispose;
    }

    public isImageBitmap(imageBitmap: ImageBitmap | { width: number, height: number }): imageBitmap is ImageBitmap {
        return (imageBitmap as ImageBitmap).close !== undefined;
    }

    public isImageBitmapArray(imageBitmap: ImageBitmap[] | { width: number, height: number }): imageBitmap is ImageBitmap[] {
        return Array.isArray(imageBitmap as ImageBitmap[]) && (imageBitmap as ImageBitmap[])[0].close !== undefined;
    }

    public setCommandEncoder(encoder: GPUCommandEncoder): void {
        this._commandEncoderForCreation = encoder;
    }

    public isCompressedFormat(format: GPUTextureFormat): boolean {
        switch (format) {
            case WebGPUConstants.TextureFormat.BC7RGBAUnormSRGB:
            case WebGPUConstants.TextureFormat.BC7RGBAUnorm:
            case WebGPUConstants.TextureFormat.BC6HRGBFloat:
            case WebGPUConstants.TextureFormat.BC6HRGBUFloat:
            case WebGPUConstants.TextureFormat.BC5RGSnorm:
            case WebGPUConstants.TextureFormat.BC5RGUnorm:
            case WebGPUConstants.TextureFormat.BC4RSnorm:
            case WebGPUConstants.TextureFormat.BC4RUnorm:
            case WebGPUConstants.TextureFormat.BC3RGBAUnormSRGB:
            case WebGPUConstants.TextureFormat.BC3RGBAUnorm:
            case WebGPUConstants.TextureFormat.BC2RGBAUnormSRGB:
            case WebGPUConstants.TextureFormat.BC2RGBAUnorm:
            case WebGPUConstants.TextureFormat.BC1RGBAUnormSRGB:
            case WebGPUConstants.TextureFormat.BC1RGBAUNorm:
                return true;
        }

        return false;
    }

    public getWebGPUTextureFormat(type: number, format: number): GPUTextureFormat {
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
                return WebGPUConstants.TextureFormat.BC6HRGBFloat;
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

    public invertYPreMultiplyAlpha(gpuTexture: GPUTexture, width: number, height: number, format: GPUTextureFormat, invertY = false, premultiplyAlpha = false, faceIndex= 0, commandEncoder?: GPUCommandEncoder): void {
        const useOwnCommandEncoder = commandEncoder === undefined;
        const pipeline = this._getPipeline(format, false, invertY, premultiplyAlpha);
        const bindGroupLayout = pipeline.getBindGroupLayout(0);

        if (useOwnCommandEncoder) {
            commandEncoder = this._device.createCommandEncoder({});
        }

        commandEncoder!.pushDebugGroup(`internal process texture - invertY=${invertY} premultiplyAlpha=${premultiplyAlpha}`);

        const outputTexture = this.createTexture({ width, height, layers: 1 }, false, false, false, false, false, format, 1, commandEncoder, WebGPUConstants.TextureUsage.CopySrc | WebGPUConstants.TextureUsage.OutputAttachment | WebGPUConstants.TextureUsage.Sampled);

        const passEncoder = commandEncoder!.beginRenderPass({
            colorAttachments: [{
                attachment: outputTexture.createView({
                    dimension: WebGPUConstants.TextureViewDimension.E2d,
                    baseMipLevel: 0,
                    mipLevelCount: 1,
                    arrayLayerCount: 1,
                    baseArrayLayer: 0,
                }),
                loadValue: WebGPUConstants.LoadOp.Load,
            }],
        });

        const bindGroup = this._device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                binding: 0,
                resource: this._invertYPreMultiplyAlphaSampler,
            }, {
                binding: 1,
                resource: gpuTexture.createView({
                    dimension: WebGPUConstants.TextureViewDimension.E2d,
                    baseMipLevel: 0,
                    mipLevelCount: 1,
                    arrayLayerCount: 1,
                    baseArrayLayer: faceIndex,
                }),
            }],
        });

        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.draw(4, 1, 0, 0);
        passEncoder.endPass();

        commandEncoder!.copyTextureToTexture({
                texture: outputTexture,
            }, {
                texture: gpuTexture,
                origin: {
                    x: 0,
                    y: 0,
                    z: Math.max(faceIndex, 0),
                }
            }, {
                width,
                height,
                depth: 1,
            }
        );

        this._deferredReleaseTextures.push([null, outputTexture, null, null]);

        commandEncoder!.popDebugGroup();

        if (useOwnCommandEncoder) {
            this._device.defaultQueue.submit([commandEncoder!.finish()]);
            commandEncoder = null as any;
        }
    }

    //------------------------------------------------------------------------------
    //                               Creation
    //------------------------------------------------------------------------------

    public createTexture(imageBitmap: ImageBitmap | { width: number, height: number, layers: number }, hasMipmaps = false, generateMipmaps = false, invertY = false, premultiplyAlpha = false, is3D = false, format: GPUTextureFormat = WebGPUConstants.TextureFormat.RGBA8Unorm,
        sampleCount = 1, commandEncoder?: GPUCommandEncoder, usage = -1): GPUTexture
    {
        const layerCount = (imageBitmap as any).layers || 1;
        let textureSize = {
            width: imageBitmap.width,
            height: imageBitmap.height,
            depth: layerCount,
        };

        const mipLevelCount = hasMipmaps ? WebGPUTextureHelper.computeNumMipmapLevels(imageBitmap.width, imageBitmap.height) : 1;
        const usages = usage >= 0 ? usage : WebGPUConstants.TextureUsage.CopySrc | WebGPUConstants.TextureUsage.CopyDst | WebGPUConstants.TextureUsage.Sampled;
        const additionalUsages = hasMipmaps && !this.isCompressedFormat(format) ? WebGPUConstants.TextureUsage.CopySrc | WebGPUConstants.TextureUsage.OutputAttachment : 0;

        const gpuTexture = this._device.createTexture({
            size: textureSize,
            dimension: is3D ? WebGPUConstants.TextureDimension.E3d : WebGPUConstants.TextureDimension.E2d,
            format,
            usage:  usages | additionalUsages,
            sampleCount,
            mipLevelCount
        });

        if (this.isImageBitmap(imageBitmap)) {
            this.updateTexture(imageBitmap, gpuTexture, imageBitmap.width, imageBitmap.height, layerCount, format, 0, 0, invertY, premultiplyAlpha, 0, 0, commandEncoder);

            if (hasMipmaps && generateMipmaps) {
                this.generateMipmaps(gpuTexture, format, mipLevelCount, 0, commandEncoder);
            }
        }

        return gpuTexture;
    }

    public createCubeTexture(imageBitmaps: ImageBitmap[] | { width: number, height: number }, hasMipmaps = false, generateMipmaps = false, invertY = false, premultiplyAlpha = false, format: GPUTextureFormat = WebGPUConstants.TextureFormat.RGBA8Unorm,
        sampleCount = 1, commandEncoder?: GPUCommandEncoder, usage = -1): GPUTexture
    {
        const width = this.isImageBitmapArray(imageBitmaps) ? imageBitmaps[0].width : imageBitmaps.width;
        const height = this.isImageBitmapArray(imageBitmaps) ? imageBitmaps[0].height : imageBitmaps.height;

        const mipLevelCount = hasMipmaps ? WebGPUTextureHelper.computeNumMipmapLevels(width, height) : 1;
        const usages = usage >= 0 ? usage : WebGPUConstants.TextureUsage.CopySrc | WebGPUConstants.TextureUsage.CopyDst | WebGPUConstants.TextureUsage.Sampled;
        const additionalUsages = hasMipmaps && !this.isCompressedFormat(format) ? WebGPUConstants.TextureUsage.CopySrc | WebGPUConstants.TextureUsage.OutputAttachment : 0;

        const gpuTexture = this._device.createTexture({
            size: {
                width,
                height,
                depth: 6,
            },
            dimension: WebGPUConstants.TextureDimension.E2d,
            format,
            usage: usages | additionalUsages,
            sampleCount,
            mipLevelCount
        });

        if (this.isImageBitmapArray(imageBitmaps)) {
            this.updateCubeTextures(imageBitmaps, gpuTexture, width, height, format, invertY, premultiplyAlpha, 0, 0, commandEncoder);

            if (hasMipmaps && generateMipmaps) {
                this.generateCubeMipmaps(gpuTexture, format, mipLevelCount, commandEncoder);
            }
        }

        return gpuTexture;
    }

    public generateCubeMipmaps(gpuTexture: GPUTexture, format: GPUTextureFormat, mipLevelCount: number, commandEncoder?: GPUCommandEncoder): void {
        const useOwnCommandEncoder = commandEncoder === undefined;

        if (useOwnCommandEncoder) {
            commandEncoder = this._device.createCommandEncoder({});
        }

        commandEncoder!.pushDebugGroup(`create cube mipmaps - ${mipLevelCount} levels`);

        for (let f = 0; f < 6; ++f) {
            this.generateMipmaps(gpuTexture, format, mipLevelCount, f, commandEncoder);
        }

        commandEncoder!.popDebugGroup();

        if (useOwnCommandEncoder) {
            this._device.defaultQueue.submit([commandEncoder!.finish()]);
            commandEncoder = null as any;
        }
    }

    public generateMipmaps(gpuTexture: GPUTexture, format: GPUTextureFormat, mipLevelCount: number, faceIndex= 0, commandEncoder?: GPUCommandEncoder): void {
        const useOwnCommandEncoder = commandEncoder === undefined;
        const pipeline = this._getPipeline(format);
        const bindGroupLayout = pipeline.getBindGroupLayout(0);

        if (useOwnCommandEncoder) {
            commandEncoder = this._device.createCommandEncoder({});
        }

        commandEncoder!.pushDebugGroup(`create mipmaps for face #${faceIndex} - ${mipLevelCount} levels`);

        for (let i = 1; i < mipLevelCount; ++i) {
            const passEncoder = commandEncoder!.beginRenderPass({
                colorAttachments: [{
                    attachment: gpuTexture.createView({
                        dimension: WebGPUConstants.TextureViewDimension.E2d,
                        baseMipLevel: i,
                        mipLevelCount: 1,
                        arrayLayerCount: 1,
                        baseArrayLayer: faceIndex,
                    }),
                    loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
                }],
            });

            const bindGroup = this._device.createBindGroup({
                layout: bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: this._mipmapSampler,
                }, {
                    binding: 1,
                    resource: gpuTexture.createView({
                        dimension: WebGPUConstants.TextureViewDimension.E2d,
                        baseMipLevel: i - 1,
                        mipLevelCount: 1,
                        arrayLayerCount: 1,
                        baseArrayLayer: faceIndex,
                    }),
                }],
            });

            passEncoder.setPipeline(pipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.draw(4, 1, 0, 0);
            passEncoder.endPass();
        }

        commandEncoder!.popDebugGroup();

        if (useOwnCommandEncoder) {
            this._device.defaultQueue.submit([commandEncoder!.finish()]);
            commandEncoder = null as any;
        }
    }

    public createGPUTextureForInternalTexture(texture: InternalTexture, width?: number, height?: number, depth?: number): WebGPUHardwareTexture {
        if (!texture._hardwareTexture) {
            texture._hardwareTexture = new WebGPUHardwareTexture();
        }

        if (width === undefined) {
            width = texture.width;
        }
        if (height === undefined) {
            height = texture.height;
        }
        if (depth === undefined) {
            depth = texture.depth;
        }

        const gpuTextureWrapper = texture._hardwareTexture as WebGPUHardwareTexture;

        gpuTextureWrapper.format = this.getWebGPUTextureFormat(texture.type, texture.format);

        gpuTextureWrapper.textureUsages =
            texture._source === InternalTextureSource.RenderTarget ? WebGPUConstants.TextureUsage.Sampled | WebGPUConstants.TextureUsage.CopySrc | WebGPUConstants.TextureUsage.OutputAttachment :
            texture._source === InternalTextureSource.Depth ? WebGPUConstants.TextureUsage.Sampled | WebGPUConstants.TextureUsage.OutputAttachment : -1;

        const hasMipMaps = texture.generateMipMaps;
        const layerCount = depth || 1;

        if (texture.isCube) {
            const gpuTexture = this.createCubeTexture({ width, height }, texture.generateMipMaps, texture.generateMipMaps, texture.invertY, false, gpuTextureWrapper.format, 1, this._commandEncoderForCreation, gpuTextureWrapper.textureUsages);

            gpuTextureWrapper.set(gpuTexture);
            gpuTextureWrapper.createView({
                dimension: WebGPUConstants.TextureViewDimension.Cube,
                mipLevelCount: hasMipMaps ? WebGPUTextureHelper.computeNumMipmapLevels(width!, height!) : 1,
                baseArrayLayer: 0,
                baseMipLevel: 0,
                aspect: WebGPUConstants.TextureAspect.All
            });
        } else {
            const gpuTexture = this.createTexture({ width, height, layers: layerCount }, texture.generateMipMaps, texture.generateMipMaps, texture.invertY, false, texture.is3D, gpuTextureWrapper.format, 1, this._commandEncoderForCreation, gpuTextureWrapper.textureUsages);

            gpuTextureWrapper.set(gpuTexture);
            gpuTextureWrapper.createView({
                dimension: texture.is2DArray ? WebGPUConstants.TextureViewDimension.E2dArray : texture.is3D ? WebGPUConstants.TextureDimension.E3d : WebGPUConstants.TextureViewDimension.E2d,
                mipLevelCount: hasMipMaps ? WebGPUTextureHelper.computeNumMipmapLevels(width!, height!) : 1,
                baseArrayLayer: 0,
                baseMipLevel: 0,
                arrayLayerCount: layerCount,
                aspect: WebGPUConstants.TextureAspect.All
            });
        }

        texture.width = texture.baseWidth = width;
        texture.height = texture.baseHeight = height;
        texture.depth = texture.baseDepth = depth;

        this.createMSAATexture(texture, texture.samples);

        return gpuTextureWrapper;
    }

    public createMSAATexture(texture: InternalTexture, samples: number): void {
        const gpuTextureWrapper = texture._hardwareTexture as Nullable<WebGPUHardwareTexture>;

        if (gpuTextureWrapper?.msaaTexture) {
            this.releaseTexture(gpuTextureWrapper.msaaTexture);
            gpuTextureWrapper.msaaTexture = null;
        }

        if (!gpuTextureWrapper || (samples ?? 1) <= 1) {
            return;
        }

        const width = texture.width;
        const height = texture.height;
        const layerCount = texture.depth || 1;

        if (texture.isCube) {
            const gpuMSAATexture = this.createCubeTexture({ width, height }, false, false, texture.invertY, false, gpuTextureWrapper.format, samples, this._commandEncoderForCreation, gpuTextureWrapper.textureUsages);
            gpuTextureWrapper.setMSAATexture(gpuMSAATexture);
        } else {
            const gpuMSAATexture = this.createTexture({ width, height, layers: layerCount }, false, false, texture.invertY, false, texture.is3D, gpuTextureWrapper.format, samples, this._commandEncoderForCreation, gpuTextureWrapper.textureUsages);
            gpuTextureWrapper.setMSAATexture(gpuMSAATexture);
        }
    }

    //------------------------------------------------------------------------------
    //                                  Update
    //------------------------------------------------------------------------------

    public updateCubeTextures(imageBitmaps: ImageBitmap[] | Uint8Array[], gpuTexture: GPUTexture, width: number, height: number, format: GPUTextureFormat, invertY = false, premultiplyAlpha = false, offsetX = 0, offsetY = 0,
        commandEncoder?: GPUCommandEncoder): void {
        const faces = [0, 3, 1, 4, 2, 5];

        for (let f = 0; f < faces.length; ++f) {
            let imageBitmap = imageBitmaps[faces[f]];

            this.updateTexture(imageBitmap, gpuTexture, width, height, 1, format, f, 0, invertY, premultiplyAlpha, offsetX, offsetY, commandEncoder);
        }
    }

    // TODO WEBGPU handle data source not being in the same format than the destination texture?
    public updateTexture(imageBitmap: ImageBitmap | Uint8Array, gpuTexture: GPUTexture, width: number, height: number, layers: number, format: GPUTextureFormat, faceIndex: number = 0, mipLevel: number = 0, invertY = false, premultiplyAlpha = false, offsetX = 0, offsetY = 0,
        commandEncoder?: GPUCommandEncoder): void
    {
        const blockInformation = this._getBlockInformationFromFormat(format);

        const textureCopyView: GPUTextureCopyView = {
            texture: gpuTexture,
            origin: {
                x: offsetX,
                y: offsetY,
                z: Math.max(faceIndex, 0)
            },
            mipLevel: mipLevel
        };

        const textureExtent = {
            width: Math.ceil(width / blockInformation.width) * blockInformation.width,
            height: Math.ceil(height / blockInformation.height) * blockInformation.height,
            depth: layers || 1
        };

        if ((imageBitmap as Uint8Array).byteLength !== undefined) {
            imageBitmap = imageBitmap as Uint8Array;

            const bytesPerRow = Math.ceil(width / blockInformation.width) * blockInformation.length;
            const aligned = Math.ceil(bytesPerRow / 256) * 256 === bytesPerRow;

            if (aligned) {
                const useOwnCommandEncoder = commandEncoder === undefined;

                if (useOwnCommandEncoder) {
                    commandEncoder = this._device.createCommandEncoder({});
                }

                const buffer = this._bufferManager.createRawBuffer(imageBitmap.byteLength, GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC, true);

                const arrayBuffer = buffer.getMappedRange();

                new Uint8Array(arrayBuffer).set(imageBitmap);

                buffer.unmap();

                commandEncoder!.copyBufferToTexture({
                    buffer: buffer,
                    offset: 0,
                    bytesPerRow
                }, textureCopyView, textureExtent);

                if (useOwnCommandEncoder) {
                    this._device.defaultQueue.submit([commandEncoder!.finish()]);
                    commandEncoder = null as any;
                }

                this._bufferManager.releaseBuffer(buffer);
            } else {
                this._device.defaultQueue.writeTexture(textureCopyView, imageBitmap, {
                    offset: 0,
                    bytesPerRow
                }, textureExtent);
            }

            if (invertY || premultiplyAlpha) {
                this.invertYPreMultiplyAlpha(gpuTexture, width, height, format, invertY, premultiplyAlpha, faceIndex, commandEncoder);
            }
        } else {
            imageBitmap = imageBitmap as ImageBitmap;

            if (invertY || premultiplyAlpha) {
                createImageBitmap(imageBitmap, { imageOrientation: invertY ? "flipY" : "none", premultiplyAlpha: premultiplyAlpha ? "premultiply" : "none" }).then((imageBitmap) => {
                    this._device.defaultQueue.copyImageBitmapToTexture({ imageBitmap }, textureCopyView, textureExtent);
                });
            } else {
                this._device.defaultQueue.copyImageBitmapToTexture({ imageBitmap }, textureCopyView, textureExtent);
            }
        }
    }

    public readPixels(texture: GPUTexture, x: number, y: number, width: number, height: number, format: GPUTextureFormat, faceIndex: number = 0, mipLevel: number = 0, buffer: Nullable<ArrayBufferView> = null): Promise<ArrayBufferView> {
        const blockInformation = this._getBlockInformationFromFormat(format);

        const bytesPerRow = Math.ceil(width / blockInformation.width) * blockInformation.length;

        const bytesPerRowAligned = Math.ceil(bytesPerRow / 256) * 256;

        const size = bytesPerRowAligned * height;

        const gpuBuffer = this._bufferManager.createRawBuffer(size, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);

        const commandEncoder = this._device.createCommandEncoder({});

        commandEncoder.copyTextureToBuffer({
            texture,
            mipLevel,
            origin: {
                x,
                y,
                z: Math.max(faceIndex, 0)
            }
        }, {
            buffer: gpuBuffer,
            offset: 0,
            bytesPerRow: bytesPerRowAligned
        }, {
            width,
            height,
            depth: 1
        });

        this._device.defaultQueue.submit([commandEncoder!.finish()]);

        const type = this._getTextureTypeFromFormat(format);
        const floatFormat = type === Constants.TEXTURETYPE_FLOAT ? 2 : type === Constants.TEXTURETYPE_HALF_FLOAT ? 1 : 0;

        return this._bufferManager.readDataFromBuffer(gpuBuffer, size, width, height, bytesPerRow, bytesPerRowAligned, floatFormat, 0, buffer);
    }

    //------------------------------------------------------------------------------
    //                              Dispose
    //------------------------------------------------------------------------------

    public releaseTexture(texture: InternalTexture | GPUTexture): void {
        if (this._isInternalTexture(texture)) {
            const hardwareTexture = texture._hardwareTexture;
            const irradianceTexture = texture._irradianceTexture;
            const depthStencilTexture = texture._depthStencilTexture;

            // We can't destroy the objects just now because they could be used in the current frame - we delay the destroying after the end of the frame
            this._deferredReleaseTextures.push([texture, hardwareTexture, irradianceTexture, depthStencilTexture]);
        } else {
            this._deferredReleaseTextures.push([null, texture, null, null]);
        }
    }

    public destroyDeferredTextures(): void {
        for (let i = 0; i < this._deferredReleaseTextures.length; ++i) {
            const [texture, hardwareTexture, irradianceTexture, depthStencilTexture] = this._deferredReleaseTextures[i];

            if (hardwareTexture) {
                if (this._isHardwareTexture(hardwareTexture)) {
                    hardwareTexture.release();
                } else {
                    hardwareTexture.destroy();
                }
            }
            irradianceTexture?.dispose();
            depthStencilTexture?.dispose();

            // TODO WEBGPU remove debug code
            if (texture) {
                if ((texture as any)._swapped) {
                    delete (texture as any)._swapped;
                } else {
                    (texture as any)._released = true;
                }
            }
        }

        this._deferredReleaseTextures.length = 0;
    }

    //------------------------------------------------------------------------------
    //                              Samplers
    //------------------------------------------------------------------------------

    private static _GetSamplerHashCode(texture: InternalTexture): number {
        let code =
            filterToBits[texture.samplingMode] +
            comparisonFunctionToBits[(texture._comparisonFunction || 0x0202) - 0x0200 + 1] +
            filterNoMipToBits[texture.samplingMode] + // handle the lodMinClamp = lodMaxClamp = 0 case when no filter used for mip mapping
            ((texture._cachedWrapU ?? 1) << 8) +
            ((texture._cachedWrapV ?? 1) << 10) +
            ((texture._cachedWrapR ?? 1) << 12) +
            ((texture._cachedAnisotropicFilteringLevel ?? 1) << 14);

        return code;
    }

   public getCompareFunction(compareFunction: Nullable<number>): GPUCompareFunction {
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

    private _getSamplerFilterDescriptor(internalTexture: InternalTexture): {
        magFilter: GPUFilterMode,
        minFilter: GPUFilterMode,
        mipmapFilter: GPUFilterMode,
        lodMinClamp?: number,
        lodMaxClamp?: number,
    } {
        let magFilter: GPUFilterMode, minFilter: GPUFilterMode, mipmapFilter: GPUFilterMode, lodMinClamp: number | undefined, lodMaxClamp: number | undefined;
        const useMipMaps = internalTexture.generateMipMaps;
        switch (internalTexture.samplingMode) {
            case Constants.TEXTURE_LINEAR_LINEAR_MIPNEAREST:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Linear;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                if (!useMipMaps) {
                    lodMinClamp = lodMaxClamp = 0;
                }
                break;
            case Constants.TEXTURE_LINEAR_LINEAR_MIPLINEAR:
            case Constants.TEXTURE_TRILINEAR_SAMPLINGMODE:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Linear;
                if (!useMipMaps) {
                    mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                    lodMinClamp = lodMaxClamp = 0;
                } else {
                    mipmapFilter = WebGPUConstants.FilterMode.Linear;
                }
                break;
            case Constants.TEXTURE_NEAREST_NEAREST_MIPLINEAR:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                if (!useMipMaps) {
                    mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                    lodMinClamp = lodMaxClamp = 0;
                } else {
                    mipmapFilter = WebGPUConstants.FilterMode.Linear;
                }
                break;
            case Constants.TEXTURE_NEAREST_NEAREST_MIPNEAREST:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                if (!useMipMaps) {
                    lodMinClamp = lodMaxClamp = 0;
                }
                break;
            case Constants.TEXTURE_NEAREST_LINEAR_MIPNEAREST:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Linear;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                if (!useMipMaps) {
                    lodMinClamp = lodMaxClamp = 0;
                }
                break;
            case Constants.TEXTURE_NEAREST_LINEAR_MIPLINEAR:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Linear;
                if (!useMipMaps) {
                    mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                    lodMinClamp = lodMaxClamp = 0;
                } else {
                    mipmapFilter = WebGPUConstants.FilterMode.Linear;
                }
                break;
            case Constants.TEXTURE_NEAREST_LINEAR:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Linear;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                lodMinClamp = lodMaxClamp = 0;
                break;
            case Constants.TEXTURE_NEAREST_NEAREST:
            case Constants.TEXTURE_NEAREST_SAMPLINGMODE:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                lodMinClamp = lodMaxClamp = 0;
                break;
            case Constants.TEXTURE_LINEAR_NEAREST_MIPNEAREST:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                if (!useMipMaps) {
                    lodMinClamp = lodMaxClamp = 0;
                }
                break;
            case Constants.TEXTURE_LINEAR_NEAREST_MIPLINEAR:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                if (!useMipMaps) {
                    mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                    lodMinClamp = lodMaxClamp = 0;
                } else {
                    mipmapFilter = WebGPUConstants.FilterMode.Linear;
                }
                break;
            case Constants.TEXTURE_LINEAR_LINEAR:
            case Constants.TEXTURE_BILINEAR_SAMPLINGMODE:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Linear;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                lodMinClamp = lodMaxClamp = 0;
                break;
            case Constants.TEXTURE_LINEAR_NEAREST:
                magFilter = WebGPUConstants.FilterMode.Linear;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                lodMinClamp = lodMaxClamp = 0;
                break;
            default:
                magFilter = WebGPUConstants.FilterMode.Nearest;
                minFilter = WebGPUConstants.FilterMode.Nearest;
                mipmapFilter = WebGPUConstants.FilterMode.Nearest;
                lodMinClamp = lodMaxClamp = 0;
                break;
        }

        return {
            magFilter,
            minFilter,
            mipmapFilter,
            lodMinClamp,
            lodMaxClamp,
        };
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
            compare: internalTexture._comparisonFunction ? this.getCompareFunction(internalTexture._comparisonFunction) : undefined,
            maxAnisotropy: internalTexture._cachedAnisotropicFilteringLevel ?? 1,
        };
    }

    public getSampler(internalTexture: InternalTexture): GPUSampler {
        const hash = WebGPUTextureHelper._GetSamplerHashCode(internalTexture);

        let sampler = this._samplers[hash];
        if (!sampler) {
            sampler = this._samplers[hash] = this._device.createSampler(this._getSamplerDescriptor(internalTexture));
        }

        return sampler;
    }
}