import { PrePassRenderTarget } from "../Materials/Textures/prePassRenderTarget";
import { Scene } from "../scene";
import { Engine } from "../Engines/engine";
import { Constants } from "../Engines/constants";
import { PostProcess } from "../PostProcesses/postProcess";
import { Effect } from "../Materials/effect";
import { _DevTools } from '../Misc/devTools';
import { Color4 } from "../Maths/math.color";
import { Nullable } from "../types";
import { AbstractMesh } from '../Meshes/abstractMesh';
import { Camera } from '../Cameras/camera';
import { Material } from '../Materials/material';
import { SubMesh } from '../Meshes/subMesh';
import { PrePassEffectConfiguration } from "./prePassEffectConfiguration";
import { RenderTargetTexture } from "../Materials/Textures/renderTargetTexture";

/**
 * Renders a pre pass of the scene
 * This means every mesh in the scene will be rendered to a render target texture
 * And then this texture will be composited to the rendering canvas with post processes
 * It is necessary for effects like subsurface scattering or deferred shading
 */
export class PrePassRenderer {
    /** @hidden */
    public static _SceneComponentInitialization: (scene: Scene) => void = (_) => {
        throw _DevTools.WarnImport("PrePassRendererSceneComponent");
    }

    /**
     * To save performance, we can excluded skinned meshes from the prepass
     */
    public excludedSkinnedMesh: AbstractMesh[] = [];

    /**
     * Force material to be excluded from the prepass
     * Can be useful when `useGeometryBufferFallback` is set to `true`
     * and you don't want a material to show in the effect.
     */
    public excludedMaterials: Material[] = [];

    private _scene: Scene;
    private _engine: Engine;

    /**
     * The render target where the scene is directly rendered
     */
    public defaultRT: PrePassRenderTarget;

    /**
     * Returns the prepass render target for the rendering pass. 
     * If we are currently rendering a render target, it returns the PrePassRenderTarget 
     * associated with that render target. Otherwise, it returns the scene default PrePassRenderTarget
     */
    public getRenderTarget(): PrePassRenderTarget {
        return this._currentTarget;
    }

    public _setRenderTarget(prePassRenderTarget: Nullable<PrePassRenderTarget>): void {
        if (prePassRenderTarget) {
            this._currentTarget = prePassRenderTarget;
        } else {
            this._currentTarget = this.defaultRT;
        }
    }

    private _currentTarget: PrePassRenderTarget;

    /**
      * All the render targets generated by prepass
      */
    public renderTargets: PrePassRenderTarget[] = [];

    private readonly _clearColor = new Color4(0, 0, 0, 0);

    private _enabled: boolean = false;

    private _needsCompositionForThisPass = false;

    /**
     * Indicates if the prepass is enabled
     */
    public get enabled() {
        return this._enabled;
    }

    /**
     * Set to true to disable gamma transform in PrePass.
     * Can be useful in case you already proceed to gamma transform on a material level
     * and your post processes don't need to be in linear color space.
     */
    public disableGammaTransform = false;

    /**
     * Instanciates a prepass renderer
     * @param scene The scene
     */
    constructor(scene: Scene) {
        this._scene = scene;
        this._engine = scene.getEngine();

        PrePassRenderer._SceneComponentInitialization(this._scene);
        this.defaultRT = this._createRenderTarget("sceneprePassRT");
        this._setRenderTarget(null);
    }

    public _createRenderTarget(name: string) : PrePassRenderTarget {
        const rt = new PrePassRenderTarget(name, this, { width: this._engine.getRenderWidth(), height: this._engine.getRenderHeight() }, 0, this._scene,
            { generateMipMaps: false, generateDepthTexture: true, defaultType: Constants.TEXTURETYPE_UNSIGNED_INT, types: [] });
        rt.samples = 1;

        this.renderTargets.push(rt);
        return rt;
    }

    /**
     * Indicates if rendering a prepass is supported
     */
    public get isSupported() {
        return this._engine.webGLVersion > 1 || this._scene.getEngine().getCaps().drawBuffersExtension;
    }

