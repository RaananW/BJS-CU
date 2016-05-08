﻿/// <reference path="../../../dist/preview release/babylon.d.ts"/>

module BABYLON {
    var maxSimultaneousLights = 4;

    class FurMaterialDefines extends MaterialDefines {
        public DIFFUSE = false;
        public HEIGHTMAP = false;
        public CLIPPLANE = false;
        public ALPHATEST = false;
        public POINTSIZE = false;
        public FOG = false;
        public NORMAL = false;
        public UV1 = false;
        public UV2 = false;
        public VERTEXCOLOR = false;
        public VERTEXALPHA = false;
        public NUM_BONE_INFLUENCERS = 0;
        public BonesPerMesh = 0;
        public INSTANCES = false;
        public HIGHLEVEL = false;

        constructor() {
            super();
            this._keys = Object.keys(this);
        }
    }

    export class FurMaterial extends Material {
        
        public diffuseTexture: BaseTexture;
        public heightTexture: BaseTexture;
        public diffuseColor = new Color3(1, 1, 1);
        
        @serialize()
        public furLength: number = 1;
        
        @serialize()
        public furAngle: number = 0;
        
        @serializeAsColor3()
        public furColor = new Color3(0.44,0.21,0.02);
        
        @serialize()
        public furOffset: number = 0.0;
        
        @serialize()
        public furSpacing: number = 12;
        
        @serializeAsVector3()
        public furGravity = new Vector3(0, 0, 0);
        
        @serialize()
        public furSpeed: number = 100;
        
        @serialize()
        public furDensity: number = 20;
        
        @serializeAsTexture()
        public furTexture: DynamicTexture;
        
        @serialize()
        public disableLighting = false;
        
        @serialize()
        public highLevelFur: boolean = true;
        
        @serialize()
        public maxSimultaneousLights = 4;

        private _worldViewProjectionMatrix = Matrix.Zero();
        private _renderId: number;
        
        private _furTime: number = 0;

        private _defines = new FurMaterialDefines();
        private _cachedDefines = new FurMaterialDefines();

        constructor(name: string, scene: Scene) {
            super(name, scene);

            this._cachedDefines.BonesPerMesh = -1;
        }
        
        @serialize()
        public get furTime() {
            return this._furTime;
        }
        
        public set furTime(furTime: number) {
            this._furTime = furTime;
        }

        public needAlphaBlending(): boolean {
            return (this.alpha < 1.0);
        }

        public needAlphaTesting(): boolean {
            return false;
        }

        public getAlphaTestTexture(): BaseTexture {
            return null;
        }

        // Methods   
        private _checkCache(scene: Scene, mesh?: AbstractMesh, useInstances?: boolean): boolean {
            if (!mesh) {
                return true;
            }

            if (this._defines.INSTANCES !== useInstances) {
                return false;
            }

            if (mesh._materialDefines && mesh._materialDefines.isEqual(this._defines)) {
                return true;
            }

            return false;
        }

