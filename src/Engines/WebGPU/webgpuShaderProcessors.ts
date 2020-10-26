import { Nullable } from '../../types';
import { IShaderProcessor } from '../Processors/iShaderProcessor';
import { ShaderProcessingContext } from "../Processors/shaderProcessingOptions";
import { WebGPUShaderProcessingContext } from './webgpuShaderProcessingContext';
import * as WebGPUConstants from './webgpuConstants';
import { ShaderCodeInliner } from '../Processors/shaderCodeInliner';
import { dbgShowDebugInliningProcess } from '../webgpuEngine';

const _knownUBOs: { [key: string]: { setIndex: number, bindingIndex: number} } = {
    "Scene": { setIndex: 0, bindingIndex: 0 },
    "Light0": { setIndex: 0, bindingIndex: 5 },
    "Light1": { setIndex: 0, bindingIndex: 6 },
    "Light2": { setIndex: 0, bindingIndex: 7 },
    "Light3": { setIndex: 0, bindingIndex: 8 },
    "Material": { setIndex: 1, bindingIndex: 0 },
    "Mesh": { setIndex: 1, bindingIndex: 1 },
};

const _knownSamplers: { [key: string]: { setIndex: number, bindingIndex: number} } = {
    "environmentBrdfSampler": { setIndex: 0, bindingIndex: 1 },
    // "reflectionSampler": { setIndex: 0, bindingIndex: 3 },
};

// TODO WEBGPU. sampler3D
const _samplerFunctionByWebGLSamplerType: { [key: string]: string } = {
    "textureCube": "samplerCube",
    "texture2D": "sampler2D",
    "sampler2D": "sampler2D",
    "sampler2DShadow": "sampler2DShadow",
    "sampler2DArrayShadow": "sampler2DArrayShadow",
    "samplerCube": "samplerCube"
};

const _textureTypeByWebGLSamplerType: { [key: string]: string } = {
    "textureCube": "textureCube",
    "texture2D": "texture2D",
    "sampler2D": "texture2D",
    "sampler2DShadow": "texture2D",
    "sampler2DArrayShadow": "texture2DArray",
    "samplerCube": "textureCube",
    "samplerCubeArray": "textureCubeArray"
};

const _gpuTextureViewDimensionByWebGPUTextureType: { [key: string]: GPUTextureViewDimension } = {
    "textureCube": WebGPUConstants.TextureViewDimension.Cube,
    "textureCubeArray": WebGPUConstants.TextureViewDimension.CubeArray,
    "texture2D": WebGPUConstants.TextureViewDimension.E2d,
    "texture2DArray": WebGPUConstants.TextureViewDimension.E2dArray,
};

// if the webgl sampler type is not listed in this array, "sampler" is taken by default
const _samplerTypeByWebGLSamplerType: { [key: string]: string } = {
    "sampler2DShadow": "samplerShadow",
    "sampler2DArrayShadow": "samplerShadow",
};

const _isComparisonSamplerByWebGPUSamplerType: { [key: string]: boolean } = {
    "samplerShadow": true,
    "samplerArrayShadow": true,
    "sampler": false,
};

/** @hidden */
export class WebGPUShaderProcessor implements IShaderProcessor {

    protected _missingVaryings: Array<string> = [];

    private _getArraySize(name: string, preProcessors: { [key: string]: string }): [string, number] {
        let length = 0;
        const startArray = name.indexOf("[");
        const endArray = name.indexOf("]");
        if (startArray > 0 && endArray > 0) {
            const lengthInString = name.substring(startArray + 1, endArray);
            length = +(lengthInString);
            if (isNaN(length)) {
                length = +(preProcessors[lengthInString]);
            }
            name = name.substr(0, startArray);
        }
        return [name, length];
    }

    public initializeShaders(processingContext: Nullable<ShaderProcessingContext>): void {
        this._missingVaryings.length = 0;
    }

    public varyingProcessor(varying: string, isFragment: boolean, preProcessors: { [key: string]: string }, processingContext: Nullable<ShaderProcessingContext>) {
        const webgpuProcessingContext = processingContext! as WebGPUShaderProcessingContext;

        const varyingRegex = new RegExp(/\s*varying\s+(\S+)\s+(\S+)\s*;/gm);
        const match = varyingRegex.exec(varying);
        if (match != null) {
            const varyingType = match[1];
            const name = match[2];
            let location: number;
            if (isFragment) {
                location = webgpuProcessingContext.availableVaryings[name];
                this._missingVaryings[location] = "";
            }
            else {
                location = webgpuProcessingContext.getVaryingNextLocation(varyingType, this._getArraySize(name, preProcessors)[1]);
                webgpuProcessingContext.availableVaryings[name] = location;
                this._missingVaryings[location] = `layout(location = ${location}) in ${varyingType} ${name};`;
            }

            varying = varying.replace(match[0], `layout(location = ${location}) ${isFragment ? "in" : "out"} ${varyingType} ${name};`);
        }
        return varying;
    }