    /**
     * Sets the proper output textures to draw in the engine.
     * @param effect The effect that is drawn. It can be or not be compatible with drawing to several output textures.
     * @param subMesh Submesh on which the effect is applied
     */
    public bindAttachmentsForEffect(effect: Effect, subMesh: SubMesh) {
        if (this.enabled && this._currentTarget.enabled) {
            if (effect._multiTarget) {
                this._engine.bindAttachments(this._currentTarget._multiRenderAttachments);
            } else {
                this._engine.bindAttachments(this._currentTarget._defaultAttachments);

                // TODO : geometry buffer renderer
                // if (this._geometryBuffer) {
                //     const material = subMesh.getMaterial();
                //     if (material && this.excludedMaterials.indexOf(material) === -1) {
                //         this._geometryBuffer.renderList!.push(subMesh.getRenderingMesh());
                //     }
                // }
            }
        }
    }

    /**
     * Restores attachments for single texture draw.
     */
    public restoreAttachments() {
        if (this.enabled && this._currentTarget._defaultAttachments) {
            this._engine.bindAttachments(this._currentTarget._defaultAttachments);
        }
    }

    /**
     * @hidden
     */
    public _beforeDraw(camera: Nullable<Camera>, texture: Nullable<RenderTargetTexture>) {
        let postProcesses = undefined;
        if (texture) {
            postProcesses = texture.postProcesses || texture.activeCamera?._postProcesses || [];       
        } 

        if (this._currentTarget._isDirty) {
            this._update(this._currentTarget, postProcesses);
        }

        if (!this._enabled || !this._currentTarget.enabled) {
            // Prepass disabled, we render only on 1 color attachment
            if (texture) {
                texture._bindFrameBuffer();
                this._engine.restoreSingleAttachmentForRenderTarget();
            } else {
                this._engine.restoreDefaultFramebuffer();
                this._engine.restoreSingleAttachment();
            }

            return;
        }

        // TODO : handle geometry buffer renderer fallback
        if (this._currentTarget._geometryBuffer) {
            this._currentTarget._geometryBuffer.renderList!.length = 0;
        }

        this._setupOutputForThisPass(this._currentTarget, camera, postProcesses);
    }

    /**
     * @hidden
     */
    public _afterDraw(camera: Nullable<Camera>, texture: Nullable<RenderTargetTexture>) {
        if (this._enabled && this._currentTarget.enabled) {
            this._scene.postProcessManager._prepareFrame();
            const firstCameraPP = camera && camera._getFirstPostProcess();
            let outputTexture = firstCameraPP ? firstCameraPP.inputTexture : (texture ? texture.getInternalTexture() : null);

            // Build post process chain for this prepass post draw
            let postProcessChain = this._currentTarget._beforeCompositionPostProcesses;

            // For now we do not support effect configuration post processes in render targets
            if (this._currentTarget !== this.defaultRT) {
                postProcessChain = [];
            }

            if (this._needsCompositionForThisPass) {
                postProcessChain = postProcessChain.concat([this._currentTarget.imageProcessingPostProcess]);
            }

            // Activates the chain
            if (postProcessChain.length) {
                this._scene.postProcessManager._prepareFrame(this._currentTarget.getInternalTexture()!, postProcessChain);
            }

            // Renders the post process chain 
            this._scene.postProcessManager.directRender(postProcessChain, outputTexture);

            if (!outputTexture) {
                this._engine.restoreDefaultFramebuffer();
            }
        }
    }

    /**
     * Clears the render target (in the sense of settings pixels to the scene clear color value)
     */
    public _clear() {
        if (this._enabled && this._currentTarget.enabled) {
            this._bindFrameBuffer(this._currentTarget);

            // Clearing other attachment with 0 on all other attachments
            this._engine.bindAttachments(this._currentTarget._clearAttachments);
            this._engine.clear(this._clearColor, true, false, false);

            // Regular clear color with the scene clear color of the 1st attachment
            this._engine.bindAttachments(this._currentTarget._defaultAttachments);
            this._engine.clear(this._scene.clearColor,
                this._scene.autoClear || this._scene.forceWireframe || this._scene.forcePointsCloud,
                this._scene.autoClearDepthAndStencil,
                this._scene.autoClearDepthAndStencil);
        }
    }

    private _bindFrameBuffer(prePassRenderTarget: PrePassRenderTarget) {
        if (this._enabled && this._currentTarget.enabled) {
            this._currentTarget._checkSize();
            var internalTexture = this._currentTarget.getInternalTexture();
            if (internalTexture) {
                this._engine.bindFramebuffer(internalTexture);
            }
        }
    }

    private _setState(prePassRenderTarget: PrePassRenderTarget, enabled: boolean) {
        this._enabled = enabled;

        prePassRenderTarget.enabled = enabled;

        if (prePassRenderTarget.imageProcessingPostProcess) {
            prePassRenderTarget.imageProcessingPostProcess.imageProcessingConfiguration.applyByPostProcess = enabled;
        }
    }

