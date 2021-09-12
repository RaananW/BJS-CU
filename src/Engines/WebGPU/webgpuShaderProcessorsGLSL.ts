import { Nullable } from '../../types';
import { IShaderProcessor, ShaderLanguage } from '../Processors/iShaderProcessor';
import { ShaderProcessingContext } from "../Processors/shaderProcessingOptions";
import { WebGPUShaderProcessingContext, WebGPUUniformBufferDescription } from './webgpuShaderProcessingContext';
import * as WebGPUConstants from './webgpuConstants';
import { Logger } from '../../Misc/logger';
import { ThinEngine } from "../thinEngine";
import { WebGPUShaderProcessor } from "./webgpuShaderProcessor";

/** @hidden */
export class WebGPUShaderProcessorGLSL extends WebGPUShaderProcessor implements IShaderProcessor {

    protected _missingVaryings: Array<string> = [];
    protected _textureArrayProcessing: Array<string> = [];
    protected _preProcessors: { [key: string]: string };

    public shaderLanguage = ShaderLanguage.GLSL;

    protected _getArraySize(name: string, type: string, preProcessors: { [key: string]: string }): [string, string, number] {
        let length = 0;
        const startArray = name.indexOf("[");
        const endArray = name.indexOf("]");
        if (startArray > 0 && endArray > 0) {
            const lengthInString = name.substring(startArray + 1, endArray);
            length = +(lengthInString);
            if (isNaN(length)) {
                length = +(preProcessors[lengthInString.trim()]);
            }
            name = name.substr(0, startArray);
        }
        return [name, type, length];
    }

    public initializeShaders(processingContext: Nullable<ShaderProcessingContext>): void {
        this.webgpuProcessingContext = processingContext as WebGPUShaderProcessingContext;

        this._missingVaryings.length = 0;
        this._textureArrayProcessing.length = 0;
    }

    public varyingProcessor(varying: string, isFragment: boolean, preProcessors: { [key: string]: string }, processingContext: Nullable<ShaderProcessingContext>) {
        this._preProcessors = preProcessors;

        const varyingRegex = new RegExp(/\s*varying\s+(?:(?:highp)?|(?:lowp)?)\s*(\S+)\s+(\S+)\s*;/gm);
        const match = varyingRegex.exec(varying);
        if (match != null) {
            const varyingType = match[1];
            const name = match[2];
            let location: number;
            if (isFragment) {
                location = this.webgpuProcessingContext.availableVaryings[name];
                this._missingVaryings[location] = "";
                if (location === undefined) {
                    Logger.Warn(`Invalid fragment shader: The varying named "${name}" is not declared in the vertex shader! This declaration will be ignored.`);
                }
            }
            else {
                location = this.webgpuProcessingContext.getVaryingNextLocation(varyingType, this._getArraySize(name, varyingType, preProcessors)[2]);
                this.webgpuProcessingContext.availableVaryings[name] = location;
                this._missingVaryings[location] = `layout(location = ${location}) in ${varyingType} ${name};`;
            }

            varying = varying.replace(match[0], location === undefined ? "" : `layout(location = ${location}) ${isFragment ? "in" : "out"} ${varyingType} ${name};`);
        }
        return varying;
    }

    public attributeProcessor(attribute: string, preProcessors: { [key: string]: string }, processingContext: Nullable<ShaderProcessingContext>) {
        this._preProcessors = preProcessors;

        const attribRegex = new RegExp(/\s*attribute\s+(\S+)\s+(\S+)\s*;/gm);
        const match = attribRegex.exec(attribute);
        if (match != null) {
            const attributeType = match[1];
            const name = match[2];
            const location = this.webgpuProcessingContext.getAttributeNextLocation(attributeType, this._getArraySize(name, attributeType, preProcessors)[2]);

            this.webgpuProcessingContext.availableAttributes[name] = location;
            this.webgpuProcessingContext.orderedAttributes[location] = name;

            attribute = attribute.replace(match[0], `layout(location = ${location}) in ${attributeType} ${name};`);
        }
        return attribute;
    }

