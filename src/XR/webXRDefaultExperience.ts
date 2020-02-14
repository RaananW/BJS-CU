import { WebXRExperienceHelper } from "./webXRExperienceHelper";
import { Scene } from '../scene';
import { WebXRInput, IWebXRInputOptions } from './webXRInput';
import { WebXRControllerPointerSelection } from './features/WebXRControllerPointerSelection';
import { WebXRRenderTarget } from './webXRTypes';
import { WebXREnterExitUI, WebXREnterExitUIOptions } from './webXREnterExitUI';
import { AbstractMesh } from '../Meshes/abstractMesh';
import { WebXRManagedOutputCanvasOptions } from './webXRManagedOutputCanvas';
import { WebXRMotionControllerTeleportation } from './features/WebXRControllerTeleportation';
import { Logger } from '../Misc/logger';

/**
 * Options for the default xr helper
 */
export class WebXRDefaultExperienceOptions {
    /**
     * Enable or disable default UI to enter XR
     */
    public disableDefaultUI?: boolean;
    /**
     * Should teleportation not initialize. defaults to false.
     */
    public disableTeleportation?: boolean;
    /**
     * Floor meshes that will be used for teleport
     */
    public floorMeshes?: Array<AbstractMesh>;
    /**
     * If set to true, the first frame will not be used to reset position
     * The first frame is mainly used when copying transformation from the old camera
     * Mainly used in AR
     */
    public ignoreNativeCameraTransformation?: boolean;
    /**
     * Disable the controller mesh-loading. Can be used if you want to load your own meshes
     */
    public inputOptions?: IWebXRInputOptions;
    /**
     * optional configuration for the output canvas
     */
    public outputCanvasOptions?: WebXRManagedOutputCanvasOptions;
    /**
     * optional UI options. This can be used among other to change session mode and reference space type
     */
    public uiOptions?: WebXREnterExitUIOptions;
    /**
     * When loading teleportation and pointer select, use stable versions instead of latest.
     */
    public useStablePlugins?: boolean;
}

/**
 * Default experience which provides a similar setup to the previous webVRExperience
 */
export class WebXRDefaultExperience {
    /**
     * Base experience
     */
    public baseExperience: WebXRExperienceHelper;
    /**
     * Enables ui for entering/exiting xr
     */
    public enterExitUI: WebXREnterExitUI;
    /**
     * Input experience extension
     */
    public input: WebXRInput;
    /**
     * Enables laser pointer and selection
     */
    public pointerSelection: WebXRControllerPointerSelection;
    /**
     * Default target xr should render to
     */
    public renderTarget: WebXRRenderTarget;
    /**
     * Enables teleportation
     */
    public teleportation: WebXRMotionControllerTeleportation;

    private constructor() {
    }

    /**
     * Creates the default xr experience
     * @param scene scene
     * @param options options for basic configuration
     * @returns resulting WebXRDefaultExperience
     */
    public static CreateAsync(scene: Scene, options: WebXRDefaultExperienceOptions = {}) {
        var result = new WebXRDefaultExperience();

        // Create base experience
        return WebXRExperienceHelper.CreateAsync(scene).then((xrHelper) => {
            result.baseExperience = xrHelper;

            if (options.ignoreNativeCameraTransformation) {
                result.baseExperience.camera.compensateOnFirstFrame = false;
            }

            // Add controller support
            result.input = new WebXRInput(xrHelper.sessionManager, xrHelper.camera, options.inputOptions);
            result.pointerSelection = <WebXRControllerPointerSelection>result.baseExperience.featuresManager.enableFeature(WebXRControllerPointerSelection.Name, options.useStablePlugins ? "stable" : "latest", {
                xrInput: result.input
            });

            // Add default teleportation, including rotation
            if (!options.disableTeleportation) {
                result.teleportation = <WebXRMotionControllerTeleportation>result.baseExperience.featuresManager.enableFeature(WebXRMotionControllerTeleportation.Name, options.useStablePlugins ? "stable" : "latest", {
                    floorMeshes: options.floorMeshes,
                    xrInput: result.input
                });
                result.teleportation.setSelectionFeature(result.pointerSelection);
            }

            // Create the WebXR output target
            result.renderTarget = result.baseExperience.sessionManager.getWebXRRenderTarget(options.outputCanvasOptions);

            if (!options.disableDefaultUI) {
                if (options.uiOptions) {
                    options.uiOptions.renderTarget = options.uiOptions.renderTarget || result.renderTarget;
                }
                // Create ui for entering/exiting xr
                return WebXREnterExitUI.CreateAsync(scene, result.baseExperience, options.uiOptions || { renderTarget: result.renderTarget }).then((ui) => {
                    result.enterExitUI = ui;
                });
            } else {
                return;
            }
        }).then(() => {
            return result;
        }).catch((error) => {
            Logger.Error("Error initializing XR");
            Logger.Error(error);
            return result;
        });
    }

    /**
     * DIsposes of the experience helper
     */
    public dispose() {
        if (this.baseExperience) {
            this.baseExperience.dispose();
        }
        if (this.input) {
            this.input.dispose();
        }
        if (this.enterExitUI) {
            this.enterExitUI.dispose();
        }
        if (this.renderTarget) {
            this.renderTarget.dispose();
        }
    }
}