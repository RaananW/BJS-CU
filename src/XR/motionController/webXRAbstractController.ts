import { IDisposable, Scene } from '../../scene';
import { WebXRControllerComponent } from './webXRControllerComponent';
import { Observable } from '../../Misc/observable';
import { Logger } from '../../Misc/logger';
import { SceneLoader } from '../../Loading/sceneLoader';
import { AbstractMesh } from '../../Meshes/abstractMesh';
import { Nullable } from '../../types';
import { Quaternion, Vector3 } from '../../Maths/math.vector';
import { Mesh } from '../../Meshes/mesh';

/**
 * Handness type in xrInput profiles. These can be used to define layouts in the Layout Map.
 */
export type MotionControllerHandness = "none" | "left" | "right";
/**
 * The type of components available in motion controllers.
 * This is not the name of the component.
 */
export type MotionControllerComponentType = "trigger" | "squeeze" | "touchpad" | "thumbstick" | "button";

/**
 * The state of a controller component
 */
export type MotionControllerComponentStateType = "default" | "touched" | "pressed";

/**
 * The schema of motion controller layout.
 * No object will be initialized using this interface
 * This is used just to define the profile.
 */
export interface IMotionControllerLayout {
    /**
     * Defines the main button component id
     */
    selectComponentId: string;
    /**
     * Available components (unsorted)
     */
    components: {
        /**
         * A map of component Ids
         */
        [componentId: string]: {
            /**
             * The type of input the component outputs
             */
            type: MotionControllerComponentType;
            /**
             * The indices of this component in the gamepad object
             */
            gamepadIndices: {
                /**
                 * Index of button
                 */
                button?: number;
                /**
                 * If available, index of x-axis
                 */
                xAxis?: number;
                /**
                 * If available, index of y-axis
                 */
                yAxis?: number;
            };
            /**
             * The mesh's root node name
             */
            rootNodeName: string;
            /**
             * Animation definitions for this model
             */
            visualResponses: {
                [stateKey: string]: {
                    /**
                     * What property will be animated
                     */
                    componentProperty: "xAxis" | "yAxis" | "button" | "state";
                    /**
                     * What states influence this visual reponse
                     */
                    states: MotionControllerComponentStateType[];
                    /**
                     * Type of animation - movement or visibility
                     */
                    valueNodeProperty: "transform" | "visibility";
                    /**
                     * Base node name to move. Its position will be calculated according to the min and max nodes
                     */
                    valueNodeName?: string;
                    /**
                     * Minimum movement node
                     */
                    minNodeName?: string;
                    /**
                     * Max movement node
                     */
                    maxNodeName?: string;
                }
            }
            /**
             * If touch enabled, what is the name of node to display user feedback
             */
            touchPointNodeName?: string;
        }
    };
    /**
     * Is it xr standard mapping or not
     */
    gamepadMapping: "" | "xr-standard";
    /**
     * Base root node of this entire model
     */
    rootNodeName: string;
    /**
     * Path to load the assets. Usually relative to the base path
     */
    assetPath: string;
}

/**
 * A definition for the layout map in the input profile
 */
export interface IMotionControllerLayoutMap {
    /**
     * Layouts with handness type as a key
     */
    [handness: string /* handness */]: IMotionControllerLayout;
}

/**
 * The XR Input profile schema
 * Profiles can be found here:
 * https://github.com/immersive-web/webxr-input-profiles/tree/master/packages/registry/profiles
 */
export interface IMotionControllerProfile {
    /**
     * The id of this profile
     * correlates to the profile(s) in the xrInput.profiles array
     */
    profileId: string;
    /**
     * fallback profiles for this profileId
     */
    fallbackProfileIds: string[];
    /**
     * The layout map, with handness as key
     */
    layouts: IMotionControllerLayoutMap;
}

/**
 * A helper-interface for the 3 meshes needed for controller button animation
 * The meshes are provided to the _lerpButtonTransform function to calculate the current position of the value mesh
 */
export interface IMotionControllerButtonMeshMap {
    /**
     * The mesh that will be changed when value changes
     */
    valueMesh: AbstractMesh;
    /**
     * the mesh that defines the pressed value mesh position.
     * This is used to find the max-position of this button
     */
    pressedMesh: AbstractMesh;
    /**
     * the mesh that defines the unpressed value mesh position.
     * This is used to find the min (or initial) position of this button
     */
    unpressedMesh: AbstractMesh;
}

/**
 * A helper-interface for the 3 meshes needed for controller axis animation.
 * This will be expanded when touchpad animations are fully supported
 * The meshes are provided to the _lerpAxisTransform function to calculate the current position of the value mesh
 */
export interface IMotionControllerMeshMap {
    /**
     * The mesh that will be changed when axis value changes
     */
    valueMesh: AbstractMesh;
    /**
     * the mesh that defines the minimum value mesh position.
     */
    minMesh?: AbstractMesh;
    /**
     * the mesh that defines the maximum value mesh position.
     */
    maxMesh?: AbstractMesh;
}

