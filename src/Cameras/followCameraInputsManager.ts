import { CameraInputsManager } from "./cameraInputsManager";
import { FollowCamera } from "./followCamera";
import { FollowCameraKeyboardMoveInput } from './Inputs/followCameraKeyboardMoveInput';

    /**
     * Default Inputs manager for the FollowCamera.
     * It groups all the default supported inputs for ease of use.
     * @see http://doc.babylonjs.com/how_to/customizing_camera_inputs
     */
    export class FollowCameraInputsManager extends CameraInputsManager<FollowCamera> {
        /**
         * Instantiates a new FollowCameraInputsManager.
         * @param camera Defines the camera the inputs belong to
         */
        constructor(camera: FollowCamera) {
            super(camera);
        }

        /**
         * Add keyboard input support to the input manager.
         * @returns the current input manager
         */
        public addKeyboard(): FollowCameraInputsManager {
            this.add(new FollowCameraKeyboardMoveInput());
            return this;
        }

        /**
         * Add mouse wheel input support to the input manager.
         * @returns the current input manager
         */
        public addMouseWheel(): FollowCameraInputsManager {
            console.warn("MouseWheel support not yet implemented for FollowCamera.");
            return this;
        }

        /**
         * Add pointers input support to the input manager.
         * @returns the current input manager
         */
        public addPointers(): FollowCameraInputsManager {
            console.warn("Pointer support not yet implemented for FollowCamera.");
            return this;
        }

        /**
         * Add orientation input support to the input manager.
         * @returns the current input manager
         */
        public addVRDeviceOrientation(): FollowCameraInputsManager {
            console.warn("DeviceOrientation support not yet implemented for FollowCamera.");
            return this;
        }
    }
