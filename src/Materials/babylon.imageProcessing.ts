module BABYLON {
    /**
     * Interface to follow in your material defines to integrate easily the
     * Image proccessing functions.
     */
    export interface IImageProcessingDefines {
        IMAGEPROCESSING: boolean;
        VIGNETTE: boolean;
        VIGNETTEBLENDMODEMULTIPLY: boolean;
        VIGNETTEBLENDMODEOPAQUE: boolean;
        TONEMAPPING: boolean;
        CONTRAST: boolean;
        COLORCURVES: boolean;
        COLORGRADING: boolean;
    }

    /**
     * This groups together the common properties used for image processing either in direct forward pass
     * or through post processing effect depending on the use of the image processing pipeline in your scene 
     * or not.
     */
    export class ImageProcessing {

        /**
         * Color curves setup used in the effect if colorCurvesEnabled is set to true 
         */
        @serializeAsColorCurves()
        public colorCurves = new ColorCurves();

        @serialize()
        private _colorCurvesEnabled = true;
        /**
         * Gets wether the color curves effect is enabled.
         */
        public get colorCurvesEnabled(): boolean {
            return this._colorCurvesEnabled;
        }
        /**
         * Gets wether the color curves effect is enabled.
         */
        public set colorCurvesEnabled(value: boolean) {
            if (this._colorCurvesEnabled === value) {
                return;
            }

            this._colorCurvesEnabled = value;
            this._updateParameters();
        }

        /**
         * Color grading LUT texture used in the effect if colorGradingEnabled is set to true 
         */
        @serializeAsTexture()
        public colorGradingTexture: BaseTexture;

        @serialize()
        private _colorGradingEnabled = true;
        /**
         * Gets wether the color grading effect is enabled.
         */
        public get colorGradingEnabled(): boolean {
            return this._colorGradingEnabled;
        }
        /**
         * Gets wether the color grading effect is enabled.
         */
        public set colorGradingEnabled(value: boolean) {
            if (this._colorGradingEnabled === value) {
                return;
            }

            this._colorGradingEnabled = value;
            this._updateParameters();
        }

        @serialize()
        protected _cameraExposure = 1.0;
        /**
         * Gets Camera exposure used in the effect.
         */
        public get cameraExposure(): number {
            return this._cameraExposure;
        }
        /**
         * Gets Camera exposure used in the effect.
         */
        public set cameraExposure(value: number) {
            if (this._cameraExposure === value) {
                return;
            }

            this._cameraExposure = value;
            this._updateParameters();
        }

        @serialize()
        protected _cameraContrast = 1.0;
        /**
         * Gets Camera contrast used in the effect.
         */
        public get cameraContrast(): number {
            return this._cameraContrast;
        }
        /**
         * Gets Camera contrast used in the effect.
         */
        public set cameraContrast(value: number) {
            if (this._cameraContrast === value) {
                return;
            }

            this._cameraContrast = value;
            this._updateParameters();
        }

        /**
         * Vignette stretch size.
         */
        @serialize()
        public vignetteStretch = 0;

        /**
         * Vignette centre X Offset.
         */
        @serialize()
        public vignetteCentreX = 0;

        /**
         * Vignette centre Y Offset.
         */
        @serialize()
        public vignetteCentreY = 0;

        /**
         * Vignette weight or intensity of the vignette effect.
         */
        @serialize()
        public vignetteWeight = 1.5;

        /**
         * Color of the vignette applied on the screen through the chosen blend mode (vignetteBlendMode)
         * if vignetteEnabled is set to true.
         */
        @serializeAsColor4()
        public vignetteColor: BABYLON.Color4 = new BABYLON.Color4(0, 0, 0, 0);

        /**
         * Camera field of view used by the Vignette effect.
         */
        @serialize()
        public cameraFov = 0.5;

        @serialize()
        private _vignetteBlendMode = ImageProcessing.VIGNETTEMODE_MULTIPLY;
        /**
         * Gets the vignette blend mode allowing different kind of effect.
         */
        public get vignetteBlendMode(): number {
            return this._vignetteBlendMode;
        }
        /**
         * Sets the vignette blend mode allowing different kind of effect.
         */
        public set vignetteBlendMode(value: number) {
            if (this._vignetteBlendMode === value) {
                return;
            }

            this._vignetteBlendMode = value;
            this._updateParameters();
        }

        @serialize()
        private _vignetteEnabled = true;
        /**
         * Gets wether the vignette effect is enabled.
         */
        public get vignetteEnabled(): boolean {
            return this._vignetteEnabled;
        }
        /**
         * Sets wether the vignette effect is enabled.
         */
        public set vignetteEnabled(value: boolean) {
            if (this._vignetteEnabled === value) {
                return;
            }

            this._vignetteEnabled = value;
            this._updateParameters();
        }

        /**
        * An event triggered when the configuration changes and requires Shader to Update some parameters.
        * @type {BABYLON.Observable}
        */
        public onUpdateParameters = new Observable<ImageProcessing>();

        /**
         * Method called each time the image processing information changes requires to recompile the effect.
         */
        protected _updateParameters(): void {
            this.onUpdateParameters.notifyObservers(this);
        }

        /**
         * Prepare the list of uniforms associated with the Image Processing effects.
         * @param uniformsList The list of uniforms used in the effect
         * @param defines the list of defines currently in use
         */
        public static PrepareUniforms(uniforms: string[], defines: IImageProcessingDefines): void {
            if (defines.CONTRAST) {
                uniforms.push("contrast");
            }
            if (defines.TONEMAPPING) {
                uniforms.push("cameraExposureLinear");
            }
            if (defines.COLORGRADING) {
                uniforms.push("colorTransformSettings");
            }
            if (defines.VIGNETTE) {
                uniforms.push("vInverseScreenSize");
                uniforms.push("vignetteSettings1");
                uniforms.push("vignetteSettings2");
            }
            if (defines.COLORCURVES) {
                ColorCurves.PrepareUniforms(uniforms);
            }
        }

        /**
         * Prepare the list of samplers associated with the Image Processing effects.
         * @param uniformsList The list of uniforms used in the effect
         * @param defines the list of defines currently in use
         */
        public static PrepareSamplers(samplersList: string[], defines: IImageProcessingDefines): void {
            if (defines.COLORGRADING) {
                samplersList.push("txColorTransform");
            }
        }

        /**
         * Prepare the list of defines associated to the shader.
         * @param defines the list of defines to complete
         */
        public prepareDefines(defines: IImageProcessingDefines): void {
            defines.VIGNETTE = this.vignetteEnabled;
            defines.VIGNETTEBLENDMODEMULTIPLY = (this.vignetteBlendMode === ImageProcessing._VIGNETTEMODE_MULTIPLY);
            defines.VIGNETTEBLENDMODEOPAQUE = !defines.VIGNETTEBLENDMODEMULTIPLY;
            defines.TONEMAPPING = (this.cameraExposure !== 1.0);
            defines.CONTRAST = (this.cameraContrast !== 1.0);
            defines.COLORCURVES = (this.colorCurvesEnabled && !!this.colorCurves);
            defines.COLORGRADING = (this.colorGradingEnabled && !!this.colorGradingTexture);
            defines.IMAGEPROCESSING = defines.VIGNETTE || defines.TONEMAPPING || defines.CONTRAST || defines.COLORCURVES || defines.COLORGRADING;
        }

        /**
         * Returns true if all the image processing information are ready.
         */
        public isReady() {
            // Color Grading texure can not be none blocking.
            return !this.colorGradingEnabled || !this.colorGradingTexture || this.colorGradingTexture.isReady();
        }

        /**
         * Binds the image processing to the shader.
         * @param effect The effect to bind to
         */
        public bind(effect: Effect, aspectRatio = 1) : void {
            // Color Curves
            if (this._colorCurvesEnabled) {
                ColorCurves.Bind(this.colorCurves, effect);
            }

            // Vignette
            if (this._vignetteEnabled) {
                var inverseWidth = 1 / effect.getEngine().getRenderWidth();
                var inverseHeight = 1 / effect.getEngine().getRenderHeight();
                effect.setFloat2("vInverseScreenSize", 1 / inverseWidth, 1 / inverseHeight);

                let vignetteScaleY = Math.tan(this.cameraFov * 0.5);
                let vignetteScaleX = vignetteScaleY * aspectRatio;

                let vignetteScaleGeometricMean = Math.sqrt(vignetteScaleX * vignetteScaleY);
                vignetteScaleX = Tools.Mix(vignetteScaleX, vignetteScaleGeometricMean, this.vignetteStretch);
                vignetteScaleY = Tools.Mix(vignetteScaleY, vignetteScaleGeometricMean, this.vignetteStretch);

                effect.setFloat4("vignetteSettings1", vignetteScaleX, vignetteScaleY, -vignetteScaleX * this.vignetteCentreX, -vignetteScaleY * this.vignetteCentreY);

                let vignettePower = -2.0 * this.vignetteWeight;
                effect.setFloat4("vignetteSettings2", this.vignetteColor.r, this.vignetteColor.g, this.vignetteColor.b, vignettePower);
            }

            // Exposure
            effect.setFloat("cameraExposureLinear", Math.pow(2.0, -this.cameraExposure) * Math.PI);
            
            // Contrast
            effect.setFloat("contrast", this.cameraContrast);
            
            // Color transform settings
            if (this.colorGradingTexture) {
                effect.setTexture("txColorTransform", this.colorGradingTexture);
                let textureSize = this.colorGradingTexture.getSize().height;

                effect.setFloat4("colorTransformSettings",
                    (textureSize - 1) / textureSize, // textureScale
                    0.5 / textureSize, // textureOffset
                    textureSize, // textureSize
                    this.colorGradingTexture.level // weight
                );
            }
        }

        /**
         * Clones the current image processing instance.
         * @return The cloned image processing
         */
        public clone(): ImageProcessing {
            return SerializationHelper.Clone(() => new ImageProcessing(), this);
        }

        /**
         * Serializes the current image processing instance to a json representation.
         * @return a JSON representation
         */
        public serialize(): any {
            return SerializationHelper.Serialize(this);
        }

        /**
         * Parses the image processing from a json representation.
         * @param source the JSON source to parse
         * @return The parsed image processing
         */      
        public static Parse(source: any) : ImageProcessing {
            return SerializationHelper.Parse(() => new ImageProcessing(), source, null, null);
        }

        // Static constants associated to the image processing.
        private static _VIGNETTEMODE_MULTIPLY = 0;
        private static _VIGNETTEMODE_OPAQUE = 1;

        /**
         * Used to apply the vignette as a mix with the pixel color.
         */
        public static get VIGNETTEMODE_MULTIPLY(): number {
            return this._VIGNETTEMODE_MULTIPLY;
        }

        /**
         * Used to apply the vignette as a replacement of the pixel color.
         */
        public static get VIGNETTEMODE_OPAQUE(): number {
            return this._VIGNETTEMODE_OPAQUE;
        }
    }
} 