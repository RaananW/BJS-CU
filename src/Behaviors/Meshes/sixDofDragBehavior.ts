import { Behavior } from "../../Behaviors/behavior";
import { Mesh } from "../../Meshes/mesh";
import { AbstractMesh } from "../../Meshes/abstractMesh";
import { Scene } from "../../scene";
import { Nullable } from "../../types";
import { PointerInfo, PointerEventTypes } from "../../Events/pointerEvents";
import { Vector3, Quaternion, Matrix } from "../../Maths/math.vector";
import { Observer, Observable } from "../../Misc/observable";
import { Camera } from "../../Cameras/camera";
import { PivotTools } from "../../Misc/pivotTools";
import { TransformNode } from "../../Meshes/transformNode";
/**
 * A behavior that when attached to a mesh will allow the mesh to be dragged around based on directions and origin of the pointer's ray
 */
export class SixDofDragBehavior implements Behavior<Mesh> {
    private static _virtualScene: Scene;
    private _ownerNode: Mesh;
    private _sceneRenderObserver: Nullable<Observer<Scene>> = null;
    private _scene: Scene;
    private _targetPosition = new Vector3(0, 0, 0);
    private _virtualOriginMesh: AbstractMesh;
    private _virtualDragMesh: AbstractMesh;
    private _pointerObserver: Nullable<Observer<PointerInfo>>;
    private _moving = false;
    private _startingOrientation = new Quaternion();
    private _attachedToElement: boolean = false;

    /**
     * How much faster the object should move when the controller is moving towards it. This is useful to bring objects that are far away from the user to them faster. Set this to 0 to avoid any speed increase. (Default: 3)
     */
    public zDragFactor = 3;
    /**
     * If the object should rotate to face the drag origin
     */
    public rotateDraggedObject = true;
    /**
     * Sets an ancestor node to drag instead of the attached node.
     * All dragging induced by this behavior will happen on the ancestor node, while the relative position/orientation/scaling
     * between the ancestor node and child node will be kept the same.
     * This is useful if the attached node is acting as an anchor to move its hierarchy, and you don't want the ancestor node to be the one to receive the pointer inputs.
     * NB : This property must be set to an actual ancestor of the attached node, or else the dragging behavior will have an undefined result.
     */
    public ancestorToDrag: Nullable<TransformNode> = null;

    /**
     * If the behavior is currently in a dragging state
     */
    public dragging = false;
    /**
     * The distance towards the target drag position to move each frame. This can be useful to avoid jitter. Set this to 1 for no delay. (Default: 0.2)
     */
    public dragDeltaRatio = 0.2;
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
     * The id of the pointer that is currently interacting with the behavior (-1 when no pointer is active)
     */
    public currentDraggingPointerId = -1;
    /**
     * If camera controls should be detached during the drag
     */
    public detachCameraControls = true;
    /**
     * Should the object rotate towards the camera when we start dragging it
     */
    public faceCameraOnDragStart = false;
    /**
     * Fires each time a drag starts
     */
    public onDragStartObservable = new Observable<{}>();
    /**
     * Fires each time a drag happens
     */
    public onDragObservable = new Observable<void>();
    /**
     *  Fires each time a drag ends (eg. mouse release after drag)
     */
    public onDragEndObservable = new Observable<{}>();

    /**
     * Instantiates a behavior that when attached to a mesh will allow the mesh to be dragged around based on directions and origin of the pointer's ray
     */
    constructor() {}

