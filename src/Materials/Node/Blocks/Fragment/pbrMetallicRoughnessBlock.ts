import { NodeMaterialBlock } from '../../nodeMaterialBlock';
import { NodeMaterialBlockConnectionPointTypes } from '../../Enums/nodeMaterialBlockConnectionPointTypes';
import { NodeMaterialBuildState } from '../../nodeMaterialBuildState';
import { NodeMaterialConnectionPoint } from '../../nodeMaterialBlockConnectionPoint';
import { MaterialHelper } from '../../../materialHelper';
import { NodeMaterialBlockTargets } from '../../Enums/nodeMaterialBlockTargets';
import { NodeMaterial, NodeMaterialDefines } from '../../nodeMaterial';
import { NodeMaterialSystemValues } from '../../Enums/nodeMaterialSystemValues';
import { InputBlock } from '../Input/inputBlock';
import { Light } from '../../../../Lights/light';
import { Nullable } from '../../../../types';
import { _TypeStore } from '../../../../Misc/typeStore';
import { AbstractMesh } from '../../../../Meshes/abstractMesh';
import { Effect, IEffectCreationOptions } from '../../../effect';
import { Mesh } from '../../../../Meshes/mesh';
import { PBRBaseMaterial } from '../../../PBR/pbrBaseMaterial';
import { Scene } from '../../../../scene';
import { AmbientOcclusionBlock } from './ambientOcclusionBlock';
import { editableInPropertyPage, PropertyTypeForEdition } from "../../nodeMaterialDecorator";

export class PBRMetallicRoughnessBlock extends NodeMaterialBlock {
    private _lightId: number;

    /**
     * Gets or sets the light associated with this block
     */
    public light: Nullable<Light>;

