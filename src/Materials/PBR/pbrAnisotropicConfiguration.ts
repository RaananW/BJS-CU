import { SerializationHelper, serialize, expandToProperty, serializeAsVector2, serializeAsTexture } from "../../Misc/decorators";
import { UniformBuffer } from "../../Materials/uniformBuffer";
import { VertexBuffer } from "../../Buffers/buffer";
import { Vector2 } from "../../Maths/math.vector";
import { MaterialFlags } from "../../Materials/materialFlags";
import { MaterialHelper } from "../../Materials/materialHelper";
import { BaseTexture } from "../../Materials/Textures/baseTexture";
import { Nullable } from "../../types";
import { SubMesh } from "../../Meshes/subMesh";
import { IAnimatable } from '../../Animations/animatable.interface';
import { EffectFallbacks } from '../effectFallbacks';
import { IMaterialPlugin } from "../IMaterialPlugin";
import { Constants } from "../../Engines/constants";
import { RegisterMaterialPlugin } from "../materialPluginManager";
import { PBRBaseMaterial } from "./pbrBaseMaterial";
import { MaterialDefines } from "../materialDefines";

declare type Engine = import("../../Engines/engine").Engine;
declare type Scene = import("../../scene").Scene;
declare type AbstractMesh = import("../../Meshes/abstractMesh").AbstractMesh;
declare type Material = import("../material").Material;

RegisterMaterialPlugin("anisotropy", (material: Material) => {
    if (material instanceof PBRBaseMaterial) {
        return new PBRAnisotropicConfiguration(material);
    }
    return null;
});

/**
 * @hidden
 */
export class MaterialAnisotropicDefines extends MaterialDefines {
    public ANISOTROPIC = false;
    public ANISOTROPIC_TEXTURE = false;
    public ANISOTROPIC_TEXTUREDIRECTUV = 0;
    public MAINUV1 = false;

    _areTexturesDirty: boolean;
    _needUVs: boolean;
}

const modelDefines = new MaterialAnisotropicDefines();

/**
 * Define the code related to the anisotropic parameters of the pbr material.
 */
export class PBRAnisotropicConfiguration implements IMaterialPlugin {
    /**
     * Defines the priority of the plugin.
     */
    @serialize()
    public priority = 110;

    private _material: PBRBaseMaterial;

    private _isEnabled = false;
    /**
     * Defines if the anisotropy is enabled in the material.
     */
    @serialize()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public isEnabled = false;

    /**
     * Defines the anisotropy strength (between 0 and 1) it defaults to 1.
     */
    @serialize()
    public intensity: number = 1;

    /**
     * Defines if the effect is along the tangents, bitangents or in between.
     * By default, the effect is "stretching" the highlights along the tangents.
     */
    @serializeAsVector2()
    public direction = new Vector2(1, 0);

    private _texture: Nullable<BaseTexture> = null;
    /**
     * Stores the anisotropy values in a texture.
     * rg is direction (like normal from -1 to 1)
     * b is a intensity
     */
    @serializeAsTexture()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public texture: Nullable<BaseTexture> = null;

    /** @hidden */
    private _internalMarkAllSubMeshesAsTexturesDirty: () => void;

    /** @hidden */
    public _markAllSubMeshesAsTexturesDirty(): void {
        this._internalMarkAllSubMeshesAsTexturesDirty();
    }

    /**
     * Instantiate a new instance of anisotropy configuration.
     * @param material The material implementing this plugin.
     */
    constructor(material: PBRBaseMaterial) {
        this._material = material;
    }

