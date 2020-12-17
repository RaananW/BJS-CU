// Assumptions: absolute position of button mesh is inside the mesh

import { DeepImmutableObject, Nullable } from "babylonjs/types";
import { Vector3 } from "babylonjs/Maths/math.vector";
import { Mesh } from "babylonjs/Meshes/mesh";
import { AbstractMesh } from "babylonjs/Meshes/abstractMesh";
import { TransformNode } from "babylonjs/Meshes/transformNode";
import { Scene } from "babylonjs/scene";
import { Ray } from "babylonjs/Culling/ray";

import { Button3D } from "./button3D";

/**
 * Enum for Button States
 */
enum ButtonState {
    /** None */
    None = 0,
    /** Pointer Entered */
    Hover = 1,
    /** Pointer Down */
    Press = 2
}

class TouchButton3DManager {
    private _touchButtonList = new Map<number, TouchButton3D>();
    private _buttonIndex = 1;

    private _sceneRegisteredOn: Nullable<Scene>;

    private _handleCollisions = () => {
        if (this._sceneRegisteredOn != null) {
            const touchMeshes = this._sceneRegisteredOn.getMeshesByTags("touchEnabled");

            this._touchButtonList.forEach(function (button: TouchButton3D) {
                touchMeshes.forEach(function (mesh: Mesh) {
                    button._collisionCheckForStateChange(mesh);
                });
            });
        }
    }

    /**
     * Creates a new touchButton3DManager
     */
    constructor() {
    }

    public addButton(button: TouchButton3D): number {
        const index = this._buttonIndex++;
        this._touchButtonList.set(index, button);
        return index;
    }

    public removeButton(index: number): boolean {
        return this._touchButtonList.delete(index);
    }

    public enableCollisionHandling(scene: Scene) {
        if (this._sceneRegisteredOn != scene) {
            if (this._sceneRegisteredOn != null) {
                this.disableCollisionHandling();
            }

            scene.registerBeforeRender(this._handleCollisions);
            this._sceneRegisteredOn = scene;
        }
    }

    public disableCollisionHandling() {
        this._sceneRegisteredOn?.unregisterBeforeRender(this._handleCollisions);
        this._sceneRegisteredOn = null;
    }
}

/**
 * Class used to create a touchable button in 3D
 */
export class TouchButton3D extends Button3D {
    private _collisionMesh: Mesh;
    private _collidableFrontDirection: Vector3;
    private _lastTouchPoint: Vector3;
    private _buttonForwardRay: Ray;

    private _collidableInitialized = false;

    private _frontOffset = 0;
    private _backOffset = 0;
    private _hoverOffset = 0;
    private _pushThroughBackOffset = 0;

    private _activeInteractions = new Map<number, ButtonState>();
    private _previousHeight = new Map<number, number>();

    private static _buttonManager = new TouchButton3DManager();
    private _buttonManagerIndex = 0;

    /**
     * Creates a new touchable button
     * @param name defines the control name
     * @param collisionMesh mesh to track collisions with
     */
    constructor(name?: string, collisionMesh?: Mesh) {
        super(name);

        if (collisionMesh) {
            this.collisionMesh = collisionMesh;
        }

        this._buttonManagerIndex = TouchButton3D._buttonManager.addButton(this);

        this._buttonForwardRay = new Ray(Vector3.Zero(), Vector3.Zero());
    }

    /**
     * Sets the front-facing direction of the button
     * @param frontDir the forward direction of the button
     */
    public set collidableFrontDirection(frontDir: Vector3) {
        this._collidableFrontDirection = frontDir.normalize();

        this._updateDistances();
    }

    /**
     * Sets the mesh used for testing input collision
     * @param collisionMesh the new collision mesh for the button
     */
    public set collisionMesh(collisionMesh: Mesh) {
        if (this._collisionMesh) {
            this._collisionMesh.dispose();
        }

        this._collisionMesh = collisionMesh;
        this._collisionMesh.metadata = this;

        this.collidableFrontDirection = collisionMesh.forward;

        this._collidableInitialized = true;
    }

    /**
     * Sets the scene used on the manager to register the collision callback on
     * @param scene the scene to use
     */
    public set sceneForCollisions(scene: Scene) {
        TouchButton3D._buttonManager.enableCollisionHandling(scene);
    }

