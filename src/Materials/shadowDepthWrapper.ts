import { Nullable } from "../types";
import { Scene } from "../scene";
import { SubMesh } from "../Meshes/subMesh";
import { Material } from "./material";
import { _TypeStore } from "../Misc/typeStore";
import { Effect, IEffectCreationOptions } from './effect';
import { ShadowGenerator } from '../Lights/Shadows/shadowGenerator';
import { GUID } from '../Misc/guid';
import { NodeMaterial } from './Node/nodeMaterial';
import { NodeMaterialSystemValues } from './Node/Enums/nodeMaterialSystemValues';
import { Constants } from "../Engines/constants";

/**
 * Options to be used when creating a shadow depth material
 */
export interface IIOptionShadowDepthMaterial {
    /** Variables in the vertex shader code that need to have their names remapped.
     * The format is: ["var_name", "var_remapped_name", "var_name", "var_remapped_name", ...]
     * "var_name" should be either: worldPos or vNormalW
     * So, if the variable holding the world position in your vertex shader is not named worldPos, you must tell the system
     * the name to use instead by using: ["worldPos", "myWorldPosVar"] assuming the variable is named myWorldPosVar in your code.
     * If the normal must also be remapped: ["worldPos", "myWorldPosVar", "vNormalW", "myWorldNormal"]
    */
    remappedVariables?: string[];

    /** Set standalone to true if the base material wrapped by ShadowDepthMaterial is not used for a regular object but for depth shadow generation only */
    standalone?: boolean;
}

/**
 * Class that can be used to wrap a base material to generate accurate shadows when using custom vertex/fragment code in the base material
 */
export class ShadowDepthWrapper {

    private _scene: Scene;
    private _options?: IIOptionShadowDepthMaterial;
    private _baseMaterial: Material;

    /** @hidden */
    public _matriceNames: any;

    /** Gets the standalone status of the wrapper */
    public get standalone(): boolean {
        return this._options?.standalone ?? false;
    }

    /** Gets the base material the wrapper is built upon */
    public get baseMaterial(): Material {
        return this._baseMaterial;
    }

    /**
     * Instantiate a new shadow depth wrapper.
     * It works by injecting some specific code in the vertex/fragment shaders of the base material and is used by a shadow generator to
     * generate the shadow depth map. For more information, please refer to the documentation:
     * https://doc.babylonjs.com/babylon101/shadows
     * @param baseMaterial Material to wrap
     * @param scene Define the scene the material belongs to
     * @param options Options used to create the wrapper
     */
    constructor(baseMaterial: Material, scene: Scene, options?: IIOptionShadowDepthMaterial) {
        this._baseMaterial = baseMaterial;
        this._scene = scene;
        this._options = options;

        const prefix = baseMaterial.getClassName() === "NodeMaterial" ? "u_" : "";

        if (prefix) {
            this._matriceNames = {
                "world": prefix + "World",
                "view": prefix + "View",
                "projection": prefix + "Projection",
                "viewProjection": prefix + "ViewProjection",
                "worldView": prefix + "WorldxView",
                "worldViewProjection": prefix + "WorldxViewxProjection",
            };

            const nodeMat = baseMaterial as NodeMaterial;
            const inputBlocks = nodeMat.getInputBlocks();

            for (let i = 0; i < inputBlocks.length; ++i) {
                switch (inputBlocks[i]._systemValue) {
                    case NodeMaterialSystemValues.World:
                        this._matriceNames["world"] = inputBlocks[i].associatedVariableName;
                        break;
                    case NodeMaterialSystemValues.View:
                        this._matriceNames["view"] = inputBlocks[i].associatedVariableName;
                        break;
                    case NodeMaterialSystemValues.Projection:
                        this._matriceNames["projection"] = inputBlocks[i].associatedVariableName;
                        break;
                    case NodeMaterialSystemValues.ViewProjection:
                        this._matriceNames["viewProjection"] = inputBlocks[i].associatedVariableName;
                        break;
                    case NodeMaterialSystemValues.WorldView:
                        this._matriceNames["worldView"] = inputBlocks[i].associatedVariableName;
                        break;
                    case NodeMaterialSystemValues.WorldViewProjection:
                        this._matriceNames["worldViewProjection"] = inputBlocks[i].associatedVariableName;
                        break;
                }
            }
        } else {
            this._matriceNames = {
                "world": prefix + "world",
                "view": prefix + "view",
                "projection": prefix + "projection",
                "viewProjection": prefix + "viewProjection",
                "worldView": prefix + "worldView",
                "worldViewProjection": prefix + "worldViewProjection",
            };
        }
    }

    /**
     * Gets the effect to use to generate the depth map
     * @param subMesh subMesh to get the effect for
     * @param shadowGenerator shadow generator to get the effect for
     * @returns the effect to use to generate the depth map for the subMesh + shadow generator specified
     */
    public getEffect(subMesh: Nullable<SubMesh>, shadowGenerator: ShadowGenerator): Nullable<Effect> {
        const subMeshEffect = subMesh?._getDrawWrapper(shadowGenerator._nameForDrawWrapper, true)!;
        return subMeshEffect?.effect;
    }

    /**
     * Specifies that the submesh is ready to be used for depth rendering
     * @param subMesh submesh to check
     * @param defines the list of defines to take into account when checking the effect
     * @param shadowGenerator combined with subMesh, it defines the effect to check
     * @param useInstances specifies that instances should be used
     * @returns a boolean indicating that the submesh is ready or not
     */
    public isReadyForSubMesh(subMesh: SubMesh, defines: string[], shadowGenerator: ShadowGenerator, useInstances: boolean): boolean {
        if (this.standalone) {
            // will ensure the effect is (re)created for the base material
            this._baseMaterial.isReadyForSubMesh(subMesh.getMesh(), subMesh, useInstances);
        }

        return this._makeEffect(subMesh, defines, shadowGenerator)?.isReady() ?? false;
    }

