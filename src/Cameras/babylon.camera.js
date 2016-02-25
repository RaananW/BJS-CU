var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var Camera = (function (_super) {
        __extends(Camera, _super);
        function Camera(name, position, scene) {
            _super.call(this, name, scene);
            this.upVector = BABYLON.Vector3.Up();
            this.orthoLeft = null;
            this.orthoRight = null;
            this.orthoBottom = null;
            this.orthoTop = null;
            this.fov = 0.8;
            this.minZ = 1.0;
            this.maxZ = 10000.0;
            this.inertia = 0.9;
            this.mode = Camera.PERSPECTIVE_CAMERA;
            this.isIntermediate = false;
            this.viewport = new BABYLON.Viewport(0, 0, 1.0, 1.0);
            this.layerMask = 0x0FFFFFFF;
            this.fovMode = Camera.FOVMODE_VERTICAL_FIXED;
            // Camera rig members
            this.cameraRigMode = Camera.RIG_MODE_NONE;
            this._rigCameras = new Array();
            // Cache
            this._computedViewMatrix = BABYLON.Matrix.Identity();
            this._projectionMatrix = new BABYLON.Matrix();
            this._postProcesses = new Array();
            this._postProcessesTakenIndices = [];
            this._activeMeshes = new BABYLON.SmartArray(256);
            this._globalPosition = BABYLON.Vector3.Zero();
            scene.addCamera(this);
            if (!scene.activeCamera) {
                scene.activeCamera = this;
            }
            this.position = position;
        }
        Object.defineProperty(Camera, "PERSPECTIVE_CAMERA", {
            get: function () {
                return Camera._PERSPECTIVE_CAMERA;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Camera, "ORTHOGRAPHIC_CAMERA", {
            get: function () {
                return Camera._ORTHOGRAPHIC_CAMERA;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Camera, "FOVMODE_VERTICAL_FIXED", {
            get: function () {
                return Camera._FOVMODE_VERTICAL_FIXED;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Camera, "FOVMODE_HORIZONTAL_FIXED", {
            get: function () {
                return Camera._FOVMODE_HORIZONTAL_FIXED;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Camera, "RIG_MODE_NONE", {
            get: function () {
                return Camera._RIG_MODE_NONE;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Camera, "RIG_MODE_STEREOSCOPIC_ANAGLYPH", {
            get: function () {
                return Camera._RIG_MODE_STEREOSCOPIC_ANAGLYPH;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Camera, "RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_PARALLEL", {
            get: function () {
                return Camera._RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_PARALLEL;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Camera, "RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_CROSSEYED", {
            get: function () {
                return Camera._RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_CROSSEYED;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Camera, "RIG_MODE_STEREOSCOPIC_OVERUNDER", {
            get: function () {
                return Camera._RIG_MODE_STEREOSCOPIC_OVERUNDER;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Camera, "RIG_MODE_VR", {
            get: function () {
                return Camera._RIG_MODE_VR;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Camera.prototype, "globalPosition", {
            get: function () {
                return this._globalPosition;
            },
            enumerable: true,
            configurable: true
        });
        Camera.prototype.getActiveMeshes = function () {
            return this._activeMeshes;
        };
        Camera.prototype.isActiveMesh = function (mesh) {
            return (this._activeMeshes.indexOf(mesh) !== -1);
        };
        //Cache
        Camera.prototype._initCache = function () {
            _super.prototype._initCache.call(this);
            this._cache.position = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
            this._cache.upVector = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
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
        };
        Camera.prototype._updateCache = function (ignoreParentClass) {
            if (!ignoreParentClass) {
                _super.prototype._updateCache.call(this);
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
        };
        Camera.prototype._updateFromScene = function () {
            this.updateCache();
            this._update();
        };
        // Synchronized
        Camera.prototype._isSynchronized = function () {
            return this._isSynchronizedViewMatrix() && this._isSynchronizedProjectionMatrix();
        };
        Camera.prototype._isSynchronizedViewMatrix = function () {
            if (!_super.prototype._isSynchronized.call(this))
                return false;
            return this._cache.position.equals(this.position)
                && this._cache.upVector.equals(this.upVector)
                && this.isSynchronizedWithParent();
        };
        Camera.prototype._isSynchronizedProjectionMatrix = function () {
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
        };
        // Controls
        Camera.prototype.attachControl = function (element, noPreventDefault) {
        };
        Camera.prototype.detachControl = function (element) {
        };
        Camera.prototype._update = function () {
            if (this.cameraRigMode !== Camera.RIG_MODE_NONE) {
                this._updateRigCameras();
            }
            this._checkInputs();
        };
        Camera.prototype._checkInputs = function () {
        };
        Camera.prototype.attachPostProcess = function (postProcess, insertAt) {
            if (insertAt === void 0) { insertAt = null; }
            if (!postProcess.isReusable() && this._postProcesses.indexOf(postProcess) > -1) {
                BABYLON.Tools.Error("You're trying to reuse a post process not defined as reusable.");
                return 0;
            }
            if (insertAt == null || insertAt < 0) {
                this._postProcesses.push(postProcess);
                this._postProcessesTakenIndices.push(this._postProcesses.length - 1);
                return this._postProcesses.length - 1;
            }
            var add = 0;
            var i;
            var start;
            if (this._postProcesses[insertAt]) {
                start = this._postProcesses.length - 1;
                for (i = start; i >= insertAt + 1; --i) {
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
            if (!add && this._postProcessesTakenIndices.indexOf(insertAt) === -1) {
                this._postProcessesTakenIndices.push(insertAt);
            }
            var result = insertAt + add;
            this._postProcesses[result] = postProcess;
            return result;
        };
        Camera.prototype.detachPostProcess = function (postProcess, atIndices) {
            if (atIndices === void 0) { atIndices = null; }
            var result = [];
            var i;
            var index;
            if (!atIndices) {
                var length = this._postProcesses.length;
                for (i = 0; i < length; i++) {
                    if (this._postProcesses[i] !== postProcess) {
                        continue;
                    }
                    delete this._postProcesses[i];
                    index = this._postProcessesTakenIndices.indexOf(i);
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
        };
        Camera.prototype.getWorldMatrix = function () {
            if (!this._worldMatrix) {
                this._worldMatrix = BABYLON.Matrix.Identity();
            }
            var viewMatrix = this.getViewMatrix();
            viewMatrix.invertToRef(this._worldMatrix);
            return this._worldMatrix;
        };
        Camera.prototype._getViewMatrix = function () {
            return BABYLON.Matrix.Identity();
        };
        Camera.prototype.getViewMatrix = function (force) {
            this._computedViewMatrix = this._computeViewMatrix(force);
            if (!force && this._isSynchronizedViewMatrix()) {
                return this._computedViewMatrix;
            }
            if (!this.parent || !this.parent.getWorldMatrix) {
                this._globalPosition.copyFrom(this.position);
            }
            else {
                if (!this._worldMatrix) {
                    this._worldMatrix = BABYLON.Matrix.Identity();
                }
                this._computedViewMatrix.invertToRef(this._worldMatrix);
                this._worldMatrix.multiplyToRef(this.parent.getWorldMatrix(), this._computedViewMatrix);
                this._globalPosition.copyFromFloats(this._computedViewMatrix.m[12], this._computedViewMatrix.m[13], this._computedViewMatrix.m[14]);
                this._computedViewMatrix.invert();
                this._markSyncedWithParent();
            }
            this._currentRenderId = this.getScene().getRenderId();
            return this._computedViewMatrix;
        };
        Camera.prototype._computeViewMatrix = function (force) {
            if (!force && this._isSynchronizedViewMatrix()) {
                return this._computedViewMatrix;
            }
            this._computedViewMatrix = this._getViewMatrix();
            this._currentRenderId = this.getScene().getRenderId();
            return this._computedViewMatrix;
        };
        Camera.prototype.getProjectionMatrix = function (force) {
            if (!force && this._isSynchronizedProjectionMatrix()) {
                return this._projectionMatrix;
            }
            var engine = this.getEngine();
            if (this.mode === Camera.PERSPECTIVE_CAMERA) {
                if (this.minZ <= 0) {
                    this.minZ = 0.1;
                }
                BABYLON.Matrix.PerspectiveFovLHToRef(this.fov, engine.getAspectRatio(this), this.minZ, this.maxZ, this._projectionMatrix, this.fovMode);
                return this._projectionMatrix;
            }
            var halfWidth = engine.getRenderWidth() / 2.0;
            var halfHeight = engine.getRenderHeight() / 2.0;
            BABYLON.Matrix.OrthoOffCenterLHToRef(this.orthoLeft || -halfWidth, this.orthoRight || halfWidth, this.orthoBottom || -halfHeight, this.orthoTop || halfHeight, this.minZ, this.maxZ, this._projectionMatrix);
            return this._projectionMatrix;
        };
        Camera.prototype.dispose = function () {
            // Animations
            this.getScene().stopAnimation(this);
            // Remove from scene
            this.getScene().removeCamera(this);
            while (this._rigCameras.length > 0) {
                this._rigCameras.pop().dispose();
            }
            // Postprocesses
            for (var i = 0; i < this._postProcessesTakenIndices.length; ++i) {
                this._postProcesses[this._postProcessesTakenIndices[i]].dispose(this);
            }
        };
        // ---- Camera rigs section ----
        Camera.prototype.setCameraRigMode = function (mode, rigParams) {
            while (this._rigCameras.length > 0) {
                this._rigCameras.pop().dispose();
            }
            this.cameraRigMode = mode;
            this._cameraRigParams = {};
            switch (this.cameraRigMode) {
                case Camera.RIG_MODE_STEREOSCOPIC_ANAGLYPH:
                case Camera.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_PARALLEL:
                case Camera.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_CROSSEYED:
                case Camera.RIG_MODE_STEREOSCOPIC_OVERUNDER:
                    this._cameraRigParams.interaxialDistance = rigParams.interaxialDistance || 0.0637;
                    //we have to implement stereo camera calcultating left and right viewpoints from interaxialDistance and target, 
                    //not from a given angle as it is now, but until that complete code rewriting provisional stereoHalfAngle value is introduced
                    this._cameraRigParams.stereoHalfAngle = BABYLON.Tools.ToRadians(this._cameraRigParams.interaxialDistance / 0.0637);
                    this._rigCameras.push(this.createRigCamera(this.name + "_L", 0));
                    this._rigCameras.push(this.createRigCamera(this.name + "_R", 1));
                    break;
            }
            var postProcesses = new Array();
            switch (this.cameraRigMode) {
                case Camera.RIG_MODE_STEREOSCOPIC_ANAGLYPH:
                    postProcesses.push(new BABYLON.PassPostProcess(this.name + "_passthru", 1.0, this._rigCameras[0]));
                    this._rigCameras[0].isIntermediate = true;
                    postProcesses.push(new BABYLON.AnaglyphPostProcess(this.name + "_anaglyph", 1.0, this._rigCameras[1]));
                    postProcesses[1].onApply = function (effect) {
                        effect.setTextureFromPostProcess("leftSampler", postProcesses[0]);
                    };
                    break;
                case Camera.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_PARALLEL:
                case Camera.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_CROSSEYED:
                case Camera.RIG_MODE_STEREOSCOPIC_OVERUNDER:
                    var isStereoscopicHoriz = (this.cameraRigMode === Camera.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_PARALLEL || this.cameraRigMode === Camera.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_CROSSEYED);
                    var firstCamIndex = (this.cameraRigMode === Camera.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_CROSSEYED) ? 1 : 0;
                    var secondCamIndex = 1 - firstCamIndex;
                    postProcesses.push(new BABYLON.PassPostProcess(this.name + "_passthru", 1.0, this._rigCameras[firstCamIndex]));
                    this._rigCameras[firstCamIndex].isIntermediate = true;
                    postProcesses.push(new BABYLON.StereoscopicInterlacePostProcess(this.name + "_stereoInterlace", this._rigCameras[secondCamIndex], postProcesses[0], isStereoscopicHoriz));
                    break;
                case Camera.RIG_MODE_VR:
                    this._rigCameras.push(this.createRigCamera(this.name + "_L", 0));
                    this._rigCameras.push(this.createRigCamera(this.name + "_R", 1));
                    var metrics = rigParams.vrCameraMetrics || BABYLON.VRCameraMetrics.GetDefault();
                    this._rigCameras[0]._cameraRigParams.vrMetrics = metrics;
                    this._rigCameras[0].viewport = new BABYLON.Viewport(0, 0, 0.5, 1.0);
                    this._rigCameras[0]._cameraRigParams.vrWorkMatrix = new BABYLON.Matrix();
                    this._rigCameras[0]._cameraRigParams.vrHMatrix = metrics.leftHMatrix;
                    this._rigCameras[0]._cameraRigParams.vrPreViewMatrix = metrics.leftPreViewMatrix;
                    this._rigCameras[0].getProjectionMatrix = this._rigCameras[0]._getVRProjectionMatrix;
                    if (metrics.compensateDistortion) {
                        postProcesses.push(new BABYLON.VRDistortionCorrectionPostProcess("VR_Distort_Compensation_Left", this._rigCameras[0], false, metrics));
                    }
                    this._rigCameras[1]._cameraRigParams.vrMetrics = this._rigCameras[0]._cameraRigParams.vrMetrics;
                    this._rigCameras[1].viewport = new BABYLON.Viewport(0.5, 0, 0.5, 1.0);
                    this._rigCameras[1]._cameraRigParams.vrWorkMatrix = new BABYLON.Matrix();
                    this._rigCameras[1]._cameraRigParams.vrHMatrix = metrics.rightHMatrix;
                    this._rigCameras[1]._cameraRigParams.vrPreViewMatrix = metrics.rightPreViewMatrix;
                    this._rigCameras[1].getProjectionMatrix = this._rigCameras[1]._getVRProjectionMatrix;
                    if (metrics.compensateDistortion) {
                        postProcesses.push(new BABYLON.VRDistortionCorrectionPostProcess("VR_Distort_Compensation_Right", this._rigCameras[1], true, metrics));
                    }
                    break;
            }
            this._update();
        };
        Camera.prototype._getVRProjectionMatrix = function () {
            BABYLON.Matrix.PerspectiveFovLHToRef(this._cameraRigParams.vrMetrics.aspectRatioFov, this._cameraRigParams.vrMetrics.aspectRatio, this.minZ, this.maxZ, this._cameraRigParams.vrWorkMatrix);
            this._cameraRigParams.vrWorkMatrix.multiplyToRef(this._cameraRigParams.vrHMatrix, this._projectionMatrix);
            return this._projectionMatrix;
        };
        Camera.prototype.setCameraRigParameter = function (name, value) {
            this._cameraRigParams[name] = value;
            //provisionnally:
            if (name === "interaxialDistance") {
                this._cameraRigParams.stereoHalfAngle = BABYLON.Tools.ToRadians(value / 0.0637);
            }
        };
        /**
         * May needs to be overridden by children so sub has required properties to be copied
         */
        Camera.prototype.createRigCamera = function (name, cameraIndex) {
            return null;
        };
        /**
         * May needs to be overridden by children
         */
        Camera.prototype._updateRigCameras = function () {
            for (var i = 0; i < this._rigCameras.length; i++) {
                this._rigCameras[i].minZ = this.minZ;
                this._rigCameras[i].maxZ = this.maxZ;
                this._rigCameras[i].fov = this.fov;
            }
            // only update viewport when ANAGLYPH
            if (this.cameraRigMode === Camera.RIG_MODE_STEREOSCOPIC_ANAGLYPH) {
                this._rigCameras[0].viewport = this._rigCameras[1].viewport = this.viewport;
            }
        };
        Camera.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            // Type
            serializationObject.type = this.getTypeName();
            // Parent
            if (this.parent) {
                serializationObject.parentId = this.parent.id;
            }
            // Animations
            BABYLON.Animation.AppendSerializedAnimations(this, serializationObject);
            serializationObject.ranges = this.serializeAnimationRanges();
            return serializationObject;
        };
        Camera.prototype.getTypeName = function () {
            return "Camera";
        };
        Camera.prototype.clone = function (name) {
            return BABYLON.SerializationHelper.Clone(Camera.GetConstructorFromName(this.getTypeName(), name, this.getScene(), this.interaxialDistance, this.isStereoscopicSideBySide), this);
        };
        Camera.GetConstructorFromName = function (type, name, scene, interaxial_distance, isStereoscopicSideBySide) {
            if (interaxial_distance === void 0) { interaxial_distance = 0; }
            if (isStereoscopicSideBySide === void 0) { isStereoscopicSideBySide = true; }
            switch (type) {
                case "ArcRotateCamera":
                    return function () { return new BABYLON.ArcRotateCamera(name, 0, 0, 1.0, BABYLON.Vector3.Zero(), scene); };
                case "DeviceOrientationCamera":
                    return function () { return new BABYLON.DeviceOrientationCamera(name, BABYLON.Vector3.Zero(), scene); };
                case "FollowCamera":
                    return function () { return new BABYLON.FollowCamera(name, BABYLON.Vector3.Zero(), scene); };
                case "ArcFollowCamera":
                    return function () { return new BABYLON.ArcFollowCamera(name, 0, 0, 1.0, null, scene); };
                case "GamepadCamera":
                    return function () { return new BABYLON.GamepadCamera(name, BABYLON.Vector3.Zero(), scene); };
                case "TouchCamera":
                    return function () { return new BABYLON.TouchCamera(name, BABYLON.Vector3.Zero(), scene); };
                case "VirtualJoysticksCamera":
                    return function () { return new BABYLON.VirtualJoysticksCamera(name, BABYLON.Vector3.Zero(), scene); };
                case "WebVRFreeCamera":
                    return function () { return new BABYLON.WebVRFreeCamera(name, BABYLON.Vector3.Zero(), scene); };
                case "VRDeviceOrientationFreeCamera":
                    return function () { return new BABYLON.VRDeviceOrientationFreeCamera(name, BABYLON.Vector3.Zero(), scene); };
                case "AnaglyphArcRotateCamera":
                    return function () { return new BABYLON.AnaglyphArcRotateCamera(name, 0, 0, 1.0, BABYLON.Vector3.Zero(), interaxial_distance, scene); };
                case "AnaglyphFreeCamera":
                    return function () { return new BABYLON.AnaglyphFreeCamera(name, BABYLON.Vector3.Zero(), interaxial_distance, scene); };
                case "AnaglyphGamepadCamera":
                    return function () { return new BABYLON.AnaglyphGamepadCamera(name, BABYLON.Vector3.Zero(), interaxial_distance, scene); };
                case "AnaglyphUniversalCamera":
                    return function () { return new BABYLON.AnaglyphUniversalCamera(name, BABYLON.Vector3.Zero(), interaxial_distance, scene); };
                case "StereoscopicArcRotateCamera":
                    return function () { return new BABYLON.StereoscopicArcRotateCamera(name, 0, 0, 1.0, BABYLON.Vector3.Zero(), interaxial_distance, isStereoscopicSideBySide, scene); };
                case "StereoscopicFreeCamera":
                    return function () { return new BABYLON.StereoscopicFreeCamera(name, BABYLON.Vector3.Zero(), interaxial_distance, isStereoscopicSideBySide, scene); };
                case "StereoscopicGamepadCamera":
                    return function () { return new BABYLON.StereoscopicGamepadCamera(name, BABYLON.Vector3.Zero(), interaxial_distance, isStereoscopicSideBySide, scene); };
                case "StereoscopicUniversalCamera":
                    return function () { return new BABYLON.StereoscopicUniversalCamera(name, BABYLON.Vector3.Zero(), interaxial_distance, isStereoscopicSideBySide, scene); };
                case "FreeCamera":
                    return function () { return new BABYLON.UniversalCamera(name, BABYLON.Vector3.Zero(), scene); };
                default:
                    return function () { return new BABYLON.UniversalCamera(name, BABYLON.Vector3.Zero(), scene); };
            }
        };
        Camera.Parse = function (parsedCamera, scene) {
            var type = parsedCamera.type;
            var construct = Camera.GetConstructorFromName(type, parsedCamera.name, scene, parsedCamera.interaxial_distance, parsedCamera.isStereoscopicSideBySide);
            var camera = BABYLON.SerializationHelper.Parse(construct, parsedCamera, scene);
            // Parent
            if (parsedCamera.parentId) {
                camera._waitingParentId = parsedCamera.parentId;
            }
            // Target
            if (parsedCamera.target) {
                if (camera.setTarget) {
                    camera.setTarget(BABYLON.Vector3.FromArray(parsedCamera.target));
                }
            }
            // Apply 3d rig, when found
            if (parsedCamera.cameraRigMode) {
                var rigParams = (parsedCamera.interaxial_distance) ? { interaxialDistance: parsedCamera.interaxial_distance } : {};
                camera.setCameraRigMode(parsedCamera.cameraRigMode, rigParams);
            }
            // Animations
            if (parsedCamera.animations) {
                for (var animationIndex = 0; animationIndex < parsedCamera.animations.length; animationIndex++) {
                    var parsedAnimation = parsedCamera.animations[animationIndex];
                    camera.animations.push(BABYLON.Animation.Parse(parsedAnimation));
                }
                BABYLON.Node.ParseAnimationRanges(camera, parsedCamera, scene);
            }
            if (parsedCamera.autoAnimate) {
                scene.beginAnimation(camera, parsedCamera.autoAnimateFrom, parsedCamera.autoAnimateTo, parsedCamera.autoAnimateLoop, 1.0);
            }
            return camera;
        };
        // Statics
        Camera._PERSPECTIVE_CAMERA = 0;
        Camera._ORTHOGRAPHIC_CAMERA = 1;
        Camera._FOVMODE_VERTICAL_FIXED = 0;
        Camera._FOVMODE_HORIZONTAL_FIXED = 1;
        Camera._RIG_MODE_NONE = 0;
        Camera._RIG_MODE_STEREOSCOPIC_ANAGLYPH = 10;
        Camera._RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_PARALLEL = 11;
        Camera._RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_CROSSEYED = 12;
        Camera._RIG_MODE_STEREOSCOPIC_OVERUNDER = 13;
        Camera._RIG_MODE_VR = 20;
        __decorate([
            BABYLON.serializeAsVector3()
        ], Camera.prototype, "position", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "upVector", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "orthoLeft", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "orthoRight", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "orthoBottom", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "orthoTop", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "fov", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "minZ", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "maxZ", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "inertia", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "mode", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "layerMask", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "fovMode", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "cameraRigMode", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "interaxialDistance", void 0);
        __decorate([
            BABYLON.serialize()
        ], Camera.prototype, "isStereoscopicSideBySide", void 0);
        return Camera;
    })(BABYLON.Node);
    BABYLON.Camera = Camera;
})(BABYLON || (BABYLON = {}));