    /*
     * Given a point, and two points on a line, this returns the distance between
     * the point and the closest point on the line. The closest point on the line
     * does not have to be between the two given points.
     *
     * Based off the 3D point-line distance equation
     *
     * Assumes lineDirection is normalized
     */
    private _getShortestDistancePointToLine(point: Vector3, linePoint: Vector3, lineDirection: Vector3) {
        const pointToLine = linePoint.subtract(point);
        const cross = lineDirection.cross(pointToLine);

        return cross.length();
    }

    /*
     * Checks to see if collidable is in a position to interact with the button
     *   - check if collidable has a plane height off the button that is within range
     *   - check that collidable + normal ray intersect the bounding sphere
     */
    private _isPrimedForInteraction(collidable: Vector3): boolean {
        // Check if the collidable has an appropriate planar height
        const heightFromCenter = this._getHeightFromButtonCenter(collidable);

        if (heightFromCenter > this._hoverOffset || heightFromCenter < this._pushThroughBackOffset) {
            return false;
        }

        // Check if the collidable or its hover ray lands within the bounding sphere of the button
        const distanceFromCenter = this._getShortestDistancePointToLine(this._collisionMesh.getAbsolutePosition(),
                                                                        collidable,
                                                                        this._collidableFrontDirection);
        return distanceFromCenter <= this._collisionMesh.getBoundingInfo().boundingSphere.radiusWorld;
    }

    /*
     * Returns a Vector3 of the collidable's projected position on the button
     * Returns the collidable's position if it is inside the button
     */
    private _getPointOnButton(collidable: Vector3): Vector3 {
        const heightFromCenter = this._getHeightFromButtonCenter(collidable);

        if (heightFromCenter <= this._frontOffset && heightFromCenter >= this._backOffset) {
            // The collidable is in the button, return its position
            return collidable;
        }
        else if (heightFromCenter > this._frontOffset) {
            // The collidable is in front of the button, project it to the surface
            const collidableDistanceToFront = (this._frontOffset - heightFromCenter);
            return collidable.add(this._collidableFrontDirection.scale(collidableDistanceToFront));
        }
        else {
            // The collidable is behind the button, project it to its back
            const collidableDistanceToBack = (this._backOffset - heightFromCenter);
            return collidable.add(this._collidableFrontDirection.scale(collidableDistanceToBack));
        }
    }

    /*
     * Updates the distance values.
     * Should be called when the front direction changes, or the mesh size changes
     *
     * Sets the following values:
     *    _frontOffset
     *    _backOffset
     *    _hoverOffset
     *    _pushThroughBackOffset
     *
     * Requires population of:
     *    _collisionMesh
     *    _collidableFrontDirection
     */
    private _updateDistances() {
        const collisionMeshPos = this._collisionMesh.getAbsolutePosition();

        this._buttonForwardRay.origin = collisionMeshPos;
        this._buttonForwardRay.direction = this._collidableFrontDirection;

        const frontPickingInfo = this._buttonForwardRay.intersectsMesh(this._collisionMesh as DeepImmutableObject<AbstractMesh>);
        this._buttonForwardRay.direction = this._buttonForwardRay.direction.negate();
        const backPickingInfo = this._buttonForwardRay.intersectsMesh(this._collisionMesh as DeepImmutableObject<AbstractMesh>);

        this._frontOffset = 0;
        this._backOffset = 0;

        if (frontPickingInfo.hit && backPickingInfo.hit) {
            this._frontOffset = this._getDistanceOffPlane(frontPickingInfo.pickedPoint!,
                                                              this._collidableFrontDirection,
                                                              collisionMeshPos);
            this._backOffset = this._getDistanceOffPlane(backPickingInfo.pickedPoint!,
                                                             this._collidableFrontDirection,
                                                             collisionMeshPos);
        }

        // For now, set the hover height equal to the thickness of the button
        const buttonThickness = this._frontOffset - this._backOffset;

        this._hoverOffset = this._frontOffset + (buttonThickness * 1.25);
        this._pushThroughBackOffset = this._backOffset - (buttonThickness * 1.5);
    }

    // Returns the distance in front of the center of the button
    // Returned value is negative when collidable is past the center
    private _getHeightFromButtonCenter(collidablePos: Vector3) {
        return this._getDistanceOffPlane(collidablePos, this._collidableFrontDirection, this._collisionMesh.getAbsolutePosition());
    }

    // Returns the distance from pointOnPlane to point along planeNormal
    private _getDistanceOffPlane(point: Vector3, planeNormal: Vector3, pointOnPlane: Vector3) {
        const d = Vector3.Dot(pointOnPlane, planeNormal);
        const abc = Vector3.Dot(point, planeNormal);

        return abc - d;
    }