/**
 * The elements needed for change-detection of the gamepad objects in motion controllers
 */
export interface IMinimalMotionControllerObject {
    /**
     * An array of available buttons
     */
    buttons: Array<{
        /**
        * Value of the button/trigger
        */
        value: number;
        /**
         * If the button/trigger is currently touched
         */
        touched: boolean;
        /**
         * If the button/trigger is currently pressed
         */
        pressed: boolean;
    }>;
    /**
     * Available axes of this controller
     */
    axes: number[];
}

/**
 * An Abstract Motion controller
 * This class receives an xrInput and a profile layout and uses those to initialize the components
 * Each component has an observable to check for changes in value and state
 */
export abstract class WebXRAbstractMotionController implements IDisposable {

    /**
     * The profile id of this motion controller
     */
    public abstract profileId: string;

    /**
     * A map of components (WebXRControllerComponent) in this motion controller
     * Components have a ComponentType and can also have both button and axis definitions
     */
    public readonly components: {
        [id: string]: WebXRControllerComponent
    } = {};

    /**
     * Observers registered here will be triggered when the model of this controller is done loading
     */
    public onModelLoadedObservable: Observable<WebXRAbstractMotionController> = new Observable();

    /**
     * The root mesh of the model. It is null if the model was not yet initialized
     */
    public rootMesh: Nullable<AbstractMesh>;

    /**
     * Disable the model's animation. Can be set at any time.
     */
    public disableAnimation: boolean = false;

    private _modelReady: boolean = false;

    /**
     * constructs a new abstract motion controller
     * @param scene the scene to which the model of the controller will be added
     * @param layout The profile layout to load
     * @param gamepadObject The gamepad object correlating to this controller
     * @param handness handness (left/right/none) of this controller
     * @param _doNotLoadControllerMesh set this flag to ignore the mesh loading
     */
    constructor(protected scene: Scene, protected layout: IMotionControllerLayout,
        /**
         * The gamepad object correlating to this controller
         */
        public gamepadObject: IMinimalMotionControllerObject,
        /**
         * handness (left/right/none) of this controller
         */
        public handness: MotionControllerHandness,
        _doNotLoadControllerMesh: boolean = false) {
        // initialize the components
        if (layout.components) {
            Object.keys(layout.components).forEach(this._initComponent);
        }
        // Model is loaded in WebXRInput
    }

    private _initComponent = (id: string) => {
        if (!id) { return; }
        const componentDef = this.layout.components[id];
        const type = componentDef.type;
        const buttonIndex = componentDef.gamepadIndices.button;
        // search for axes
        let axes: number[] = [];
        if (componentDef.gamepadIndices.xAxis !== undefined && componentDef.gamepadIndices.yAxis !== undefined) {
            axes.push(componentDef.gamepadIndices.xAxis, componentDef.gamepadIndices.yAxis);
        }

        this.components[id] = new WebXRControllerComponent(id, type, buttonIndex, axes);
    }

    /**
     * Update this model using the current XRFrame
     * @param xrFrame the current xr frame to use and update the model
     */
    public updateFromXRFrame(xrFrame: XRFrame): void {
        this.getComponentIds().forEach((id) => this.getComponent(id).update(this.gamepadObject));
        this.updateModel(xrFrame);
    }

    /**
     * Get the list of components available in this motion controller
     * @returns an array of strings correlating to available components
     */
    public getComponentIds(): string[] {
        return Object.keys(this.components);
    }

    /**
     * Get the main (Select) component of this controller as defined in the layout
     * @returns the main component of this controller
     */
    public getMainComponent(): WebXRControllerComponent {
        return this.getComponent(this.layout.selectComponentId);
    }

    /**
     * get a component based an its component id as defined in layout.components
     * @param id the id of the component
     * @returns the component correlates to the id or undefined if not found
     */
    public getComponent(id: string): WebXRControllerComponent {
        return this.components[id];
    }

    /**
     * Get the first component of specific type
     * @param type type of component to find
     * @return a controller component or null if not found
     */
    public getComponentOfType(type: MotionControllerComponentType): Nullable<WebXRControllerComponent> {
        return this.getAllComponentsOfType(type)[0] || null;
    }

    /**
     * Returns all components of specific type
     * @param type the type to search for
     * @return an array of components with this type
     */
    public getAllComponentsOfType(type: MotionControllerComponentType): WebXRControllerComponent[] {
        return this.getComponentIds().map((id) => this.components[id]).filter((component) => component.type === type);
    }