    /**
     * Initialize the plugin.
     *
     * @param scene defines the scene the material belongs to.
     * @param dirtyCallbacks The list of dirty callbacks.
     */
    public initialize(scene: Scene, dirtyCallbacks: { [code: number]: () => void }): void {
        this._internalMarkAllSubMeshesAsTexturesDirty = dirtyCallbacks[Constants.MATERIAL_TextureDirtyFlag];
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
     * Specifies that the submesh is ready to be used.
     * @param defines the list of "defines" to update.
     * @param scene defines the scene the material belongs to.
     * @param engine the engine this scene belongs to.
     * @returns - boolean indicating that the submesh is ready or not.
     */
    public isReadyForSubMesh(defines: MaterialAnisotropicDefines, scene: Scene, engine: Engine): boolean {
        if (!this._isEnabled) {
            return true;
        }

        if (defines._areTexturesDirty) {
            if (scene.texturesEnabled) {
                if (this._texture && MaterialFlags.AnisotropicTextureEnabled) {
                    if (!this._texture.isReadyOrNotBlocking()) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Checks to see if a texture is used in the material.
     * @param defines the list of "defines" to update.
     * @param scene defines the scene the material belongs to.
     * @param mesh the mesh being rendered
     */
    public prepareDefines(defines: MaterialAnisotropicDefines, scene: Scene, mesh: AbstractMesh): void {
        if (this._isEnabled) {
            defines.ANISOTROPIC = this._isEnabled;
            if (this._isEnabled && !mesh.isVerticesDataPresent(VertexBuffer.TangentKind)) {
                defines._needUVs = true;
                defines.MAINUV1 = true;
            }

            if (defines._areTexturesDirty) {
                if (scene.texturesEnabled) {
                    if (this._texture && MaterialFlags.AnisotropicTextureEnabled) {
                        MaterialHelper.PrepareDefinesForMergedUV(this._texture, defines, "ANISOTROPIC_TEXTURE");
                    } else {
                        defines.ANISOTROPIC_TEXTURE = false;
                    }
                }
            }
        }
        else {
            defines.ANISOTROPIC = false;
            defines.ANISOTROPIC_TEXTURE = false;
        }
    }

    /**
     * Binds the material data.
     * @param uniformBuffer defines the Uniform buffer to fill in.
     * @param scene defines the scene the material belongs to.
     * @param engine defines the engine the material belongs to.
     * @param subMesh the submesh to bind data for
    */
     public bindForSubMesh(uniformBuffer: UniformBuffer, scene: Scene, engine: Engine, subMesh: SubMesh): void {
        if (!this._isEnabled) {
            return;
        }

        const isFrozen = this._material.isFrozen;

        if (!uniformBuffer.useUbo || !isFrozen || !uniformBuffer.isSync) {
            if (this._texture && MaterialFlags.AnisotropicTextureEnabled) {
                uniformBuffer.updateFloat2("vAnisotropyInfos", this._texture.coordinatesIndex, this._texture.level);
                MaterialHelper.BindTextureMatrix(this._texture, uniformBuffer, "anisotropy");
            }

            // Anisotropy
            uniformBuffer.updateFloat3("vAnisotropy", this.direction.x, this.direction.y, this.intensity);
        }

        // Textures
        if (scene.texturesEnabled) {
            if (this._texture && MaterialFlags.AnisotropicTextureEnabled) {
                uniformBuffer.setTexture("anisotropySampler", this._texture);
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
    }

    /**
     * Returns the animatable textures.
     * @param animatables Array of animatable textures.
     */
    public getAnimatables(animatables: IAnimatable[]): void {
        if (this._texture && this._texture.animations && this._texture.animations.length > 0) {
            animatables.push(this._texture);
        }
    }

    /**
     * Disposes the resources of the material.
     * @param forceDisposeTextures - Forces the disposal of all textures.
     */
    public dispose(forceDisposeTextures?: boolean): void {
        if (forceDisposeTextures) {
            if (this._texture) {
                this._texture.dispose();
            }
        }
    }

    /**
    * Get the current class name of the texture useful for serialization or dynamic coding.
    * @returns "PBRAnisotropicConfiguration"
    */
    public getClassName(): string {
        return "PBRAnisotropicConfiguration";
    }

    /**
     * Add fallbacks to the effect fallbacks list.
     * @param defines defines the Base texture to use.
     * @param fallbacks defines the current fallback list.
     * @param currentRank defines the current fallback rank.
     * @returns the new fallback rank.
     */
    public addFallbacks(defines: MaterialAnisotropicDefines, fallbacks: EffectFallbacks, currentRank: number): number {
        if (defines.ANISOTROPIC) {
            fallbacks.addFallback(currentRank++, "ANISOTROPIC");
        }
        return currentRank;
    }

    /**
     * Add the required uniforms to the current list.
     * @param uniforms defines the current uniform list.
     */
    public addUniforms(uniforms: string[]): void {
        uniforms.push("vAnisotropy", "vAnisotropyInfos", "anisotropyMatrix");
    }

    /**
     * Add the required uniforms to the current buffer.
     * @param uniformBuffer defines the current uniform buffer.
     */
    public prepareUniformBuffer(uniformBuffer: UniformBuffer): void {
        uniformBuffer.addUniform("vAnisotropy", 3);
        uniformBuffer.addUniform("vAnisotropyInfos", 2);
        uniformBuffer.addUniform("anisotropyMatrix", 16);
    }

    /**
     * Add the required samplers to the current list.
     * @param samplers defines the current sampler list.
     */
    public addSamplers(samplers: string[]): void {
        samplers.push("anisotropySampler");
    }

    /**
     * Makes a duplicate of the current configuration into another one.
     * @param anisotropicConfiguration define the config where to copy the info
     */
    public copyTo(anisotropicConfiguration: PBRAnisotropicConfiguration): void {
        SerializationHelper.Clone(() => anisotropicConfiguration, this);
    }

    /**
     * Serializes this anisotropy configuration.
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