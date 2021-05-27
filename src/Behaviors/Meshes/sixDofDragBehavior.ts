import { Mesh } from "../../Meshes/mesh";
import { Scene } from "../../scene";
import { Nullable } from "../../types";
import { Vector3, Quaternion, Matrix, TmpVectors } from "../../Maths/math.vector";
import { Observable, Observer } from "../../Misc/observable";
import { PivotTools } from "../../Misc/pivotTools";
import { BaseSixDofDragBehavior } from "./baseSixDofDragBehavior";
import { TransformNode } from "../../Meshes/transformNode";
/**
 * A behavior that when attached to a mesh will allow the mesh to be dragged around based on directions and origin of the pointer's ray
 */
export class SixDofDragBehavior extends BaseSixDofDragBehavior {
    private _sceneRenderObserver: Nullable<Observer<Scene>> = null;
    private _virtualTransformNode: TransformNode;

    protected _targetPosition = new Vector3(0, 0, 0);
    protected _targetOrientation = new Quaternion();
    protected _targetScaling = new Vector3(1, 1, 1);
    protected _startingPosition = new Vector3(0, 0, 0);
    protected _startingPositionPointerOffset = new Vector3(0, 0, 0);
    protected _startingOrientation = new Quaternion();
    protected _startingScaling = new Vector3(1, 1, 1);

    /**
     * Fires when position is updated
     */
    public onPositionChangedObservable = new Observable<{ position: Vector3 }>();

    /**
     * The distance towards the target drag position to move each frame. This can be useful to avoid jitter. Set this to 1 for no delay. (Default: 0.2)
     */
    public dragDeltaRatio = 0.2;

    /**
     * If the object should rotate to face the drag origin
     */
    public rotateDraggedObject = true;

    /**
     *  The name of the behavior
     */
    public get name(): string {
        return "SixDofDrag";
    }

    /**
     * Should the object rotate towards the camera when we start dragging it
     */
    public faceCameraOnDragStart = false;

    /**
     * Attaches the six DoF drag behavior
     * @param ownerNode The mesh that will be dragged around once attached
     */
    public attach(ownerNode: Mesh): void {
        super.attach(ownerNode);
        this._virtualTransformNode = new TransformNode("virtual_sixDof", BaseSixDofDragBehavior._virtualScene);
        this._virtualTransformNode.rotationQuaternion = Quaternion.Identity();

        // On every frame move towards target scaling to avoid jitter caused by vr controllers
        this._sceneRenderObserver = ownerNode.getScene().onBeforeRenderObservable.add(() => {
            var pickedMesh = this._draggedMesh;
            if (this.currentDraggingPointerIds.length === 1 && this._moving && pickedMesh) {
                // Slowly move mesh to avoid jitter
                PivotTools._RemoveAndStorePivotPoint(pickedMesh);

                if (this.ancestorToDrag) {
                    const delta = this._targetPosition.subtract(this.ancestorToDrag.absolutePosition).scale(this.dragDeltaRatio);
                    if (this.ancestorToDrag.parent) {
                        Vector3.TransformNormalToRef(delta, Matrix.Invert(this.ancestorToDrag.parent.getWorldMatrix()), delta);
                    }
                    this.ancestorToDrag.position.addInPlace(delta);
                    this.onPositionChangedObservable.notifyObservers({ position: this.ancestorToDrag.absolutePosition });
                } else {
                    pickedMesh.position.addInPlace(this._targetPosition.subtract(pickedMesh.position).scale(this.dragDeltaRatio));
                    this.onPositionChangedObservable.notifyObservers({ position: pickedMesh.absolutePosition });
                }

                var oldParent = this.ancestorToDrag ? this.ancestorToDrag.parent : this._ownerNode.parent;

                // Only rotate the mesh if it's parent has uniform scaling
                if (!oldParent || ((oldParent as Mesh).scaling && !(oldParent as Mesh).scaling.isNonUniformWithinEpsilon(0.001))) {
                    if (this.ancestorToDrag) {
                        this.ancestorToDrag.setParent(null);
                        Quaternion.SlerpToRef(this.ancestorToDrag.rotationQuaternion!, this._targetOrientation, this.dragDeltaRatio, this.ancestorToDrag.rotationQuaternion!);
                        this.ancestorToDrag.setParent(oldParent);
                    } else {
                        this._ownerNode.setParent(null);
                        Quaternion.SlerpToRef(this._ownerNode.rotationQuaternion!, this._targetOrientation, this.dragDeltaRatio, this._ownerNode.rotationQuaternion!);
                        this._ownerNode.setParent(oldParent);
                    }
                }

                PivotTools._RestorePivotPoint(pickedMesh);
            }
        });
    }

