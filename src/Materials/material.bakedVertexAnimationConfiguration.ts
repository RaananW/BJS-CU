import { Nullable } from "../types";
import { Scene } from "../scene";
import { serialize, expandToProperty, serializeAsTexture, SerializationHelper } from "../Misc/decorators";
import { MaterialFlags } from "./materialFlags";
import { Texture } from "./Textures/texture";
import { BaseTexture } from './Textures/baseTexture';
import { UniformBuffer } from "./uniformBuffer";
import { Vector4 } from "../Maths/math.vector";

/**
 * @hidden
 */
export interface IMaterialBakedVertexAnimationDefines {
    BAKED_VERTEX_ANIMATION_TEXTURE: boolean;

    /** @hidden */
    _areTexturesDirty: boolean;
}

/**
 * Define the code related to the vertex animation texture (VAT) parameters.
 *
 */
export class BakedVertexAnimationConfiguration {
    private _texture: Nullable<Texture> = null;
    /**
     * The vertex animation texture of the material.
     */
    @serializeAsTexture()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public texture: Nullable<Texture>;

    private _isEnabled = false;
    /**
     * Enable or disable the vertex animation on this material
     */
    @serialize()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public isEnabled = false;

    /** @hidden */
    private _internalMarkAllSubMeshesAsTexturesDirty: () => void;

    /** @hidden */
    public _markAllSubMeshesAsTexturesDirty(): void {
        this._internalMarkAllSubMeshesAsTexturesDirty();
    }

    /**
     * The animation parameters for this frame. See setAnimationParameters()
     */
     public animationParameters: Vector4;

    /**
     * The time counter, to pick the correct animation frame.
     */
    public time = 0;

    /**
     * Instantiate a new vertex animation
     * @param markAllSubMeshesAsTexturesDirty Callback to flag the material to dirty
     */
    constructor(markAllSubMeshesAsTexturesDirty: () => void) {
        this._internalMarkAllSubMeshesAsTexturesDirty = markAllSubMeshesAsTexturesDirty;
    }

    /**
     * Gets whether the submesh is ready to be used or not.
     * @param defines the list of "defines" to update.
     * @param scene defines the scene the material belongs to.
     * @returns - boolean indicating that the submesh is ready or not.
     */
    public isReadyForSubMesh(defines: IMaterialBakedVertexAnimationDefines, scene: Scene): boolean {
        if (!this._isEnabled || !scene.texturesEnabled) {
            return true;
        }

        if (defines._areTexturesDirty && scene.texturesEnabled) {
            if (this._texture && MaterialFlags.BakedVertexAnimationTextureEnabled) {
                // Texture cannot be not blocking.
                if (!this._texture.isReady()) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Update the defines for vertex animation usage
     * @param defines the list of "defines" to update.
     * @param scene defines the scene the material belongs to.
     */
    public prepareDefines(defines: IMaterialBakedVertexAnimationDefines, scene: Scene): void {
        if (!this._isEnabled || !scene.texturesEnabled) {
            defines.BAKED_VERTEX_ANIMATION_TEXTURE = false;
        } else {
            defines.BAKED_VERTEX_ANIMATION_TEXTURE = true;
        }
    }

    /**
     * Binds the material data.
     * @param uniformBuffer defines the Uniform buffer to fill in.
     * @param scene defines the scene the material belongs to.
     * @param isFrozen defines whether the material is frozen or not.
     * @param defines list of defines from the material.
     */
    public bindForSubMesh(uniformBuffer: UniformBuffer, scene: Scene, isFrozen: boolean, defines: any): void {
        if (!this._isEnabled || !scene.texturesEnabled) {
            return;
        }

        if (!uniformBuffer.useUbo || !isFrozen || !uniformBuffer.isSync) {
            if (this._texture && MaterialFlags.BakedVertexAnimationTextureEnabled) {
                const size = this._texture.getSize();
                uniformBuffer.updateFloat2(
                    "bakedVertexAnimationTextureSizeInverted",
                    1.0 / size.width,
                    1.0 / size.height
                );
                uniformBuffer.updateFloat("bakedVertexAnimationTime", this.time);
            }
        }

        // Textures
        if (this._texture && MaterialFlags.BakedVertexAnimationTextureEnabled) {
            uniformBuffer.setTexture("bakedVertexAnimationTexture", this._texture);
        }

        if (!defines.INSTANCES) {
            uniformBuffer.updateVector4("bakedVertexAnimationSettings", this.animationParameters);
         }
    }

    /**
     * Sets animation parameters.
     * @param startFrame The first frame of the animation.
     * @param endFrame The last frame of the animation.
     * @param offset The offset when starting the animation.
     * @param speedFramesPerSecond The frame rate.
     */
    public setAnimationParameters(
        startFrame: number,
        endFrame: number,
        offset: number = 0,
        speedFramesPerSecond: number = 30
    ): void {
        this.animationParameters = new Vector4(startFrame, endFrame, offset, speedFramesPerSecond);
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
     * Disposes the resources of the material.
     * @param forceDisposeTextures - Forces the disposal of all textures.
     */
    public dispose(forceDisposeTextures?: boolean): void {
        if (forceDisposeTextures) {
            this._texture?.dispose();
        }
    }

    /**
     * Get the current class name useful for serialization or dynamic coding.
     * @returns "BakedVertexAnimationConfiguration"
     */
    public getClassName(): string {
        return "BakedVertexAnimationConfiguration";
    }

    /**
     * Add the required uniforms to the current list.
     * @param uniforms defines the current uniform list.
     */
    public static AddUniforms(uniforms: string[]): void {
        uniforms.push("bakedVertexAnimationSettings");
        uniforms.push("bakedVertexAnimationTextureSizeInverted");
        uniforms.push("bakedVertexAnimationTime");
    }

    /**
     * Add the required samplers to the current list.
     * @param samplers defines the current sampler list.
     */
    public static AddSamplers(samplers: string[]): void {
        samplers.push("bakedVertexAnimationTexture");
    }

    /**
     * Add the required attributes to the current list.
     * @param attribs defines the current atribute list.
     */
    public static AddAttributes(attribs: string[]): void {
        attribs.push("bakedVertexAnimationSettingsInstanced");
    }

    /**
     * Add the required uniforms to the current buffer.
     * @param uniformBuffer defines the current uniform buffer.
     */
    public static PrepareUniformBuffer(uniformBuffer: UniformBuffer): void {
        uniformBuffer.addUniform("bakedVertexAnimationSettings", 4);
        uniformBuffer.addUniform("bakedVertexAnimationTextureSizeInverted", 2);
        uniformBuffer.addUniform("bakedVertexAnimationTime", 1);
    }

    /**
     * Makes a duplicate of the current instance into another one.
     * @param vatMap define the instance where to copy the info
     */
    public copyTo(vatMap: BakedVertexAnimationConfiguration): void {
        SerializationHelper.Clone(() => vatMap, this);
    }

    /**
     * Serializes this vertex animation instance
     * @returns - An object with the serialized instance.
     */
    public serialize(): any {
        return SerializationHelper.Serialize(this);
    }

    /**
     * Parses a vertex animation setting from a serialized object.
     * @param source - Serialized object.
     * @param scene Defines the scene we are parsing for
     * @param rootUrl Defines the rootUrl to load from
     */
    public parse(source: any, scene: Scene, rootUrl: string): void {
        SerializationHelper.Parse(() => this, source, scene, rootUrl);
    }
}
