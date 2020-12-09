import { MultiRenderTarget, IMultiRenderTargetOptions } from "./multiRenderTarget";
import { Engine } from "../../Engines/engine";
import { RenderTargetTexture } from './renderTargetTexture';
import { Scene } from "../../scene";
import { PostProcess } from "../../PostProcesses/postProcess";
import { ImageProcessingPostProcess } from "../../PostProcesses/imageProcessingPostProcess";
import { Nullable } from "../../types";

/**
 * A multi render target designed to render the prepass.
 * Prepass is a scene component used to render information in multiple textures
 * alongside with the scene materials rendering.
 * Note : This is an internal class, and you should NOT need to instanciate this.
 * Only the `PrePassRenderer` should instanciate this class.
 * It is more likely that you need a regular `MultiRenderTarget`
 */
export class PrePassRenderTarget extends MultiRenderTarget {

    public _beforeCompositionPostProcesses: PostProcess[] = [];
    /**
     * Image processing post process for composition
     */
    public imageProcessingPostProcess: ImageProcessingPostProcess;

    /**
     * How many samples are used for MSAA of the scene render target
     */
    public get samples() {
        return this._samples;
    }

    public set samples(n: number) {
        this._samples = n;
    }

    public _engine: Engine;
    public _scene: Scene;

    public _outputPostProcess: Nullable<PostProcess>;
    public _internalTextureDirty = false;

    /**
      * Is this render target enabled for prepass rendering
      */
    public enabled: boolean = false;

    /**
      * Render target associated with this prePassRenderTarget
      * If this is `null`, it means this prePassRenderTarget is associated with the scene
      */
    public renderTargetTexture: Nullable<RenderTargetTexture> = null;

    public constructor(name: string,  renderTargetTexture: Nullable<RenderTargetTexture>, size: any, count: number, scene: Scene, options?: IMultiRenderTargetOptions | undefined) {
        super(name, size, count, scene, options);

        this.renderTargetTexture = renderTargetTexture;
    }

    public _createCompositionEffect() {
        this.imageProcessingPostProcess = new ImageProcessingPostProcess("prePassComposition", 1, null, undefined, this._engine);
    }

    /**
     * Checks that the size of this RT is still adapted to the desired render size.
     */
    public _checkSize() {
        var	requiredWidth = this._engine.getRenderWidth(true);
        var	requiredHeight = this._engine.getRenderHeight(true);

        var width = this.getRenderWidth();
        var height = this.getRenderHeight();

        if (width !== requiredWidth || height !== requiredHeight) {
            this.resize({ width: requiredWidth, height: requiredHeight });

            this._internalTextureDirty = true;
        }
    }

    /**
     * Changes the number of render targets in this MRT
     * Be careful as it will recreate all the data in the new texture.
     * @param count new texture count
     * @param options Specifies texture types and sampling modes for new textures
     */
    public updateCount(count: number, options?: IMultiRenderTargetOptions) {
        super.updateCount(count, options);
        this._internalTextureDirty = true;
    }

    /**
     * Resets the post processes chains applied to this RT.
     */
    public _resetPostProcessChain() {
        this._beforeCompositionPostProcesses = [];
    }

    /**
     * Diposes this render target
     */
    public dispose() {
        super.dispose();

        if (this._scene && this._scene.prePassRenderer) {
            const index = this._scene.prePassRenderer.renderTargets.indexOf(this);

            if (index !== -1) {
                this._scene.prePassRenderer.renderTargets.splice(index, 1);
            }
        }

        if (this.imageProcessingPostProcess) {
            this.imageProcessingPostProcess.dispose();
        }
    }
}