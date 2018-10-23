    /**
     * Default Inputs manager for the ArcRotateCamera.
     * It groups all the default supported inputs for ease of use.
     * @see http://doc.babylonjs.com/how_to/customizing_camera_inputs
     */
    export class ArcRotateCameraInputsManager extends CameraInputsManager<ArcRotateCamera> {
        /**
         * Instantiates a new ArcRotateCameraInputsManager.
         * @param camera Defines the camera the inputs belong to
         */
        constructor(camera: ArcRotateCamera) {
            super(camera);
        }

        /**
         * Add mouse wheel input support to the input manager.
         * @returns the current input manager
         */
        public addMouseWheel(): ArcRotateCameraInputsManager {
            this.add(new ArcRotateCameraMouseWheelInput());
            return this;
        }

        /**
         * Add pointers input support to the input manager.
         * @returns the current input manager
         */
        public addPointers(): ArcRotateCameraInputsManager {
            this.add(new ArcRotateCameraPointersInput());
            return this;
        }

        /**
         * Add keyboard input support to the input manager.
         * @returns the current input manager
         */
        public addKeyboard(): ArcRotateCameraInputsManager {
            this.add(new ArcRotateCameraKeyboardMoveInput());
            return this;
        }

        /**
         * Add orientation input support to the input manager.
         * @returns the current input manager
         */
        public addVRDeviceOrientation(): ArcRotateCameraInputsManager {
            this.add(new ArcRotateCameraVRDeviceOrientationInput());
            return this;
        }
    }
