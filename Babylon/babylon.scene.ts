﻿module BABYLON {
    export interface IDisposable {
        dispose(): void;
    }

    /**
     * Represents a scene to be rendered by the engine.
     * @see http://doc.babylonjs.com/page.php?p=21911
     */
    export class Scene {
        // Statics
        private static _FOGMODE_NONE = 0;
        private static _FOGMODE_EXP = 1;
        private static _FOGMODE_EXP2 = 2;
        private static _FOGMODE_LINEAR = 3;

        public static MinDeltaTime = 1.0;
        public static MaxDeltaTime = 1000.0;

        public static get FOGMODE_NONE(): number {
            return Scene._FOGMODE_NONE;
        }

        public static get FOGMODE_EXP(): number {
            return Scene._FOGMODE_EXP;
        }

        public static get FOGMODE_EXP2(): number {
            return Scene._FOGMODE_EXP2;
        }

        public static get FOGMODE_LINEAR(): number {
            return Scene._FOGMODE_LINEAR;
        }

        // Members
        public autoClear = true;
        public clearColor: any = new Color3(0.2, 0.2, 0.3);
        public ambientColor = new Color3(0, 0, 0);
        /**
        * A function to be executed before rendering this scene
        * @type {Function}
        */
        public beforeRender: () => void;
        /**
        * A function to be executed after rendering this scene
        * @type {Function}
        */
        public afterRender: () => void;
        /**
        * A function to be executed when this scene is disposed.
        * @type {Function}
        */
        public onDispose: () => void;
        public beforeCameraRender: (camera: Camera) => void;
        public afterCameraRender: (camera: Camera) => void;
        public forceWireframe = false;
        public forcePointsCloud = false;
        public forceShowBoundingBoxes = false;
        public clipPlane: Plane;
        public animationsEnabled = true;

        // Pointers
        private _onPointerMove: (evt: PointerEvent) => void;
        private _onPointerDown: (evt: PointerEvent) => void;
        public onPointerDown: (evt: PointerEvent, pickInfo: PickingInfo) => void;
        public cameraToUseForPointers: Camera = null; // Define this parameter if you are using multiple cameras and you want to specify which one should be used for pointer position
        private _pointerX: number;
        private _pointerY: number;
        private _meshUnderPointer: AbstractMesh;

        // Keyboard
        private _onKeyDown: (evt: Event) => void;
        private _onKeyUp: (evt: Event) => void;

        // Fog
        /**
        * is fog enabled on this scene.
        * @type {boolean}
        */
        public fogEnabled = true;
        public fogMode = Scene.FOGMODE_NONE;
        public fogColor = new Color3(0.2, 0.2, 0.3);
        public fogDensity = 0.1;
        public fogStart = 0;
        public fogEnd = 1000.0;

        // Lights
        /**
        * is shadow enabled on this scene.
        * @type {boolean}
        */
        public shadowsEnabled = true;
        /**
        * is light enabled on this scene.
        * @type {boolean}
        */
        public lightsEnabled = true;
        /**
        * All of the lights added to this scene.
        * @see BABYLON.Light
        * @type {BABYLON.Light[]}
        */
        public lights = new Array<Light>();

        // Cameras
        /**
        * All of the cameras added to this scene.
        * @see BABYLON.Camera
        * @type {BABYLON.Camera[]}
        */
        public cameras = new Array<Camera>();
        public activeCameras = new Array<Camera>();
        public activeCamera: Camera;

        // Meshes
        /**
        * All of the (abstract) meshes added to this scene.
        * @see BABYLON.AbstractMesh
        * @type {BABYLON.AbstractMesh[]}
        */
        public meshes = new Array<AbstractMesh>();

        // Geometries
        private _geometries = new Array<Geometry>();

        public materials = new Array<Material>();
        public multiMaterials = new Array<MultiMaterial>();
        public defaultMaterial = new StandardMaterial("default material", this);

        // Textures
        public texturesEnabled = true;
        public textures = new Array<BaseTexture>();

        // Particles
        public particlesEnabled = true;
        public particleSystems = new Array<ParticleSystem>();

        // Sprites
        public spritesEnabled = true;
        public spriteManagers = new Array<SpriteManager>();

        // Layers
        public layers = new Array<Layer>();

        // Skeletons
        public skeletonsEnabled = true;
        public skeletons = new Array<Skeleton>();

        // Lens flares
        public lensFlaresEnabled = true;
        public lensFlareSystems = new Array<LensFlareSystem>();

        // Collisions
        public collisionsEnabled = true;
        public gravity = new Vector3(0, -9.0, 0);

        // Postprocesses
        public postProcessesEnabled = true;
        public postProcessManager: PostProcessManager;
        public postProcessRenderPipelineManager: PostProcessRenderPipelineManager;

        // Customs render targets
        public renderTargetsEnabled = true;
        public customRenderTargets = new Array<RenderTargetTexture>();

        // Delay loading
        public useDelayedTextureLoading: boolean;

        // Imported meshes
        public importedMeshesFiles = new Array<String>();

        // Database
        public database; //ANY

        // Actions
        /**
         * This scene's action manager
         * @type {BABYLON.ActionManager}
         */
        public actionManager: ActionManager;
        public _actionManagers = new Array<ActionManager>();
        private _meshesForIntersections = new SmartArray<AbstractMesh>(256);

        // Procedural textures
        public proceduralTexturesEnabled = true;
        public _proceduralTextures = new Array<ProceduralTexture>();

        // Sound Tracks
        public mainSoundTrack: SoundTrack;
        public soundTracks = new Array<SoundTrack>();

        // Private
        private _engine: Engine;
        private _totalVertices = 0;
        public _activeVertices = 0;
        public _activeParticles = 0;
        private _lastFrameDuration = 0;
        private _evaluateActiveMeshesDuration = 0;
        private _renderTargetsDuration = 0;
        public _particlesDuration = 0;
        private _renderDuration = 0;
        public _spritesDuration = 0;
        private _animationRatio = 0;
        private _animationStartDate: number;
        public _cachedMaterial: Material;

        private _renderId = 0;
        private _executeWhenReadyTimeoutId = -1;

        public _toBeDisposed = new SmartArray<IDisposable>(256);

        private _onReadyCallbacks = new Array<() => void>();
        private _pendingData = [];//ANY

        private _onBeforeRenderCallbacks = new Array<() => void>();
        private _onAfterRenderCallbacks = new Array<() => void>();

        private _activeMeshes = new SmartArray<Mesh>(256);
        private _processedMaterials = new SmartArray<Material>(256);
        private _renderTargets = new SmartArray<RenderTargetTexture>(256);
        public _activeParticleSystems = new SmartArray<ParticleSystem>(256);
        private _activeSkeletons = new SmartArray<Skeleton>(32);
        public _activeBones = 0;

        private _renderingManager: RenderingManager;
        private _physicsEngine: PhysicsEngine;

        public _activeAnimatables = new Array<Animatable>();

        private _transformMatrix = Matrix.Zero();
        private _pickWithRayInverseMatrix: Matrix;

        private _scaledPosition = Vector3.Zero();
        private _scaledVelocity = Vector3.Zero();

        private _boundingBoxRenderer: BoundingBoxRenderer;
        private _outlineRenderer: OutlineRenderer;

        private _viewMatrix: Matrix;
        private _projectionMatrix: Matrix;
        private _frustumPlanes: Plane[];

        private _selectionOctree: Octree<AbstractMesh>;

        private _pointerOverMesh: AbstractMesh;

        private _debugLayer: DebugLayer;

        private _depthRenderer: DepthRenderer;

        /**
         * @constructor
         * @param {BABYLON.Engine} engine - the engine to be used to render this scene.
         */
        constructor(engine: Engine) {
            this._engine = engine;

            engine.scenes.push(this);

            this._renderingManager = new RenderingManager(this);

            this.postProcessManager = new PostProcessManager(this);

            this.postProcessRenderPipelineManager = new PostProcessRenderPipelineManager();

            this._boundingBoxRenderer = new BoundingBoxRenderer(this);
            this._outlineRenderer = new OutlineRenderer(this);

            this.attachControl();

            this._debugLayer = new DebugLayer(this);
            this.mainSoundTrack = new SoundTrack(this, { mainTrack: true });
        }

        // Properties 
        public get debugLayer(): DebugLayer {
            return this._debugLayer;
        }

        /**
         * The mesh that is currently under the pointer.
         * @return {BABYLON.AbstractMesh} mesh under the pointer/mouse cursor or null if none.
         */
        public get meshUnderPointer(): AbstractMesh {
            return this._meshUnderPointer;
        }

        /**
         * Current on-screen X position of the pointer
         * @return {number} X position of the pointer
         */
        public get pointerX(): number {
            return this._pointerX;
        }

        /**
         * Current on-screen Y position of the pointer
         * @return {number} Y position of the pointer
         */
        public get pointerY(): number {
            return this._pointerY;
        }

        public getCachedMaterial(): Material {
            return this._cachedMaterial;
        }

        public getBoundingBoxRenderer(): BoundingBoxRenderer {
            return this._boundingBoxRenderer;
        }

        public getOutlineRenderer(): OutlineRenderer {
            return this._outlineRenderer;
        }

        public getEngine(): Engine {
            return this._engine;
        }

        public getTotalVertices(): number {
            return this._totalVertices;
        }

        public getActiveVertices(): number {
            return this._activeVertices;
        }

        public getActiveParticles(): number {
            return this._activeParticles;
        }

        public getActiveBones(): number {
            return this._activeBones;
        }

        // Stats
        public getLastFrameDuration(): number {
            return this._lastFrameDuration;
        }

        public getEvaluateActiveMeshesDuration(): number {
            return this._evaluateActiveMeshesDuration;
        }

        public getActiveMeshes(): SmartArray<Mesh> {
            return this._activeMeshes;
        }

        public getRenderTargetsDuration(): number {
            return this._renderTargetsDuration;
        }

        public getRenderDuration(): number {
            return this._renderDuration;
        }

        public getParticlesDuration(): number {
            return this._particlesDuration;
        }

        public getSpritesDuration(): number {
            return this._spritesDuration;
        }

        public getAnimationRatio(): number {
            return this._animationRatio;
        }

        public getRenderId(): number {
            return this._renderId;
        }

        public incrementRenderId(): void {
            this._renderId++;
        }

        private _updatePointerPosition(evt: PointerEvent): void {
            var canvasRect = this._engine.getRenderingCanvasClientRect();

            this._pointerX = evt.clientX - canvasRect.left;
            this._pointerY = evt.clientY - canvasRect.top;

            if (this.cameraToUseForPointers) {
                this._pointerX = this._pointerX - this.cameraToUseForPointers.viewport.x * this._engine.getRenderWidth();
                this._pointerY = this._pointerY - this.cameraToUseForPointers.viewport.y * this._engine.getRenderHeight();
            }
        }

        // Pointers handling
        public attachControl() {
            this._onPointerMove = (evt: PointerEvent) => {
                var canvas = this._engine.getRenderingCanvas();

                this._updatePointerPosition(evt);

                var pickResult = this.pick(this._pointerX, this._pointerY,
                    (mesh: AbstractMesh): boolean => mesh.isPickable && mesh.isVisible && mesh.isReady() && mesh.actionManager && mesh.actionManager.hasPointerTriggers,
                    false,
                    this.cameraToUseForPointers);

                if (pickResult.hit) {
                    this._meshUnderPointer = pickResult.pickedMesh;

                    this.setPointerOverMesh(pickResult.pickedMesh);
                    canvas.style.cursor = "pointer";
                } else {
                    this.setPointerOverMesh(null);
                    canvas.style.cursor = "";
                    this._meshUnderPointer = null;
                }
            };

            this._onPointerDown = (evt: PointerEvent) => {

                var predicate = null;

                if (!this.onPointerDown) {
                    predicate = (mesh: AbstractMesh): boolean => {
                        return mesh.isPickable && mesh.isVisible && mesh.isReady() && mesh.actionManager && mesh.actionManager.hasPickTriggers;
                    };
                }

                this._updatePointerPosition(evt);

                var pickResult = this.pick(this._pointerX, this._pointerY, predicate, false, this.cameraToUseForPointers);

                if (pickResult.hit) {
                    if (pickResult.pickedMesh.actionManager) {
                        switch (evt.button) {
                            case 0:
                                pickResult.pickedMesh.actionManager.processTrigger(ActionManager.OnLeftPickTrigger, ActionEvent.CreateNew(pickResult.pickedMesh, evt));
                                break;
                            case 1:
                                pickResult.pickedMesh.actionManager.processTrigger(ActionManager.OnCenterPickTrigger, ActionEvent.CreateNew(pickResult.pickedMesh, evt));
                                break;
                            case 2:
                                pickResult.pickedMesh.actionManager.processTrigger(ActionManager.OnRightPickTrigger, ActionEvent.CreateNew(pickResult.pickedMesh, evt));
                                break;
                        }
                        pickResult.pickedMesh.actionManager.processTrigger(ActionManager.OnPickTrigger, ActionEvent.CreateNew(pickResult.pickedMesh, evt));
                    }
                }

                if (this.onPointerDown) {
                    this.onPointerDown(evt, pickResult);
                }
            };

            this._onKeyDown = (evt: Event) => {
                if (this.actionManager) {
                    this.actionManager.processTrigger(ActionManager.OnKeyDownTrigger, ActionEvent.CreateNewFromScene(this, evt));
                }
            };

            this._onKeyUp = (evt: Event) => {
                if (this.actionManager) {
                    this.actionManager.processTrigger(ActionManager.OnKeyUpTrigger, ActionEvent.CreateNewFromScene(this, evt));
                }
            };


            var eventPrefix = Tools.GetPointerPrefix();
            this._engine.getRenderingCanvas().addEventListener(eventPrefix + "move", this._onPointerMove, false);
            this._engine.getRenderingCanvas().addEventListener(eventPrefix + "down", this._onPointerDown, false);        

            Tools.RegisterTopRootEvents([
                { name: "keydown", handler: this._onKeyDown },
                { name: "keyup", handler: this._onKeyUp }
            ]);
        }

        public detachControl() {
            var eventPrefix = Tools.GetPointerPrefix();
            this._engine.getRenderingCanvas().removeEventListener(eventPrefix + "move", this._onPointerMove);
            this._engine.getRenderingCanvas().removeEventListener(eventPrefix + "down", this._onPointerDown);

            Tools.UnregisterTopRootEvents([
                { name: "keydown", handler: this._onKeyDown },
                { name: "keyup", handler: this._onKeyUp }
            ]);
        }

        // Ready
        public isReady(): boolean {
            if (this._pendingData.length > 0) {
                return false;
            }

            for (var index = 0; index < this._geometries.length; index++) {
                var geometry = this._geometries[index];

                if (geometry.delayLoadState === Engine.DELAYLOADSTATE_LOADING) {
                    return false;
                }
            }

            for (index = 0; index < this.meshes.length; index++) {
                var mesh = this.meshes[index];

                if (!mesh.isReady()) {
                    return false;
                }

                var mat = mesh.material;
                if (mat) {
                    if (!mat.isReady(mesh)) {
                        return false;
                    }
                }

            }

            return true;
        }

        public resetCachedMaterial(): void {
            this._cachedMaterial = null;
        }

        public registerBeforeRender(func: () => void): void {
            this._onBeforeRenderCallbacks.push(func);
        }

        public unregisterBeforeRender(func: () => void): void {
            var index = this._onBeforeRenderCallbacks.indexOf(func);

            if (index > -1) {
                this._onBeforeRenderCallbacks.splice(index, 1);
            }
        }

        public registerAfterRender(func: () => void): void {
            this._onAfterRenderCallbacks.push(func);
        }

        public unregisterAfterRender(func: () => void): void {
            var index = this._onAfterRenderCallbacks.indexOf(func);

            if (index > -1) {
                this._onAfterRenderCallbacks.splice(index, 1);
            }
        }

        public _addPendingData(data): void {
            this._pendingData.push(data);
        }

        public _removePendingData(data): void {
            var index = this._pendingData.indexOf(data);

            if (index !== -1) {
                this._pendingData.splice(index, 1);
            }
        }

        public getWaitingItemsCount(): number {
            return this._pendingData.length;
        }

        /**
         * Registers a function to be executed when the scene is ready.
         * @param {Function} func - the function to be executed.
         */
        public executeWhenReady(func: () => void): void {
            this._onReadyCallbacks.push(func);

            if (this._executeWhenReadyTimeoutId !== -1) {
                return;
            }

            this._executeWhenReadyTimeoutId = setTimeout(() => {
                this._checkIsReady();
            }, 150);
        }

        public _checkIsReady() {
            if (this.isReady()) {
                this._onReadyCallbacks.forEach(func => {
                    func();
                });

                this._onReadyCallbacks = [];
                this._executeWhenReadyTimeoutId = -1;
                return;
            }

            this._executeWhenReadyTimeoutId = setTimeout(() => {
                this._checkIsReady();
            }, 150);
        }

        // Animations
        /**
         * Will start the animation sequence of a given target
         * @param target - the target 
         * @param {number} from - from which frame should animation start
         * @param {number} to - till which frame should animation run.
         * @param {boolean} [loop] - should the animation loop
         * @param {number} [speedRatio] - the speed in which to run the animation
         * @param {Function} [onAnimationEnd] function to be executed when the animation ended.
         * @param {BABYLON.Animatable} [animatable] an animatable object. If not provided a new one will be created from the given params.
         * @return {BABYLON.Animatable} the animatable object created for this animation
         * @see BABYLON.Animatable
         * @see http://doc.babylonjs.com/page.php?p=22081
         */
        public beginAnimation(target: any, from: number, to: number, loop?: boolean, speedRatio?: number, onAnimationEnd?: () => void, animatable?: Animatable): Animatable {
            if (speedRatio === undefined) {
                speedRatio = 1.0;
            }

            this.stopAnimation(target);

            if (!animatable) {
                animatable = new Animatable(this, target, from, to, loop, speedRatio, onAnimationEnd);
            }

            // Local animations
            if (target.animations) {
                animatable.appendAnimations(target, target.animations);
            }

            // Children animations
            if (target.getAnimatables) {
                var animatables = target.getAnimatables();
                for (var index = 0; index < animatables.length; index++) {
                    this.beginAnimation(animatables[index], from, to, loop, speedRatio, onAnimationEnd, animatable);
                }
            }

            return animatable;
        }

        public beginDirectAnimation(target: any, animations: Animation[], from: number, to: number, loop?: boolean, speedRatio?: number, onAnimationEnd?: () => void): Animatable {
            if (speedRatio === undefined) {
                speedRatio = 1.0;
            }

            var animatable = new Animatable(this, target, from, to, loop, speedRatio, onAnimationEnd, animations);

            return animatable;
        }

        public getAnimatableByTarget(target: any): Animatable {
            for (var index = 0; index < this._activeAnimatables.length; index++) {
                if (this._activeAnimatables[index].target === target) {
                    return this._activeAnimatables[index];
                }
            }

            return null;
        }

        /**
         * Will stop the animation of the given target
         * @param target - the target 
         * @see beginAnimation 
         */
        public stopAnimation(target: any): void {
            var animatable = this.getAnimatableByTarget(target);

            if (animatable) {
                animatable.stop();
            }
        }

        private _animate(): void {
            if (!this.animationsEnabled) {
                return;
            }

            if (!this._animationStartDate) {
                this._animationStartDate = Tools.Now;
            }
            // Getting time
            var now = Tools.Now;
            var delay = now - this._animationStartDate;

            for (var index = 0; index < this._activeAnimatables.length; index++) {
                if (!this._activeAnimatables[index]._animate(delay)) {
                    this._activeAnimatables.splice(index, 1);
                    index--;
                }
            }
        }

        // Matrix
        public getViewMatrix(): Matrix {
            return this._viewMatrix;
        }

        public getProjectionMatrix(): Matrix {
            return this._projectionMatrix;
        }

        public getTransformMatrix(): Matrix {
            return this._transformMatrix;
        }

        public setTransformMatrix(view: Matrix, projection: Matrix): void {
            this._viewMatrix = view;
            this._projectionMatrix = projection;

            this._viewMatrix.multiplyToRef(this._projectionMatrix, this._transformMatrix);
        }

        // Methods

        /**
         * sets the active camera of the scene using its ID
         * @param {string} id - the camera's ID
         * @return {BABYLON.Camera|null} the new active camera or null if none found.
         * @see activeCamera
         */
        public setActiveCameraByID(id: string): Camera {
            var camera = this.getCameraByID(id);

            if (camera) {
                this.activeCamera = camera;
                return camera;
            }

            return null;
        }

        /**
         * sets the active camera of the scene using its name
         * @param {string} name - the camera's name
         * @return {BABYLON.Camera|null} the new active camera or null if none found.
         * @see activeCamera
         */
        public setActiveCameraByName(name: string): Camera {
            var camera = this.getCameraByName(name);

            if (camera) {
                this.activeCamera = camera;
                return camera;
            }

            return null;
        }

        /**
         * get a material using its id
         * @param {string} the material's ID
         * @return {BABYLON.Material|null} the material or null if none found.
         */
        public getMaterialByID(id: string): Material {
            for (var index = 0; index < this.materials.length; index++) {
                if (this.materials[index].id === id) {
                    return this.materials[index];
                }
            }

            return null;
        }

        /**
         * get a material using its name
         * @param {string} the material's name
         * @return {BABYLON.Material|null} the material or null if none found.
         */
        public getMaterialByName(name: string): Material {
            for (var index = 0; index < this.materials.length; index++) {
                if (this.materials[index].name === name) {
                    return this.materials[index];
                }
            }

            return null;
        }

        public getCameraByID(id: string): Camera {
            for (var index = 0; index < this.cameras.length; index++) {
                if (this.cameras[index].id === id) {
                    return this.cameras[index];
                }
            }

            return null;
        }

        /**
         * get a camera using its name
         * @param {string} the camera's name
         * @return {BABYLON.Camera|null} the camera or null if none found.
         */
        public getCameraByName(name: string): Camera {
            for (var index = 0; index < this.cameras.length; index++) {
                if (this.cameras[index].name === name) {
                    return this.cameras[index];
                }
            }

            return null;
        }

        /**
         * get a light node using its name
         * @param {string} the light's name
         * @return {BABYLON.Light|null} the light or null if none found.
         */
        public getLightByName(name: string): Light {
            for (var index = 0; index < this.lights.length; index++) {
                if (this.lights[index].name === name) {
                    return this.lights[index];
                }
            }

            return null;
        }

        /**
         * get a light node using its ID
         * @param {string} the light's id
         * @return {BABYLON.Light|null} the light or null if none found.
         */
        public getLightByID(id: string): Light {
            for (var index = 0; index < this.lights.length; index++) {
                if (this.lights[index].id === id) {
                    return this.lights[index];
                }
            }

            return null;
        }

        /**
         * get a geometry using its ID
         * @param {string} the geometry's id
         * @return {BABYLON.Geometry|null} the geometry or null if none found.
         */
        public getGeometryByID(id: string): Geometry {
            for (var index = 0; index < this._geometries.length; index++) {
                if (this._geometries[index].id === id) {
                    return this._geometries[index];
                }
            }

            return null;
        }

        /**
         * add a new geometry to this scene.
         * @param {BABYLON.Geometry} geometry - the geometry to be added to the scene.
         * @param {boolean} [force] - force addition, even if a geometry with this ID already exists
         * @return {boolean} was the geometry added or not
         */
        public pushGeometry(geometry: Geometry, force?: boolean): boolean {
            if (!force && this.getGeometryByID(geometry.id)) {
                return false;
            }

            this._geometries.push(geometry);

            return true;
        }

        public getGeometries(): Geometry[] {
            return this._geometries;
        }

        /**
         * Get a the first added mesh found of a given ID
         * @param {string} id - the id to search for
         * @return {BABYLON.AbstractMesh|null} the mesh found or null if not found at all.
         */
        public getMeshByID(id: string): AbstractMesh {
            for (var index = 0; index < this.meshes.length; index++) {
                if (this.meshes[index].id === id) {
                    return this.meshes[index];
                }
            }

            return null;
        }

        /**
         * Get a the last added mesh found of a given ID
         * @param {string} id - the id to search for
         * @return {BABYLON.AbstractMesh|null} the mesh found or null if not found at all.
         */
        public getLastMeshByID(id: string): AbstractMesh {
            for (var index = this.meshes.length - 1; index >= 0; index--) {
                if (this.meshes[index].id === id) {
                    return this.meshes[index];
                }
            }

            return null;
        }

        /**
         * Get a the last added node (Mesh, Camera, Light) found of a given ID
         * @param {string} id - the id to search for
         * @return {BABYLON.Node|null} the node found or null if not found at all.
         */
        public getLastEntryByID(id: string): Node {
            for (var index = this.meshes.length - 1; index >= 0; index--) {
                if (this.meshes[index].id === id) {
                    return this.meshes[index];
                }
            }

            for (index = this.cameras.length - 1; index >= 0; index--) {
                if (this.cameras[index].id === id) {
                    return this.cameras[index];
                }
            }

            for (index = this.lights.length - 1; index >= 0; index--) {
                if (this.lights[index].id === id) {
                    return this.lights[index];
                }
            }

            return null;
        }

        public getNodeByName(name: string): Node {
            var mesh = this.getMeshByName(name);

            if (mesh) {
                return mesh;
            }

            var light = this.getLightByName(name);

            if (light) {
                return light;
            }

            return this.getCameraByName(name);
        }

        public getMeshByName(name: string): AbstractMesh {
            for (var index = 0; index < this.meshes.length; index++) {
                if (this.meshes[index].name === name) {
                    return this.meshes[index];
                }
            }

            return null;
        }

        public getSoundByName(name: string): Sound {
            for (var index = 0; index < this.mainSoundTrack.soundCollection.length; index++) {
                if (this.mainSoundTrack.soundCollection[index].name === name) {
                    return this.mainSoundTrack.soundCollection[index];
                }
            }

            for (var sdIndex = 0; sdIndex < this.soundTracks.length; sdIndex++) {
                for (index = 0; index < this.soundTracks[sdIndex].soundCollection.length; index++) {
                    if (this.soundTracks[sdIndex].soundCollection[index].name === name) {
                        return this.soundTracks[sdIndex].soundCollection[index];
                    }
                }
            }

            return null;
        }

        public getLastSkeletonByID(id: string): Skeleton {
            for (var index = this.skeletons.length - 1; index >= 0; index--) {
                if (this.skeletons[index].id === id) {
                    return this.skeletons[index];
                }
            }

            return null;
        }

        public getSkeletonById(id: string): Skeleton {
            for (var index = 0; index < this.skeletons.length; index++) {
                if (this.skeletons[index].id === id) {
                    return this.skeletons[index];
                }
            }

            return null;
        }

        public getSkeletonByName(name: string): Skeleton {
            for (var index = 0; index < this.skeletons.length; index++) {
                if (this.skeletons[index].name === name) {
                    return this.skeletons[index];
                }
            }

            return null;
        }

        public isActiveMesh(mesh: Mesh): boolean {
            return (this._activeMeshes.indexOf(mesh) !== -1);
        }

        private _evaluateSubMesh(subMesh: SubMesh, mesh: AbstractMesh): void {
            if (mesh.subMeshes.length === 1 || subMesh.isInFrustum(this._frustumPlanes)) {
                var material = subMesh.getMaterial();

                if (mesh.showSubMeshesBoundingBox) {
                    this._boundingBoxRenderer.renderList.push(subMesh.getBoundingInfo().boundingBox);
                }

                if (material) {
                    // Render targets
                    if (material.getRenderTargetTextures) {
                        if (this._processedMaterials.indexOf(material) === -1) {
                            this._processedMaterials.push(material);

                            this._renderTargets.concat(material.getRenderTargetTextures());
                        }
                    }

                    // Dispatch
                    this._activeVertices += subMesh.indexCount;
                    this._renderingManager.dispatch(subMesh);
                }
            }
        }

        private _evaluateActiveMeshes(): void {
            this.activeCamera._activeMeshes.reset();
            this._activeMeshes.reset();
            this._renderingManager.reset();
            this._processedMaterials.reset();
            this._activeParticleSystems.reset();
            this._activeSkeletons.reset();
            this._boundingBoxRenderer.reset();

            if (!this._frustumPlanes) {
                this._frustumPlanes = Frustum.GetPlanes(this._transformMatrix);
            } else {
                Frustum.GetPlanesToRef(this._transformMatrix, this._frustumPlanes);
            }

            // Meshes
            var meshes: AbstractMesh[];
            var len: number;

            if (this._selectionOctree) { // Octree
                var selection = this._selectionOctree.select(this._frustumPlanes);
                meshes = selection.data;
                len = selection.length;
            } else { // Full scene traversal
                len = this.meshes.length;
                meshes = this.meshes;
            }

            for (var meshIndex = 0; meshIndex < len; meshIndex++) {
                var mesh = meshes[meshIndex];

                if (mesh.isBlocked) {
                    continue;
                }

                this._totalVertices += mesh.getTotalVertices();

                if (!mesh.isReady()) {
                    continue;
                }

                mesh.computeWorldMatrix();

                // Intersections
                if (mesh.actionManager && mesh.actionManager.hasSpecificTriggers([ActionManager.OnIntersectionEnterTrigger, ActionManager.OnIntersectionExitTrigger])) {
                    this._meshesForIntersections.pushNoDuplicate(mesh);
                }

                // Switch to current LOD
                var meshLOD = mesh.getLOD(this.activeCamera);

                if (!meshLOD) {
                    continue;
                }

                mesh._preActivate();

                if (mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0 && ((mesh.layerMask & this.activeCamera.layerMask) !== 0) && mesh.isInFrustum(this._frustumPlanes)) {
                    this._activeMeshes.push(mesh);
                    this.activeCamera._activeMeshes.push(mesh);
                    mesh._activate(this._renderId);

                    this._activeMesh(meshLOD);
                }
            }

            // Particle systems
            var beforeParticlesDate = Tools.Now;
            if (this.particlesEnabled) {
                Tools.StartPerformanceCounter("Particles", this.particleSystems.length > 0);
                for (var particleIndex = 0; particleIndex < this.particleSystems.length; particleIndex++) {
                    var particleSystem = this.particleSystems[particleIndex];

                    if (!particleSystem.isStarted()) {
                        continue;
                    }

                    if (!particleSystem.emitter.position || (particleSystem.emitter && particleSystem.emitter.isEnabled())) {
                        this._activeParticleSystems.push(particleSystem);
                        particleSystem.animate();
                    }
                }
                Tools.EndPerformanceCounter("Particles", this.particleSystems.length > 0);
            }
            this._particlesDuration += Tools.Now - beforeParticlesDate;
        }

        private _activeMesh(mesh: AbstractMesh): void {
            if (mesh.skeleton && this.skeletonsEnabled) {
                this._activeSkeletons.pushNoDuplicate(mesh.skeleton);
            }

            if (mesh.showBoundingBox || this.forceShowBoundingBoxes) {
                this._boundingBoxRenderer.renderList.push(mesh.getBoundingInfo().boundingBox);
            }

            if (mesh && mesh.subMeshes) {
                // Submeshes Octrees
                var len: number;
                var subMeshes: SubMesh[];

                if (mesh._submeshesOctree && mesh.useOctreeForRenderingSelection) {
                    var intersections = mesh._submeshesOctree.select(this._frustumPlanes);

                    len = intersections.length;
                    subMeshes = intersections.data;
                } else {
                    subMeshes = mesh.subMeshes;
                    len = subMeshes.length;
                }

                for (var subIndex = 0; subIndex < len; subIndex++) {
                    var subMesh = subMeshes[subIndex];

                    this._evaluateSubMesh(subMesh, mesh);
                }
            }
        }

        public updateTransformMatrix(force?: boolean): void {
            this.setTransformMatrix(this.activeCamera.getViewMatrix(), this.activeCamera.getProjectionMatrix(force));
        }

        private _renderForCamera(camera: Camera): void {
            var engine = this._engine;

            this.activeCamera = camera;

            if (!this.activeCamera)
                throw new Error("Active camera not set");

            Tools.StartPerformanceCounter("Rendering camera " + this.activeCamera.name);

            // Viewport
            engine.setViewport(this.activeCamera.viewport);

            // Camera
            this._renderId++;
            this.updateTransformMatrix();

            if (this.beforeCameraRender) {
                this.beforeCameraRender(this.activeCamera);
            }

            // Meshes
            var beforeEvaluateActiveMeshesDate = Tools.Now;
            Tools.StartPerformanceCounter("Active meshes evaluation");
            this._evaluateActiveMeshes();
            this._evaluateActiveMeshesDuration += Tools.Now - beforeEvaluateActiveMeshesDate;
            Tools.EndPerformanceCounter("Active meshes evaluation");

            // Skeletons
            for (var skeletonIndex = 0; skeletonIndex < this._activeSkeletons.length; skeletonIndex++) {
                var skeleton = this._activeSkeletons.data[skeletonIndex];

                skeleton.prepare();
            }

            // Render targets
            var beforeRenderTargetDate = Tools.Now;
            if (this.renderTargetsEnabled) {
                Tools.StartPerformanceCounter("Render targets", this._renderTargets.length > 0);
                for (var renderIndex = 0; renderIndex < this._renderTargets.length; renderIndex++) {
                    var renderTarget = this._renderTargets.data[renderIndex];
                    if (renderTarget._shouldRender()) {
                        this._renderId++;
                        renderTarget.render();
                    }
                }
                Tools.EndPerformanceCounter("Render targets", this._renderTargets.length > 0);
                this._renderId++;
            }

            if (this._renderTargets.length > 0) { // Restore back buffer
                engine.restoreDefaultFramebuffer();
            }
            this._renderTargetsDuration += Tools.Now - beforeRenderTargetDate;

            // Prepare Frame
            this.postProcessManager._prepareFrame();

            var beforeRenderDate = Tools.Now;
            // Backgrounds
            if (this.layers.length) {
                engine.setDepthBuffer(false);
                var layerIndex;
                var layer;
                for (layerIndex = 0; layerIndex < this.layers.length; layerIndex++) {
                    layer = this.layers[layerIndex];
                    if (layer.isBackground) {
                        layer.render();
                    }
                }
                engine.setDepthBuffer(true);
            }

            // Render
            Tools.StartPerformanceCounter("Main render");
            this._renderingManager.render(null, null, true, true);
            Tools.EndPerformanceCounter("Main render");

            // Bounding boxes
            this._boundingBoxRenderer.render();

            // Lens flares
            if (this.lensFlaresEnabled) {
                Tools.StartPerformanceCounter("Lens flares", this.lensFlareSystems.length > 0);
                for (var lensFlareSystemIndex = 0; lensFlareSystemIndex < this.lensFlareSystems.length; lensFlareSystemIndex++) {
                    this.lensFlareSystems[lensFlareSystemIndex].render();
                }
                Tools.EndPerformanceCounter("Lens flares", this.lensFlareSystems.length > 0);
            }

            // Foregrounds
            if (this.layers.length) {
                engine.setDepthBuffer(false);
                for (layerIndex = 0; layerIndex < this.layers.length; layerIndex++) {
                    layer = this.layers[layerIndex];
                    if (!layer.isBackground) {
                        layer.render();
                    }
                }
                engine.setDepthBuffer(true);
            }

            this._renderDuration += Tools.Now - beforeRenderDate;

            // Finalize frame
            this.postProcessManager._finalizeFrame(camera.isIntermediate);

            // Update camera
            this.activeCamera._updateFromScene();

            // Reset some special arrays
            this._renderTargets.reset();

            if (this.afterCameraRender) {
                this.afterCameraRender(this.activeCamera);
            }

            Tools.EndPerformanceCounter("Rendering camera " + this.activeCamera.name);
        }

        private _processSubCameras(camera: Camera): void {
            if (camera.subCameras.length === 0) {
                this._renderForCamera(camera);
                return;
            }

            // Sub-cameras
            for (var index = 0; index < camera.subCameras.length; index++) {
                this._renderForCamera(camera.subCameras[index]);
            }

            this.activeCamera = camera;
            this.setTransformMatrix(this.activeCamera.getViewMatrix(), this.activeCamera.getProjectionMatrix());

            // Update camera
            this.activeCamera._updateFromScene();
        }

        private _checkIntersections(): void {
            for (var index = 0; index < this._meshesForIntersections.length; index++) {
                var sourceMesh = this._meshesForIntersections.data[index];

                for (var actionIndex = 0; actionIndex < sourceMesh.actionManager.actions.length; actionIndex++) {
                    var action = sourceMesh.actionManager.actions[actionIndex];

                    if (action.trigger === ActionManager.OnIntersectionEnterTrigger || action.trigger === ActionManager.OnIntersectionExitTrigger) {
                        var parameters = action.getTriggerParameter();
                        var otherMesh = parameters instanceof AbstractMesh ? parameters : parameters.mesh;

                        var areIntersecting = otherMesh.intersectsMesh(sourceMesh, parameters.usePreciseIntersection);
                        var currentIntersectionInProgress = sourceMesh._intersectionsInProgress.indexOf(otherMesh);

                        if (areIntersecting && currentIntersectionInProgress === -1) {
                            if (action.trigger === ActionManager.OnIntersectionEnterTrigger) {
                                action._executeCurrent(ActionEvent.CreateNew(sourceMesh));
                                sourceMesh._intersectionsInProgress.push(otherMesh);
                            } else if (action.trigger === ActionManager.OnIntersectionExitTrigger) {
                                sourceMesh._intersectionsInProgress.push(otherMesh);
                            }
                        } else if (!areIntersecting && currentIntersectionInProgress > -1 && action.trigger === ActionManager.OnIntersectionExitTrigger) {
                            action._executeCurrent(ActionEvent.CreateNew(sourceMesh));

                            var indexOfOther = sourceMesh._intersectionsInProgress.indexOf(otherMesh);

                            if (indexOfOther > -1) {
                                sourceMesh._intersectionsInProgress.splice(indexOfOther, 1);
                            }
                        }
                    }
                }
            }
        }

        public render(): void {
            var startDate = Tools.Now;
            this._particlesDuration = 0;
            this._spritesDuration = 0;
            this._activeParticles = 0;
            this._renderDuration = 0;
            this._renderTargetsDuration = 0;
            this._evaluateActiveMeshesDuration = 0;
            this._totalVertices = 0;
            this._activeVertices = 0;
            this._activeBones = 0;
            this.getEngine().resetDrawCalls();
            this._meshesForIntersections.reset();
            this.resetCachedMaterial();

            Tools.StartPerformanceCounter("Scene rendering");

            // Actions
            if (this.actionManager) {
                this.actionManager.processTrigger(ActionManager.OnEveryFrameTrigger, null);
            }

            // Before render
            if (this.beforeRender) {
                this.beforeRender();
            }

            for (var callbackIndex = 0; callbackIndex < this._onBeforeRenderCallbacks.length; callbackIndex++) {
                this._onBeforeRenderCallbacks[callbackIndex]();
            }

            // Animations
            var deltaTime = Math.max(Scene.MinDeltaTime, Math.min(this._engine.getDeltaTime(), Scene.MaxDeltaTime));
            this._animationRatio = deltaTime * (60.0 / 1000.0);
            this._animate();

            // Physics
            if (this._physicsEngine) {
                Tools.StartPerformanceCounter("Physics");
                this._physicsEngine._runOneStep(deltaTime / 1000.0);
                Tools.EndPerformanceCounter("Physics");
            }

            // Customs render targets
            var beforeRenderTargetDate = Tools.Now;
            var engine = this.getEngine();
            var currentActiveCamera = this.activeCamera;
            if (this.renderTargetsEnabled) {
                Tools.StartPerformanceCounter("Custom render targets", this.customRenderTargets.length > 0);
                for (var customIndex = 0; customIndex < this.customRenderTargets.length; customIndex++) {
                    var renderTarget = this.customRenderTargets[customIndex];
                    if (renderTarget._shouldRender()) {
                        this._renderId++;

                        this.activeCamera = renderTarget.activeCamera || this.activeCamera;

                        if (!this.activeCamera)
                            throw new Error("Active camera not set");

                        // Viewport
                        engine.setViewport(this.activeCamera.viewport);

                        // Camera
                        this.updateTransformMatrix();

                        renderTarget.render();
                    }
                }
                Tools.EndPerformanceCounter("Custom render targets", this.customRenderTargets.length > 0);

                this._renderId++;
            }

            if (this.customRenderTargets.length > 0) { // Restore back buffer
                engine.restoreDefaultFramebuffer();
            }
            this._renderTargetsDuration += Tools.Now - beforeRenderTargetDate;
            this.activeCamera = currentActiveCamera;

            // Procedural textures
            if (this.proceduralTexturesEnabled) {
                Tools.StartPerformanceCounter("Procedural textures", this._proceduralTextures.length > 0);
                for (var proceduralIndex = 0; proceduralIndex < this._proceduralTextures.length; proceduralIndex++) {
                    var proceduralTexture = this._proceduralTextures[proceduralIndex];
                    if (proceduralTexture._shouldRender()) {
                        proceduralTexture.render();
                    }
                }
                Tools.EndPerformanceCounter("Procedural textures", this._proceduralTextures.length > 0);
            }

            // Clear
            this._engine.clear(this.clearColor, this.autoClear || this.forceWireframe || this.forcePointsCloud, true);

            // Shadows
            if (this.shadowsEnabled) {
                for (var lightIndex = 0; lightIndex < this.lights.length; lightIndex++) {
                    var light = this.lights[lightIndex];
                    var shadowGenerator = light.getShadowGenerator();

                    if (light.isEnabled() && shadowGenerator && shadowGenerator.getShadowMap().getScene().textures.indexOf(shadowGenerator.getShadowMap()) !== -1) {
                        this._renderTargets.push(shadowGenerator.getShadowMap());
                    }
                }
            }

            // Depth renderer
            if (this._depthRenderer) {
                this._renderTargets.push(this._depthRenderer.getDepthMap());
            }

            // RenderPipeline
            this.postProcessRenderPipelineManager.update();

            // Multi-cameras?
            if (this.activeCameras.length > 0) {
                var currentRenderId = this._renderId;
                for (var cameraIndex = 0; cameraIndex < this.activeCameras.length; cameraIndex++) {
                    this._renderId = currentRenderId;
                    this._processSubCameras(this.activeCameras[cameraIndex]);
                }
            } else {
                if (!this.activeCamera) {
                    throw new Error("No camera defined");
                }

                this._processSubCameras(this.activeCamera);
            }

            // Intersection checks
            this._checkIntersections();

            // Update the audio listener attached to the camera
            this._updateAudioParameters();

            // After render
            if (this.afterRender) {
                this.afterRender();
            }

            for (callbackIndex = 0; callbackIndex < this._onAfterRenderCallbacks.length; callbackIndex++) {
                this._onAfterRenderCallbacks[callbackIndex]();
            }

            // Cleaning
            for (var index = 0; index < this._toBeDisposed.length; index++) {
                this._toBeDisposed.data[index].dispose();
                this._toBeDisposed[index] = null;
            }

            this._toBeDisposed.reset();


            Tools.EndPerformanceCounter("Scene rendering");
            this._lastFrameDuration = Tools.Now - startDate;
        }

        private _updateAudioParameters() {
            var listeningCamera: Camera;
            var audioEngine = Engine.audioEngine;

            if (this.activeCameras.length > 0) {
                listeningCamera = this.activeCameras[0];
            } else {
                listeningCamera = this.activeCamera;
            }

            if (listeningCamera && audioEngine.canUseWebAudio) {
                audioEngine.audioContext.listener.setPosition(listeningCamera.position.x, listeningCamera.position.y, listeningCamera.position.z);
                var mat = Matrix.Invert(listeningCamera.getViewMatrix());
                var cameraDirection = Vector3.TransformNormal(new Vector3(0, 0, -1), mat);
                cameraDirection.normalize();
                audioEngine.audioContext.listener.setOrientation(cameraDirection.x, cameraDirection.y, cameraDirection.z, 0, 1, 0);
                for (var i = 0; i < this.mainSoundTrack.soundCollection.length; i++) {
                    var sound = this.mainSoundTrack.soundCollection[i];
                    if (sound.useCustomAttenuation) {
                        sound.updateDistanceFromListener();
                    }
                }
                for (i = 0; i < this.soundTracks.length; i++) {
                    for (var j = 0; j < this.soundTracks[i].soundCollection.length; j++) {
                        sound = this.soundTracks[i].soundCollection[j];
                        if (sound.useCustomAttenuation) {
                            sound.updateDistanceFromListener();
                        }
                    }
                }
            }
        }

        public enableDepthRenderer(): DepthRenderer {
            if (this._depthRenderer) {
                return this._depthRenderer;
            }

            this._depthRenderer = new DepthRenderer(this);

            return this._depthRenderer;
        }

        public disableDepthRenderer(): void {
            if (!this._depthRenderer) {
                return;
            }

            this._depthRenderer.dispose();
            this._depthRenderer = null;
        }

        public dispose(): void {
            this.beforeRender = null;
            this.afterRender = null;

            this.skeletons = [];

            this._boundingBoxRenderer.dispose();

            if (this._depthRenderer) {
                this._depthRenderer.dispose();
            }

            // Debug layer
            this.debugLayer.hide();

            // Events
            if (this.onDispose) {
                this.onDispose();
            }

            this._onBeforeRenderCallbacks = [];
            this._onAfterRenderCallbacks = [];

            this.detachControl();

            // Release sounds & sounds tracks
            this.mainSoundTrack.dispose();

            for (var scIndex = 0; scIndex < this.soundTracks.length; scIndex++) {
                this.soundTracks[scIndex].dispose();
            }

            // Detach cameras
            var canvas = this._engine.getRenderingCanvas();
            var index;
            for (index = 0; index < this.cameras.length; index++) {
                this.cameras[index].detachControl(canvas);
            }

            // Release lights
            while (this.lights.length) {
                this.lights[0].dispose();
            }

            // Release meshes
            while (this.meshes.length) {
                this.meshes[0].dispose(true);
            }

            // Release cameras
            while (this.cameras.length) {
                this.cameras[0].dispose();
            }

            // Release materials
            while (this.materials.length) {
                this.materials[0].dispose();
            }

            // Release particles
            while (this.particleSystems.length) {
                this.particleSystems[0].dispose();
            }

            // Release sprites
            while (this.spriteManagers.length) {
                this.spriteManagers[0].dispose();
            }

            // Release layers
            while (this.layers.length) {
                this.layers[0].dispose();
            }

            // Release textures
            while (this.textures.length) {
                this.textures[0].dispose();
            }

            // Post-processes
            this.postProcessManager.dispose();

            // Physics
            if (this._physicsEngine) {
                this.disablePhysicsEngine();
            }

            // Remove from engine
            index = this._engine.scenes.indexOf(this);

            if (index > -1) {
                this._engine.scenes.splice(index, 1);
            }

            this._engine.wipeCaches();
        }

        // Collisions
        public _getNewPosition(position: Vector3, velocity: Vector3, collider: Collider, maximumRetry: number, finalPosition: Vector3, excludedMesh: AbstractMesh = null): void {
            position.divideToRef(collider.radius, this._scaledPosition);
            velocity.divideToRef(collider.radius, this._scaledVelocity);

            collider.retry = 0;
            collider.initialVelocity = this._scaledVelocity;
            collider.initialPosition = this._scaledPosition;
            this._collideWithWorld(this._scaledPosition, this._scaledVelocity, collider, maximumRetry, finalPosition, excludedMesh);

            finalPosition.multiplyInPlace(collider.radius);
        }

        private _collideWithWorld(position: Vector3, velocity: Vector3, collider: Collider, maximumRetry: number, finalPosition: Vector3, excludedMesh: AbstractMesh = null): void {
            var closeDistance = Engine.CollisionsEpsilon * 10.0;

            if (collider.retry >= maximumRetry) {
                finalPosition.copyFrom(position);
                return;
            }

            collider._initialize(position, velocity, closeDistance);

            // Check all meshes
            for (var index = 0; index < this.meshes.length; index++) {
                var mesh = this.meshes[index];
                if (mesh.isEnabled() && mesh.checkCollisions && mesh.subMeshes && mesh !== excludedMesh) {
                    mesh._checkCollision(collider);
                }
            }

            if (!collider.collisionFound) {
                position.addToRef(velocity, finalPosition);
                return;
            }

            if (velocity.x !== 0 || velocity.y !== 0 || velocity.z !== 0) {
                collider._getResponse(position, velocity);
            }

            if (velocity.length() <= closeDistance) {
                finalPosition.copyFrom(position);
                return;
            }

            collider.retry++;
            this._collideWithWorld(position, velocity, collider, maximumRetry, finalPosition, excludedMesh);
        }

        // Octrees
        public getWorldExtends(): { min: Vector3; max: Vector3 } {
            var min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
            var max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
            for (var index = 0; index < this.meshes.length; index++) {
                var mesh = this.meshes[index];

                mesh.computeWorldMatrix(true);
                var minBox = mesh.getBoundingInfo().boundingBox.minimumWorld;
                var maxBox = mesh.getBoundingInfo().boundingBox.maximumWorld;

                Tools.CheckExtends(minBox, min, max);
                Tools.CheckExtends(maxBox, min, max);
            }

            return {
                min: min,
                max: max
            };
        }

        public createOrUpdateSelectionOctree(maxCapacity = 64, maxDepth = 2): Octree<AbstractMesh> {
            if (!this._selectionOctree) {
                this._selectionOctree = new Octree<AbstractMesh>(Octree.CreationFuncForMeshes, maxCapacity, maxDepth);
            }

            var worldExtends = this.getWorldExtends();

            // Update octree
            this._selectionOctree.update(worldExtends.min, worldExtends.max, this.meshes);

            return this._selectionOctree;
        }

        // Picking
        public createPickingRay(x: number, y: number, world: Matrix, camera: Camera): Ray {
            var engine = this._engine;

            if (!camera) {
                if (!this.activeCamera)
                    throw new Error("Active camera not set");

                camera = this.activeCamera;
            }

            var cameraViewport = camera.viewport;
            var viewport = cameraViewport.toGlobal(engine);

            // Moving coordinates to local viewport world
            x = x / this._engine.getHardwareScalingLevel() - viewport.x;
            y = y / this._engine.getHardwareScalingLevel() - (this._engine.getRenderHeight() - viewport.y - viewport.height);
            return Ray.CreateNew(x, y, viewport.width, viewport.height, world ? world : Matrix.Identity(), camera.getViewMatrix(), camera.getProjectionMatrix());
            //       return BABYLON.Ray.CreateNew(x / window.devicePixelRatio, y / window.devicePixelRatio, viewport.width, viewport.height, world ? world : BABYLON.Matrix.Identity(), camera.getViewMatrix(), camera.getProjectionMatrix());
        }

        private _internalPick(rayFunction: (world: Matrix) => Ray, predicate: (mesh: AbstractMesh) => boolean, fastCheck?: boolean): PickingInfo {
            var pickingInfo = null;

            for (var meshIndex = 0; meshIndex < this.meshes.length; meshIndex++) {
                var mesh = this.meshes[meshIndex];

                if (predicate) {
                    if (!predicate(mesh)) {
                        continue;
                    }
                } else if (!mesh.isEnabled() || !mesh.isVisible || !mesh.isPickable) {
                    continue;
                }

                var world = mesh.getWorldMatrix();
                var ray = rayFunction(world);

                var result = mesh.intersects(ray, fastCheck);
                if (!result || !result.hit)
                    continue;

                if (!fastCheck && pickingInfo != null && result.distance >= pickingInfo.distance)
                    continue;

                pickingInfo = result;

                if (fastCheck) {
                    break;
                }
            }

            return pickingInfo || new PickingInfo();
        }

        public pick(x: number, y: number, predicate?: (mesh: AbstractMesh) => boolean, fastCheck?: boolean, camera?: Camera): PickingInfo {
            /// <summary>Launch a ray to try to pick a mesh in the scene</summary>
            /// <param name="x">X position on screen</param>
            /// <param name="y">Y position on screen</param>
            /// <param name="predicate">Predicate function used to determine eligible meshes. Can be set to null. In this case, a mesh must be enabled, visible and with isPickable set to true</param>
            /// <param name="fastCheck">Launch a fast check only using the bounding boxes. Can be set to null.</param>
            /// <param name="camera">camera to use for computing the picking ray. Can be set to null. In this case, the scene.activeCamera will be used</param>
            return this._internalPick(world => this.createPickingRay(x, y, world, camera), predicate, fastCheck);
        }

        public pickWithRay(ray: Ray, predicate: (mesh: Mesh) => boolean, fastCheck?: boolean) {
            return this._internalPick(world => {
                if (!this._pickWithRayInverseMatrix) {
                    this._pickWithRayInverseMatrix = Matrix.Identity();
                }
                world.invertToRef(this._pickWithRayInverseMatrix);
                return Ray.Transform(ray, this._pickWithRayInverseMatrix);
            }, predicate, fastCheck);
        }

        public setPointerOverMesh(mesh: AbstractMesh): void {
            if (this._pointerOverMesh === mesh) {
                return;
            }

            if (this._pointerOverMesh && this._pointerOverMesh.actionManager) {
                this._pointerOverMesh.actionManager.processTrigger(ActionManager.OnPointerOutTrigger, ActionEvent.CreateNew(this._pointerOverMesh));
            }

            this._pointerOverMesh = mesh;
            if (this._pointerOverMesh && this._pointerOverMesh.actionManager) {
                this._pointerOverMesh.actionManager.processTrigger(ActionManager.OnPointerOverTrigger, ActionEvent.CreateNew(this._pointerOverMesh));
            }
        }

        public getPointerOverMesh(): AbstractMesh {
            return this._pointerOverMesh;
        }

        // Physics
        public getPhysicsEngine(): PhysicsEngine {
            return this._physicsEngine;
        }

        public enablePhysics(gravity: Vector3, plugin?: IPhysicsEnginePlugin): boolean {
            if (this._physicsEngine) {
                return true;
            }

            this._physicsEngine = new PhysicsEngine(plugin);

            if (!this._physicsEngine.isSupported()) {
                this._physicsEngine = null;
                return false;
            }

            this._physicsEngine._initialize(gravity);

            return true;
        }

        public disablePhysicsEngine(): void {
            if (!this._physicsEngine) {
                return;
            }

            this._physicsEngine.dispose();
            this._physicsEngine = undefined;
        }

        public isPhysicsEnabled(): boolean {
            return this._physicsEngine !== undefined;
        }

        public setGravity(gravity: Vector3): void {
            if (!this._physicsEngine) {
                return;
            }

            this._physicsEngine._setGravity(gravity);
        }

        public createCompoundImpostor(parts: any, options: PhysicsBodyCreationOptions): any {
            if (parts.parts) { // Old API
                options = parts;
                parts = parts.parts;
            }

            if (!this._physicsEngine) {
                return null;
            }

            for (var index = 0; index < parts.length; index++) {
                var mesh = parts[index].mesh;

                mesh._physicImpostor = parts[index].impostor;
                mesh._physicsMass = options.mass / parts.length;
                mesh._physicsFriction = options.friction;
                mesh._physicRestitution = options.restitution;
            }

            return this._physicsEngine._registerMeshesAsCompound(parts, options);
        }

        public deleteCompoundImpostor(compound: any): void {
            for (var index = 0; index < compound.parts.length; index++) {
                var mesh = compound.parts[index].mesh;
                mesh._physicImpostor = PhysicsEngine.NoImpostor;
                this._physicsEngine._unregisterMesh(mesh);
            }
        }

        // Misc.
        public createDefaultCameraOrLight() {
            // Light
            if (this.lights.length === 0) {
                new HemisphericLight("default light", Vector3.Up(), this);
            }

            // Camera
            if (!this.activeCamera) {
                var camera = new FreeCamera("default camera", Vector3.Zero(), this);

                // Compute position
                var worldExtends = this.getWorldExtends();
                var worldCenter = worldExtends.min.add(worldExtends.max.subtract(worldExtends.min).scale(0.5));

                camera.position = new Vector3(worldCenter.x, worldCenter.y, worldExtends.min.z - (worldExtends.max.z - worldExtends.min.z));
                camera.setTarget(worldCenter);

                this.activeCamera = camera;
            }
        }

        // Tags
        private _getByTags(list: any[], tagsQuery: string, forEach?: (item: any) => void): any[] {
            if (tagsQuery === undefined) {
                // returns the complete list (could be done with BABYLON.Tags.MatchesQuery but no need to have a for-loop here)
                return list;
            }

            var listByTags = [];

            forEach = forEach || ((item: any) => { return; });

            for (var i in list) {
                var item = list[i];
                if (Tags.MatchesQuery(item, tagsQuery)) {
                    listByTags.push(item);
                    forEach(item);
                }
            }

            return listByTags;
        }

        public getMeshesByTags(tagsQuery: string, forEach?: (mesh: AbstractMesh) => void): Mesh[] {
            return this._getByTags(this.meshes, tagsQuery, forEach);
        }

        public getCamerasByTags(tagsQuery: string, forEach?: (camera: Camera) => void): Camera[] {
            return this._getByTags(this.cameras, tagsQuery, forEach);
        }

        public getLightsByTags(tagsQuery: string, forEach?: (light: Light) => void): Light[] {
            return this._getByTags(this.lights, tagsQuery, forEach);
        }

        public getMaterialByTags(tagsQuery: string, forEach?: (material: Material) => void): Material[] {
            return this._getByTags(this.materials, tagsQuery, forEach).concat(this._getByTags(this.multiMaterials, tagsQuery, forEach));
        }
    }
} 