module BABYLON {    
    /**
     * The DepthOfFieldBlurPostProcess applied a blur in a give direction.
     * This blur differs from the standard BlurPostProcess as it attempts to avoid blurring pixels 
     * based on samples that have a large difference in distance than the center pixel.
     * See section 2.6.2 http://fileadmin.cs.lth.se/cs/education/edan35/lectures/12dof.pdf
     */
    export class DepthOfFieldBlurPostProcess extends BlurPostProcess {
        /**
         * Creates a new instance of @see CircleOfConfusionPostProcess
         * @param name The name of the effect.
         * @param scene The scene the effect belongs to.
         * @param direction The direction the blur should be applied.
         * @param kernel The size of the kernel used to blur.
         * @param options The required width/height ratio to downsize to before computing the render pass.
         * @param camera The camera to apply the render pass to.
         * @param depthMap The depth map to be used to avoid blurring accross edges
         * @param imageToBlur The image to apply the blur to (default: Current rendered frame)
         * @param samplingMode The sampling mode to be used when computing the pass. (default: 0)
         * @param engine The engine which the post process will be applied. (default: current engine)
         * @param reusable If the post process can be reused on the same frame. (default: false)
         * @param textureType Type of textures used when performing the post process. (default: 0)
         */
        constructor(name: string, scene: Scene, public direction: Vector2, kernel: number, options: number | PostProcessOptions, camera: Nullable<Camera>, depthMap:RenderTargetTexture, imageToBlur:Nullable<PostProcess> = null, samplingMode: number = Texture.BILINEAR_SAMPLINGMODE, engine?: Engine, reusable?: boolean, textureType: number = Engine.TEXTURETYPE_UNSIGNED_INT) {
            super(name, direction, kernel, options, camera, samplingMode = Texture.BILINEAR_SAMPLINGMODE, engine, reusable, textureType = Engine.TEXTURETYPE_UNSIGNED_INT, `#define DOF 1\r\n`);
			
			this.onApplyObservable.add((effect: Effect) => {
                if(imageToBlur != null){
                    effect.setTextureFromPostProcess("textureSampler", imageToBlur);
                }
                effect.setTexture("depthSampler", depthMap);
                if(scene.activeCamera){
                    effect.setFloat2('cameraMinMaxZ', scene.activeCamera.minZ, scene.activeCamera.maxZ);
                }
			});
        }
    }
}