import { SerializationHelper, serialize, expandToProperty, serializeAsColor3, serializeAsTexture } from "../../Misc/decorators";
import { UniformBuffer } from "../../Materials/uniformBuffer";
import { Color3 } from '../../Maths/math.color';
import { MaterialFlags } from "../../Materials/materialFlags";
import { MaterialHelper } from "../../Materials/materialHelper";
import { BaseTexture } from "../../Materials/Textures/baseTexture";
import { Nullable } from "../../types";
import { IAnimatable } from '../../Animations/animatable.interface';
import { EffectFallbacks } from '../effectFallbacks';
import { SubMesh } from '../../Meshes/subMesh';
import { Constants } from "../../Engines/constants";
import { IMaterialPlugin } from "../IMaterialPlugin";
import { RegisterMaterialPlugin } from "../materialPluginManager";
import { PBRBaseMaterial } from "./pbrBaseMaterial";
import { MaterialDefines } from "../materialDefines";

declare type Engine = import("../../Engines/engine").Engine;
declare type Scene = import("../../scene").Scene;
declare type Material = import("../material").Material;
declare type AbstractMesh = import("../../Meshes/abstractMesh").AbstractMesh;

RegisterMaterialPlugin("sheen", (material: Material) => {
    if (material instanceof PBRBaseMaterial) {
        return new PBRSheenConfiguration(material);
    }
    return null;
});

/**
 * @hidden
 */
 class MaterialSheenDefines extends MaterialDefines {
    public SHEEN = false;
    public SHEEN_TEXTURE = false;
    public SHEEN_GAMMATEXTURE = false;
    public SHEEN_TEXTURE_ROUGHNESS = false;
    public SHEEN_TEXTUREDIRECTUV = 0;
    public SHEEN_TEXTURE_ROUGHNESSDIRECTUV = 0;
    public SHEEN_LINKWITHALBEDO = false;
    public SHEEN_ROUGHNESS = false;
    public SHEEN_ALBEDOSCALING = false;
    public SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE = false;
    public SHEEN_TEXTURE_ROUGHNESS_IDENTICAL = false;

    /** @hidden */
    _areTexturesDirty: boolean;
}

const modelDefines = new MaterialSheenDefines();

/**
 * Define the code related to the Sheen parameters of the pbr material.
 */
export class PBRSheenConfiguration implements IMaterialPlugin {
    /**
     * Defines the priority of the plugin.
     */
    @serialize()
    public priority = 120;

    private _material: PBRBaseMaterial;

    private _isEnabled = false;
    /**
     * Defines if the material uses sheen.
     */
    @serialize()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public isEnabled = false;

    private _linkSheenWithAlbedo = false;
    /**
     * Defines if the sheen is linked to the sheen color.
     */
    @serialize()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public linkSheenWithAlbedo = false;

    /**
     * Defines the sheen intensity.
     */
    @serialize()
    public intensity = 1;

    /**
     * Defines the sheen color.
     */
    @serializeAsColor3()
    public color = Color3.White();

    private _texture: Nullable<BaseTexture> = null;
    /**
     * Stores the sheen tint values in a texture.
     * rgb is tint
     * a is a intensity or roughness if the roughness property has been defined and useRoughnessFromTexture is true (in that case, textureRoughness won't be used)
     * If the roughness property has been defined and useRoughnessFromTexture is false then the alpha channel is not used to modulate roughness
     */
    @serializeAsTexture()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public texture: Nullable<BaseTexture> = null;

    private _useRoughnessFromMainTexture = true;
    /**
     * Indicates that the alpha channel of the texture property will be used for roughness.
     * Has no effect if the roughness (and texture!) property is not defined
     */
    @serialize()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public useRoughnessFromMainTexture = true;

    private _roughness: Nullable<number> = null;
    /**
     * Defines the sheen roughness.
     * It is not taken into account if linkSheenWithAlbedo is true.
     * To stay backward compatible, material roughness is used instead if sheen roughness = null
     */
    @serialize()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public roughness: Nullable<number> = null;