    /**
     * Adds an effect configuration to the current prepass render target.
     * If an effect has already been added, it won't add it twice and will return the configuration
     * already present.
     * @param cfg the effect configuration
     * @return the effect configuration now used by the prepass
     */
    public addEffectConfiguration(effectConfiguration: PrePassEffectConfiguration): PrePassEffectConfiguration {
        return this.getRenderTarget()._addEffectConfiguration(effectConfiguration);
    }

    private _enable(prePassRenderTarget: PrePassRenderTarget) {
        const previousMrtCount = prePassRenderTarget.mrtCount;

        for (let i = 0; i < prePassRenderTarget._effectConfigurations.length; i++) {
            if (prePassRenderTarget._effectConfigurations[i].enabled) {
                this._enableTextures(prePassRenderTarget, prePassRenderTarget._effectConfigurations[i].texturesRequired);
            }
        }

        if (prePassRenderTarget.mrtCount !== previousMrtCount) {
            prePassRenderTarget.updateCount(prePassRenderTarget.mrtCount, { types: prePassRenderTarget._mrtFormats });
        }

        prePassRenderTarget._updateGeometryBufferLayout();
        prePassRenderTarget._resetPostProcessChain();

        for (let i = 0; i < prePassRenderTarget._effectConfigurations.length; i++) {
            if (prePassRenderTarget._effectConfigurations[i].enabled) {
                // TODO : subsurface scattering has 1 scene-wide effect configuration
                // solution : do not stock postProcess on effectConfiguration, but in the prepassRenderTarget (hashmap configuration => postProcess)
                // And call createPostProcess whenever the post process does not exist in the RT
                if (!prePassRenderTarget._effectConfigurations[i].postProcess && prePassRenderTarget._effectConfigurations[i].createPostProcess) {
                    prePassRenderTarget._effectConfigurations[i].createPostProcess!();
                }

                if (prePassRenderTarget._effectConfigurations[i].postProcess) {
                    prePassRenderTarget._beforeCompositionPostProcesses.push(prePassRenderTarget._effectConfigurations[i].postProcess!);
                }
            }
        }

        prePassRenderTarget._reinitializeAttachments();

        if (!prePassRenderTarget.imageProcessingPostProcess) {
            prePassRenderTarget._createCompositionEffect();
        }

        this._setState(prePassRenderTarget, true);
    }

    private _disable(prePassRenderTarget: PrePassRenderTarget) {
        this._setState(prePassRenderTarget, false);

        prePassRenderTarget._resetLayout();

        for (let i = 0; i < prePassRenderTarget._effectConfigurations.length; i++) {
            prePassRenderTarget._effectConfigurations[i].enabled = false;
        }
    }

    // private _bindPostProcessChain() {
    //     if (this._postProcesses.length) {
    //         this._postProcesses[0].inputTexture = this.defaultRT.getInternalTexture()!;
    //     } else {
    //         const pp = this._scene.activeCamera?._getFirstPostProcess();
    //         if (pp) {
    //             pp.inputTexture = this.defaultRT.getInternalTexture()!;
    //         }
    //     }
    // }

    private _setupOutputForThisPass(prePassRenderTarget: PrePassRenderTarget, camera: Nullable<Camera>, postProcesses: Nullable<PostProcess>[] = []) {
        // Here we search for an image composition post process
        // If no ipp if found, we use the prepass built-in
        // We also set the framebuffer to the input texture of the first post process that is to come
        // Order is : draw ===> prePassRenderTarget._postProcesses ==> ipp ==> camera._postProcesses
        const secondaryCamera = camera && this._scene.activeCameras && !!this._scene.activeCameras.length && this._scene.activeCameras.indexOf(camera) !== 0;
        const postProcessesSource = camera ? camera._postProcesses : postProcesses;
        this._needsCompositionForThisPass = !this._hasImageProcessing(postProcessesSource) && 
            !this.disableGammaTransform && 
            !secondaryCamera;
        const firstCameraPP = this._getFirstPostProcess(postProcessesSource);
        const firstPrePassPP = prePassRenderTarget._beforeCompositionPostProcesses && prePassRenderTarget._beforeCompositionPostProcesses[0];
        let firstPP = null;

        prePassRenderTarget.imageProcessingPostProcess.restoreDefaultInputTexture();

        // Setting the prePassRenderTarget as input texture of the first PP
        if (firstPrePassPP) {
            firstPrePassPP.inputTexture = prePassRenderTarget.getInternalTexture()!;
            firstPP = firstPrePassPP;
        } else if (this._needsCompositionForThisPass) {
            prePassRenderTarget.imageProcessingPostProcess.inputTexture = prePassRenderTarget.getInternalTexture()!;
            firstPP = prePassRenderTarget.imageProcessingPostProcess;
        } else if (firstCameraPP) {
            firstCameraPP.inputTexture = prePassRenderTarget.getInternalTexture()!;
            firstPP = firstCameraPP;
        }
        
        if (firstPP) {
            firstPP.autoClear = false;
        }

        this._bindFrameBuffer(prePassRenderTarget);
    }