    public attributeProcessor(attribute: string, preProcessors: { [key: string]: string }, processingContext: Nullable<ShaderProcessingContext>) {
        const webgpuProcessingContext = processingContext! as WebGPUShaderProcessingContext;

        const attribRegex = new RegExp(/\s*attribute\s+(\S+)\s+(\S+)\s*;/gm);
        const match = attribRegex.exec(attribute);
        if (match != null) {
            const varyingType = match[1];
            const name = match[2];
            const location = webgpuProcessingContext.getAttributeNextLocation(varyingType, this._getArraySize(name, preProcessors)[1]);

            webgpuProcessingContext.availableAttributes[name] = location;
            webgpuProcessingContext.orderedAttributes[location] = name;

            attribute = attribute.replace(match[0], `layout(location = ${location}) in ${varyingType} ${name};`);
        }
        return attribute;
    }

    public uniformProcessor(uniform: string, isFragment: boolean, preProcessors: { [key: string]: string }, processingContext: Nullable<ShaderProcessingContext>): string {
        const webgpuProcessingContext = processingContext! as WebGPUShaderProcessingContext;

        const uniformRegex = new RegExp(/\s*uniform\s+(?:(?:highp)?|(?:lowp)?)\s*(\S+)\s+(\S+)\s*;/gm);

        const match = uniformRegex.exec(uniform);
        if (match != null) {
            const uniformType = match[1];
            let name = match[2];

            if (uniformType.indexOf("texture") === 0 || uniformType.indexOf("sampler") === 0) {
                let samplerInfo = _knownSamplers[name];
                if (!samplerInfo) {
                    samplerInfo = webgpuProcessingContext.availableSamplers[name];
                    if (!samplerInfo) {
                        samplerInfo = webgpuProcessingContext.getNextFreeTextureBinding();
                    }
                }

                const setIndex = samplerInfo.setIndex;
                const textureBindingIndex = samplerInfo.bindingIndex;
                const samplerBindingIndex = samplerInfo.bindingIndex + 1;
                const samplerFunction = _samplerFunctionByWebGLSamplerType[uniformType];
                const samplerType = _samplerTypeByWebGLSamplerType[uniformType] ?? "sampler";
                const textureType = _textureTypeByWebGLSamplerType[uniformType];
                const textureDimension = _gpuTextureViewDimensionByWebGPUTextureType[textureType];

                // Manage textures and samplers.
                uniform = `layout(set = ${setIndex}, binding = ${textureBindingIndex}) uniform ${textureType} ${name}Texture;
                    layout(set = ${setIndex}, binding = ${samplerBindingIndex}) uniform ${samplerType} ${name}Sampler;
                    #define ${name} ${samplerFunction}(${name}Texture, ${name}Sampler)`;

                webgpuProcessingContext.availableSamplers[name] = samplerInfo;
                if (!webgpuProcessingContext.orderedUBOsAndSamplers[setIndex]) {
                    webgpuProcessingContext.orderedUBOsAndSamplers[setIndex] = [];
                }
                webgpuProcessingContext.orderedUBOsAndSamplers[setIndex][textureBindingIndex] = {
                    isSampler: true,
                    isComparisonSampler: _isComparisonSamplerByWebGPUSamplerType[samplerType] ?? false,
                    textureDimension,
                    name,
                };
            }
            else {
                // Check the size of the uniform array in case of array.
                let length = 0;

                [name, length] = this._getArraySize(name, preProcessors);

                for (let i = 0; i < webgpuProcessingContext.leftOverUniforms.length; i++) {
                    if (webgpuProcessingContext.leftOverUniforms[i].name === name) {
                        return "";
                    }
                }

                webgpuProcessingContext.leftOverUniforms.push({
                    name,
                    type: uniformType,
                    length
                });
                uniform = "";
            }
        }
        return uniform;
    }

