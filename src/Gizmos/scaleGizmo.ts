import { Logger } from "../Misc/logger";
import { Observable, Observer } from "../Misc/observable";
import { Nullable } from "../types";
import { Vector3 } from "../Maths/math.vector";
import { Color3 } from '../Maths/math.color';
import { AbstractMesh } from "../Meshes/abstractMesh";
import { PolyhedronBuilder } from "../Meshes/Builders/polyhedronBuilder";
import { Gizmo } from "./gizmo";
import { AxisScaleGizmo } from "./axisScaleGizmo";
import { UtilityLayerRenderer } from "../Rendering/utilityLayerRenderer";
import { Mesh } from "../Meshes/mesh";
import { Node } from "../node";
import { PointerEventTypes, PointerInfo } from "../Events/pointerEvents";
import { LinesMesh } from "../Meshes/linesMesh";
import { StandardMaterial } from "../Materials/standardMaterial";
/**
 * Gizmo that enables scaling a mesh along 3 axis
 */
export class ScaleGizmo extends Gizmo {
    /**
     * Internal gizmo used for interactions on the x axis
     */
    public xGizmo: AxisScaleGizmo;
    /**
     * Internal gizmo used for interactions on the y axis
     */
    public yGizmo: AxisScaleGizmo;
    /**
     * Internal gizmo used for interactions on the z axis
     */
    public zGizmo: AxisScaleGizmo;

    /**
     * Internal gizmo used to scale all axis equally
     */
    public uniformScaleGizmo: AxisScaleGizmo;

    private _meshAttached: Nullable<AbstractMesh> = null;
    private _nodeAttached: Nullable<Node> = null;
    private _snapDistance: number;
    private _uniformScalingMesh: Mesh;
    private _octahedron: Mesh;
    private _sensitivity: number = 1;
    private _coloredMaterial: StandardMaterial;
    private _hoverMaterial: StandardMaterial;
    private _disableMaterial: StandardMaterial;
    private _observables: Nullable<Observer<PointerInfo>>[] = [];

    /** Gizmo state variables used for UI behavior */
    private dragging = false;
    /** Node Caching for quick lookup */
    private gizmoAxisCache: Map<Mesh, any> = new Map();

    /** Fires an event when any of it's sub gizmos are dragged */
    public onDragStartObservable = new Observable();
    /** Fires an event when any of it's sub gizmos are released from dragging */
    public onDragEndObservable = new Observable();