    private _textureRoughness: Nullable<BaseTexture> = null;
    /**
     * Stores the sheen roughness in a texture.
     * alpha channel is the roughness. This texture won't be used if the texture property is not empty and useRoughnessFromTexture is true
     */
    @serializeAsTexture()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public textureRoughness: Nullable<BaseTexture> = null;

    private _albedoScaling = false;
    /**
     * If true, the sheen effect is layered above the base BRDF with the albedo-scaling technique.
     * It allows the strength of the sheen effect to not depend on the base color of the material,
     * making it easier to setup and tweak the effect
     */
    @serialize()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public albedoScaling = false;

    /** @hidden */
    private _internalMarkAllSubMeshesAsTexturesDirty: () => void;

    /** @hidden */
    public _markAllSubMeshesAsTexturesDirty(): void {
        this._internalMarkAllSubMeshesAsTexturesDirty();
    }

    /**
     * Instantiate a new instance of sheen configuration.
     * @param material The material implementing this plugin.
     */
     constructor(material: PBRBaseMaterial) {
        this._material = material;
    }

    /**
     * Initialize the plugin.
     *
     * @param scene defines the scene the material belongs to.
     * @param dirtyCallbacks The list of dirty callbacks
     */
    public initialize(scene: Scene, dirtyCallbacks: { [code: number]: () => void }): void {
        this._internalMarkAllSubMeshesAsTexturesDirty = dirtyCallbacks[Constants.MATERIAL_TextureDirtyFlag];
    }