        public isReady(mesh?: AbstractMesh, useInstances?: boolean): boolean {
            if (this.checkReadyOnlyOnce) {
                if (this._wasPreviouslyReady) {
                    return true;
                }
            }

            var scene = this.getScene();

            if (!this.checkReadyOnEveryCall) {
                if (this._renderId === scene.getRenderId()) {
                    if (this._checkCache(scene, mesh, useInstances)) {
                        return true;
                    }
                }
            }

            var engine = scene.getEngine();
            var needNormals = false;
            var needUVs = false;

            this._defines.reset();

            // Textures
            if (scene.texturesEnabled) {
                if (this.diffuseTexture && StandardMaterial.DiffuseTextureEnabled) {
                    if (!this.diffuseTexture.isReady()) {
                        return false;
                    } else {
                        needUVs = true;
                        this._defines.DIFFUSE = true;
                    }
                } 
                if (this.heightTexture) {
                    if (!this.heightTexture.isReady()) {
                        return false;
                    } else {
                        needUVs = true;
                        this._defines.HEIGHTMAP = true;
                    }
                }               
            }

            // Effect
            if (scene.clipPlane) {
                this._defines.CLIPPLANE = true;
            }

            if (engine.getAlphaTesting()) {
                this._defines.ALPHATEST = true;
            }

            // Point size
            if (this.pointsCloud || scene.forcePointsCloud) {
                this._defines.POINTSIZE = true;
            }

            // Fog
            if (scene.fogEnabled && mesh && mesh.applyFog && scene.fogMode !== Scene.FOGMODE_NONE && this.fogEnabled) {
                this._defines.FOG = true;
            }
            
            // High level
            if (this.highLevelFur) {
                this._defines.HIGHLEVEL = true;
            }

            // Lights
            if (scene.lightsEnabled && !this.disableLighting) {
                needNormals = MaterialHelper.PrepareDefinesForLights(scene, mesh, this._defines, this.maxSimultaneousLights);
            }

            // Attribs
            if (mesh) {
                if (needNormals && mesh.isVerticesDataPresent(VertexBuffer.NormalKind)) {
                    this._defines.NORMAL = true;
                }
                if (needUVs) {
                    if (mesh.isVerticesDataPresent(VertexBuffer.UVKind)) {
                        this._defines.UV1 = true;
                    }
                    if (mesh.isVerticesDataPresent(VertexBuffer.UV2Kind)) {
                        this._defines.UV2 = true;
                    }
                }
                if (mesh.useVertexColors && mesh.isVerticesDataPresent(VertexBuffer.ColorKind)) {
                    this._defines.VERTEXCOLOR = true;

                    if (mesh.hasVertexAlpha) {
                        this._defines.VERTEXALPHA = true;
                    }
                }
                
                if (mesh.useBones && mesh.computeBonesUsingShaders) {
                    this._defines.NUM_BONE_INFLUENCERS = mesh.numBoneInfluencers;
                    this._defines.BonesPerMesh = (mesh.skeleton.bones.length + 1);
                }

                // Instances
                if (useInstances) {
                    this._defines.INSTANCES = true;
                }
            }

            // Get correct effect      
            if (!this._defines.isEqual(this._cachedDefines)) {
                this._defines.cloneTo(this._cachedDefines);

                scene.resetCachedMaterial();

                // Fallbacks
                var fallbacks = new EffectFallbacks();             
                if (this._defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }

                MaterialHelper.HandleFallbacksForShadows(this._defines, fallbacks, this.maxSimultaneousLights);
             
                if (this._defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }

                //Attributes
                var attribs = [VertexBuffer.PositionKind];

                if (this._defines.NORMAL) {
                    attribs.push(VertexBuffer.NormalKind);
                }

                if (this._defines.UV1) {
                    attribs.push(VertexBuffer.UVKind);
                }

                if (this._defines.UV2) {
                    attribs.push(VertexBuffer.UV2Kind);
                }

                if (this._defines.VERTEXCOLOR) {
                    attribs.push(VertexBuffer.ColorKind);
                }

                MaterialHelper.PrepareAttributesForBones(attribs, mesh, this._defines, fallbacks);
                MaterialHelper.PrepareAttributesForInstances(attribs, this._defines);

                // Legacy browser patch
                var shaderName = "fur";
                var join = this._defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor",
                    "vFogInfos", "vFogColor", "pointSize",
                    "vDiffuseInfos", 
                    "mBones",
                    "vClipPlane", "diffuseMatrix",
                    "furLength", "furAngle", "furColor", "furOffset", "furGravity", "furTime", "furSpacing", "furDensity"
                ];
                var samplers = ["diffuseSampler",
                    "heightTexture", "furTexture"
                ];
                
                MaterialHelper.PrepareUniformsAndSamplersList(uniforms, samplers, this._defines, this.maxSimultaneousLights);
                
                this._effect = scene.getEngine().createEffect(shaderName,
                    attribs, uniforms, samplers,
                    join, fallbacks, this.onCompiled, this.onError, { maxSimultaneousLights: this.maxSimultaneousLights });
            }
            if (!this._effect.isReady()) {
                return false;
            }

            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;

            if (mesh) {
                if (!mesh._materialDefines) {
                    mesh._materialDefines = new FurMaterialDefines();
                }

                this._defines.cloneTo(mesh._materialDefines);
            }

            return true;
        }

        public bindOnlyWorldMatrix(world: Matrix): void {
            this._effect.setMatrix("world", world);
        }

        public bind(world: Matrix, mesh?: Mesh): void {
            var scene = this.getScene();

            // Matrices        
            this.bindOnlyWorldMatrix(world);
            this._effect.setMatrix("viewProjection", scene.getTransformMatrix());

            // Bones
            MaterialHelper.BindBonesParameters(mesh, this._effect);

            if (scene.getCachedMaterial() !== this) {
                // Textures        
                if (this.diffuseTexture && StandardMaterial.DiffuseTextureEnabled) {
                    this._effect.setTexture("diffuseSampler", this.diffuseTexture);

                    this._effect.setFloat2("vDiffuseInfos", this.diffuseTexture.coordinatesIndex, this.diffuseTexture.level);
                    this._effect.setMatrix("diffuseMatrix", this.diffuseTexture.getTextureMatrix());
                }
                
                if (this.heightTexture) {
                    this._effect.setTexture("heightTexture", this.heightTexture);
                }
                
                // Clip plane
                MaterialHelper.BindClipPlane(this._effect, scene);

                // Point size
                if (this.pointsCloud) {
                    this._effect.setFloat("pointSize", this.pointSize);
                }

                this._effect.setVector3("vEyePosition", scene._mirroredCameraPosition ? scene._mirroredCameraPosition : scene.activeCamera.position);                
            }

            this._effect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);