    public get attachedMesh() {
        return this._meshAttached;
    }
    public set attachedMesh(mesh: Nullable<AbstractMesh>) {
        this._meshAttached = mesh;
        this._nodeAttached = mesh;
        [this.xGizmo, this.yGizmo, this.zGizmo, this.uniformScaleGizmo].forEach((gizmo) => {
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
        [this.xGizmo, this.yGizmo, this.zGizmo, this.uniformScaleGizmo].forEach((gizmo) => {
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
     * Creates a ScaleGizmo
     * @param gizmoLayer The utility layer the gizmo will be added to
     * @param thickness display gizmo axis thickness
     */
    constructor(gizmoLayer: UtilityLayerRenderer = UtilityLayerRenderer.DefaultUtilityLayer, thickness: number = 1) {
        super(gizmoLayer);
        this.uniformScaleGizmo = this._createUniformScaleMesh();
        this.xGizmo = new AxisScaleGizmo(new Vector3(1, 0, 0), Color3.Red().scale(0.5), gizmoLayer, this, thickness);
        this.yGizmo = new AxisScaleGizmo(new Vector3(0, 1, 0), Color3.Green().scale(0.5), gizmoLayer, this, thickness);
        this.zGizmo = new AxisScaleGizmo(new Vector3(0, 0, 1), Color3.Blue().scale(0.5), gizmoLayer, this, thickness);

        // Relay drag events
        [this.xGizmo, this.yGizmo, this.zGizmo, this.uniformScaleGizmo].forEach((gizmo) => {
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

    /** Create Geometry for Gizmo */
    private _createUniformScaleMesh(): AxisScaleGizmo {
        this._coloredMaterial = new StandardMaterial("", this.gizmoLayer.utilityLayerScene);
        this._coloredMaterial.diffuseColor = Color3.Gray();

        this._hoverMaterial = new StandardMaterial("", this.gizmoLayer.utilityLayerScene);
        this._hoverMaterial.diffuseColor = Color3.Yellow();

        this._disableMaterial = new StandardMaterial("", this.gizmoLayer.utilityLayerScene);
        this._disableMaterial.diffuseColor = Color3.Gray();
        this._disableMaterial.alpha = 0.4;

        const uniformScaleGizmo = new AxisScaleGizmo(new Vector3(0, 1, 0), Color3.Gray().scale(0.5), this.gizmoLayer, this);
        uniformScaleGizmo.updateGizmoRotationToMatchAttachedMesh = false;
        uniformScaleGizmo.uniformScaling = true;
        this._uniformScalingMesh = PolyhedronBuilder.CreatePolyhedron("uniform", { type: 1 }, uniformScaleGizmo.gizmoLayer.utilityLayerScene);
        this._uniformScalingMesh.scaling.scaleInPlace(0.01);
        this._uniformScalingMesh.visibility = 0;
        this._octahedron = PolyhedronBuilder.CreatePolyhedron("", { type: 1 }, uniformScaleGizmo.gizmoLayer.utilityLayerScene);
        this._octahedron.scaling.scaleInPlace(0.007);
        this._uniformScalingMesh.addChild(this._octahedron);
        uniformScaleGizmo.setCustomMesh(this._uniformScalingMesh, true);
        var light = this.gizmoLayer._getSharedGizmoLight();
        light.includedOnlyMeshes = light.includedOnlyMeshes.concat(this._octahedron);

        const cache = {
            gizmoMeshes: uniformScaleGizmo._rootMesh.getChildMeshes(),
            material: this._coloredMaterial,
            hoverMaterial: this._hoverMaterial,
            disableMaterial: this._disableMaterial,
            active: false
        };

        this.addToAxisCache(uniformScaleGizmo._rootMesh, cache);

        return uniformScaleGizmo;
    }

    public set updateGizmoRotationToMatchAttachedMesh(value: boolean) {
        if (!value) {
            Logger.Warn("Setting updateGizmoRotationToMatchAttachedMesh = false on scaling gizmo is not supported.");
        }
        else {
            this._updateGizmoRotationToMatchAttachedMesh = value;
            [this.xGizmo, this.yGizmo, this.zGizmo, this.uniformScaleGizmo].forEach((gizmo) => {
                if (gizmo) {
                    gizmo.updateGizmoRotationToMatchAttachedMesh = value;
                }
            });
        }
    }
    public get updateGizmoRotationToMatchAttachedMesh() {
        return this._updateGizmoRotationToMatchAttachedMesh;
    }

    /**
     * Drag distance in babylon units that the gizmo will snap to when dragged (Default: 0)
     */
    public set snapDistance(value: number) {
        this._snapDistance = value;
        [this.xGizmo, this.yGizmo, this.zGizmo, this.uniformScaleGizmo].forEach((gizmo) => {
            if (gizmo) {
                gizmo.snapDistance = value;
            }
        });
    }
    public get snapDistance() {
        return this._snapDistance;
    }

    /**
     * Ratio for the scale of the gizmo (Default: 1)
     */
    public set scaleRatio(value: number) {
        this._scaleRatio = value;
        [this.xGizmo, this.yGizmo, this.zGizmo, this.uniformScaleGizmo].forEach((gizmo) => {
            if (gizmo) {
                gizmo.scaleRatio = value;
            }
        });
    }
    public get scaleRatio() {
        return this._scaleRatio;
    }

    /**
     * Sensitivity factor for dragging (Default: 1)
     */
    public set sensitivity(value: number) {
        this._sensitivity = value;
        [this.xGizmo, this.yGizmo, this.zGizmo, this.uniformScaleGizmo].forEach((gizmo) => {
            if (gizmo) {
                gizmo.sensitivity = value;
            }
        });
    }
    public get sensitivity() {
        return this._sensitivity;
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
                if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
                    if (this.dragging) { return; }
                    this.gizmoAxisCache.forEach((cache) => {
                        const isHovered = (cache.gizmoMeshes.indexOf(pointerInfo?.pickInfo?.pickedMesh as Mesh) != -1);
                        const material = isHovered || cache.active ? cache.hoverMaterial : cache.material;
                        cache.gizmoMeshes.forEach((m: Mesh) => {
                            m.material = material;
                            if ((m as LinesMesh).color) {
                                (m as LinesMesh).color = material.diffuseColor;
                            }
                        });
                    });
                }

                // On Mouse Down
                if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                    // If user Clicked Gizmo
                    if (this.gizmoAxisCache.has(pointerInfo.pickInfo.pickedMesh?.parent as Mesh)) {
                        console.log(pointerInfo.pickInfo.pickedMesh)
                        this.dragging = true;
                        const statusMap = this.gizmoAxisCache.get(pointerInfo.pickInfo.pickedMesh?.parent as Mesh);
                        statusMap!.active = true;
                        this.gizmoAxisCache.forEach((cache) => {
                            const isHovered = cache.gizmoMeshes.indexOf((pointerInfo?.pickInfo?.pickedMesh?.parent as Mesh)) != -1;
                            const material = isHovered || cache.active ? cache.hoverMaterial : cache.disableMaterial;
                            cache.gizmoMeshes.forEach((m: Mesh) => {
                                m.material = material;
                                if ((m as LinesMesh).color) {
                                    (m as LinesMesh).color = material.diffuseColor;
                                }
                            });
                        });
                    }
                }

                // On Mouse Up
                if (pointerInfo.type === PointerEventTypes.POINTERUP) {
                    this.gizmoAxisCache.forEach((cache) => {
                        cache.active = false;
                        this.dragging = false;
                        cache.gizmoMeshes.forEach((m: Mesh) => {
                            m.material = cache.material;
                            if ((m as LinesMesh).color) {
                                (m as LinesMesh).color = cache.material.diffuseColor;
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
        [this.xGizmo, this.yGizmo, this.zGizmo, this.uniformScaleGizmo].forEach((gizmo) => {
            if (gizmo) {
                gizmo.dispose();
            }
        });
        this._observables.forEach((obs) => {
            this.gizmoLayer.utilityLayerScene.onPointerObservable.remove(obs);
        });
        this.onDragStartObservable.clear();
        this.onDragEndObservable.clear();
        [this._uniformScalingMesh, this._octahedron].forEach((msh) => {
            if (msh) {
                msh.dispose();
            }
        });
        [this._coloredMaterial, this._hoverMaterial, this._disableMaterial].forEach((matl) => {
            if (matl) {
                matl.dispose();
            }
        });
    }
}