    public constructor(name: string) {
        super(name, NodeMaterialBlockTargets.VertexAndFragment);

        this._isUnique = true;

        this.registerInput("worldPosition", NodeMaterialBlockConnectionPointTypes.Vector4, false, NodeMaterialBlockTargets.Vertex);
        this.registerInput("worldNormal", NodeMaterialBlockConnectionPointTypes.Vector4, false, NodeMaterialBlockTargets.Fragment);
        this.registerInput("perturbedNormal", NodeMaterialBlockConnectionPointTypes.Vector4, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("cameraPosition", NodeMaterialBlockConnectionPointTypes.Vector3, false, NodeMaterialBlockTargets.Fragment);
        this.registerInput("baseColor", NodeMaterialBlockConnectionPointTypes.Color4, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("baseTexture", NodeMaterialBlockConnectionPointTypes.Color4, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("metallic", NodeMaterialBlockConnectionPointTypes.Float, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("roughness", NodeMaterialBlockConnectionPointTypes.Float, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("metalRoughText", NodeMaterialBlockConnectionPointTypes.Color4, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("opacityTexture", NodeMaterialBlockConnectionPointTypes.Color4, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("ambientColor", NodeMaterialBlockConnectionPointTypes.Color3, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("ambientOcclusion", NodeMaterialBlockConnectionPointTypes.Float, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("reflection", NodeMaterialBlockConnectionPointTypes.Float, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("sheen", NodeMaterialBlockConnectionPointTypes.Float, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("clearCoat", NodeMaterialBlockConnectionPointTypes.Float, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("subSurface", NodeMaterialBlockConnectionPointTypes.Float, true, NodeMaterialBlockTargets.Fragment);
        this.registerInput("anisotropy", NodeMaterialBlockConnectionPointTypes.Float, true, NodeMaterialBlockTargets.Fragment);

        this.registerOutput("ambient", NodeMaterialBlockConnectionPointTypes.Color3, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("diffuse", NodeMaterialBlockConnectionPointTypes.Color3, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("specular", NodeMaterialBlockConnectionPointTypes.Color3, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("sheen", NodeMaterialBlockConnectionPointTypes.Color3, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("clearcoat", NodeMaterialBlockConnectionPointTypes.Color3, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("diffuseInd", NodeMaterialBlockConnectionPointTypes.Color3, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("specularInd", NodeMaterialBlockConnectionPointTypes.Color3, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("sheenInd", NodeMaterialBlockConnectionPointTypes.Color3, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("clearcoatInd", NodeMaterialBlockConnectionPointTypes.Color3, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("refraction", NodeMaterialBlockConnectionPointTypes.Color3, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("lighting", NodeMaterialBlockConnectionPointTypes.Color4, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("shadow", NodeMaterialBlockConnectionPointTypes.Float, NodeMaterialBlockTargets.Fragment);

    }

    @editableInPropertyPage("Alpha from albedo", PropertyTypeForEdition.Boolean, "TRANSPARENCY")
    public useAlphaFromAlbedoTexture: boolean = false;

    @editableInPropertyPage("Alpha Testing", PropertyTypeForEdition.Boolean, "TRANSPARENCY")
    public useAlphaTest: boolean = false;

    @editableInPropertyPage("Alpha CutOff", PropertyTypeForEdition.Float, "TRANSPARENCY", { min: 0, max: 1})
    public alphaTestCutoff: number = 0.4;

    @editableInPropertyPage("Alpha blending", PropertyTypeForEdition.Boolean, "TRANSPARENCY")
    public useAlphaBlending: boolean = false;

    @editableInPropertyPage("Get alpha from opacity texture RGB", PropertyTypeForEdition.Boolean, "TRANSPARENCY")
    public opacityRGB: boolean = false;

    /**
     * Gets the current class name
     * @returns the class name
     */
    public getClassName() {
        return "PBRMetallicRoughnessBlock";
    }

    public get worldPosition(): NodeMaterialConnectionPoint {
        return this._inputs[0];
    }

    public get worldNormal(): NodeMaterialConnectionPoint {
        return this._inputs[1];
    }

    public get perturbedNormal(): NodeMaterialConnectionPoint {
        return this._inputs[2];
    }

    public get cameraPosition(): NodeMaterialConnectionPoint {
        return this._inputs[3];
    }

    public get baseColor(): NodeMaterialConnectionPoint {
        return this._inputs[4];
    }

    public get baseTexture(): NodeMaterialConnectionPoint {
        return this._inputs[5];
    }

    public get metallic(): NodeMaterialConnectionPoint {
        return this._inputs[6];
    }

    public get roughness(): NodeMaterialConnectionPoint {
        return this._inputs[7];
    }

    public get metalRoughTexture(): NodeMaterialConnectionPoint {
        return this._inputs[8];
    }

    public get opacityTexture(): NodeMaterialConnectionPoint {
        return this._inputs[9];
    }

    public get ambientColor(): NodeMaterialConnectionPoint {
        return this._inputs[10];
    }

    public get ambientOcclusionParams(): NodeMaterialConnectionPoint {
        return this._inputs[11];
    }

    public get reflectionParams(): NodeMaterialConnectionPoint {
        return this._inputs[12];
    }

    public get sheenParams(): NodeMaterialConnectionPoint {
        return this._inputs[13];
    }

    public get clearcoatParams(): NodeMaterialConnectionPoint {
        return this._inputs[14];
    }

    public get subSurfaceParams(): NodeMaterialConnectionPoint {
        return this._inputs[15];
    }

    public get anisotropyParams(): NodeMaterialConnectionPoint {
        return this._inputs[16];
    }

    public get ambient(): NodeMaterialConnectionPoint {
        return this._outputs[0];
    }

    public get diffuse(): NodeMaterialConnectionPoint {
        return this._outputs[1];
    }

    public get specular(): NodeMaterialConnectionPoint {
        return this._outputs[2];
    }

    public get sheen(): NodeMaterialConnectionPoint {
        return this._outputs[3];
    }

    public get clearcoat(): NodeMaterialConnectionPoint {
        return this._outputs[4];
    }

    public get diffuseIndirect(): NodeMaterialConnectionPoint {
        return this._outputs[5];
    }

    public get specularIndirect(): NodeMaterialConnectionPoint {
        return this._outputs[6];
    }

    public get sheenIndirect(): NodeMaterialConnectionPoint {
        return this._outputs[7];
    }

    public get clearcoatIndirect(): NodeMaterialConnectionPoint {
        return this._outputs[8];
    }

    public get refraction(): NodeMaterialConnectionPoint {
        return this._outputs[9];
    }

    public get lighting(): NodeMaterialConnectionPoint {
        return this._outputs[10];
    }

    public get shadow(): NodeMaterialConnectionPoint {
        return this._outputs[11];
    }

    public autoConfigure(material: NodeMaterial) {
        if (!this.cameraPosition.isConnected) {
            let cameraPositionInput = material.getInputBlockByPredicate((b) => b.systemValue === NodeMaterialSystemValues.CameraPosition);

            if (!cameraPositionInput) {
                cameraPositionInput = new InputBlock("cameraPosition");
                cameraPositionInput.setAsSystemValue(NodeMaterialSystemValues.CameraPosition);
            }
            cameraPositionInput.output.connectTo(this.cameraPosition);
        }
    }

    public prepareDefines(mesh: AbstractMesh, nodeMaterial: NodeMaterial, defines: NodeMaterialDefines) {
        defines.setValue("PBR", true);

        // Albedo & Opacity
        if (this.baseTexture.isConnected) {
            defines.setValue("ALBEDO", true);
        }

        if (this.opacityTexture.isConnected) {
            defines.setValue("OPACITY", true);
        }

        // Ambient occlusion
        const aoBlock = this.ambientOcclusionParams.connectedPoint?.ownerBlock as Nullable<AmbientOcclusionBlock>;

        defines.setValue("AMBIENT", aoBlock?.texture.isConnected ?? false);

        if (!defines._areLightsDirty) {
            return;
        }

        const scene = mesh.getScene();

        if (!this.light) {
            // Lights
            MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, true, nodeMaterial.maxSimultaneousLights);
            defines._needNormals = true;

            defines.setValue("SPECULARTERM", false); //!! DBG

            // Multiview
            //MaterialHelper.PrepareDefinesForMultiview(scene, defines);
        } else {
            let state = {
                needNormals: false,
                needRebuild: false,
                lightmapMode: false,
                shadowEnabled: false,
                specularEnabled: false
            };

            MaterialHelper.PrepareDefinesForLight(scene, mesh, this.light, this._lightId, defines, true, state);

            if (state.needRebuild) {
                defines.rebuild();
            }
        }
    }

    public updateUniformsAndSamples(state: NodeMaterialBuildState, nodeMaterial: NodeMaterial, defines: NodeMaterialDefines, uniformBuffers: string[]) {
        MaterialHelper.PrepareUniformsAndSamplersList(<IEffectCreationOptions>{
            uniformsNames: state.uniforms,
            uniformBuffersNames: uniformBuffers,
            samplers: state.samplers,
            defines: defines,
            maxSimultaneousLights: nodeMaterial.maxSimultaneousLights
        });
    }

    public isReady() {
        /*if (this.texture && !this.texture.isReadyOrNotBlocking()) {
            return false;
        }*/

        return true;
    }

    public bind(effect: Effect, nodeMaterial: NodeMaterial, mesh?: Mesh) {
        if (!mesh) {
            return;
        }

        const scene = mesh.getScene();

        if (!this.light) {
            MaterialHelper.BindLights(scene, mesh, effect, true, nodeMaterial.maxSimultaneousLights);
        } else {
            MaterialHelper.BindLight(this.light, this._lightId, scene, effect, true);
        }

        /*if (!mesh || !this.texture) {
            return;
        }

        effect.setMatrix(this._reflectionMatrixName, this.texture.getReflectionTextureMatrix());

        if (this.texture.isCube) {
            effect.setTexture(this._cubeSamplerName, this.texture);
        } else {
            effect.setTexture(this._2DSamplerName, this.texture);
        }*/
    }

    private _injectVertexCode(state: NodeMaterialBuildState) {
        let worldPos = this.worldPosition;
        let comments = `//${this.name}`;

        // Declaration
        if (!this.light) { // Emit for all lights
            state._emitFunctionFromInclude(state.supportUniformBuffers ? "lightUboDeclaration" : "lightFragmentDeclaration", comments, {
                repeatKey: "maxSimultaneousLights"
            });
            this._lightId = 0;

            state.sharedData.dynamicUniformBlocks.push(this);
        } else {
            this._lightId = (state.counters["lightCounter"] !== undefined ? state.counters["lightCounter"] : -1) + 1;
            state.counters["lightCounter"] = this._lightId;

            state._emitFunctionFromInclude(state.supportUniformBuffers ? "lightUboDeclaration" : "lightFragmentDeclaration", comments, {
                replaceStrings: [{ search: /{X}/g, replace: this._lightId.toString() }]
            }, this._lightId.toString());
        }

        // Inject code in vertex
        let worldPosVaryingName = "v_" + worldPos.associatedVariableName;
        if (state._emitVaryingFromString(worldPosVaryingName, "vec4")) {
            state.compilationString += `${worldPosVaryingName} = ${worldPos.associatedVariableName};\r\n`;
        }

        if (this.light) {
            state.compilationString += state._emitCodeFromInclude("shadowsVertex", comments, {
                replaceStrings: [
                    { search: /{X}/g, replace: this._lightId.toString() },
                    { search: /worldPos/g, replace: worldPos.associatedVariableName }
                ]
            });
        } else {
            state.compilationString += `vec4 worldPos = ${worldPos.associatedVariableName};\r\n`;
            state.compilationString += state._emitCodeFromInclude("shadowsVertex", comments, {
                repeatKey: "maxSimultaneousLights"
            });
        }
    }

    protected _buildBlock(state: NodeMaterialBuildState) {
        super._buildBlock(state);

        if (state.target !== NodeMaterialBlockTargets.Fragment) {
            // Vertex
            this._injectVertexCode(state);

            return;
        }

        // Fragment
        state.sharedData.bindableBlocks.push(this);
        state.sharedData.blocksWithDefines.push(this);

        let comments = `//${this.name}`;
        let worldPos = this.worldPosition;
        let normalShading = this.perturbedNormal;

        //
        // Includes
        //
        if (!this.light) { // Emit for all lights
            state._emitFunctionFromInclude(state.supportUniformBuffers ? "lightUboDeclaration" : "lightFragmentDeclaration", comments, {
                repeatKey: "maxSimultaneousLights"
            });
        } else {
            state._emitFunctionFromInclude(state.supportUniformBuffers ? "lightUboDeclaration" : "lightFragmentDeclaration", comments, {
                replaceStrings: [{ search: /{X}/g, replace: this._lightId.toString() }]
            }, this._lightId.toString());
        }

        state._emitFunctionFromInclude("helperFunctions", comments);
        state._emitFunctionFromInclude("pbrHelperFunctions", comments);

        state._emitFunctionFromInclude("shadowsFragmentFunctions", comments, {
            replaceStrings: [
                { search: /vPositionW/g, replace: "v_" + worldPos.associatedVariableName + ".xyz" }
            ]
        });

        state._emitFunctionFromInclude("harmonicsFunctions", comments);

        state._emitFunctionFromInclude("pbrDirectLightingSetupFunctions", comments, {
            replaceStrings: [
                { search: /vPositionW/g, replace: "v_" + worldPos.associatedVariableName + ".xyz" }
            ]
        });

        state._emitFunctionFromInclude("pbrDirectLightingFalloffFunctions", comments);
        state._emitFunctionFromInclude("pbrBRDFFunctions", comments);

        state._emitFunctionFromInclude("pbrDirectLightingFunctions", comments, {
            replaceStrings: [
                { search: /vPositionW/g, replace: "v_" + worldPos.associatedVariableName + ".xyz" }
            ]
        });

        state._emitFunctionFromInclude("pbrIBLFunctions", comments);

        state._emitFunctionFromInclude("pbrBlockAlbedoOpacity", comments);
        state._emitFunctionFromInclude("pbrBlockReflectivity", comments);
        state._emitFunctionFromInclude("pbrBlockAmbientOcclusion", comments);
        state._emitFunctionFromInclude("pbrBlockAlphaFresnel", comments);
        state._emitFunctionFromInclude("pbrBlockAnisotropic", comments);
        state._emitFunctionFromInclude("pbrBlockReflection", comments);
        state._emitFunctionFromInclude("pbrBlockSheen", comments);
        state._emitFunctionFromInclude("pbrBlockClearcoat", comments);
        state._emitFunctionFromInclude("pbrBlockSubSurface", comments);

        //
        // code
        //
        const vLightingIntensity = "vec4(1.)";

        const aoBlock = this.ambientOcclusionParams.connectedPoint?.ownerBlock as Nullable<AmbientOcclusionBlock>;
        const aoColor = this.ambientColor.isConnected ? this.ambientColor.associatedVariableName : "vec3(0., 0., 0.)";
        let aoDirectLightIntensity = aoBlock?.directLightIntensity.isConnected ? aoBlock.directLightIntensity.associatedVariableName : PBRBaseMaterial.DEFAULT_AO_ON_ANALYTICAL_LIGHTS.toString();

        if (!aoBlock?.directLightIntensity.isConnected && aoDirectLightIntensity.charAt(aoDirectLightIntensity.length - 1) !== '.') {
            aoDirectLightIntensity += ".";
        }

        if (this._lightId === 0) {
            // _____________________________ Geometry Information ____________________________
            if (state._registerTempVariable("viewDirectionW")) {
                state.compilationString += `vec3 viewDirectionW = normalize(${this.cameraPosition.associatedVariableName} - ${"v_" + worldPos.associatedVariableName}.xyz);\r\n`;
            }

            state.compilationString += `vec3 geometricNormalW = ${this.worldNormal.associatedVariableName}.xyz;\r\n`;

            state.compilationString += `vec3 normalW = ${normalShading.isConnected ? normalShading.associatedVariableName + ".xyz" : "geometricNormalW"};\r\n`;

            state.compilationString += state._emitCodeFromInclude("pbrBlockNormalFinal", comments, {
                replaceStrings: [
                    { search: /vPositionW/g, replace: worldPos.associatedVariableName },
                    { search: /vEyePosition.w/g, replace: "1." },
                ]
            });

            // _____________________________ Albedo & Opacity ______________________________
            state.compilationString += `albedoOpacityOutParams albedoOpacityOut;\r\n`;

            const albedoColor = this.baseColor.isConnected ? this.baseColor.associatedVariableName : "vec4(1., 1., 1., 1.)";
            const albedoTexture = this.baseTexture.isConnected ? this.baseTexture.associatedVariableName : "";
            const opacityTexture = this.opacityTexture.isConnected ? this.opacityTexture.associatedVariableName : "";

            state.compilationString += `albedoOpacityBlock(
                    ${albedoColor},
                #ifdef ALBEDO
                    ${albedoTexture},
                    vec2(1., 1.),
                #endif
                #ifdef OPACITY
                    ${opacityTexture},
                    vec2(1., 1.),
                #endif
                    albedoOpacityOut
                );

                vec3 surfaceAlbedo = albedoOpacityOut.surfaceAlbedo;
                float alpha = albedoOpacityOut.alpha;\r\n`;

            // _____________________________ AO  _______________________________
            state.compilationString += `ambientOcclusionOutParams aoOut;\r\n`;

            const aoTexture = aoBlock?.texture.isConnected ? aoBlock.texture.associatedVariableName : "vec2(0., 0.)";
            const aoLevel = "1.";
            const aoIntensity = aoBlock?.intensity.isConnected ? aoBlock.intensity.associatedVariableName : "1.";

            state.compilationString += `ambientOcclusionBlock(
                #ifdef AMBIENT
                    ${aoTexture},
                    vec4(0., ${aoLevel}, ${aoIntensity}, 0.),
                #endif
                    aoOut
                );\r\n`;

            // _____________________________ Direct Lighting Info __________________________________
            state.compilationString += state._emitCodeFromInclude("pbrBlockDirectLighting", comments);
        }

        /*if (this.light) {
            state.compilationString += state._emitCodeFromInclude("lightFragment", comments, {
                replaceStrings: [
                    { search: /{X}/g, replace: this._lightId.toString() }
                ]
            });
        } else {
            state.compilationString += state._emitCodeFromInclude("lightFragment", comments, {
                repeatKey: "maxSimultaneousLights"
            });
        }*/

        // _____________________________ Compute Final Lit and Unlit Components ________________________
        //state.compilationString += state._emitCodeFromInclude("pbrBlockFinalLitComponents", comments);

        state.compilationString += state._emitCodeFromInclude("pbrBlockFinalUnlitComponents", comments, {
            replaceStrings: [
                { search: /vec3 finalEmissive[\s\S]*?finalEmissive\*=vLightingIntensity\.y;/g, replace: "" },
                { search: /vAmbientColor/g, replace: aoColor },
                { search: /vLightingIntensity/g, replace: vLightingIntensity },
                { search: /vAmbientInfos\.w/g, replace: aoDirectLightIntensity },
            ]
        });

        state.compilationString += state._emitCodeFromInclude("pbrBlockFinalColorComposition", comments, {
            replaceStrings: [
                { search: /finalEmissive/g, replace: "vec3(0.)" },
            ]
        });

        if (this.lighting.hasEndpoints) {
            state.compilationString += this._declareOutput(this.lighting, state) + ` = finalColor;\r\n`;
        }

        if (this.shadow.hasEndpoints) {
            state.compilationString += this._declareOutput(this.shadow, state) + ` = shadow;\r\n`;
        }

        (window as any).sheenParams = this.sheenParams.connectedPoint?.ownerBlock;
        return this;
    }

    public serialize(): any {
        let serializationObject = super.serialize();

        if (this.light) {
            serializationObject.lightId = this.light.id;
        }

        /*if (this.texture) {
            serializationObject.texture = this.texture.serialize();
        }*/

        return serializationObject;
    }

    public _deserialize(serializationObject: any, scene: Scene, rootUrl: string) {
        super._deserialize(serializationObject, scene, rootUrl);

        if (serializationObject.lightId) {
            this.light = scene.getLightByID(serializationObject.lightId);
        }

        /*if (serializationObject.texture) {
            rootUrl = serializationObject.texture.url.indexOf("data:") === 0 ? "" : rootUrl;
            if (serializationObject.texture.isCube) {
                this.texture = CubeTexture.Parse(serializationObject.texture, scene, rootUrl);
            } else {
                this.texture = Texture.Parse(serializationObject.texture, scene, rootUrl);
            }
        }*/
    }
}

_TypeStore.RegisteredTypes["BABYLON.PBRMetallicRoughnessBlock"] = PBRMetallicRoughnessBlock;