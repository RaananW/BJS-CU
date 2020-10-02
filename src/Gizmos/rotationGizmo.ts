import { Logger } from "../Misc/logger";
import { Observable, Observer } from "../Misc/observable";
import { Nullable } from "../types";
import { Vector3 } from "../Maths/math.vector";
import { Color3 } from '../Maths/math.color';
import { AbstractMesh } from "../Meshes/abstractMesh";
import { Mesh } from "../Meshes/mesh";
import { Gizmo } from "./gizmo";
import { PlaneRotationGizmo } from "./planeRotationGizmo";
import { UtilityLayerRenderer } from "../Rendering/utilityLayerRenderer";
import { Node } from "../node";
import { PointerEventTypes, PointerInfo } from "../Events/pointerEvents";
import { LinesMesh } from "../Meshes/linesMesh";
/**
 * Gizmo that enables rotating a mesh along 3 axis
 */
export class RotationGizmo extends Gizmo {
    /**
     * Internal gizmo used for interactions on the x axis
     */
    public xGizmo: PlaneRotationGizmo;
    /**
     * Internal gizmo used for interactions on the y axis
     */
    public yGizmo: PlaneRotationGizmo;
    /**
     * Internal gizmo used for interactions on the z axis
     */
    public zGizmo: PlaneRotationGizmo;

    /** Fires an event when any of it's sub gizmos are dragged */
    public onDragStartObservable = new Observable();
    /** Fires an event when any of it's sub gizmos are released from dragging */
    public onDragEndObservable = new Observable();

    private _meshAttached: Nullable<AbstractMesh>;
    private _nodeAttached: Nullable<Node>;
    private _observables: Nullable<Observer<PointerInfo>>[] = [];

    /** Gizmo state variables used for UI behavior */
    private dragging = false;
    /** Node Caching for quick lookup */
    private gizmoAxisCache: Map<Mesh, any> = new Map();

    public get attachedMesh() {
        return this._meshAttached;
    }
    public set attachedMesh(mesh: Nullable<AbstractMesh>) {
        this._meshAttached = mesh;
        this._nodeAttached = mesh;
        [this.xGizmo, this.yGizmo, this.zGizmo].forEach((gizmo) => {
            if (gizmo.isEnabled) {
                gizmo.attachedMesh = mesh;
            }
            else {
                gizmo.attachedMesh = null;
            }
        });
    }

    public get attachedNode() {
        return this._nodeAttached;
    }
    public set attachedNode(node: Nullable<Node>) {
        this._meshAttached = null;
        this._nodeAttached = node;
        [this.xGizmo, this.yGizmo, this.zGizmo].forEach((gizmo) => {
            if (gizmo.isEnabled) {
                gizmo.attachedNode = node;
            }
            else {
                gizmo.attachedNode = null;
            }
        });
    }

    /**
     * True when the mouse pointer is hovering a gizmo mesh
     */
    public get isHovered() {
        var hovered = false;
        [this.xGizmo, this.yGizmo, this.zGizmo].forEach((gizmo) => {
            hovered = hovered || gizmo.isHovered;
        });
        return hovered;
    }

    /**
     * Creates a RotationGizmo
     * @param gizmoLayer The utility layer the gizmo will be added to
     * @param tessellation Amount of tessellation to be used when creating rotation circles
     * @param useEulerRotation Use and update Euler angle instead of quaternion
     * @param thickness display gizmo axis thickness
     */
    constructor(gizmoLayer: UtilityLayerRenderer = UtilityLayerRenderer.DefaultUtilityLayer, tessellation = 32, useEulerRotation = false, thickness: number = 1) {
        super(gizmoLayer);
        this.xGizmo = new PlaneRotationGizmo(new Vector3(1, 0, 0), Color3.Red().scale(0.5), gizmoLayer, tessellation, this, useEulerRotation, thickness);
        this.yGizmo = new PlaneRotationGizmo(new Vector3(0, 1, 0), Color3.Green().scale(0.5), gizmoLayer, tessellation, this, useEulerRotation, thickness);
        this.zGizmo = new PlaneRotationGizmo(new Vector3(0, 0, 1), Color3.Blue().scale(0.5), gizmoLayer, tessellation, this, useEulerRotation, thickness);

        // Relay drag events
        [this.xGizmo, this.yGizmo, this.zGizmo].forEach((gizmo) => {
            gizmo.dragBehavior.onDragStartObservable.add(() => {
                this.onDragStartObservable.notifyObservers({});
            });
            gizmo.dragBehavior.onDragEndObservable.add(() => {
                this.onDragEndObservable.notifyObservers({});
            });
        });

        this.attachedMesh = null;
        this.attachedNode = null;
        this.subscribeToPointerObserver();
    }