    private _hasImageProcessing(postProcesses: Nullable<PostProcess>[]): boolean {
        let isIPPAlreadyPresent = false;
        if (postProcesses) {
            for (let i = 0; i < postProcesses.length; i++) {
                if (postProcesses[i]?.getClassName() === "ImageProcessingPostProcess") {
                    isIPPAlreadyPresent = true;
                }
            }
        }

        return isIPPAlreadyPresent;
    }

    /**
     * Internal, gets the first post proces.
     * @returns the first post process to be run on this camera.
     */
    private _getFirstPostProcess(postProcesses: Nullable<PostProcess>[]): Nullable<PostProcess> {
        for (var ppIndex = 0; ppIndex < postProcesses.length; ppIndex++) {
            if (postProcesses[ppIndex] !== null) {
                return postProcesses[ppIndex];
            }
        }
        return null;
    }

    /**
     * Marks the prepass renderer as dirty, triggering a check if the prepass is necessary for the next rendering.
     */
    public markAsDirty() {
        for (let i = 0; i < this.renderTargets.length; i++) {
            this.renderTargets[i]._isDirty = true;
        }
    }

    /**
     * Enables a texture on the MultiRenderTarget for prepass
     */
    private _enableTextures(prePassRenderTarget: PrePassRenderTarget, types: number[]) {
        for (let i = 0; i < types.length; i++) {
            let type = types[i];

            if (prePassRenderTarget._textureIndices[type] === -1) {
                prePassRenderTarget._textureIndices[type] = prePassRenderTarget._mrtLayout.length;
                prePassRenderTarget._mrtLayout.push(type);

                prePassRenderTarget._mrtFormats.push(PrePassRenderTarget._textureFormats[type].format);
                prePassRenderTarget.mrtCount++;
            }
        }
    }

    private _update(prePassRenderTarget: PrePassRenderTarget, forcePostProcesses?: PostProcess[]) {
        this._disable(prePassRenderTarget);
        let enablePrePass = false;

        for (let i = 0; i < this._scene.materials.length; i++) {
            if (this._scene.materials[i].setPrePassRenderer(this)) {
                enablePrePass = true;
            }
        }

        let postProcesses;

        if (forcePostProcesses) {
            postProcesses = forcePostProcesses;
        } else {
            const camera = this._scene.activeCamera;
            if (!camera) {
                return;
            }

            postProcesses = camera._postProcesses;
        }

        postProcesses = (<Nullable<PostProcess[]>>postProcesses.filter((pp) => { return pp != null; }));

        if (postProcesses) {
            for (let i = 0; i < postProcesses.length; i++) {
                if (postProcesses[i].setPrePassRenderer(this)) {
                    enablePrePass = true;
                }
            }
        }

        this._markAllMaterialsAsPrePassDirty();
        prePassRenderTarget._isDirty = false;

        if (enablePrePass) {
            this._enable(prePassRenderTarget);
        }
    }

    private _markAllMaterialsAsPrePassDirty() {
        const materials = this._scene.materials;

        for (let i = 0; i < materials.length; i++) {
            materials[i].markAsDirty(Material.PrePassDirtyFlag);
        }
    }

    /**
     * Disposes the prepass renderer.
     */
    public dispose() {
        for (let i = this.renderTargets.length - 1; i >= 0; i--) {

            for (let j = 0; j < this.renderTargets[i]._effectConfigurations.length; j++) {
                if (this.renderTargets[i]._effectConfigurations[j].dispose) {
                    this.renderTargets[i]._effectConfigurations[j].dispose!();
                }
            }
            this.renderTargets[i].dispose();
        }
    }

}