    /**
     * Specifies that the submesh is ready to be used.
     * @param defines the list of "defines" to update.
     * @param scene defines the scene the material belongs to.
     * @param engine the engine this scene belongs to.
     * @returns - boolean indicating that the submesh is ready or not.
     */
    public isReadyForSubMesh(defines: MaterialSheenDefines, scene: Scene, engine: Engine): boolean {
        if (!this._isEnabled) {
            return true;
        }

        if (defines._areTexturesDirty) {
            if (scene.texturesEnabled) {
                if (this._texture && MaterialFlags.SheenTextureEnabled) {
                    if (!this._texture.isReadyOrNotBlocking()) {
                        return false;
                    }
                }

                if (this._textureRoughness && MaterialFlags.SheenTextureEnabled) {
                    if (!this._textureRoughness.isReadyOrNotBlocking()) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Collects all defines.
     * @param defines The object to append to.
     */
    public collectDefines(defines: { [name: string]: { type: string, default: any } }): void {
        for (const key of Object.keys(modelDefines)) {
            if (key[0] === "_") {
                continue;
            }

            const type = typeof (modelDefines[key]);
            defines[key] = {
                type: type === "number" ? "number" : type === "string" ? "string" : "object",
                default: modelDefines[key],
            };
        }
    }

    /**
     * Checks to see if a texture is used in the material.
     * @param defines the list of "defines" to update.
     * @param scene defines the scene the material belongs to.
     * @param mesh the mesh being rendered
     */
    public prepareDefines(defines: MaterialSheenDefines, scene: Scene, mesh: AbstractMesh): void {
        if (this._isEnabled) {
            defines.SHEEN = this._isEnabled;
            defines.SHEEN_LINKWITHALBEDO = this._linkSheenWithAlbedo;
            defines.SHEEN_ROUGHNESS = this._roughness !== null;
            defines.SHEEN_ALBEDOSCALING = this._albedoScaling;
            defines.SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE = this._useRoughnessFromMainTexture;
            defines.SHEEN_TEXTURE_ROUGHNESS_IDENTICAL = this._texture !== null && this._texture._texture === this._textureRoughness?._texture && this._texture.checkTransformsAreIdentical(this._textureRoughness);

            if (defines._areTexturesDirty) {
                if (scene.texturesEnabled) {
                    if (this._texture && MaterialFlags.SheenTextureEnabled) {
                        MaterialHelper.PrepareDefinesForMergedUV(this._texture, defines, "SHEEN_TEXTURE");
                        defines.SHEEN_GAMMATEXTURE = this._texture.gammaSpace;
                    } else {
                        defines.SHEEN_TEXTURE = false;
                    }

                    if (this._textureRoughness && MaterialFlags.SheenTextureEnabled) {
                        MaterialHelper.PrepareDefinesForMergedUV(this._textureRoughness, defines, "SHEEN_TEXTURE_ROUGHNESS");
                    } else {
                        defines.SHEEN_TEXTURE_ROUGHNESS = false;
                    }
                }
            }
        }
        else {
            defines.SHEEN = false;
            defines.SHEEN_TEXTURE = false;
            defines.SHEEN_TEXTURE_ROUGHNESS = false;
            defines.SHEEN_LINKWITHALBEDO = false;
            defines.SHEEN_ROUGHNESS = false;
            defines.SHEEN_ALBEDOSCALING = false;
            defines.SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE = false;
            defines.SHEEN_TEXTURE_ROUGHNESS_IDENTICAL = false;
        }
    }

    /**
     * Binds the material data.
     * @param uniformBuffer defines the Uniform buffer to fill in.
     * @param scene defines the scene the material belongs to.
     * @param engine the engine this scene belongs to.
     * @param subMesh the submesh to bind data for
     */
    public bindForSubMesh(uniformBuffer: UniformBuffer, scene: Scene, engine: Engine, subMesh: SubMesh): void {
        if (!this._isEnabled) {
            return;
        }

        const defines = subMesh!.materialDefines as unknown as MaterialSheenDefines;

        const isFrozen = this._material.isFrozen;

        const identicalTextures = defines.SHEEN_TEXTURE_ROUGHNESS_IDENTICAL;

        if (!uniformBuffer.useUbo || !isFrozen || !uniformBuffer.isSync) {
            if (identicalTextures && MaterialFlags.SheenTextureEnabled) {
                uniformBuffer.updateFloat4("vSheenInfos", this._texture!.coordinatesIndex, this._texture!.level, -1, -1);
                MaterialHelper.BindTextureMatrix(this._texture!, uniformBuffer, "sheen");
            } else if ((this._texture || this._textureRoughness) && MaterialFlags.SheenTextureEnabled) {
                uniformBuffer.updateFloat4("vSheenInfos", this._texture?.coordinatesIndex ?? 0, this._texture?.level ?? 0, this._textureRoughness?.coordinatesIndex ?? 0, this._textureRoughness?.level ?? 0);
                if (this._texture) {
                    MaterialHelper.BindTextureMatrix(this._texture, uniformBuffer, "sheen");
                }
                if (this._textureRoughness && !identicalTextures && !defines.SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE) {
                    MaterialHelper.BindTextureMatrix(this._textureRoughness, uniformBuffer, "sheenRoughness");
                }
            }

            // Sheen
            uniformBuffer.updateFloat4("vSheenColor",
                this.color.r,
                this.color.g,
                this.color.b,
                this.intensity);

            if (this._roughness !== null) {
                uniformBuffer.updateFloat("vSheenRoughness", this._roughness);
            }
        }

        // Textures
        if (scene.texturesEnabled) {
            if (this._texture && MaterialFlags.SheenTextureEnabled) {
                uniformBuffer.setTexture("sheenSampler", this._texture);
            }

            if (this._textureRoughness && !identicalTextures && !defines.SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE && MaterialFlags.SheenTextureEnabled) {
                uniformBuffer.setTexture("sheenRoughnessSampler", this._textureRoughness);
            }
        }
    }

    /**
     * Checks to see if a texture is used in the material.
     * @param texture - Base texture to use.
     * @returns - Boolean specifying if a texture is used in the material.
     */
    public hasTexture(texture: BaseTexture): boolean {
        if (this._texture === texture) {
            return true;
        }

        if (this._textureRoughness === texture) {
            return true;
        }

        return false;
    }

    /**
     * Returns an array of the actively used textures.
     * @param activeTextures Array of BaseTextures
     */
    public getActiveTextures(activeTextures: BaseTexture[]): void {
        if (this._texture) {
            activeTextures.push(this._texture);
        }

        if (this._textureRoughness) {
            activeTextures.push(this._textureRoughness);
        }
    }

    /**
     * Returns the animatable textures.
     * @param animatables Array of animatable textures.
     */
    public getAnimatables(animatables: IAnimatable[]): void {
        if (this._texture && this._texture.animations && this._texture.animations.length > 0) {
            animatables.push(this._texture);
        }

        if (this._textureRoughness && this._textureRoughness.animations && this._textureRoughness.animations.length > 0) {
            animatables.push(this._textureRoughness);
        }
    }

    /**
     * Disposes the resources of the material.
     * @param forceDisposeTextures - Forces the disposal of all textures.
     */
    public dispose(forceDisposeTextures?: boolean): void {
        if (forceDisposeTextures) {
            this._texture?.dispose();
            this._textureRoughness?.dispose();
        }
    }

    /**
    * Get the current class name of the texture useful for serialization or dynamic coding.
    * @returns "PBRSheenConfiguration"
    */
    public getClassName(): string {
        return "PBRSheenConfiguration";
    }

    /**
     * Add fallbacks to the effect fallbacks list.
     * @param defines defines the Base texture to use.
     * @param fallbacks defines the current fallback list.
     * @param currentRank defines the current fallback rank.
     * @returns the new fallback rank.
     */
    public addFallbacks(defines: MaterialSheenDefines, fallbacks: EffectFallbacks, currentRank: number): number {
        if (defines.SHEEN) {
            fallbacks.addFallback(currentRank++, "SHEEN");
        }
        return currentRank;
    }

    /**
     * Add the required uniforms to the current list.
     * @param uniforms defines the current uniform list.
     */
    public addUniforms(uniforms: string[]): void {
        uniforms.push("vSheenColor", "vSheenRoughness", "vSheenInfos", "sheenMatrix", "sheenRoughnessMatrix");
    }

    /**
     * Add the required uniforms to the current buffer.
     * @param uniformBuffer defines the current uniform buffer.
     */
    public prepareUniformBuffer(uniformBuffer: UniformBuffer): void {
        uniformBuffer.addUniform("vSheenColor", 4);
        uniformBuffer.addUniform("vSheenRoughness", 1);
        uniformBuffer.addUniform("vSheenInfos", 4);
        uniformBuffer.addUniform("sheenMatrix", 16);
        uniformBuffer.addUniform("sheenRoughnessMatrix", 16);
    }

    /**
     * Add the required samplers to the current list.
     * @param samplers defines the current sampler list.
     */
    public addSamplers(samplers: string[]): void {
        samplers.push("sheenSampler");
        samplers.push("sheenRoughnessSampler");
    }

    /**
     * Makes a duplicate of the current configuration into another one.
     * @param sheenConfiguration define the config where to copy the info
     */
    public copyTo(sheenConfiguration: PBRSheenConfiguration): void {
        SerializationHelper.Clone(() => sheenConfiguration, this);
    }

    /**
     * Serializes this BRDF configuration.
     * @returns - An object with the serialized config.
     */
    public serialize(): any {
        return SerializationHelper.Serialize(this);
    }

    /**
     * Parses a anisotropy Configuration from a serialized object.
     * @param source - Serialized object.
     * @param scene Defines the scene we are parsing for
     * @param rootUrl Defines the rootUrl to load from
     */
    public parse(source: any, scene: Scene, rootUrl: string): void {
        SerializationHelper.Parse(() => this, source, scene, rootUrl);
    }
}