    public uniformProcessor(uniform: string, isFragment: boolean, preProcessors: { [key: string]: string }, processingContext: Nullable<ShaderProcessingContext>): string {
        this._preProcessors = preProcessors;

        const uniformRegex = new RegExp(/\s*uniform\s+(?:(?:highp)?|(?:lowp)?)\s*(\S+)\s+(\S+)\s*;/gm);

        const match = uniformRegex.exec(uniform);
        if (match != null) {
            let uniformType = match[1];
            let name = match[2];

            if (uniformType.indexOf("sampler") === 0 || uniformType.indexOf("sampler") === 1) {
                let arraySize = 0; // 0 means the texture is not declared as an array

                [name, uniformType, arraySize] = this._getArraySize(name, uniformType, preProcessors);

                let textureInfo = this.webgpuProcessingContext.availableTextures[name];
                if (!textureInfo) {
                    textureInfo = {
                        autoBindSampler: true,
                        isTextureArray: arraySize > 0,
                        isStorageTexture: false,
                        textures: [],
                        sampleType: WebGPUConstants.TextureSampleType.Float,
                    };
                    for (let i = 0; i < (arraySize || 1); ++i) {
                        textureInfo.textures.push(this.webgpuProcessingContext.getNextFreeUBOBinding());
                    }
                }

                const samplerType = WebGPUShaderProcessor._SamplerTypeByWebGLSamplerType[uniformType] ?? "sampler";
                const isComparisonSampler = !!WebGPUShaderProcessor._IsComparisonSamplerByWebGPUSamplerType[samplerType];
                const samplerBindingType = isComparisonSampler ? WebGPUConstants.SamplerBindingType.Comparison : WebGPUConstants.SamplerBindingType.Filtering;
                const samplerName = name + WebGPUShaderProcessor.AutoSamplerSuffix;

                let samplerInfo = this.webgpuProcessingContext.availableSamplers[samplerName];
                if (!samplerInfo) {
                    samplerInfo = {
                        binding: this.webgpuProcessingContext.getNextFreeUBOBinding(),
                        type: samplerBindingType,
                    };
                }

                const componentType = uniformType.charAt(0) === 'u' ? 'u' : uniformType.charAt(0) === 'i' ? 'i' : '';

                if (componentType) {
                    uniformType = uniformType.substr(1);
                }

                const sampleType =
                    isComparisonSampler ? WebGPUConstants.TextureSampleType.Depth :
                    componentType === 'u' ? WebGPUConstants.TextureSampleType.Uint :
                    componentType === 'i' ? WebGPUConstants.TextureSampleType.Sint : WebGPUConstants.TextureSampleType.Float;

                textureInfo.sampleType = sampleType;

                const isTextureArray = arraySize > 0;
                const samplerGroupIndex = samplerInfo.binding.groupIndex;
                const samplerBindingIndex = samplerInfo.binding.bindingIndex;
                const samplerFunction = WebGPUShaderProcessor._SamplerFunctionByWebGLSamplerType[uniformType];
                const textureType = WebGPUShaderProcessor._TextureTypeByWebGLSamplerType[uniformType];
                const textureDimension = WebGPUShaderProcessor._GpuTextureViewDimensionByWebGPUTextureType[textureType];

                // Manage textures and samplers.
                if (!isTextureArray) {
                    arraySize = 1;
                    uniform = `layout(set = ${samplerGroupIndex}, binding = ${samplerBindingIndex}) uniform ${componentType}${samplerType} ${samplerName};
                        layout(set = ${textureInfo.textures[0].groupIndex}, binding = ${textureInfo.textures[0].bindingIndex}) uniform ${textureType} ${name}Texture;
                        #define ${name} ${componentType}${samplerFunction}(${name}Texture, ${samplerName})`;
                } else {
                    let layouts = [];
                    layouts.push(`layout(set = ${samplerGroupIndex}, binding = ${samplerBindingIndex}) uniform ${componentType}${samplerType} ${samplerName};`);
                    uniform = `\r\n`;
                    for (let i = 0; i < arraySize; ++i) {
                        const textureSetIndex = textureInfo.textures[i].groupIndex;
                        const textureBindingIndex = textureInfo.textures[i].bindingIndex;

                        layouts.push(`layout(set = ${textureSetIndex}, binding = ${textureBindingIndex}) uniform ${textureType} ${name}Texture${i};`);

                        uniform += `${i > 0 ? '\r\n' : ''}#define ${name}${i} ${componentType}${samplerFunction}(${name}Texture${i}, ${samplerName})`;
                    }
                    uniform = layouts.join('\r\n') + uniform;
                    this._textureArrayProcessing.push(name);
                }

                this.webgpuProcessingContext.availableTextures[name] = textureInfo;
                this.webgpuProcessingContext.availableSamplers[samplerName] = samplerInfo;

                this._addSamplerBindingDescription(samplerName, samplerInfo, !isFragment);

                for (let i = 0; i < arraySize; ++i) {
                    this._addTextureBindingDescription(name, textureInfo, i, textureDimension, null, !isFragment);
                }
            }
            else {
                this._addUniformToLeftOverUBO(name, uniformType, preProcessors);
                uniform = "";
            }
        }
        return uniform;
    }

    public uniformBufferProcessor(uniformBuffer: string, isFragment: boolean, processingContext: Nullable<ShaderProcessingContext>): string {
        const uboRegex = new RegExp(/uniform\s+(\w+)/gm);

        const match = uboRegex.exec(uniformBuffer);
        if (match != null) {
            const name = match[1];

            let uniformBufferInfo = this.webgpuProcessingContext.availableUBOs[name];
            if (!uniformBufferInfo) {
                const knownUBO = WebGPUShaderProcessingContext.KnownUBOs[name];

                let binding;
                if (knownUBO && knownUBO.binding.groupIndex !== -1) {
                    binding = knownUBO.binding;
                } else {
                    binding = this.webgpuProcessingContext.getNextFreeUBOBinding();
                }

                uniformBufferInfo = { binding };
                this.webgpuProcessingContext.availableUBOs[name] = uniformBufferInfo;
            }

            this._addUniformBufferBindingDescription(name, uniformBufferInfo, !isFragment);

            uniformBuffer = uniformBuffer.replace("uniform", `layout(set = ${uniformBufferInfo.binding.groupIndex}, binding = ${uniformBufferInfo.binding.bindingIndex}) uniform`);
        }
        return uniformBuffer;
    }

