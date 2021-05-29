import { Behavior } from "../../Behaviors/behavior";
import { Mesh } from "../../Meshes/mesh";
import { AbstractMesh } from "../../Meshes/abstractMesh";
import { Scene } from "../../scene";
import { Nullable } from "../../types";
import { PointerInfo, PointerEventTypes } from "../../Events/pointerEvents";
import { Vector3, Quaternion } from "../../Maths/math.vector";
import { Observer, Observable } from "../../Misc/observable";
import { TransformNode } from "../../Meshes";

/**
 * Base behavior for six degrees of freedom interactions in XR experiences.
 * Creates virtual meshes that are dragged around
 * And observables for position/rotation changes
 */
export class BaseSixDofDragBehavior implements Behavior<Mesh> {
    protected static _virtualScene: Scene;
    private _pointerObserver: Nullable<Observer<PointerInfo>>;
    private _attachedToElement: boolean = false;
    protected _virtualMeshesInfo: {
        [id: number]: {
            dragging: boolean;
            moving: boolean;
            dragMesh: AbstractMesh;
            originMesh: AbstractMesh;
            startingPosition: Vector3;
            startingOrientation: Quaternion;
            lastOriginPosition: Vector3;
            lastDragPosition: Vector3;
        };
    } = {};

    private _tmpVector: Vector3 = new Vector3();
    private _tmpQuaternion: Quaternion = new Quaternion();

    protected _scene: Scene;
    protected _moving = false;
    protected _ownerNode: Mesh;
    protected _draggedMesh: Nullable<AbstractMesh>;

    // TODO
    protected _draggableMeshes: Nullable<AbstractMesh[]> = null;

    /**
     * Sets an ancestor node to drag instead of the attached node.
     * All dragging induced by this behavior will happen on the ancestor node, while the relative position/orientation/scaling
     * between the ancestor node and child node will be kept the same.
     * This is useful if the attached node is acting as an anchor to move its hierarchy, and you don't want the ancestor node to be the one to receive the pointer inputs.
     * NB : This property must be set to an actual ancestor of the attached node, or else the dragging behavior will have an undefined result.
     */
    public ancestorToDrag: Nullable<TransformNode> = null;

    /**
     * How much faster the object should move when the controller is moving towards it. This is useful to bring objects that are far away from the user to them faster. Set this to 0 to avoid any speed increase. (Default: 3)
     */
    public zDragFactor = 3;
    /**
     * The id of the pointer that is currently interacting with the behavior (-1 when no pointer is active)
     */
    public get currentDraggingPointerId() {
        if (this.currentDraggingPointerIds[0] !== undefined) {
            return this.currentDraggingPointerIds[0];
        }
        return -1;
    }

    public set currentDraggingPointerId(value: number) {
        this.currentDraggingPointerIds[0] = value;
    }

    /**
     * In case of multipointer interaction, all pointer ids currently active are stored here
     */
    public currentDraggingPointerIds: number[] = [];

    /**
     * Get or set the currentDraggingPointerId
     * @deprecated Please use currentDraggingPointerId instead
     */
    public get currentDraggingPointerID(): number {
        return this.currentDraggingPointerId;
    }
    public set currentDraggingPointerID(currentDraggingPointerID: number) {
        this.currentDraggingPointerId = currentDraggingPointerID;
    }
    /**
    /**
     * If camera controls should be detached during the drag
     */
    public detachCameraControls = true;

    /**
     * Fires each time a drag starts
     */
    public onDragStartObservable = new Observable<{ position: Vector3 }>();
    /**
     * Fires each time a drag happens
     */
    public onDragObservable = new Observable<{ delta: Vector3; position: Vector3 }>();
    /**
     *  Fires each time a drag ends (eg. mouse release after drag)
     */
    public onDragEndObservable = new Observable<{}>();

    /**
     * Should the behavior allow simultaneous pointers to interact with the owner node.
     */
    public allowMultiPointer: boolean = true;

    /**
     *  The name of the behavior
     */
    public get name(): string {
        return "BaseSixDofDrag";
    }

    /**
     *  Returns true if the attached mesh is currently moving with this behavior
     */
    public get isMoving(): boolean {
        return this._moving;
    }

    /**
     *  Initializes the behavior
     */
    public init() {}

    /**
     * In the case of multiple active cameras, the cameraToUseForPointers should be used if set instead of active camera
     */
    private get _pointerCamera() {
        if (this._scene.cameraToUseForPointers) {
            return this._scene.cameraToUseForPointers;
        } else {
            return this._scene.activeCamera;
        }
    }

