module BABYLON {
    // We're mainly based on the logic defined into the FreeCamera code
    export class DeviceOrientationCamera extends FreeCamera {

        private _initialQuaternion: Quaternion;
        private _quaternionCache: Quaternion;

        constructor(name: string, position: Vector3, scene: Scene) {
            super(name, position, scene);
            this.inputs.addDeviceOrientation();
        }

        public getTypeName(): string {
            return "DeviceOrientationCamera";
        }

        public _checkInputs(): void {
            super._checkInputs();
            if (this._initialQuaternion) {
                this._quaternionCache.copyFrom(this.rotationQuaternion);
                this._initialQuaternion.multiplyToRef(this.rotationQuaternion, this.rotationQuaternion);
            }
        }

        public resetToCurrentRotation(axis: BABYLON.Axis = BABYLON.Axis.Y) {
            //can only work if this camera has a rotation quaternion already.
            if (!this.rotationQuaternion) return;

            if (!this._initialQuaternion) {
                this._initialQuaternion = new BABYLON.Quaternion();
            }

            this._initialQuaternion.copyFrom(this._quaternionCache || this.rotationQuaternion);

            ['x', 'y', 'z'].forEach((axisName) => {
                if (!axis[axisName]) {
                    this._initialQuaternion[axisName] = 0;
                } else {
                    this._initialQuaternion[axisName] *= -1;
                }
            });
            this._initialQuaternion.normalize();
        }
    }
}