    public set updateGizmoRotationToMatchAttachedMesh(value: boolean) {
        if (this.xGizmo) {
            this.xGizmo.updateGizmoRotationToMatchAttachedMesh = value;
            this.yGizmo.updateGizmoRotationToMatchAttachedMesh = value;
            this.zGizmo.updateGizmoRotationToMatchAttachedMesh = value;
        }
    }
    public get updateGizmoRotationToMatchAttachedMesh() {
        return this.xGizmo.updateGizmoRotationToMatchAttachedMesh;
    }

    /**
     * Drag distance in babylon units that the gizmo will snap to when dragged (Default: 0)
     */
    public set snapDistance(value: number) {
        if (this.xGizmo) {
            this.xGizmo.snapDistance = value;
            this.yGizmo.snapDistance = value;
            this.zGizmo.snapDistance = value;
        }
    }
    public get snapDistance() {
        return this.xGizmo.snapDistance;
    }

    /**
     * Ratio for the scale of the gizmo (Default: 1)
     */
    public set scaleRatio(value: number) {
        if (this.xGizmo) {
            this.xGizmo.scaleRatio = value;
            this.yGizmo.scaleRatio = value;
            this.zGizmo.scaleRatio = value;
        }
    }
    public get scaleRatio() {
        return this.xGizmo.scaleRatio;
    }
    /**
     * Builds Gizmo Axis Cache to enable features such as hover state preservation and graying out other axis during manipulation
     * @param mesh Axis gizmo mesh
      @param cache display gizmo axis thickness
     */
    public addToAxisCache(mesh: Mesh, cache: any) {
        this.gizmoAxisCache.set(mesh, cache);
    }

    /**
     * Subscribes to pointer up, down, and hover events. Used for responsive gizmos.
     */
    public subscribeToPointerObserver(): void {
        const pointerObserver = this.gizmoLayer.utilityLayerScene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.pickInfo) {
                // On Hover Logic
                console.log(pointerInfo.pickInfo.pickedMesh?.id);
                if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
                    if (this.dragging) { return; }
                    this.gizmoAxisCache.forEach((statusMap, parentMesh) => {
                        const isHovered = pointerInfo.pickInfo && (parentMesh.getChildMeshes().indexOf((pointerInfo.pickInfo.pickedMesh as Mesh)) != -1);
                        const material = isHovered || statusMap.active ? statusMap.hoverMaterial : statusMap.material;
                        parentMesh.getChildMeshes().forEach((m) => {
                            if (m.name !== 'ignore') {
                                m.material = material;
                                if ((m as LinesMesh).color) {
                                    (m as LinesMesh).color = material.diffuseColor;
                                }
                            }
                        });
                    });
                }

                // On Mouse Down
                if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                    // If user Clicked Gizmo
                    if (this.gizmoAxisCache.has(pointerInfo.pickInfo.pickedMesh?.parent as Mesh)) {
                        this.dragging = true;
                        const statusMap = this.gizmoAxisCache.get(pointerInfo.pickInfo.pickedMesh?.parent as Mesh);
                        statusMap!.active = true;
                        console.log(this.gizmoAxisCache);
                        this.gizmoAxisCache.forEach((statusMap, parentMesh) => {
                            const isHovered = pointerInfo.pickInfo && (parentMesh.getChildMeshes().indexOf((pointerInfo.pickInfo.pickedMesh as Mesh)) != -1);
                            const material = isHovered || statusMap.active ? statusMap.hoverMaterial : statusMap.disableMaterial;
                            parentMesh.getChildMeshes().forEach((m) => {
                                if (m.name !== 'ignore') {
                                    m.material = material;
                                    if ((m as LinesMesh).color) {
                                        (m as LinesMesh).color = material.diffuseColor;
                                    }
                                }
                            });
                        });
                    }
                }

                // On Mouse Up
                if (pointerInfo.type === PointerEventTypes.POINTERUP) {
                    this.gizmoAxisCache.forEach((statusMap, parentMesh) => {
                        statusMap.active = false;
                        this.dragging = false;
                        parentMesh.getChildMeshes().forEach((m) => {
                            if (m.name !== 'ignore') {
                                m.material = statusMap.material;
                                if ((m as LinesMesh).color) {
                                    (m as LinesMesh).color = statusMap.material.diffuseColor;
                                }
                            }
                        });
                    });
                }
            }
        });

        this._observables = [pointerObserver];
    }

    /**
     * Disposes of the gizmo
     */
    public dispose() {
        this.xGizmo.dispose();
        this.yGizmo.dispose();
        this.zGizmo.dispose();
        this.onDragStartObservable.clear();
        this.onDragEndObservable.clear();
        this._observables.forEach(obs => {
            this.gizmoLayer.utilityLayerScene.onPointerObservable.remove(obs);
        });
    }

    /**
     * CustomMeshes are not supported by this gizmo
     * @param mesh The mesh to replace the default mesh of the gizmo
     */
    public setCustomMesh(mesh: Mesh) {
        Logger.Error("Custom meshes are not supported on this gizmo, please set the custom meshes on the gizmos contained within this one (gizmo.xGizmo, gizmo.yGizmo, gizmo.zGizmo)");
    }
}