    /**
     * Loads the model correlating to this controller
     * When the mesh is loaded, the onModelLoadedObservable will be triggered
     * @returns A promise fulfilled with the result of the model loading
     */
    public async loadModel(): Promise<boolean> {
        let useGeneric = !this._getModelLoadingConstraints();
        let loadingParams = this._getGenericFilenameAndPath();
        // Checking if GLB loader is present
        if (useGeneric) {
            Logger.Warn("You need to reference GLTF loader to load Windows Motion Controllers model. Falling back to generic models");
        } else {
            loadingParams = this._getFilenameAndPath();
        }
        return new Promise((resolve, reject) => {
            SceneLoader.ImportMesh("", loadingParams.path, loadingParams.filename, this.scene, (meshes: AbstractMesh[]) => {
                if (useGeneric) {
                    this._getGenericParentMesh(meshes);
                } else {
                    this._setRootMesh(meshes);
                }
                this._processLoadedModel(meshes);
                this._modelReady = true;
                this.onModelLoadedObservable.notifyObservers(this);
                resolve(true);
            }, null, (_scene: Scene, message: string) => {
                Logger.Log(message);
                Logger.Warn(`Failed to retrieve controller model of type ${this.profileId} from the remote server: ${loadingParams.path}${loadingParams.filename}`);
                reject(message);
            });
        });
    }

    /**
     * Update the model itself with the current frame data
     * @param xrFrame the frame to use for updating the model mesh
     */
    protected updateModel(xrFrame: XRFrame): void {
        if (!this._modelReady) {
            return;
        }
        this._updateModel(xrFrame);
    }

    /**
     * Moves the axis on the controller mesh based on its current state
     * @param axis the index of the axis
     * @param axisValue the value of the axis which determines the meshes new position
     * @hidden
     */
    protected _lerpTransform(axisMap: IMotionControllerMeshMap, axisValue: number, fixValueCoordinates?: boolean): void {
        if (!axisMap.minMesh || !axisMap.maxMesh) {
            return;
        }

        if (!axisMap.minMesh.rotationQuaternion || !axisMap.maxMesh.rotationQuaternion || !axisMap.valueMesh.rotationQuaternion) {
            return;
        }

        // Convert from gamepad value range (-1 to +1) to lerp range (0 to 1)
        let lerpValue = fixValueCoordinates ? axisValue * 0.5 + 0.5 : axisValue;
        Quaternion.SlerpToRef(
            axisMap.minMesh.rotationQuaternion,
            axisMap.maxMesh.rotationQuaternion,
            lerpValue,
            axisMap.valueMesh.rotationQuaternion);
        Vector3.LerpToRef(
            axisMap.minMesh.position,
            axisMap.maxMesh.position,
            lerpValue,
            axisMap.valueMesh.position);
    }

    // Look through all children recursively. This will return null if no mesh exists with the given name.
    protected _getChildByName(node: AbstractMesh, name: string): AbstractMesh {
        return <AbstractMesh>node.getChildren((n) => n.name === name, false)[0];
    }
    // Look through only immediate children. This will return null if no mesh exists with the given name.
    protected _getImmediateChildByName(node: AbstractMesh, name: string): AbstractMesh {
        return <AbstractMesh>node.getChildren((n) => n.name == name, true)[0];
    }

    private _getGenericFilenameAndPath(): { filename: string, path: string } {
        return {
            filename: "generic.babylon",
            path: "https://controllers.babylonjs.com/generic/"
        };
    }

    private _getGenericParentMesh(meshes: AbstractMesh[]): void {
        this.rootMesh = new Mesh(this.profileId + " " + this.handness, this.scene);

        meshes.forEach((mesh) => {
            if (!mesh.parent) {
                mesh.isPickable = false;
                mesh.setParent(this.rootMesh);
            }
        });

        this.rootMesh.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI, 0);
    }

    /**
     * Get the filename and path for this controller's model
     * @returns a map of filename and path
     */
    protected abstract _getFilenameAndPath(): { filename: string, path: string };
    /**
     * This function will be called after the model was successfully loaded and can be used
     * for mesh transformations before it is available for the user
     * @param meshes the loaded meshes
     */
    protected abstract _processLoadedModel(meshes: AbstractMesh[]): void;
    /**
     * Set the root mesh for this controller. Important for the WebXR controller class
     * @param meshes the loaded meshes
     */
    protected abstract _setRootMesh(meshes: AbstractMesh[]): void;
    /**
     * A function executed each frame that updates the mesh (if needed)
     * @param xrFrame the current xrFrame
     */
    protected abstract _updateModel(xrFrame: XRFrame): void;
    /**
     * This function is called before the mesh is loaded. It checks for loading constraints.
     * For example, this function can check if the GLB loader is available
     * If this function returns false, the generic controller will be loaded instead
     * @returns Is the client ready to load the mesh
     */
    protected abstract _getModelLoadingConstraints(): boolean;

    /**
     * Dispose this controller, the model mesh and all its components
     */
    public dispose(): void {
        this.getComponentIds().forEach((id) => this.getComponent(id).dispose());
        if (this.rootMesh) {
            this.rootMesh.dispose();
        }
    }
}