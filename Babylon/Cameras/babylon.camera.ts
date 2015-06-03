﻿module BABYLON {

    export class VRCameraMetrics {
        public hResolution: number;
        public vResolution: number;
        public hScreenSize: number;
        public vScreenSize: number;
        public vScreenCenter: number;
        public eyeToScreenDistance: number;
        public lensSeparationDistance: number;
        public interpupillaryDistance: number;
        public distortionK: number[];
        public chromaAbCorrection: number[];
        public postProcessScaleFactor: number;
        public lensCenterOffset: number;
        public compensateDistorsion = true;

        public get aspectRatio(): number {
            return this.hResolution / (2 * this.vResolution);
        }

        public get aspectRatioFov(): number {
            return (2 * Math.atan((this.postProcessScaleFactor * this.vScreenSize) / (2 * this.eyeToScreenDistance)));
        }

        public get leftHMatrix(): Matrix {
            var meters = (this.hScreenSize / 4) - (this.lensSeparationDistance / 2);
            var h = (4 * meters) / this.hScreenSize;

            return Matrix.Translation(h, 0, 0);
        }

        public get rightHMatrix(): Matrix {
            var meters = (this.hScreenSize / 4) - (this.lensSeparationDistance / 2);
            var h = (4 * meters) / this.hScreenSize;

            return Matrix.Translation(-h, 0, 0);
        }

        public get leftPreViewMatrix(): Matrix {
            return Matrix.Translation(0.5 * this.interpupillaryDistance, 0, 0);
        }

        public get rightPreViewMatrix(): Matrix {
            return Matrix.Translation(-0.5 * this.interpupillaryDistance, 0, 0);
        }

        public static GetDefault(): VRCameraMetrics {
            var result = new VRCameraMetrics();

            result.hResolution = 1280;
            result.vResolution = 800;
            result.hScreenSize = 0.149759993;
            result.vScreenSize = 0.0935999975;
            result.vScreenCenter = 0.0467999987,
            result.eyeToScreenDistance = 0.0410000011;
            result.lensSeparationDistance = 0.0635000020;
            result.interpupillaryDistance = 0.0640000030;
            result.distortionK = [1.0, 0.219999999, 0.239999995, 0.0];
            result.chromaAbCorrection = [0.995999992, -0.00400000019, 1.01400006, 0.0];
            result.postProcessScaleFactor = 1.714605507808412;
            result.lensCenterOffset = 0.151976421;

            return result;
        }
    }

    export class Camera extends Node {
        // Statics
        private static _PERSPECTIVE_CAMERA = 0;
        private static _ORTHOGRAPHIC_CAMERA = 1;

        private static _FOVMODE_VERTICAL_FIXED = 0;
        private static _FOVMODE_HORIZONTAL_FIXED = 1;

        private static _SUB_CAMERA_MODE_NONE = 0;
        private static _SUB_CAMERA_MODE_ANAGLYPH = 1;
        private static _SUB_CAMERA_MODE_HORIZONTAL_STEREOSCOPIC = 2;
        private static _SUB_CAMERA_MODE_VERTICAL_STEREOSCOPIC = 3;
        private static _SUB_CAMERA_MODE_VR = 4;

        private static _SUB_CAMERAID_A = 0;
        private static _SUB_CAMERAID_B = 1;

        public static get PERSPECTIVE_CAMERA(): number {
            return Camera._PERSPECTIVE_CAMERA;
        }

        public static get ORTHOGRAPHIC_CAMERA(): number {
            return Camera._ORTHOGRAPHIC_CAMERA;
        }

        public static get FOVMODE_VERTICAL_FIXED(): number {
            return Camera._FOVMODE_VERTICAL_FIXED;
        }

        public static get FOVMODE_HORIZONTAL_FIXED(): number {
            return Camera._FOVMODE_HORIZONTAL_FIXED;
        }

        public static get SUB_CAMERA_MODE_NONE(): number {
            return Camera._SUB_CAMERA_MODE_NONE;
        }

        public static get SUB_CAMERA_MODE_ANAGLYPH(): number {
            return Camera._SUB_CAMERA_MODE_ANAGLYPH;
        }

        public static get SUB_CAMERA_MODE_HORIZONTAL_STEREOSCOPIC(): number {
            return Camera._SUB_CAMERA_MODE_HORIZONTAL_STEREOSCOPIC;
        }

        public static get SUB_CAMERA_MODE_VERTICAL_STEREOSCOPIC(): number {
            return Camera._SUB_CAMERA_MODE_VERTICAL_STEREOSCOPIC;
        }

        public static get SUB_CAMERA_MODE_VR(): number {
            return Camera._SUB_CAMERA_MODE_VR;
        }

        public static get SUB_CAMERAID_A(): number {
            return Camera._SUB_CAMERAID_A;
        }

        public static get SUB_CAMERAID_B(): number {
            return Camera._SUB_CAMERAID_B;
        }
        
        // Members
        public upVector = Vector3.Up();
        public orthoLeft = null;
        public orthoRight = null;
        public orthoBottom = null;
        public orthoTop = null;
        public fov = 0.8;
        public minZ = 1.0;
        public maxZ = 10000.0;
        public inertia = 0.9;
        public mode = Camera.PERSPECTIVE_CAMERA;
        public isIntermediate = false;
        public viewport = new Viewport(0, 0, 1.0, 1.0);
        public layerMask: number = 0x0FFFFFFF;
        public fovMode: number = Camera.FOVMODE_VERTICAL_FIXED;
   
        // Subcamera members
        public subCameras = new Array<Camera>();
        public _subCameraMode = Camera.SUB_CAMERA_MODE_NONE;
        public _subCamHalfSpace: number;

        // VR related
        private _vrMetrics: VRCameraMetrics;
        private _vrHMatrix: Matrix;
        public _vrPreViewMatrix: Matrix;
        public _vrWorkMatrix: Matrix;
        public _vrActualUp: Vector3;

        // Cache
        private _computedViewMatrix = Matrix.Identity();
        public _projectionMatrix = new Matrix();
        private _worldMatrix: Matrix;
        public _postProcesses = new Array<PostProcess>();
        public _postProcessesTakenIndices = [];

        public _activeMeshes = new SmartArray<Mesh>(256);

        private _globalPosition = Vector3.Zero();

        constructor(name: string, public position: Vector3, scene: Scene) {
            super(name, scene);

            scene.addCamera(this);

            if (!scene.activeCamera) {
                scene.activeCamera = this;
            }
        }

        public get globalPosition(): Vector3 {
            return this._globalPosition;
        }

        public getActiveMeshes(): SmartArray<Mesh> {
            return this._activeMeshes;
        }

        public isActiveMesh(mesh: Mesh): boolean {
            return (this._activeMeshes.indexOf(mesh) !== -1);
        }

        //Cache
        public _initCache() {
            super._initCache();

            this._cache.position = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
            this._cache.upVector = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);

            this._cache.mode = undefined;
            this._cache.minZ = undefined;
            this._cache.maxZ = undefined;

            this._cache.fov = undefined;
            this._cache.aspectRatio = undefined;

            this._cache.orthoLeft = undefined;
            this._cache.orthoRight = undefined;
            this._cache.orthoBottom = undefined;
            this._cache.orthoTop = undefined;
            this._cache.renderWidth = undefined;
            this._cache.renderHeight = undefined;
        }

        public _updateCache(ignoreParentClass?: boolean): void {
            if (!ignoreParentClass) {
                super._updateCache();
            }

            var engine = this.getEngine();

            this._cache.position.copyFrom(this.position);
            this._cache.upVector.copyFrom(this.upVector);

            this._cache.mode = this.mode;
            this._cache.minZ = this.minZ;
            this._cache.maxZ = this.maxZ;

            this._cache.fov = this.fov;
            this._cache.aspectRatio = engine.getAspectRatio(this);

            this._cache.orthoLeft = this.orthoLeft;
            this._cache.orthoRight = this.orthoRight;
            this._cache.orthoBottom = this.orthoBottom;
            this._cache.orthoTop = this.orthoTop;
            this._cache.renderWidth = engine.getRenderWidth();
            this._cache.renderHeight = engine.getRenderHeight();
        }

        public _updateFromScene(): void {
            this.updateCache();
            this._update();
        }

        // Synchronized
        public _isSynchronized(): boolean {
            return this._isSynchronizedViewMatrix() && this._isSynchronizedProjectionMatrix();
        }

        public _isSynchronizedViewMatrix(): boolean {
            if (!super._isSynchronized())
                return false;

            return this._cache.position.equals(this.position)
                && this._cache.upVector.equals(this.upVector)
                && this.isSynchronizedWithParent();
        }

        public _isSynchronizedProjectionMatrix(): boolean {
            var check = this._cache.mode === this.mode
                && this._cache.minZ === this.minZ
                && this._cache.maxZ === this.maxZ;

            if (!check) {
                return false;
            }

            var engine = this.getEngine();

            if (this.mode === Camera.PERSPECTIVE_CAMERA) {
                check = this._cache.fov === this.fov
                && this._cache.aspectRatio === engine.getAspectRatio(this);
            }
            else {
                check = this._cache.orthoLeft === this.orthoLeft
                && this._cache.orthoRight === this.orthoRight
                && this._cache.orthoBottom === this.orthoBottom
                && this._cache.orthoTop === this.orthoTop
                && this._cache.renderWidth === engine.getRenderWidth()
                && this._cache.renderHeight === engine.getRenderHeight();
            }

            return check;
        }

        // Controls
        public attachControl(element: HTMLElement): void {
        }

        public detachControl(element: HTMLElement): void {
        }

        public _update(): void {
            this._checkInputs();
            if (this._subCameraMode !== Camera.SUB_CAMERA_MODE_NONE) {
                this._updateSubCameras();
            }
        }

        public _checkInputs(): void {
        }

        public attachPostProcess(postProcess: PostProcess, insertAt: number = null): number {
            if (!postProcess.isReusable() && this._postProcesses.indexOf(postProcess) > -1) {
                Tools.Error("You're trying to reuse a post process not defined as reusable.");
                return 0;
            }

            if (insertAt == null || insertAt < 0) {
                this._postProcesses.push(postProcess);
                this._postProcessesTakenIndices.push(this._postProcesses.length - 1);

                return this._postProcesses.length - 1;
            }

            var add = 0;

            if (this._postProcesses[insertAt]) {

                var start = this._postProcesses.length - 1;


                for (var i = start; i >= insertAt + 1; --i) {
                    this._postProcesses[i + 1] = this._postProcesses[i];
                }

                add = 1;
            }

            for (i = 0; i < this._postProcessesTakenIndices.length; ++i) {
                if (this._postProcessesTakenIndices[i] < insertAt) {
                    continue;
                }

                start = this._postProcessesTakenIndices.length - 1;
                for (var j = start; j >= i; --j) {
                    this._postProcessesTakenIndices[j + 1] = this._postProcessesTakenIndices[j] + add;
                }
                this._postProcessesTakenIndices[i] = insertAt;
                break;
            }

            if (!add && this._postProcessesTakenIndices.indexOf(insertAt) == -1) {
                this._postProcessesTakenIndices.push(insertAt);
            }

            var result = insertAt + add;

            this._postProcesses[result] = postProcess;

            return result;
        }

        public detachPostProcess(postProcess: PostProcess, atIndices: any = null): number[] {
            var result = [];

            if (!atIndices) {

                var length = this._postProcesses.length;

                for (var i = 0; i < length; i++) {

                    if (this._postProcesses[i] !== postProcess) {
                        continue;
                    }

                    delete this._postProcesses[i];

                    var index = this._postProcessesTakenIndices.indexOf(i);
                    this._postProcessesTakenIndices.splice(index, 1);
                }

            }
            else {
                atIndices = (atIndices instanceof Array) ? atIndices : [atIndices];
                for (i = 0; i < atIndices.length; i++) {
                    var foundPostProcess = this._postProcesses[atIndices[i]];

                    if (foundPostProcess !== postProcess) {
                        result.push(i);
                        continue;
                    }

                    delete this._postProcesses[atIndices[i]];

                    index = this._postProcessesTakenIndices.indexOf(atIndices[i]);
                    this._postProcessesTakenIndices.splice(index, 1);
                }
            }
            return result;
        }

        public getWorldMatrix(): Matrix {
            if (!this._worldMatrix) {
                this._worldMatrix = Matrix.Identity();
            }

            var viewMatrix = this.getViewMatrix();

            viewMatrix.invertToRef(this._worldMatrix);

            return this._worldMatrix;
        }

        public _getViewMatrix(): Matrix {
            return Matrix.Identity();
        }

        public getViewMatrix(force?: boolean): Matrix {
            this._computedViewMatrix = this._computeViewMatrix(force);

            if (!force && this._isSynchronizedViewMatrix()) {
                return this._computedViewMatrix;
            }

            if (!this.parent || !this.parent.getWorldMatrix) {
                this._globalPosition.copyFrom(this.position);
            } else {
                if (!this._worldMatrix) {
                    this._worldMatrix = Matrix.Identity();
                }

                this._computedViewMatrix.invertToRef(this._worldMatrix);

                this._worldMatrix.multiplyToRef(this.parent.getWorldMatrix(), this._computedViewMatrix);
                this._globalPosition.copyFromFloats(this._computedViewMatrix.m[12], this._computedViewMatrix.m[13], this._computedViewMatrix.m[14]);

                this._computedViewMatrix.invert();

                this._markSyncedWithParent();
            }

            this._currentRenderId = this.getScene().getRenderId();

            return this._computedViewMatrix;
        }

        public _computeViewMatrix(force?: boolean): Matrix {
            if (!force && this._isSynchronizedViewMatrix()) {
                return this._computedViewMatrix;
            }

            this._computedViewMatrix = this._getViewMatrix();
            this._currentRenderId = this.getScene().getRenderId();

            return this._computedViewMatrix;
        }

        public getProjectionMatrix(force?: boolean): Matrix {
            if (!force && this._isSynchronizedProjectionMatrix()) {
                return this._projectionMatrix;
            }

            var engine = this.getEngine();
            if (this.mode === Camera.PERSPECTIVE_CAMERA) {
                if (this.minZ <= 0) {
                    this.minZ = 0.1;
                }

                Matrix.PerspectiveFovLHToRef(this.fov, engine.getAspectRatio(this), this.minZ, this.maxZ, this._projectionMatrix, this.fovMode);
                return this._projectionMatrix;
            }

            var halfWidth = engine.getRenderWidth() / 2.0;
            var halfHeight = engine.getRenderHeight() / 2.0;
            Matrix.OrthoOffCenterLHToRef(this.orthoLeft || -halfWidth, this.orthoRight || halfWidth, this.orthoBottom || -halfHeight, this.orthoTop || halfHeight, this.minZ, this.maxZ, this._projectionMatrix);
            return this._projectionMatrix;
        }

        public dispose(): void {
            // Remove from scene
            this.getScene().removeCamera(this);
            while (this.subCameras.length > 0) {
                this.subCameras.pop().dispose();
            }                    

            // Postprocesses
            for (var i = 0; i < this._postProcessesTakenIndices.length; ++i) {
                this._postProcesses[this._postProcessesTakenIndices[i]].dispose(this);
            }
        }
        
        // ---- 3D cameras section ----
        public setSubCameraMode(mode: number, halfSpace = 0, metrics?: VRCameraMetrics): void {
            while (this.subCameras.length > 0) {
                this.subCameras.pop().dispose();
            }
            this._subCameraMode = mode;
            this._subCamHalfSpace = Tools.ToRadians(halfSpace);

            var camA = this.getSubCamera(this.name + "_A", true);
            var camB = this.getSubCamera(this.name + "_B", false);
            var postProcessA: PostProcess;
            var postProcessB: PostProcess;

            switch (this._subCameraMode) {
                case Camera.SUB_CAMERA_MODE_ANAGLYPH:
                    postProcessA = new PassPostProcess(this.name + "_leftTexture", 1.0, camA);
                    camA.isIntermediate = true;

                    postProcessB = new AnaglyphPostProcess(this.name + "_anaglyph", 1.0, camB);
                    postProcessB.onApply = effect => {
                        effect.setTextureFromPostProcess("leftSampler", postProcessA);
                    };
                    break;

                case Camera.SUB_CAMERA_MODE_HORIZONTAL_STEREOSCOPIC:
                case Camera.SUB_CAMERA_MODE_VERTICAL_STEREOSCOPIC:
                    var isStereoscopicHoriz = this._subCameraMode === Camera.SUB_CAMERA_MODE_HORIZONTAL_STEREOSCOPIC;
                    postProcessA = new PassPostProcess("passthru", 1.0, camA);
                    camA.isIntermediate = true;

                    postProcessB = new StereoscopicInterlacePostProcess("st_interlace", camB, postProcessA, isStereoscopicHoriz);
                    break;

                case Camera.SUB_CAMERA_MODE_VR:
                    metrics = metrics || VRCameraMetrics.GetDefault();
                    camA._vrMetrics = metrics;
                    camA.viewport = new Viewport(0, 0, 0.5, 1.0);
                    camA._vrWorkMatrix = new Matrix();

                    camA._vrHMatrix = metrics.leftHMatrix;
                    camA._vrPreViewMatrix = metrics.leftPreViewMatrix;
                    camA.getProjectionMatrix = camA._getVRProjectionMatrix;

                    if (metrics.compensateDistorsion) {
                        postProcessA = new VRDistortionCorrectionPostProcess("Distortion Compensation Left", camA, false, metrics);
                    }

                    camB._vrMetrics = camA._vrMetrics;
                    camB.viewport = new Viewport(0.5, 0, 0.5, 1.0);
                    camB._vrWorkMatrix = new Matrix();
                    camB._vrHMatrix = metrics.rightHMatrix;
                    camB._vrPreViewMatrix = metrics.rightPreViewMatrix;

                    camB.getProjectionMatrix = camB._getVRProjectionMatrix;

                    if (metrics.compensateDistorsion) {
                        postProcessB = new VRDistortionCorrectionPostProcess("Distortion Compensation Right", camB, true, metrics);
                    }
            }
            if (this._subCameraMode !== Camera.SUB_CAMERA_MODE_NONE) {
                this.subCameras.push(camA);
                this.subCameras.push(camB);
            }
            this._update();
        }

        private _getVRProjectionMatrix(): Matrix {
            Matrix.PerspectiveFovLHToRef(this._vrMetrics.aspectRatioFov, this._vrMetrics.aspectRatio, this.minZ, this.maxZ, this._vrWorkMatrix);
            this._vrWorkMatrix.multiplyToRef(this._vrHMatrix, this._projectionMatrix);
            return this._projectionMatrix;
        }

        public setSubCamHalfSpace(halfSpace: number) {
            this._subCamHalfSpace = Tools.ToRadians(halfSpace);
        }
        
        /**
         * May needs to be overridden by children so sub has required properties to be copied
         */
        public getSubCamera(name: string, isA: boolean): Camera {
            return null;
        }
        
        /**
         * May needs to be overridden by children
         */
        public _updateSubCameras() {
            var camA = this.subCameras[Camera.SUB_CAMERAID_A];
            var camB = this.subCameras[Camera.SUB_CAMERAID_B];
            camA.minZ = camB.minZ = this.minZ;
            camA.maxZ = camB.maxZ = this.maxZ;
            camA.fov = camB.fov = this.fov;
            
            // only update viewport, when ANAGLYPH
            if (this._subCameraMode === Camera.SUB_CAMERA_MODE_ANAGLYPH) {
                camA.viewport = camB.viewport = this.viewport;
            }
        }
    }
}