    private _createVirtualMeshInfo() {
        // Setup virtual meshes to be used for dragging without dirtying the existing scene

        const dragMesh = new AbstractMesh("", BaseSixDofDragBehavior._virtualScene);
        dragMesh.rotationQuaternion = new Quaternion();
        const originMesh = new AbstractMesh("", BaseSixDofDragBehavior._virtualScene);
        originMesh.rotationQuaternion = new Quaternion();

        return {
            dragging: false,
            moving: false,
            dragMesh,
            originMesh,
            startingPosition: new Vector3(),
            startingOrientation: new Quaternion(),
            lastOriginPosition: new Vector3(),
            lastDragPosition: new Vector3(),
        };
    }

    /**
     * Attaches the scale behavior the passed in mesh
     * @param ownerNode The mesh that will be scaled around once attached
     */
    public attach(ownerNode: Mesh): void {
        this._ownerNode = ownerNode;
        this._scene = this._ownerNode.getScene();
        if (!BaseSixDofDragBehavior._virtualScene) {
            BaseSixDofDragBehavior._virtualScene = new Scene(this._scene.getEngine(), { virtual: true });
            BaseSixDofDragBehavior._virtualScene.detachControl();
        }

        var pickPredicate = (m: AbstractMesh) => {
            return this._ownerNode == m || m.isDescendantOf(this._ownerNode);
        };
        this._pointerObserver = this._scene.onPointerObservable.add((pointerInfo, eventState) => {
            const pointerId = (<PointerEvent>pointerInfo.event).pointerId;
            if (!this._virtualMeshesInfo[pointerId]) {
                this._virtualMeshesInfo[pointerId] = this._createVirtualMeshInfo();
            }
            const virtualMeshesInfo = this._virtualMeshesInfo[pointerId];

            if (pointerInfo.type == PointerEventTypes.POINTERDOWN) {
                if (
                    !virtualMeshesInfo.dragging &&
                    pointerInfo.pickInfo &&
                    pointerInfo.pickInfo.hit &&
                    pointerInfo.pickInfo.pickedMesh &&
                    pointerInfo.pickInfo.pickedPoint &&
                    pointerInfo.pickInfo.ray &&
                    pickPredicate(pointerInfo.pickInfo.pickedMesh)
                ) {
                    if (!this.allowMultiPointer && this.currentDraggingPointerIds.length > 0) {
                        return;
                    }

                    const pickedMesh = this._ownerNode;
                    this._draggedMesh = pickedMesh;
                    virtualMeshesInfo.lastOriginPosition.copyFrom(pointerInfo.pickInfo.ray.origin);

                    // Set position and orientation of the controller
                    virtualMeshesInfo.originMesh.position.copyFrom(pointerInfo.pickInfo.ray.origin);
                    virtualMeshesInfo.originMesh.lookAt(pointerInfo.pickInfo.ray.origin.add(pointerInfo.pickInfo.ray.direction));

                    // Attach the virtual drag mesh to the virtual origin mesh so it can be dragged
                    virtualMeshesInfo.originMesh.removeChild(virtualMeshesInfo.dragMesh);
                    virtualMeshesInfo.dragMesh.position.copyFrom(pointerInfo.pickInfo.pickedPoint);
                    virtualMeshesInfo.lastDragPosition.copyFrom(pointerInfo.pickInfo.pickedPoint);

                    virtualMeshesInfo.startingPosition.copyFrom(virtualMeshesInfo.dragMesh.position);
                    virtualMeshesInfo.startingOrientation.copyFrom(virtualMeshesInfo.dragMesh.rotationQuaternion!);
                    virtualMeshesInfo.originMesh.addChild(virtualMeshesInfo.dragMesh);

                    // Update state
                    virtualMeshesInfo.dragging = true;

                    if (this.currentDraggingPointerIds.indexOf(pointerId) === -1) {
                        this.currentDraggingPointerIds.push(pointerId);
                    }

                    // Detach camera controls
                    if (this.detachCameraControls && this._pointerCamera && !this._pointerCamera.leftCamera) {
                        if (this._pointerCamera.inputs && this._pointerCamera.inputs.attachedToElement) {
                            this._pointerCamera.detachControl();
                            this._attachedToElement = true;
                        } else {
                            this._attachedToElement = false;
                        }
                    }

                    this._targetDragStart(virtualMeshesInfo.dragMesh.absolutePosition, virtualMeshesInfo.dragMesh.rotationQuaternion!, pointerId);
                    this.onDragStartObservable.notifyObservers({ position: virtualMeshesInfo.dragMesh.absolutePosition });
                }
            } else if (pointerInfo.type == PointerEventTypes.POINTERUP || pointerInfo.type == PointerEventTypes.POINTERDOUBLETAP) {
                const registeredPointerIndex = this.currentDraggingPointerIds.indexOf(pointerId);
                virtualMeshesInfo.dragging = false;
                if (registeredPointerIndex !== -1) {
                    this.currentDraggingPointerIds.splice(registeredPointerIndex, 1);
                    if (this.currentDraggingPointerIds.length === 0) {
                        this._moving = false;
                        this._draggedMesh = null;

                        // Reattach camera controls
                        if (this.detachCameraControls && this._attachedToElement && this._pointerCamera && !this._pointerCamera.leftCamera) {
                            this._pointerCamera.attachControl(true);
                            this._attachedToElement = false;
                        }
                    }

                    virtualMeshesInfo.originMesh.removeChild(virtualMeshesInfo.dragMesh);
                    this._targetDragEnd(pointerId);
                    this.onDragEndObservable.notifyObservers({});
                }
            } else if (pointerInfo.type == PointerEventTypes.POINTERMOVE) {
                const registeredPointerIndex = this.currentDraggingPointerIds.indexOf(pointerId);

                if (registeredPointerIndex !== -1 && virtualMeshesInfo.dragging && pointerInfo.pickInfo && pointerInfo.pickInfo.ray && this._draggedMesh) {
                    let zDragFactor = this.zDragFactor;

                    if ( this.currentDraggingPointerIds.length > 1) {
                        zDragFactor = 0;
                    }

                    // Calculate controller drag distance in controller space
                    var originDragDifference = pointerInfo.pickInfo.ray.origin.subtract(virtualMeshesInfo.lastOriginPosition);
                    virtualMeshesInfo.lastOriginPosition.copyFrom(pointerInfo.pickInfo.ray.origin);
                    var localOriginDragDifference = -Vector3.Dot(originDragDifference, pointerInfo.pickInfo.ray.direction);

                    virtualMeshesInfo.originMesh.addChild(virtualMeshesInfo.dragMesh);
                    // Determine how much the controller moved to/away towards the dragged object and use this to move the object further when its further away
                    virtualMeshesInfo.dragMesh.position.z -=
                        virtualMeshesInfo.dragMesh.position.z < 1
                            ? localOriginDragDifference * zDragFactor
                            : localOriginDragDifference * zDragFactor * virtualMeshesInfo.dragMesh.position.z;
                    if (virtualMeshesInfo.dragMesh.position.z < 0) {
                        virtualMeshesInfo.dragMesh.position.z = 0;
                    }

                    // Update the controller position
                    virtualMeshesInfo.originMesh.position.copyFrom(pointerInfo.pickInfo.ray.origin);
                    virtualMeshesInfo.originMesh.lookAt(pointerInfo.pickInfo.ray.origin.add(pointerInfo.pickInfo.ray.direction));
                    virtualMeshesInfo.originMesh.removeChild(virtualMeshesInfo.dragMesh);

                    // Get change in rotation
                    this._tmpQuaternion.copyFrom(virtualMeshesInfo.startingOrientation);
                    this._tmpQuaternion.x = -this._tmpQuaternion.x;
                    this._tmpQuaternion.y = -this._tmpQuaternion.y;
                    this._tmpQuaternion.z = -this._tmpQuaternion.z;
                    virtualMeshesInfo.dragMesh.rotationQuaternion!.multiplyToRef(this._tmpQuaternion, this._tmpQuaternion);
                    this.onDragObservable.notifyObservers({ delta: this._tmpVector, position: virtualMeshesInfo.dragMesh.position });
                    virtualMeshesInfo.dragMesh.position.subtractToRef(virtualMeshesInfo.startingPosition, this._tmpVector);

                    // Notify herited methods and observables
                    this._targetDrag(this._tmpVector, this._tmpQuaternion, pointerId);
                    virtualMeshesInfo.lastDragPosition.copyFrom(virtualMeshesInfo.dragMesh.absolutePosition);

                    this._moving = true;
                }
            }
        });
    }

    protected _targetDragStart(worldPosition: Vector3, worldRotation: Quaternion, pointerId: number) {
        // Herited classes can override that
    }

    protected _targetDrag(worldDeltaPosition: Vector3, worldDeltaRotation: Quaternion, pointerId: number) {
        // Herited classes can override that
    }

    protected _targetDragEnd(pointerId: number) {
        // Herited classes can override that
    }

    /**
     * Detaches the behavior from the mesh
     */
    public detach(): void {
        if (this._scene) {
            if (this.detachCameraControls && this._attachedToElement && this._pointerCamera && !this._pointerCamera.leftCamera) {
                this._pointerCamera.attachControl(true);
                this._attachedToElement = false;
            }
            this._scene.onPointerObservable.remove(this._pointerObserver);
        }

        for (let pointerId in this._virtualMeshesInfo) {
            this._virtualMeshesInfo[pointerId].originMesh.dispose();
            this._virtualMeshesInfo[pointerId].dragMesh.dispose();
        }

        this.onDragEndObservable.clear();
        this.onDragObservable.clear();
        this.onDragStartObservable.clear();
    }
}
