module BABYLON {
    /**
     * The SharpenPostProcess applies a sharpen kernel to every pixel
     * See http://en.wikipedia.org/wiki/Kernel_(image_processing)
     */
    export class SharpenPostProcess extends PostProcess{
        /**
         * How much sharpness should be applied (default: 0.3)
         */
        public amount:number = 0.3;
        /**
         * Creates a new instance of @see ConvolutionPostProcess
         * @param name The name of the effect.
         * @param options The required width/height ratio to downsize to before computing the render pass.
         * @param camera The camera to apply the render pass to.
         * @param samplingMode The sampling mode to be used when computing the pass. (default: 0)
         * @param engine The engine which the post process will be applied. (default: current engine)
         * @param reusable If the post process can be reused on the same frame. (default: false)
         * @param textureType Type of textures used when performing the post process. (default: 0)
         */
        constructor(name: string, options: number | PostProcessOptions, camera: Nullable<Camera>, samplingMode?: number, engine?: Engine, reusable?: boolean, textureType: number = Engine.TEXTURETYPE_UNSIGNED_INT) {
            super(name, "sharpen", ["amount", "screenSize"], null, options, camera, samplingMode, engine, reusable, null, textureType);

            this.onApply = (effect: Effect) => {
                effect.setFloat2("screenSize", this.width, this.height);
                effect.setFloat("amount", this.amount);
            };
        }
    }
}
