﻿module BABYLON {

    var OculusRiftDevKit2013_Metric = {
        HResolution: 1280,
        VResolution: 800,
        HScreenSize: 0.149759993,
        VScreenSize: 0.0935999975,
        VScreenCenter: 0.0467999987,
        EyeToScreenDistance: 0.0410000011,
        LensSeparationDistance: 0.0635000020,
        InterpupillaryDistance: 0.0640000030,
        DistortionK: [1.0, 0.219999999, 0.239999995, 0.0],
        ChromaAbCorrection: [0.995999992, -0.00400000019, 1.01400006, 0.0],
        PostProcessScaleFactor: 1.714605507808412,
        LensCenterOffset: 0.151976421
    };

    class _OculusInnerGamepadCamera extends FreeCamera {
        private _aspectRatioAspectRatio: number;
        private _aspectRatioFov: number;
        private _hMatrix: Matrix;
        private _workMatrix = new BABYLON.Matrix();
        private _preViewMatrix: Matrix;
        private _actualUp = new BABYLON.Vector3(0, 0, 0);

        constructor(name: string, position: Vector3, scene: Scene, isLeftEye: boolean) {
            super(name, position, scene);

            // Constants
            this._aspectRatioAspectRatio = OculusRiftDevKit2013_Metric.HResolution / (2 * OculusRiftDevKit2013_Metric.VResolution);
            this._aspectRatioFov = (2 * Math.atan((OculusRiftDevKit2013_Metric.PostProcessScaleFactor * OculusRiftDevKit2013_Metric.VScreenSize) / (2 * OculusRiftDevKit2013_Metric.EyeToScreenDistance)));

            var hMeters = (OculusRiftDevKit2013_Metric.HScreenSize / 4) - (OculusRiftDevKit2013_Metric.LensSeparationDistance / 2);
            var h = (4 * hMeters) / OculusRiftDevKit2013_Metric.HScreenSize;

            this._hMatrix = BABYLON.Matrix.Translation(isLeftEye ? h : -h, 0, 0);

            this.viewport = new BABYLON.Viewport(isLeftEye ? 0 : 0.5, 0, 0.5, 1.0);

            this._preViewMatrix = BABYLON.Matrix.Translation(isLeftEye ? .5 * OculusRiftDevKit2013_Metric.InterpupillaryDistance : -.5 * OculusRiftDevKit2013_Metric.InterpupillaryDistance, 0, 0);

            // Postprocess
            var postProcess = new BABYLON.OculusDistortionCorrectionPostProcess("Oculus Distortion", this, !isLeftEye, OculusRiftDevKit2013_Metric);
        }

        public getProjectionMatrix(): Matrix {
            BABYLON.Matrix.PerspectiveFovLHToRef(this._aspectRatioFov, this._aspectRatioAspectRatio, this.minZ, this.maxZ, this._workMatrix);
            this._workMatrix.multiplyToRef(this._hMatrix, this._projectionMatrix);
            return this._projectionMatrix;
        }

        public _getViewMatrix(): Matrix {
            BABYLON.Matrix.RotationYawPitchRollToRef(this.rotation.y, this.rotation.x, this.rotation.z, this._cameraRotationMatrix);

            BABYLON.Vector3.TransformCoordinatesToRef(this._referencePoint, this._cameraRotationMatrix, this._transformedReferencePoint);
            BABYLON.Vector3.TransformNormalToRef(this.upVector, this._cameraRotationMatrix, this._actualUp);

            // Computing target and final matrix
            this.position.addToRef(this._transformedReferencePoint, this._currentTarget);

            BABYLON.Matrix.LookAtLHToRef(this.position, this._currentTarget, this._actualUp, this._workMatrix);

            this._workMatrix.multiplyToRef(this._preViewMatrix, this._viewMatrix);
            return this._viewMatrix;
        }
    }

    export class OculusGamepadCamera extends FreeCamera {
        private _leftCamera: _OculusInnerGamepadCamera;
        private _rightCamera: _OculusInnerGamepadCamera;
        private _offsetOrientation: { yaw: number; pitch: number; roll: number };
        private _deviceOrientationHandler;
        private _gamepad: BABYLON.Gamepad;
        private _gamepads: BABYLON.Gamepads;
        public angularSensibility = 200;
        public moveSensibility = 75;

        constructor(name: string, position: Vector3, scene: Scene) {
            super(name, position, scene);

            this._leftCamera = new _OculusInnerGamepadCamera(name + "_left", position.clone(), scene, true);
            this._rightCamera = new _OculusInnerGamepadCamera(name + "_right", position.clone(), scene, false);

            this.subCameras.push(this._leftCamera);
            this.subCameras.push(this._rightCamera);

            this._deviceOrientationHandler = this._onOrientationEvent.bind(this);
            this._gamepads = new BABYLON.Gamepads((gamepad: BABYLON.Gamepad) => { this._onNewGameConnected(gamepad); });
        }

        private _onNewGameConnected(gamepad: BABYLON.Gamepad) {
            // Only the first gamepad can control the camera
            if (gamepad.index === 0) {
                this._gamepad = gamepad;
            }
        }

        public _update(): void {
            this._leftCamera.position.copyFrom(this.position);
            this._rightCamera.position.copyFrom(this.position);

            this._updateCamera(this._leftCamera);
            this._updateCamera(this._rightCamera);

            super._update();
        }

        public _checkInputs(): void {
            if (!this._gamepad) {
                return;
            }

            var LSValues = this._gamepad.leftStick;
            var normalizedLX = LSValues.x / this.moveSensibility;
            var normalizedLY = LSValues.y / this.moveSensibility;
            LSValues.x = Math.abs(normalizedLX) > 0.005 ? 0 + normalizedLX : 0;
            LSValues.y = Math.abs(normalizedLY) > 0.005 ? 0 + normalizedLY : 0;

            var cameraTransform = BABYLON.Matrix.RotationYawPitchRoll(this.rotation.y, this.rotation.x, 0);
            var deltaTransform = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(LSValues.x, 0, -LSValues.y), cameraTransform);
            this.cameraDirection = this.cameraDirection.add(deltaTransform);
        }

        public _updateCamera(camera: FreeCamera): void {
            camera.minZ = this.minZ;
            camera.maxZ = this.maxZ;

            camera.rotation.x = this.rotation.x;
            camera.rotation.y = this.rotation.y;
            camera.rotation.z = this.rotation.z;
        }

        // Oculus events
        public _onOrientationEvent(evt: DeviceOrientationEvent): void {
            var yaw = evt.alpha / 180 * Math.PI;
            var pitch = evt.beta / 180 * Math.PI;
            var roll = evt.gamma / 180 * Math.PI;

            if (!this._offsetOrientation) {
                this._offsetOrientation = {
                    yaw: yaw,
                    pitch: pitch,
                    roll: roll
                };
                return;
            }
            else {
                this.rotation.y += yaw - this._offsetOrientation.yaw;
                this.rotation.x += pitch - this._offsetOrientation.pitch;
                this.rotation.z += this._offsetOrientation.roll - roll;

                this._offsetOrientation.yaw = yaw;
                this._offsetOrientation.pitch = pitch;
                this._offsetOrientation.roll = roll;
            }
        }

        public attachControl(element: HTMLElement, noPreventDefault?: boolean): void {
            super.attachControl(element, noPreventDefault);

            window.addEventListener("deviceorientation", this._deviceOrientationHandler);
        }

        public detachControl(element: HTMLElement): void {
            super.detachControl(element);

            window.removeEventListener("deviceorientation", this._deviceOrientationHandler);
        }

        public dispose(): void {
            this._gamepads.dispose();
            super.dispose();
        }
    }
} 