    // Updates the stored state of the button, and fire pointer events
    private _updateButtonState(id: number, newState: ButtonState, pointOnButton: Vector3) {
        const dummyPointerId = 0;
        const buttonIndex = 0; // Left click
        const buttonStateForId = this._activeInteractions.get(id) || ButtonState.None;

        // Take into account all inputs interacting with the button to avoid state flickering
        let previousPushDepth = 0;
        this._activeInteractions.forEach(function(value, key) {
            previousPushDepth = Math.max(previousPushDepth, value);
        });

        if (buttonStateForId != newState) {
            if (newState == ButtonState.None) {
                this._activeInteractions.delete(id);
            }
            else {
                this._activeInteractions.set(id, newState);
            }
        }

        let newPushDepth = 0;
        this._activeInteractions.forEach(function(value, key) {
            newPushDepth = Math.max(newPushDepth, value);
        });

        if (newPushDepth == ButtonState.Press) {
            if (previousPushDepth == ButtonState.Hover) {
                this._onPointerDown(this, pointOnButton, dummyPointerId, buttonIndex);
            }
            else if (previousPushDepth == ButtonState.Press) {
                this._onPointerMove(this, pointOnButton);
            }
        }
        else if (newPushDepth == ButtonState.Hover) {
            if (previousPushDepth == ButtonState.None) {
                this._onPointerEnter(this);
            }
            else if (previousPushDepth == ButtonState.Press) {
                this._onPointerUp(this, pointOnButton, dummyPointerId, buttonIndex, false);
            }
            else {
                this._onPointerMove(this, pointOnButton);
            }
        }
        else if (newPushDepth == ButtonState.None) {
            if (previousPushDepth == ButtonState.Hover) {
                this._onPointerOut(this);
            }
            else if (previousPushDepth == ButtonState.Press) {
                this._onPointerUp(this, pointOnButton, dummyPointerId, buttonIndex, false);
                this._onPointerOut(this);
            }
        }
    }

    // Decides whether to change button state based on the planar depth of the input source
    /** @hidden */
    public _collisionCheckForStateChange(mesh: Mesh) {
        if (this._collidableInitialized) {
            const collidablePosition = mesh.getAbsolutePosition();
            const inRange = this._isPrimedForInteraction(collidablePosition);

            const uniqueId = mesh.uniqueId;

            if (inRange) {
                const pointOnButton = this._getPointOnButton(collidablePosition);
                const heightFromCenter = this._getHeightFromButtonCenter(collidablePosition);
                const flickerDelta = 0.003;

                this._lastTouchPoint = pointOnButton;

                const isGreater = function (compareHeight: number) {
                    return heightFromCenter >= (compareHeight + flickerDelta);
                };

                const isLower = function (compareHeight: number) {
                    return heightFromCenter <= (compareHeight - flickerDelta);
                };

                // Update button state and fire events
                switch (this._activeInteractions.get(uniqueId) || ButtonState.None) {
                    case ButtonState.None:
                        if (isGreater(this._frontOffset) &&
                            isLower(this._hoverOffset)) {
                            this._updateButtonState(uniqueId, ButtonState.Hover, pointOnButton);
                        }

                        break;
                    case ButtonState.Hover:
                        if (isGreater(this._hoverOffset)) {
                            this._updateButtonState(uniqueId, ButtonState.None, pointOnButton);
                        }
                        else if (isLower(this._frontOffset)) {
                            this._updateButtonState(uniqueId, ButtonState.Press, pointOnButton);
                        }

                        break;
                    case ButtonState.Press:
                        if (isGreater(this._frontOffset)) {
                            this._updateButtonState(uniqueId, ButtonState.Hover, pointOnButton);
                        }
                        else if (isLower(this._pushThroughBackOffset)) {
                            this._updateButtonState(uniqueId, ButtonState.None, pointOnButton);
                        }

                        break;
                }

                this._previousHeight.set(uniqueId, heightFromCenter);
            }
            else {
                this._updateButtonState(uniqueId, ButtonState.None, this._lastTouchPoint);
                this._previousHeight.delete(uniqueId);
            }
        }
    }

    protected _getTypeName(): string {
        return "TouchButton3D";
    }

    // Mesh association
    protected _createNode(scene: Scene): TransformNode {
        return super._createNode(scene);

        this.sceneForCollisions = scene;
    }

    /**
     * Releases all associated resources
     */
    public dispose() {
        super.dispose();

        if (this._collisionMesh) {
            this._collisionMesh.dispose();
        }

        TouchButton3D._buttonManager.removeButton(this._buttonManagerIndex);
    }
}