    /**
     *  The name of the behavior
     */
    public get name(): string {
        return "SixDofDrag";
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

    /**
     * Attaches the scale behavior the passed in mesh
     * @param ownerNode The mesh that will be scaled around once attached
     */
    public attach(ownerNode: Mesh): void {
        this._ownerNode = ownerNode;
        this._scene = this._ownerNode.getScene();
        if (!SixDofDragBehavior._virtualScene) {
            SixDofDragBehavior._virtualScene = new Scene(this._scene.getEngine(), { virtual: true });
            SixDofDragBehavior._virtualScene.detachControl();
        }

        var pickedMesh: Nullable<AbstractMesh> = null;
        var lastSixDofOriginPosition = new Vector3(0, 0, 0);

        // Setup virtual meshes to be used for dragging without dirtying the existing scene
        this._virtualOriginMesh = new AbstractMesh("", SixDofDragBehavior._virtualScene);
        this._virtualOriginMesh.rotationQuaternion = new Quaternion();
        this._virtualDragMesh = new AbstractMesh("", SixDofDragBehavior._virtualScene);
        this._virtualDragMesh.rotationQuaternion = new Quaternion();

        var pickPredicate = (m: AbstractMesh) => {
            return this._ownerNode == m || m.isDescendantOf(this._ownerNode);
        };
        this._pointerObserver = this._scene.onPointerObservable.add((pointerInfo, eventState) => {
            if (pointerInfo.type == PointerEventTypes.POINTERDOWN) {
                if (
                    !this.dragging &&
                    pointerInfo.pickInfo &&
                    pointerInfo.pickInfo.hit &&
                    pointerInfo.pickInfo.pickedMesh &&
                    pointerInfo.pickInfo.ray &&
                    pickPredicate(pointerInfo.pickInfo.pickedMesh)
                ) {
                    if (this._pointerCamera && this._pointerCamera.cameraRigMode == Camera.RIG_MODE_NONE) {
                        pointerInfo.pickInfo.ray.origin.copyFrom(this._pointerCamera!.globalPosition);
                    }

                    pickedMesh = this._ownerNode;
                    PivotTools._RemoveAndStorePivotPoint(pickedMesh);
                    lastSixDofOriginPosition.copyFrom(pointerInfo.pickInfo.ray.origin);

                    // Set position and orientation of the controller
                    this._virtualOriginMesh.position.copyFrom(pointerInfo.pickInfo.ray.origin);
                    this._virtualOriginMesh.lookAt(pointerInfo.pickInfo.ray.origin.add(pointerInfo.pickInfo.ray.direction));

                    // Attach the virtual drag mesh to the virtual origin mesh so it can be dragged
                    this._virtualOriginMesh.removeChild(this._virtualDragMesh);
                    pickedMesh.computeWorldMatrix();
                    this._virtualDragMesh.position.copyFrom(pickedMesh.absolutePosition);
                    const referenceMesh = this.ancestorToDrag ? this.ancestorToDrag : pickedMesh;
                    const oldParent = referenceMesh.parent;

                    if (!referenceMesh.rotationQuaternion) {
                        referenceMesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(referenceMesh.rotation.y, referenceMesh.rotation.x, referenceMesh.rotation.z);
                    }
                    referenceMesh.setParent(null);
                    if (this.faceCameraOnDragStart) {
                        const quat = Quaternion.FromLookDirectionLH(pointerInfo.pickInfo.ray.direction.scale(-1), new Vector3(0, 1, 0));
                        quat.normalize();
                        this._virtualDragMesh.rotationQuaternion!.copyFrom(quat);
                    } else {
                        this._virtualDragMesh.rotationQuaternion!.copyFrom(referenceMesh.rotationQuaternion);
                    }
                    referenceMesh.setParent(oldParent);

                    this._virtualOriginMesh.addChild(this._virtualDragMesh);

                    // Update state
                    this._targetPosition.copyFrom(this._virtualDragMesh.absolutePosition);
                    this.dragging = true;
                    this.currentDraggingPointerId = (<PointerEvent>pointerInfo.event).pointerId;

                    // Detach camera controls
                    if (this.detachCameraControls && this._pointerCamera && !this._pointerCamera.leftCamera) {
                        if (this._pointerCamera.inputs && this._pointerCamera.inputs.attachedToElement) {
                            this._pointerCamera.detachControl();
                            this._attachedToElement = true;
                        } else {
                            this._attachedToElement = false;
                        }
                    }
                    PivotTools._RestorePivotPoint(pickedMesh);
                    this.onDragStartObservable.notifyObservers({});
                }
            } else if (pointerInfo.type == PointerEventTypes.POINTERUP || pointerInfo.type == PointerEventTypes.POINTERDOUBLETAP) {
                if (this.currentDraggingPointerId == (<PointerEvent>pointerInfo.event).pointerId) {
                    this.dragging = false;
                    this._moving = false;
                    this.currentDraggingPointerId = -1;
                    pickedMesh = null;
                    this._virtualOriginMesh.removeChild(this._virtualDragMesh);

                    // Reattach camera controls
                    if (this.detachCameraControls && this._attachedToElement && this._pointerCamera && !this._pointerCamera.leftCamera) {
                        this._pointerCamera.attachControl(true);
                        this._attachedToElement = false;
                    }
                    this.onDragEndObservable.notifyObservers({});
                }
            } else if (pointerInfo.type == PointerEventTypes.POINTERMOVE) {
                if (this.currentDraggingPointerId == (<PointerEvent>pointerInfo.event).pointerId && this.dragging && pointerInfo.pickInfo && pointerInfo.pickInfo.ray && pickedMesh) {
                    var zDragFactor = this.zDragFactor;
                    if (this._pointerCamera && this._pointerCamera.cameraRigMode == Camera.RIG_MODE_NONE) {
                        pointerInfo.pickInfo.ray.origin.copyFrom(this._pointerCamera!.globalPosition);
                        zDragFactor = 0;
                    }

                    // Calculate controller drag distance in controller space
                    var originDragDifference = pointerInfo.pickInfo.ray.origin.subtract(lastSixDofOriginPosition);
                    lastSixDofOriginPosition.copyFrom(pointerInfo.pickInfo.ray.origin);
                    var localOriginDragDifference = -Vector3.Dot(originDragDifference, pointerInfo.pickInfo.ray.direction);

                    this._virtualOriginMesh.addChild(this._virtualDragMesh);
                    // Determine how much the controller moved to/away towards the dragged object and use this to move the object further when its further away
                    this._virtualDragMesh.position.z -=
                        this._virtualDragMesh.position.z < 1
                            ? localOriginDragDifference * this.zDragFactor
                            : localOriginDragDifference * zDragFactor * this._virtualDragMesh.position.z;
                    if (this._virtualDragMesh.position.z < 0) {
                        this._virtualDragMesh.position.z = 0;
                    }

                    // Update the controller position
                    this._virtualOriginMesh.position.copyFrom(pointerInfo.pickInfo.ray.origin);
                    this._virtualOriginMesh.lookAt(pointerInfo.pickInfo.ray.origin.add(pointerInfo.pickInfo.ray.direction));
                    this._virtualOriginMesh.removeChild(this._virtualDragMesh);

                    // Move the virtualObjectsPosition into the picked mesh's space if needed
                    this._targetPosition.copyFrom(this._virtualDragMesh.absolutePosition);

                    if (pickedMesh.parent && !this.ancestorToDrag) {
                        Vector3.TransformCoordinatesToRef(this._targetPosition, Matrix.Invert(pickedMesh.parent.getWorldMatrix()), this._targetPosition);
                    }

                    if (!this._moving) {
                        this._startingOrientation.copyFrom(this._virtualDragMesh.rotationQuaternion!);
                    }
                    this._moving = true;
                }
            }
        });

        var tmpQuaternion = new Quaternion();
        // On every frame move towards target scaling to avoid jitter caused by vr controllers
        this._sceneRenderObserver = ownerNode.getScene().onBeforeRenderObservable.add(() => {
            if (this.dragging && this._moving && pickedMesh) {
                PivotTools._RemoveAndStorePivotPoint(pickedMesh);
                // Slowly move mesh to avoid jitter
                if (this.ancestorToDrag) {
                    const delta = this._targetPosition.subtract(pickedMesh.absolutePosition).scale(this.dragDeltaRatio);

                    if (this.ancestorToDrag.parent) {
                        Vector3.TransformNormalToRef(delta, Matrix.Invert(this.ancestorToDrag.parent.getWorldMatrix()), delta);
                    }
                    this.ancestorToDrag.position.addInPlace(delta);
                } else {
                    pickedMesh.position.addInPlace(this._targetPosition.subtract(pickedMesh.position).scale(this.dragDeltaRatio));
                }

                if (this.rotateDraggedObject) {
                    // Get change in rotation
                    tmpQuaternion.copyFrom(this._startingOrientation);
                    tmpQuaternion.x = -tmpQuaternion.x;
                    tmpQuaternion.y = -tmpQuaternion.y;
                    tmpQuaternion.z = -tmpQuaternion.z;
                    this._virtualDragMesh.rotationQuaternion!.multiplyToRef(tmpQuaternion, tmpQuaternion);
                    // Convert change in rotation to only y axis rotation
                    Quaternion.RotationYawPitchRollToRef(tmpQuaternion.toEulerAngles("xyz").y, 0, 0, tmpQuaternion);
                    tmpQuaternion.multiplyToRef(this._startingOrientation, tmpQuaternion);
                    // Slowly move mesh to avoid jitter
                    var oldParent = this.ancestorToDrag ? this.ancestorToDrag.parent : pickedMesh.parent;

                    // Only rotate the mesh if it's parent has uniform scaling
                    if (!oldParent || ((oldParent as Mesh).scaling && !(oldParent as Mesh).scaling.isNonUniformWithinEpsilon(0.001))) {
                        if (this.ancestorToDrag) {
                            this.ancestorToDrag.setParent(null);
                            Quaternion.SlerpToRef(this.ancestorToDrag.rotationQuaternion!, tmpQuaternion, this.dragDeltaRatio, this.ancestorToDrag.rotationQuaternion!);
                            this.ancestorToDrag.setParent(oldParent);
                        } else {
                            pickedMesh.setParent(null);
                            Quaternion.SlerpToRef(pickedMesh.rotationQuaternion!, tmpQuaternion, this.dragDeltaRatio, pickedMesh.rotationQuaternion!);
                            pickedMesh.setParent(oldParent);
                        }
                    }
                }
                PivotTools._RestorePivotPoint(pickedMesh);

                this.onDragObservable.notifyObservers();
            }
        });
    }
    /**
     *  Detaches the behavior from the mesh
     */
    public detach(): void {
        if (this._scene) {
            if (this.detachCameraControls && this._attachedToElement && this._pointerCamera && !this._pointerCamera.leftCamera) {
                this._pointerCamera.attachControl(true);
                this._attachedToElement = false;
            }
            this._scene.onPointerObservable.remove(this._pointerObserver);
        }
        if (this._ownerNode) {
            this._ownerNode.getScene().onBeforeRenderObservable.remove(this._sceneRenderObserver);
        }
        if (this._virtualOriginMesh) {
            this._virtualOriginMesh.dispose();
        }
        if (this._virtualDragMesh) {
            this._virtualDragMesh.dispose();
        }
        this.onDragEndObservable.clear();
        this.onDragObservable.clear();
        this.onDragStartObservable.clear();
    }
}