    private _onePointerPositionUpdated(worldDeltaPosition: Vector3, worldDeltaRotation: Quaternion) {
        let pointerDelta = TmpVectors.Vector3[0];
        pointerDelta.setAll(0);

        if (this.rotateDraggedObject) {
            // Convert change in rotation to only y axis rotation
            Quaternion.RotationYawPitchRollToRef(worldDeltaRotation.toEulerAngles("xyz").y, 0, 0, TmpVectors.Quaternion[0]);
            TmpVectors.Quaternion[0].multiplyToRef(this._startingOrientation, this._targetOrientation);
            this._startingPositionPointerOffset.rotateByQuaternionToRef(TmpVectors.Quaternion[0], pointerDelta);
            this._startingPositionPointerOffset.subtractToRef(pointerDelta, pointerDelta);
        }

        this._targetPosition.copyFrom(this._startingPosition).addInPlace(worldDeltaPosition).subtractInPlace(pointerDelta);
        if (this._ownerNode.parent && !this.ancestorToDrag) {
            Vector3.TransformCoordinatesToRef(this._targetPosition, Matrix.Invert(this._ownerNode.parent.getWorldMatrix()), this._targetPosition);
        }
    }

    private _getPositionOffsetAround(transformationLocalOrigin: Vector3, scaling: Vector3, rotation: Quaternion): Vector3 {
        const translationMatrix = TmpVectors.Matrix[0]; // T
        const translationMatrixInv = TmpVectors.Matrix[1]; // T'
        const rotationMatrix = TmpVectors.Matrix[2]; // R
        const scaleMatrix = TmpVectors.Matrix[3]; // S
        const finalMatrix = TmpVectors.Matrix[4]; // T' x R x S x T

        Matrix.TranslationToRef(transformationLocalOrigin.x, transformationLocalOrigin.y, transformationLocalOrigin.z, translationMatrix); // T
        Matrix.TranslationToRef(-transformationLocalOrigin.x, -transformationLocalOrigin.y, -transformationLocalOrigin.z, translationMatrixInv); // T'
        Matrix.FromQuaternionToRef(rotation, rotationMatrix); // R
        Matrix.ScalingToRef(scaling.x ,scaling.y, scaling.z, scaleMatrix)
        translationMatrixInv.multiplyToRef(rotationMatrix, finalMatrix); // T' x R
        finalMatrix.multiplyToRef(scaleMatrix, finalMatrix); // T' x R x S
        finalMatrix.multiplyToRef(translationMatrix, finalMatrix);  // T' x R x S x T

        return finalMatrix.getTranslation();
    }


