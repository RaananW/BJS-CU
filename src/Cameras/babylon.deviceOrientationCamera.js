var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    // We're mainly based on the logic defined into the FreeCamera code
    var DeviceOrientationCamera = (function (_super) {
        __extends(DeviceOrientationCamera, _super);
        //         private _offsetX: number = null;
        //         private _offsetY: number = null;
        //         private _orientationGamma: number = 0;
        //         private _orientationBeta: number = 0;
        //         private _initialOrientationGamma: number = 0;
        //         private _initialOrientationBeta: number = 0;
        //         private _attachedCanvas: HTMLCanvasElement;
        //         private _orientationChanged: (e: DeviceOrientationEvent) => any;
        // 
        //         @serialize()
        //         public angularSensibility: number = 10000.0;
        // 
        //         @serialize()
        //         public moveSensibility: number = 50.0;
        function DeviceOrientationCamera(name, position, scene) {
            _super.call(this, name, position, scene);
            this.inputs.addDeviceOrientation();
            // window.addEventListener("resize", () => {
            //     this._initialOrientationGamma = null;
            // }, false);
        }
        //         public attachControl(canvas: HTMLCanvasElement, noPreventDefault: boolean): void {
        //             if (this._attachedCanvas) {
        //                 return;
        //             }
        //             this._attachedCanvas = canvas;
        // 
        //             if (!this._orientationChanged) {
        //                 this._orientationChanged = (evt) => {
        // 
        //                     if (!this._initialOrientationGamma) {
        //                             this._initialOrientationGamma = evt.gamma;
        //                             this._initialOrientationBeta = evt.beta;
        //                     }
        // 
        //                     this._orientationGamma = evt.gamma;
        //                     this._orientationBeta = evt.beta;
        //  
        //                     this._offsetY = (this._initialOrientationBeta - this._orientationBeta);
        //                     this._offsetX = (this._initialOrientationGamma - this._orientationGamma);
        //                 };
        //             }
        // 
        //             window.addEventListener("deviceorientation", this._orientationChanged);
        //         }
        // 
        //         public detachControl(canvas: HTMLCanvasElement): void {
        //             if (this._attachedCanvas !== canvas) {
        //                 return;
        //             }
        // 
        //             window.removeEventListener("deviceorientation", this._orientationChanged);
        // 
        //             this._attachedCanvas = null;
        //             this._orientationGamma = 0;
        //             this._orientationBeta = 0;
        //             this._initialOrientationGamma = 0;
        //             this._initialOrientationBeta = 0;
        //         }
        // 
        //         public _checkInputs(): void {
        //             if (!this._offsetX) {
        //                 return;
        //             }
        //             this.cameraRotation.y -= this._offsetX / this.angularSensibility;
        // 
        //             var speed = this._computeLocalCameraSpeed();
        //             var direction = new Vector3(0, 0, speed * this._offsetY / this.moveSensibility);
        // 
        //             Matrix.RotationYawPitchRollToRef(this.rotation.y, this.rotation.x, 0, this._cameraRotationMatrix);
        //             this.cameraDirection.addInPlace(Vector3.TransformCoordinates(direction, this._cameraRotationMatrix));
        // 
        //             super._checkInputs();
        //         }
        DeviceOrientationCamera.prototype.getTypeName = function () {
            return "DeviceOrientationCamera";
        };
        return DeviceOrientationCamera;
    }(BABYLON.FreeCamera));
    BABYLON.DeviceOrientationCamera = DeviceOrientationCamera;
})(BABYLON || (BABYLON = {}));