            if (scene.lightsEnabled && !this.disableLighting) {
                MaterialHelper.BindLights(scene, mesh, this._effect, this._defines, this.maxSimultaneousLights);
            }

            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== Scene.FOGMODE_NONE) {
                this._effect.setMatrix("view", scene.getViewMatrix());
            }

            // Fog
            MaterialHelper.BindFogParameters(scene, mesh, this._effect);
            
            this._effect.setFloat("furLength", this.furLength);
            this._effect.setFloat("furAngle", this.furAngle);
            this._effect.setColor4("furColor", this.furColor, 1.0);
            
            if (this.highLevelFur) {
                this._effect.setVector3("furGravity", this.furGravity);
                this._effect.setFloat("furOffset", this.furOffset);
                this._effect.setFloat("furSpacing", this.furSpacing);
                this._effect.setFloat("furDensity", this.furDensity);
                
                this._furTime += this.getScene().getEngine().getDeltaTime() / this.furSpeed;
                this._effect.setFloat("furTime", this._furTime);
                
                this._effect.setTexture("furTexture", this.furTexture);
            }
 
            super.bind(world, mesh);
        }

        public getAnimatables(): IAnimatable[] {
            var results = [];

            if (this.diffuseTexture && this.diffuseTexture.animations && this.diffuseTexture.animations.length > 0) {
                results.push(this.diffuseTexture);
            }
            
            if (this.heightTexture && this.heightTexture.animations && this.heightTexture.animations.length > 0) {
                results.push(this.heightTexture);
            }

            return results;
        }

        public dispose(forceDisposeEffect?: boolean): void {
            if (this.diffuseTexture) {
                this.diffuseTexture.dispose();
            }

            super.dispose(forceDisposeEffect);
        }
        
        public clone(name: string): FurMaterial {
            return SerializationHelper.Clone(() => new FurMaterial(name, this.getScene()), this);
        }

        public serialize(): any {
            var serializationObject = SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.FurMaterial";
            return serializationObject;
        }

        // Statics
        public static Parse(source: any, scene: Scene, rootUrl: string): FurMaterial {
            return SerializationHelper.Parse(() => new FurMaterial(source.name, scene), source, scene, rootUrl);
        }
        
        public static GenerateTexture(name: string, scene: Scene): DynamicTexture {
            // Generate fur textures
            var texture = new DynamicTexture("FurTexture " + name, 256, scene, true);
            var context = texture.getContext();
            
            for ( var i = 0; i < 20000; ++i ) {
                context.fillStyle = "rgba(255, " + Math.floor(Math.random() * 255) + ", " + Math.floor(Math.random() * 255) + ", 1)";
                context.fillRect((Math.random() * texture.getSize().width), (Math.random() * texture.getSize().height), 2, 2);
            }
            
            texture.update(false);
            texture.wrapU = Texture.WRAP_ADDRESSMODE;
            texture.wrapV = Texture.WRAP_ADDRESSMODE;
            
            return texture;
        }
        
        // Creates and returns an array of meshes used as shells for the Fur Material
        // that can be disposed later in your code
        // The quality is in interval [0, 100]
        public static FurifyMesh(sourceMesh: Mesh, quality: number): Mesh[] {
            var meshes = [sourceMesh];
            var mat: FurMaterial = <FurMaterial>sourceMesh.material;
            
            if (!(mat instanceof FurMaterial)) {
                throw "The material of the source mesh must be a Fur Material";
            }
            
            for (var i = 1; i < quality; i++) {
                var offsetFur = new BABYLON.FurMaterial(mat.name + i, sourceMesh.getScene());
                offsetFur.furLength = mat.furLength;
                offsetFur.furAngle = mat.furAngle;
                offsetFur.furGravity = mat.furGravity;
                offsetFur.furSpacing = mat.furSpacing;
                offsetFur.furSpeed = mat.furSpeed;
                offsetFur.furColor = mat.furColor;
                offsetFur.diffuseTexture = mat.diffuseTexture;
                offsetFur.furOffset = i / quality;
                offsetFur.furTexture = mat.furTexture;
                offsetFur.highLevelFur = mat.highLevelFur;
                offsetFur.furTime = mat.furTime;
                offsetFur.furDensity = mat.furDensity;
                
                var offsetMesh = sourceMesh.clone(sourceMesh.name + i);
                offsetMesh.material = offsetFur;
                offsetMesh.skeleton = sourceMesh.skeleton;
                offsetMesh.parent = sourceMesh;
                meshes.push(offsetMesh);
            }
            
            return meshes;
        }
    }
} 