    private _twoPointersPositionUpdated(worldDeltaPosition: Vector3, worldDeltaRotation: Quaternion, pointerId: number) {
        const startingPosition0 = this._virtualMeshesInfo[this.currentDraggingPointerIds[0]].startingPosition;
        const startingPosition1 = this._virtualMeshesInfo[this.currentDraggingPointerIds[1]].startingPosition;
        const startingCenter = startingPosition0.add(startingPosition1).scale(0.5);
        const startingVector = startingPosition1.subtract(startingPosition0);

        const currentPosition0 = this._virtualMeshesInfo[this.currentDraggingPointerIds[0]].dragMesh.absolutePosition;
        const currentPosition1 = this._virtualMeshesInfo[this.currentDraggingPointerIds[1]].dragMesh.absolutePosition;
        const currentCenter = currentPosition0.add(currentPosition1).scale(0.5);
        const currentVector = currentPosition1.subtract(currentPosition0);

        const scaling = new Vector3();
        scaling.setAll(currentVector.length() / startingVector.length());
        const translation = currentCenter.subtract(startingCenter);

        const rotationQuaternion = Quaternion.FromEulerAngles(0, Vector3.GetAngleBetweenVectorsOnPlane(startingVector.normalize(), currentVector.normalize(), Vector3.UpReadOnly), 0);

        // const previousVector = TmpVectors.Vector3[0].clone();
        // const newVector = TmpVectors.Vector3[1].clone();
        // previousPosition.subtractToRef(pivotPosition, previousVector);
        // newPosition.subtractToRef(pivotPosition, newVector);
        // const scalingDelta = newVector.length() / previousVector.length();
        // this._virtualTransformNode.rotateAround(
        //     this._virtualMeshesInfo[pointerId].dragMesh.absolutePosition,
        //     Vector3.UpReadOnly,
        //     Vector3.GetAngleBetweenVectorsOnPlane(previousVector.normalize(), newVector.normalize(), Vector3.UpReadOnly)
        // );
        // if (Vector3.GetAngleBetweenVectorsOnPlane(previousVector.normalize(), newVector.normalize(), Vector3.UpReadOnly) !== 0) {
        //     console.log(Vector3.GetAngleBetweenVectorsOnPlane(previousVector.normalize(), newVector.normalize(), Vector3.UpReadOnly));
        //     // console.log(newVector);
        // }
        // this._virtualTransformNode.scaling.scaleInPlace(scalingDelta);
        
        // TODO interpolate
        const referenceMesh = this.ancestorToDrag ? this.ancestorToDrag : this._ownerNode;
        const oldParent = referenceMesh.parent;
        referenceMesh.setParent(null);
        PivotTools._RemoveAndStorePivotPoint(referenceMesh);
        
        const positionOffset = this._getPositionOffsetAround(startingCenter.subtract(this._virtualTransformNode.position), scaling, rotationQuaternion);
        this._virtualTransformNode.rotationQuaternion!.multiplyToRef(rotationQuaternion, referenceMesh.rotationQuaternion!);
        this._virtualTransformNode.scaling.multiplyToRef(scaling, referenceMesh.scaling);
        this._virtualTransformNode.position.addToRef(translation.add(positionOffset), referenceMesh.position);
        
        PivotTools._RestorePivotPoint(referenceMesh);
        referenceMesh.setParent(oldParent);
    }

    protected _targetDragStart(worldPosition: Vector3, worldRotation: Quaternion, pointerId: number) {
        const pointerCount = this.currentDraggingPointerIds.length;
        const referenceMesh = this.ancestorToDrag ? this.ancestorToDrag : this._ownerNode;
        const oldParent = referenceMesh.parent;

        if (!referenceMesh.rotationQuaternion) {
            referenceMesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(referenceMesh.rotation.y, referenceMesh.rotation.x, referenceMesh.rotation.z);
        }
        referenceMesh.setParent(null);
        PivotTools._RemoveAndStorePivotPoint(referenceMesh);

        this._targetPosition.copyFrom(referenceMesh.absolutePosition);
        this._targetOrientation.copyFrom(referenceMesh.rotationQuaternion!);
        this._targetScaling.copyFrom(referenceMesh.scaling);
        if (this.faceCameraOnDragStart && this._scene.activeCamera && pointerCount === 1) {
            const toCamera = this._scene.activeCamera.position.subtract(this._ownerNode.getAbsolutePivotPoint()).normalize();
            const quat = Quaternion.FromLookDirectionLH(toCamera, new Vector3(0, 1, 0));
            quat.normalize();
            this._targetOrientation.copyFrom(quat);
        }
        this._startingPosition.copyFrom(this._targetPosition);
        this._startingOrientation.copyFrom(this._targetOrientation);
        this._startingScaling.copyFrom(this._targetScaling);
        this._startingPositionPointerOffset.copyFrom(this._targetPosition).subtractInPlace(worldPosition);

        if (pointerCount === 2) {
            this._virtualTransformNode.position.copyFrom(referenceMesh.absolutePosition);
            this._virtualTransformNode.scaling.copyFrom(referenceMesh.absoluteScaling);
            this._virtualTransformNode.rotationQuaternion!.copyFrom(referenceMesh.absoluteRotationQuaternion);
        }

        PivotTools._RestorePivotPoint(referenceMesh);
        referenceMesh.setParent(oldParent);
    }

    protected _targetDrag(worldDeltaPosition: Vector3, worldDeltaRotation: Quaternion, pointerId: number) {
        if (this.currentDraggingPointerIds.length === 1) {
            this._onePointerPositionUpdated(worldDeltaPosition, worldDeltaRotation);
        } else if (this.currentDraggingPointerIds.length === 2) {
            this._twoPointersPositionUpdated(worldDeltaPosition, worldDeltaRotation, pointerId);
        }
    }

    /**
     *  Detaches the behavior from the mesh
     */
    public detach(): void {
        super.detach();

        if (this._ownerNode) {
            this._ownerNode.getScene().onBeforeRenderObservable.remove(this._sceneRenderObserver);
        }

        this._virtualTransformNode.dispose();
    }
}