    public postProcessor(code: string, defines: string[], isFragment: boolean, processingContext: Nullable<ShaderProcessingContext>, engine: ThinEngine) {
        const hasDrawBuffersExtension = code.search(/#extension.+GL_EXT_draw_buffers.+require/) !== -1;

        // Remove extensions
        var regex = /#extension.+(GL_OVR_multiview2|GL_OES_standard_derivatives|GL_EXT_shader_texture_lod|GL_EXT_frag_depth|GL_EXT_draw_buffers).+(enable|require)/g;
        code = code.replace(regex, "");

        // Replace instructions
        code = code.replace(/texture2D\s*\(/g, "texture(");
        if (isFragment) {
            code = code.replace(/texture2DLodEXT\s*\(/g, "textureLod(");
            code = code.replace(/textureCubeLodEXT\s*\(/g, "textureLod(");
            code = code.replace(/textureCube\s*\(/g, "texture(");
            code = code.replace(/gl_FragDepthEXT/g, "gl_FragDepth");
            code = code.replace(/gl_FragColor/g, "glFragColor");
            code = code.replace(/gl_FragData/g, "glFragData");
            code = code.replace(/void\s+?main\s*\(/g, (hasDrawBuffersExtension ? "" : "layout(location = 0) out vec4 glFragColor;\n") + "void main(");
        } else {
            code = code.replace(/gl_InstanceID/g, "gl_InstanceIndex");
            code = code.replace(/gl_VertexID/g, "gl_VertexIndex");
            var hasMultiviewExtension = defines.indexOf("#define MULTIVIEW") !== -1;
            if (hasMultiviewExtension) {
                return "#extension GL_OVR_multiview2 : require\nlayout (num_views = 2) in;\n" + code;
            }
        }

        // Flip Y + convert z range from [-1,1] to [0,1]
        if (!isFragment) {
            const lastClosingCurly = code.lastIndexOf("}");
            code = code.substring(0, lastClosingCurly);
            code += "gl_Position.y *= -1.;\n";
            if (!engine.isNDCHalfZRange) {
                code += "gl_Position.z = (gl_Position.z + gl_Position.w) / 2.0;\n";
            }
            code += "}";
        }

        return code;
    }

    private _applyTextureArrayProcessing(code: string, name: string): string {
        // Replaces the occurrences of name[XX] by nameXX
        const regex = new RegExp(name + "\\s*\\[(.+)?\\]", "gm");
        let match = regex.exec(code);

        while (match != null) {
            let index = match[1];
            let iindex = +(index);
            if (this._preProcessors && isNaN(iindex)) {
                iindex = +(this._preProcessors[index.trim()]);
            }
            code = code.replace(match[0], name + iindex);
            match = regex.exec(code);
        }

        return code;
    }

    protected _generateLeftOverUBOCode(name: string, uniformBufferDescription: WebGPUUniformBufferDescription): string {
        let ubo = `layout(set = ${uniformBufferDescription.binding.groupIndex}, binding = ${uniformBufferDescription.binding.bindingIndex}) uniform ${name} {\n    `;
        for (let leftOverUniform of this.webgpuProcessingContext.leftOverUniforms) {
            if (leftOverUniform.length > 0) {
                ubo += `    ${leftOverUniform.type} ${leftOverUniform.name}[${leftOverUniform.length}];\n`;
            }
            else {
                ubo += `    ${leftOverUniform.type} ${leftOverUniform.name};\n`;
            }
        }
        ubo += "};\n\n";

        return ubo;
    }

    public finalizeShaders(vertexCode: string, fragmentCode: string, processingContext: Nullable<ShaderProcessingContext>): { vertexCode: string, fragmentCode: string } {
        // make replacements for texture names in the texture array case
        for (let i = 0; i < this._textureArrayProcessing.length; ++i) {
            const name = this._textureArrayProcessing[i];
            vertexCode = this._applyTextureArrayProcessing(vertexCode, name);
            fragmentCode = this._applyTextureArrayProcessing(fragmentCode, name);
        }

        // inject the missing varying in the fragment shader
        for (let i = 0; i < this._missingVaryings.length; ++i) {
            const decl = this._missingVaryings[i];
            if (decl && decl.length > 0) {
                fragmentCode = decl + "\n" + fragmentCode;
            }
        }

        // Builds the leftover UBOs.
        const leftOverUBO = this._buildLeftOverUBO();

        vertexCode = leftOverUBO + vertexCode;
        fragmentCode = leftOverUBO + fragmentCode;

        this._collectBindingNames();
        this._preCreateBindGroups();

        this._preProcessors = null as any;

        return { vertexCode, fragmentCode };
    }
}