    public uniformBufferProcessor(uniformBuffer: string, isFragment: boolean, processingContext: Nullable<ShaderProcessingContext>): string {
        const webgpuProcessingContext = processingContext! as WebGPUShaderProcessingContext;
        const uboRegex = new RegExp(/uniform\s+(\w+)/gm);

        const match = uboRegex.exec(uniformBuffer);
        if (match != null) {
            const name = match[1];
            let setIndex: number;
            let bindingIndex: number;
            const knownUBO = _knownUBOs[name];
            if (knownUBO) {
                setIndex = knownUBO.setIndex;
                bindingIndex = knownUBO.bindingIndex;
            }
            else {
                if (isFragment) {
                    const availableUBO = webgpuProcessingContext.availableUBOs[name];
                    if (availableUBO) {
                        setIndex = availableUBO.setIndex;
                        bindingIndex = availableUBO.bindingIndex;
                    }
                    else {
                        const nextBinding = webgpuProcessingContext.getNextFreeUBOBinding();
                        setIndex = nextBinding.setIndex;
                        bindingIndex = nextBinding.bindingIndex;
                    }
                }
                else {
                    const nextBinding = webgpuProcessingContext.getNextFreeUBOBinding();
                    setIndex = nextBinding.setIndex;
                    bindingIndex = nextBinding.bindingIndex;
                }
            }

            webgpuProcessingContext.availableUBOs[name] = { setIndex, bindingIndex };
            if (!webgpuProcessingContext.orderedUBOsAndSamplers[setIndex]) {
                webgpuProcessingContext.orderedUBOsAndSamplers[setIndex] = [];
            }
            webgpuProcessingContext.orderedUBOsAndSamplers[setIndex][bindingIndex] = { isSampler: false, name };

            uniformBuffer = uniformBuffer.replace("uniform", `layout(set = ${setIndex}, binding = ${bindingIndex}) uniform`);
        }
        return uniformBuffer;
    }

    // public endOfUniformBufferProcessor(closingBracketLine: string, isFragment: boolean): string {
    //     console.log("uniformBuffer closingBracketLine ", closingBracketLine);
    //     return closingBracketLine;
    // }

    public postProcessor(code: string, defines: string[], isFragment: boolean, processingContext: Nullable<ShaderProcessingContext>) {
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

        // Flip Y.
        // TODO WEBGPU. Triple check this part and wait on Google News for this issue.
        // https://github.com/gpuweb/gpuweb/issues/379
        if (!isFragment) {
            const lastClosingCurly = code.lastIndexOf("}");
            code = code.substring(0, lastClosingCurly);
            code += "gl_Position.y *= -1.;\ngl_Position.z = (gl_Position.z + gl_Position.w) / 2.0; }";
        }

        let sci = new ShaderCodeInliner(code);
        sci.debug = dbgShowDebugInliningProcess;
        sci.processCode();
        return sci.code;
    }

    public finalizeShaders(vertexCode: string, fragmentCode: string, processingContext: Nullable<ShaderProcessingContext>): { vertexCode: string, fragmentCode: string } {
        const webgpuProcessingContext = processingContext! as WebGPUShaderProcessingContext;

        // inject the missing varying in the fragment shader
        for (let i = 0; i < this._missingVaryings.length; ++i) {
            const decl = this._missingVaryings[i];
            if (decl && decl.length > 0) {
                fragmentCode = decl + "\n" + fragmentCode;
            }
        }

        // Builds the leftover UBOs.
        if (webgpuProcessingContext.leftOverUniforms.length) {
            const name = "LeftOver";
            let availableUBO = webgpuProcessingContext.availableUBOs[name];
            if (!availableUBO) {
                availableUBO = webgpuProcessingContext.getNextFreeUBOBinding();
                webgpuProcessingContext.availableUBOs[name] = availableUBO;
                if (!webgpuProcessingContext.orderedUBOsAndSamplers[availableUBO.setIndex]) {
                    webgpuProcessingContext.orderedUBOsAndSamplers[availableUBO.setIndex] = [];
                }
                webgpuProcessingContext.orderedUBOsAndSamplers[availableUBO.setIndex][availableUBO.bindingIndex] = { isSampler: false, name };
            }

            let ubo = `layout(set = ${availableUBO.setIndex}, binding = ${availableUBO.bindingIndex}) uniform ${name} {\n    `;
            for (let leftOverUniform of webgpuProcessingContext.leftOverUniforms) {
                if (leftOverUniform.length > 0) {
                    ubo += `    ${leftOverUniform.type} ${leftOverUniform.name}[${leftOverUniform.length}];\n`;
                }
                else {
                    ubo += `    ${leftOverUniform.type} ${leftOverUniform.name};\n`;
                }
            }
            ubo += "};\n\n";

            // Currently set in both vert and frag but could be optim away if necessary.
            vertexCode = ubo + vertexCode;
            fragmentCode = ubo + fragmentCode;
        }

        return { vertexCode, fragmentCode };
    }
}