    /**
     * Disposes the resources
     */
    public dispose(): void {
    }

    private _makeEffect(subMesh: Nullable<SubMesh>, defines: string[], shadowGenerator: ShadowGenerator): Nullable<Effect> {
        const mainDrawWrapper = subMesh?._getDrawWrapper(Constants.SUBMESH_DRAWWRAPPER_MAINPASS);
        const origEffect = mainDrawWrapper?.effect;

        if (!mainDrawWrapper || !origEffect) {
            return null;
        }

        const shadowDrawWrapper = subMesh!._getDrawWrapper(shadowGenerator._nameForDrawWrapper, true)!;
        if (!shadowDrawWrapper.userData) {
            shadowDrawWrapper.userData = GUID.RandomId();
        }

        let join = defines.join("\n");

        if (shadowDrawWrapper.effect) {
            if (join === shadowDrawWrapper.defines) {
                // we already created the depth effect and it is still up to date for this submesh + shadow generator
                return shadowDrawWrapper.effect;
            }
        }

        shadowDrawWrapper.defines = join;

        // the depth effect is either out of date or has not been created yet
        let vertexCode = origEffect.rawVertexSourceCode,
            fragmentCode = origEffect.rawFragmentSourceCode;

        // vertex code
        const vertexNormalBiasCode = this._options && this._options.remappedVariables ? `#include<shadowMapVertexNormalBias>(${this._options.remappedVariables.join(",")})` : Effect.IncludesShadersStore["shadowMapVertexNormalBias"],
              vertexMetricCode = this._options && this._options.remappedVariables ? `#include<shadowMapVertexMetric>(${this._options.remappedVariables.join(",")})` : Effect.IncludesShadersStore["shadowMapVertexMetric"],
              fragmentSoftTransparentShadow = this._options && this._options.remappedVariables ? `#include<shadowMapFragmentSoftTransparentShadow>(${this._options.remappedVariables.join(",")})` : Effect.IncludesShadersStore["shadowMapFragmentSoftTransparentShadow"],
              fragmentBlockCode = Effect.IncludesShadersStore["shadowMapFragment"];

        vertexCode = vertexCode.replace(/void\s+?main/g, Effect.IncludesShadersStore["shadowMapVertexDeclaration"] + "\r\nvoid main");
        vertexCode = vertexCode.replace(/#define SHADOWDEPTH_NORMALBIAS|#define CUSTOM_VERTEX_UPDATE_WORLDPOS/g, vertexNormalBiasCode);

        if (vertexCode.indexOf("#define SHADOWDEPTH_METRIC") !== -1) {
            vertexCode = vertexCode.replace(/#define SHADOWDEPTH_METRIC/g, vertexMetricCode);
        } else {
            vertexCode = vertexCode.replace(/}\s*$/g, vertexMetricCode + "\r\n}");
        }
        vertexCode = vertexCode.replace(/#define SHADER_NAME.*?\n|out vec4 glFragColor;\n/g, "");

        // fragment code
        const hasLocationForSoftTransparentShadow = fragmentCode.indexOf("#define SHADOWDEPTH_SOFTTRANSPARENTSHADOW") >= 0 || fragmentCode.indexOf("#define CUSTOM_FRAGMENT_BEFORE_FOG") >= 0;
        const hasLocationForFragment = fragmentCode.indexOf("#define SHADOWDEPTH_FRAGMENT") !== -1;

        let fragmentCodeToInjectAtEnd = "";

        if (!hasLocationForSoftTransparentShadow) {
            fragmentCodeToInjectAtEnd = fragmentSoftTransparentShadow + "\r\n";
        } else {
            fragmentCode = fragmentCode.replace(/#define SHADOWDEPTH_SOFTTRANSPARENTSHADOW|#define CUSTOM_FRAGMENT_BEFORE_FOG/g, fragmentSoftTransparentShadow);
        }

        fragmentCode = fragmentCode.replace(/void\s+?main/g, Effect.IncludesShadersStore["shadowMapFragmentDeclaration"] + "\r\nvoid main");

        if (hasLocationForFragment) {
            fragmentCode = fragmentCode.replace(/#define SHADOWDEPTH_FRAGMENT/g, fragmentBlockCode);
        } else {
            fragmentCodeToInjectAtEnd += fragmentBlockCode + "\r\n";
        }
        if (fragmentCodeToInjectAtEnd) {
            fragmentCode = fragmentCode.replace(/}\s*$/g, fragmentCodeToInjectAtEnd + "}");
        }

        fragmentCode = fragmentCode.replace(/#define SHADER_NAME.*?\n|out vec4 glFragColor;\n/g, "");

        const uniforms = origEffect.getUniformNames().slice();

        uniforms.push("biasAndScaleSM", "depthValuesSM", "lightDataSM", "softTransparentShadowSM");

        shadowDrawWrapper.effect = this._scene.getEngine().createEffect({
            vertexSource: vertexCode,
            fragmentSource: fragmentCode,
            vertexToken: shadowDrawWrapper.userData,
            fragmentToken: shadowDrawWrapper.userData,
        }, <IEffectCreationOptions>{
            attributes: origEffect.getAttributesNames(),
            uniformsNames: uniforms,
            uniformBuffersNames: origEffect.getUniformBuffersNames(),
            samplers: origEffect.getSamplers(),
            defines: join + "\n" + origEffect.defines.replace("#define SHADOWS", "").replace(/#define SHADOW\d/g, ""),
            indexParameters: origEffect.getIndexParameters(),
        }, this._scene.getEngine());

        return shadowDrawWrapper.effect;
    }
}
