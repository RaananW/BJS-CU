﻿module BABYLON {
    /**
     * Glow layer options. This helps customizing the behaviour
     * of the glow layer.
     */
    export interface IGlowLayerOptions {
        /**
         * Multiplication factor apply to the canvas size to compute the render target size
         * used to generated the glowing objects (the smaller the faster).
         */
        mainTextureRatio: number;

        /**
         * Enforces a fixed size texture to ensure resize independant blur.
         */
        mainTextureFixedSize?: number;

        /**
         * How big is the kernel of the blur texture.
         */
        blurKernelSize: number;

        /**
         * The camera attached to the layer.
         */
        camera: Nullable<Camera>;

        /**
         * Enable MSAA by chosing the number of samples.
         */
        mainTextureSamples?: number;
    }

    /**
     * The glow layer Helps adding a glow effect around the emissive parts of a mesh.
     * 
     * Once instantiated in a scene, simply use the pushMesh or removeMesh method to add or remove
     * glowy meshes to your scene.
     * 
     * Documentation: https://doc.babylonjs.com/how_to/glow_layer
     */
    export class GlowLayer extends EffectLayer {
        /**
         * Effect Name of the layer.
         */
        public static readonly EffectName = "GlowLayer";

        /**
         * The default blur kernel size used for the glow.
         */
        public static DefaultBlurKernelSize = 32;

        /**
         * The default texture size ratio used for the glow.
         */
        public static DefaultTextureRatio = 0.5;

        /**
         * Sets the kernel size of the blur.
         */
        public set blurKernelSize(value: number) {
            this._horizontalBlurPostprocess1.kernel = value;
            this._verticalBlurPostprocess1.kernel = value;
            this._horizontalBlurPostprocess2.kernel = value;
            this._verticalBlurPostprocess2.kernel = value;
        }

        /**
         * Gets the kernel size of the blur.
         */
        @serialize()
        public get blurKernelSize(): number {
            return this._horizontalBlurPostprocess1.kernel;
        }

        /**
         * Sets the glow intensity.
         */
        public set intensity(value: number) {
            this._intensity = value;
        }

        /**
         * Gets the glow intensity.
         */
        @serialize()
        public get intensity(): number {
            return this._intensity;
        }

        @serialize('options')
        private _options: IGlowLayerOptions;

        private _intensity: number = 1.0;
        private _horizontalBlurPostprocess1: BlurPostProcess;
        private _verticalBlurPostprocess1: BlurPostProcess;
        private _horizontalBlurPostprocess2: BlurPostProcess;
        private _verticalBlurPostprocess2: BlurPostProcess;
        private _blurTexture1: RenderTargetTexture;
        private _blurTexture2: RenderTargetTexture;
        private _postProcesses1: PostProcess[];
        private _postProcesses2: PostProcess[];

        private _includedOnlyMeshes: number[] = [];
        private _excludedMeshes: number[] = [];

        /**
         * Callback used to let the user override the color selection on a per mesh basis
         */
        public customEmissiveColorSelector: (mesh: Mesh, subMesh: SubMesh, material: Material, result: Color4) => void;
        /**
         * Callback used to let the user override the texture selection on a per mesh basis
         */
        public customEmissiveTextureSelector: (mesh: Mesh, subMesh: SubMesh, material: Material) => Texture;

        /**
         * Instantiates a new glow Layer and references it to the scene.
         * @param name The name of the layer
         * @param scene The scene to use the layer in
         * @param options Sets of none mandatory options to use with the layer (see IGlowLayerOptions for more information)
         */
        constructor(name: string, scene: Scene, options?: Partial<IGlowLayerOptions>) {
            super(name, scene);
            this.neutralColor = new Color4(0, 0, 0, 1);

            // Adapt options
            this._options = {
                mainTextureRatio: GlowLayer.DefaultTextureRatio,
                blurKernelSize: 32,
                mainTextureFixedSize: undefined,
                camera: null,
                mainTextureSamples: 1,
                ...options,
            };

            // Initialize the layer
            this._init({
                alphaBlendingMode: Engine.ALPHA_ADD,
                camera: this._options.camera,
                mainTextureFixedSize: this._options.mainTextureFixedSize,
                mainTextureRatio: this._options.mainTextureRatio
            });
        }

        /**
         * Get the effect name of the layer.
         * @return The effect name
         */ 
        public getEffectName(): string {
            return GlowLayer.EffectName;
        }

        /**
         * Create the merge effect. This is the shader use to blit the information back
         * to the main canvas at the end of the scene rendering.
         */
        protected _createMergeEffect(): Effect {
             // Effect
             return this._engine.createEffect("glowMapMerge",
                [VertexBuffer.PositionKind],
                ["offset"],
                ["textureSampler", "textureSampler2"],
                "#define EMISSIVE \n");

        }

        /**
         * Creates the render target textures and post processes used in the glow layer.
         */
        protected _createTextureAndPostProcesses(): void {
            var blurTextureWidth = this._mainTextureDesiredSize.width;
            var blurTextureHeight = this._mainTextureDesiredSize.height;
            blurTextureWidth = this._engine.needPOTTextures ? Tools.GetExponentOfTwo(blurTextureWidth, this._maxSize) : blurTextureWidth;
            blurTextureHeight = this._engine.needPOTTextures ? Tools.GetExponentOfTwo(blurTextureHeight, this._maxSize) : blurTextureHeight;

            var textureType = 0;
            if (this._engine.getCaps().textureHalfFloatRender) {
                textureType = Engine.TEXTURETYPE_HALF_FLOAT;
            }
            else {
                textureType = Engine.TEXTURETYPE_UNSIGNED_INT;
            }

            this._blurTexture1 = new RenderTargetTexture("GlowLayerBlurRTT",
                {
                    width: blurTextureWidth,
                    height: blurTextureHeight
                },
                this._scene,
                false,
                true,
                textureType);
            this._blurTexture1.wrapU = Texture.CLAMP_ADDRESSMODE;
            this._blurTexture1.wrapV = Texture.CLAMP_ADDRESSMODE;
            this._blurTexture1.updateSamplingMode(Texture.BILINEAR_SAMPLINGMODE);
            this._blurTexture1.renderParticles = false;
            this._blurTexture1.ignoreCameraViewport = true;

            var blurTextureWidth2 = Math.floor(blurTextureWidth / 2);
            var blurTextureHeight2 = Math.floor(blurTextureHeight / 2);

            this._blurTexture2 = new RenderTargetTexture("GlowLayerBlurRTT2",
                {
                    width: blurTextureWidth2,
                    height: blurTextureHeight2
                },
                this._scene,
                false,
                true,
                textureType);
            this._blurTexture2.wrapU = Texture.CLAMP_ADDRESSMODE;
            this._blurTexture2.wrapV = Texture.CLAMP_ADDRESSMODE;
            this._blurTexture2.updateSamplingMode(Texture.BILINEAR_SAMPLINGMODE);
            this._blurTexture2.renderParticles = false;
            this._blurTexture2.ignoreCameraViewport = true;

            this._textures = [ this._blurTexture1, this._blurTexture2 ];

            this._horizontalBlurPostprocess1 = new BlurPostProcess("GlowLayerHBP1", new Vector2(1.0, 0), this._options.blurKernelSize / 2, {
                    width:  blurTextureWidth,
                    height: blurTextureHeight
                },
                null, Texture.BILINEAR_SAMPLINGMODE, this._scene.getEngine(), false, textureType);
            this._horizontalBlurPostprocess1.width = blurTextureWidth;
            this._horizontalBlurPostprocess1.height = blurTextureHeight;
            this._horizontalBlurPostprocess1.onApplyObservable.add(effect => {
                effect.setTexture("textureSampler", this._mainTexture);
            });

            this._verticalBlurPostprocess1 = new BlurPostProcess("GlowLayerVBP1", new Vector2(0, 1.0), this._options.blurKernelSize / 2, {
                    width:  blurTextureWidth,
                    height: blurTextureHeight
                },
                null, Texture.BILINEAR_SAMPLINGMODE, this._scene.getEngine(), false, textureType);

            this._horizontalBlurPostprocess2 = new BlurPostProcess("GlowLayerHBP2", new Vector2(1.0, 0), this._options.blurKernelSize / 2, {
                    width:  blurTextureWidth2,
                    height: blurTextureHeight2
                },
                null, Texture.BILINEAR_SAMPLINGMODE, this._scene.getEngine(), false, textureType);
            this._horizontalBlurPostprocess2.width = blurTextureWidth2;
            this._horizontalBlurPostprocess2.height = blurTextureHeight2;
            this._horizontalBlurPostprocess2.onApplyObservable.add(effect => {
                effect.setTexture("textureSampler", this._blurTexture1);
            });

            this._verticalBlurPostprocess2 = new BlurPostProcess("GlowLayerVBP2", new Vector2(0, 1.0), this._options.blurKernelSize / 2, {
                    width:  blurTextureWidth2,
                    height: blurTextureHeight2
                },
                null, Texture.BILINEAR_SAMPLINGMODE, this._scene.getEngine(), false, textureType);

            this._postProcesses = [ this._horizontalBlurPostprocess1, this._verticalBlurPostprocess1, this._horizontalBlurPostprocess2, this._verticalBlurPostprocess2 ];
            this._postProcesses1 = [ this._horizontalBlurPostprocess1, this._verticalBlurPostprocess1 ];
            this._postProcesses2 = [ this._horizontalBlurPostprocess2, this._verticalBlurPostprocess2 ];

            this._mainTexture.samples = this._options.mainTextureSamples!;
            this._mainTexture.onAfterUnbindObservable.add(() => {
                let internalTexture = this._blurTexture1.getInternalTexture();
                if (internalTexture) {
                    this._scene.postProcessManager.directRender(
                        this._postProcesses1,
                        internalTexture, 
                        true);

                        internalTexture = this._blurTexture2.getInternalTexture();
                        if (internalTexture) {
                            this._scene.postProcessManager.directRender(
                                this._postProcesses2,
                                internalTexture, 
                                true);
                        }
                }
            });

            // Prevent autoClear.
            this._postProcesses.map(pp => { pp.autoClear = false; });
        }

        /**
         * Checks for the readiness of the element composing the layer.
         * @param subMesh the mesh to check for
         * @param useInstances specify wether or not to use instances to render the mesh
         * @param emissiveTexture the associated emissive texture used to generate the glow
         * @return true if ready otherwise, false
         */
        public isReady(subMesh: SubMesh, useInstances: boolean): boolean {
            let material = subMesh.getMaterial();
            let mesh = subMesh.getRenderingMesh();

            if (!material || !mesh) {
                return false;
            }

            let emissiveTexture = (<any>material).emissiveTexture;
            return super._isReady(subMesh, useInstances, emissiveTexture);
        }

        /**
         * Returns wether or nood the layer needs stencil enabled during the mesh rendering.
         */
        public needStencil(): boolean {
            return false;
        }

        /**
         * Implementation specific of rendering the generating effect on the main canvas.
         * @param effect The effect used to render through
         */
        protected _internalRender(effect: Effect): void {
            // Texture
            effect.setTexture("textureSampler", this._blurTexture1);
            effect.setTexture("textureSampler2", this._blurTexture2);
            effect.setFloat("offset", this._intensity);

            // Cache
            var engine = this._engine;
            var previousStencilBuffer = engine.getStencilBuffer();
                
            // Draw order
            engine.setStencilBuffer(false);

            engine.drawElementsType(Material.TriangleFillMode, 0, 6);

            // Draw order
            engine.setStencilBuffer(previousStencilBuffer);
        }

        /**
         * Sets the required values for both the emissive texture and and the main color.
         */
        protected _setEmissiveTextureAndColor(mesh: Mesh, subMesh: SubMesh, material: Material): void {
            var textureLevel = 1.0;

            if (this.customEmissiveTextureSelector) {
                this._emissiveTextureAndColor.texture = this.customEmissiveTextureSelector(mesh, subMesh, material);
            } else {
                if (material) {
                    this._emissiveTextureAndColor.texture = (<any>material).emissiveTexture;
                    if (this._emissiveTextureAndColor.texture) {
                        textureLevel = this._emissiveTextureAndColor.texture.level;
                    }
                }
                else {
                    this._emissiveTextureAndColor.texture = null;
                }
            }

            if (this.customEmissiveColorSelector) {
                this.customEmissiveColorSelector(mesh, subMesh, material, this._emissiveTextureAndColor.color);
            } else {
                if ((<any>material).emissiveColor) {
                    this._emissiveTextureAndColor.color.set(
                        (<any>material).emissiveColor.r * textureLevel,
                        (<any>material).emissiveColor.g * textureLevel,
                        (<any>material).emissiveColor .b * textureLevel,
                        1.0);
                }
                else {
                    this._emissiveTextureAndColor.color.set(
                        this.neutralColor.r,
                        this.neutralColor.g,
                        this.neutralColor.b,
                        this.neutralColor.a);
                }
            }
        }

        /**
         * Returns true if the mesh should render, otherwise false.
         * @param mesh The mesh to render
         * @returns true if it should render otherwise false
         */
        protected _shouldRenderMesh(mesh: Mesh): boolean {
            return this.hasMesh(mesh);
        }

        /**
         * Add a mesh in the exclusion list to prevent it to impact or being impacted by the glow layer.
         * @param mesh The mesh to exclude from the glow layer
         */
        public addExcludedMesh(mesh: Mesh): void {
            if (this._excludedMeshes.indexOf(mesh.uniqueId) === -1) {
                this._excludedMeshes.push(mesh.uniqueId);
            }
        }

        /**
          * Remove a mesh from the exclusion list to let it impact or being impacted by the glow layer.
          * @param mesh The mesh to remove
          */
        public removeExcludedMesh(mesh: Mesh): void {
            var index = this._excludedMeshes.indexOf(mesh.uniqueId);
            if (index !== -1) {
                this._excludedMeshes.splice(index, 1);
            } 
        }

        /**
         * Add a mesh in the inclusion list to impact or being impacted by the glow layer.
         * @param mesh The mesh to include in the glow layer
         */
        public addIncludedOnlyMesh(mesh: Mesh): void {
            if (this._includedOnlyMeshes.indexOf(mesh.uniqueId) === -1) {
                this._includedOnlyMeshes.push(mesh.uniqueId);
            }
        }

        /**
          * Remove a mesh from the Inclusion list to prevent it to impact or being impacted by the glow layer.
          * @param mesh The mesh to remove
          */
        public removeIncludedOnlyMesh(mesh: Mesh): void {
            var index = this._includedOnlyMeshes.indexOf(mesh.uniqueId);
            if (index !== -1) {
                this._includedOnlyMeshes.splice(index, 1);
            } 
        }

        /**
         * Determine if a given mesh will be used in the glow layer
         * @param mesh The mesh to test
         * @returns true if the mesh will be highlighted by the current glow layer
         */
        public hasMesh(mesh: AbstractMesh): boolean {
            // Included Mesh
            if (this._includedOnlyMeshes.length) {
                return this._includedOnlyMeshes.indexOf(mesh.uniqueId) !== -1;
            };

            // Excluded Mesh
            if (this._excludedMeshes.length) {
                return this._excludedMeshes.indexOf(mesh.uniqueId) === -1;
            };

            return true;
        }

        /**
         * Free any resources and references associated to a mesh.
         * Internal use
         * @param mesh The mesh to free.
         */
        public _disposeMesh(mesh: Mesh): void {
            this.removeIncludedOnlyMesh(mesh);
            this.removeExcludedMesh(mesh);
        }

        /**
         * Serializes this glow layer
         * @returns - serialized glow layer object.
         */
        public serialize(): any {
            var serializationObject = SerializationHelper.Serialize(this);
            var index;

            // Included meshes
            serializationObject.includedMeshes = [];

            if (this._includedOnlyMeshes.length) {
                for (index = 0; index < this._includedOnlyMeshes.length; index++) {
                    var mesh = this._scene.getMeshByUniqueID(this._includedOnlyMeshes[index]);
                    if (mesh) {
                        serializationObject.includedMeshes.push(mesh.id);
                    }
                }
            }

            // Excluded meshes
            serializationObject.excludedMeshes = [];

            if (this._excludedMeshes.length) {
                for (index = 0; index < this._excludedMeshes.length; index++) {
                    var mesh = this._scene.getMeshByUniqueID(this._excludedMeshes[index]);
                    if (mesh) {
                        serializationObject.excludedMeshes.push(mesh.id);
                    }
                }
            }

            return serializationObject;
        }

        /**
         * Creates a Glow Layer from parsed glow layer data.
         * @param parsedGlowLayer - Parsed glow layer data.
         * @param scene - BJS scene.
         * @param rootUrl - Root URL containing the glow layer information.
         * @returns - Parsed Glow Layer.
         */
        public static Parse(parsedGlowLayer: any, scene: Scene, rootUrl: string): GlowLayer {
            var gl = SerializationHelper.Parse(() => new GlowLayer(parsedGlowLayer.name, scene, parsedGlowLayer.options), parsedGlowLayer, scene, rootUrl);
            var index;

            // Excluded meshes
            for (index = 0; index < parsedGlowLayer.excludedMeshes.length; index++) {
                var mesh = scene.getMeshByID(parsedGlowLayer.excludedMeshes[index]);
                if (mesh) {
                    gl.addExcludedMesh(<Mesh>mesh);
                }
            }

            // Included meshes
            for (index = 0; index < parsedGlowLayer.includedMeshes.length; index++) {
                var mesh = scene.getMeshByID(parsedGlowLayer.includedMeshes[index]);
                if (mesh) {
                    gl.addIncludedOnlyMesh(<Mesh>mesh);
                }
            }

            return gl;
        }
    }
} 
