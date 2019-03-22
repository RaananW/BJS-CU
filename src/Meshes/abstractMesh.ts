import { Tools } from "../Misc/tools";
import { Observer, Observable } from "../Misc/observable";
import { Nullable, FloatArray, IndicesArray, DeepImmutable } from "../types";
import { Camera } from "../Cameras/camera";
import { Scene, IDisposable } from "../scene";
import { Quaternion, Matrix, Vector3, Color3, Color4, Plane, Tmp, Epsilon, Axis, Vector2 } from "../Maths/math";
import { Engine } from "../Engines/engine";
import { Node } from "../node";
import { VertexBuffer } from "../Meshes/buffer";
import { VertexData, IGetSetVerticesData } from "../Meshes/mesh.vertexData";
import { TransformNode } from "../Meshes/transformNode";
import { SubMesh } from "../Meshes/subMesh";
import { PickingInfo } from "../Collisions/pickingInfo";
import { IntersectionInfo } from "../Collisions/intersectionInfo";
import { ICullable, BoundingInfo } from "../Culling/boundingInfo";
import { Material } from "../Materials/material";
import { MaterialDefines } from "../Materials/materialDefines";
import { Light } from "../Lights/light";
import { Skeleton } from "../Bones/skeleton";
import { IEdgesRenderer } from "../Rendering/edgesRenderer";
import { SolidParticle } from "../Particles/solidParticle";
import { Constants } from "../Engines/constants";
import { AbstractActionManager } from '../Actions/abstractActionManager';

declare type Ray = import("../Culling/ray").Ray;
declare type Collider = import("../Collisions/collider").Collider;
declare type TrianglePickingPredicate = import("../Culling/ray").TrianglePickingPredicate;

/** @hidden */
class _FacetDataStorage {
    // facetData private properties
    public facetPositions: Vector3[];             // facet local positions
    public facetNormals: Vector3[];               // facet local normals
    public facetPartitioning: number[][];         // partitioning array of facet index arrays
    public facetNb: number = 0;                   // facet number
    public partitioningSubdivisions: number = 10; // number of subdivisions per axis in the partioning space
    public partitioningBBoxRatio: number = 1.01;  // the partioning array space is by default 1% bigger than the bounding box
    public facetDataEnabled: boolean = false;     // is the facet data feature enabled on this mesh ?
    public facetParameters: any = {};             // keep a reference to the object parameters to avoid memory re-allocation
    public bbSize: Vector3 = Vector3.Zero();      // bbox size approximated for facet data
    public subDiv = {                             // actual number of subdivisions per axis for ComputeNormals()
        max: 1,
        X: 1,
        Y: 1,
        Z: 1
    };

    public facetDepthSort: boolean = false;                           // is the facet depth sort to be computed
    public facetDepthSortEnabled: boolean = false;                    // is the facet depth sort initialized
    public depthSortedIndices: IndicesArray;                          // copy of the indices array to store them once sorted
    public depthSortedFacets: { ind: number, sqDistance: number }[];    // array of depth sorted facets
    public facetDepthSortFunction: (f1: { ind: number, sqDistance: number }, f2: { ind: number, sqDistance: number }) => number;  // facet depth sort function
    public facetDepthSortFrom: Vector3;                               // location where to depth sort from
    public facetDepthSortOrigin: Vector3;                             // same as facetDepthSortFrom but expressed in the mesh local space

    public invertedMatrix: Matrix; // Inverted world matrix.
}

/**
 * Class used to store all common mesh properties
 */
export class AbstractMesh extends TransformNode implements IDisposable, ICullable, IGetSetVerticesData {
    /** No occlusion */
    public static OCCLUSION_TYPE_NONE = 0;
    /** Occlusion set to optimisitic */
    public static OCCLUSION_TYPE_OPTIMISTIC = 1;
    /** Occlusion set to strict */
    public static OCCLUSION_TYPE_STRICT = 2;
    /** Use an accurante occlusion algorithm */
    public static OCCLUSION_ALGORITHM_TYPE_ACCURATE = 0;
    /** Use a conservative occlusion algorithm */
    public static OCCLUSION_ALGORITHM_TYPE_CONSERVATIVE = 1;

    /** Default culling strategy : this is an exclusion test and it's the more accurate.
     *  Test order :
     *  Is the bounding sphere outside the frustum ?
     *  If not, are the bounding box vertices outside the frustum ?
     *  It not, then the cullable object is in the frustum.
     */
    public static readonly CULLINGSTRATEGY_STANDARD = Constants.MESHES_CULLINGSTRATEGY_STANDARD;
    /** Culling strategy : Bounding Sphere Only.
     *  This is an exclusion test. It's faster than the standard strategy because the bounding box is not tested.
     *  It's also less accurate than the standard because some not visible objects can still be selected.
     *  Test : is the bounding sphere outside the frustum ?
     *  If not, then the cullable object is in the frustum.
     */
    public static readonly CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY = Constants.MESHES_CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
    /** Culling strategy : Optimistic Inclusion.
     *  This in an inclusion test first, then the standard exclusion test.
     *  This can be faster when a cullable object is expected to be almost always in the camera frustum.
     *  This could also be a little slower than the standard test when the tested object center is not the frustum but one of its bounding box vertex is still inside.
     *  Anyway, it's as accurate as the standard strategy.
     *  Test :
     *  Is the cullable object bounding sphere center in the frustum ?
     *  If not, apply the default culling strategy.
     */
    public static readonly CULLINGSTRATEGY_OPTIMISTIC_INCLUSION = Constants.MESHES_CULLINGSTRATEGY_OPTIMISTIC_INCLUSION;
    /** Culling strategy : Optimistic Inclusion then Bounding Sphere Only.
     *  This in an inclusion test first, then the bounding sphere only exclusion test.
     *  This can be the fastest test when a cullable object is expected to be almost always in the camera frustum.
     *  This could also be a little slower than the BoundingSphereOnly strategy when the tested object center is not in the frustum but its bounding sphere still intersects it.
     *  It's less accurate than the standard strategy and as accurate as the BoundingSphereOnly strategy.
     *  Test :
     *  Is the cullable object bounding sphere center in the frustum ?
     *  If not, apply the Bounding Sphere Only strategy. No Bounding Box is tested here.
     */
    public static readonly CULLINGSTRATEGY_OPTIMISTIC_INCLUSION_THEN_BSPHERE_ONLY = Constants.MESHES_CULLINGSTRATEGY_OPTIMISTIC_INCLUSION_THEN_BSPHERE_ONLY;

    /**
     * No billboard
     */
    public static get BILLBOARDMODE_NONE(): number {
        return TransformNode.BILLBOARDMODE_NONE;
    }

    /** Billboard on X axis */
    public static get BILLBOARDMODE_X(): number {
        return TransformNode.BILLBOARDMODE_X;
    }

    /** Billboard on Y axis */
    public static get BILLBOARDMODE_Y(): number {
        return TransformNode.BILLBOARDMODE_Y;
    }

    /** Billboard on Z axis */
    public static get BILLBOARDMODE_Z(): number {
        return TransformNode.BILLBOARDMODE_Z;
    }

    /** Billboard on all axes */
    public static get BILLBOARDMODE_ALL(): number {
        return TransformNode.BILLBOARDMODE_ALL;
    }

    private _facetData = new _FacetDataStorage();

    /**
     * The culling strategy to use to check whether the mesh must be rendered or not.
     * This value can be changed at any time and will be used on the next render mesh selection.
     * The possible values are :
     * - AbstractMesh.CULLINGSTRATEGY_STANDARD
     * - AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY
     * - AbstractMesh.CULLINGSTRATEGY_OPTIMISTIC_INCLUSION
     * - AbstractMesh.CULLINGSTRATEGY_OPTIMISTIC_INCLUSION_THEN_BSPHERE_ONLY
     * Please read each static variable documentation to get details about the culling process.
     * */
    public cullingStrategy = AbstractMesh.CULLINGSTRATEGY_STANDARD;

    /**
     * Gets the number of facets in the mesh
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata#what-is-a-mesh-facet
     */
    public get facetNb(): number {
        return this._facetData.facetNb;
    }
    /**
     * Gets or set the number (integer) of subdivisions per axis in the partioning space
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata#tweaking-the-partitioning
     */
    public get partitioningSubdivisions(): number {
        return this._facetData.partitioningSubdivisions;
    }
    public set partitioningSubdivisions(nb: number) {
        this._facetData.partitioningSubdivisions = nb;
    }
    /**
     * The ratio (float) to apply to the bouding box size to set to the partioning space.
     * Ex : 1.01 (default) the partioning space is 1% bigger than the bounding box
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata#tweaking-the-partitioning
     */
    public get partitioningBBoxRatio(): number {
        return this._facetData.partitioningBBoxRatio;
    }
    public set partitioningBBoxRatio(ratio: number) {
        this._facetData.partitioningBBoxRatio = ratio;
    }

    /**
     * Gets or sets a boolean indicating that the facets must be depth sorted on next call to `updateFacetData()`.
     * Works only for updatable meshes.
     * Doesn't work with multi-materials
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata#facet-depth-sort
     */
    public get mustDepthSortFacets(): boolean {
        return this._facetData.facetDepthSort;
    }
    public set mustDepthSortFacets(sort: boolean) {
        this._facetData.facetDepthSort = sort;
    }

    /**
     * The location (Vector3) where the facet depth sort must be computed from.
     * By default, the active camera position.
     * Used only when facet depth sort is enabled
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata#facet-depth-sort
     */
    public get facetDepthSortFrom(): Vector3 {
        return this._facetData.facetDepthSortFrom;
    }
    public set facetDepthSortFrom(location: Vector3) {
        this._facetData.facetDepthSortFrom = location;
    }

    /**
     * gets a boolean indicating if facetData is enabled
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata#what-is-a-mesh-facet
     */
    public get isFacetDataEnabled(): boolean {
        return this._facetData.facetDataEnabled;
    }

    /** @hidden */
    public _updateNonUniformScalingState(value: boolean): boolean {
        if (!super._updateNonUniformScalingState(value)) {
            return false;
        }
        this._markSubMeshesAsMiscDirty();
        return true;
    }

    // Events

    /**
    * An event triggered when this mesh collides with another one
    */
    public onCollideObservable = new Observable<AbstractMesh>();

    private _onCollideObserver: Nullable<Observer<AbstractMesh>>;

    /** Set a function to call when this mesh collides with another one */
    public set onCollide(callback: () => void) {
        if (this._onCollideObserver) {
            this.onCollideObservable.remove(this._onCollideObserver);
        }
        this._onCollideObserver = this.onCollideObservable.add(callback);
    }

    /**
    * An event triggered when the collision's position changes
    */
    public onCollisionPositionChangeObservable = new Observable<Vector3>();

    private _onCollisionPositionChangeObserver: Nullable<Observer<Vector3>>;
    /** Set a function to call when the collision's position changes */
    public set onCollisionPositionChange(callback: () => void) {
        if (this._onCollisionPositionChangeObserver) {
            this.onCollisionPositionChangeObservable.remove(this._onCollisionPositionChangeObserver);
        }
        this._onCollisionPositionChangeObserver = this.onCollisionPositionChangeObservable.add(callback);
    }

    /**
    * An event triggered when material is changed
    */
    public onMaterialChangedObservable = new Observable<AbstractMesh>();

    // Properties

    /**
     * Gets or sets the orientation for POV movement & rotation
     */
    public definedFacingForward = true;

    /** @hidden */
    public _occlusionQuery: Nullable<WebGLQuery>;

    private _visibility = 1.0;

    /**
     * Gets or sets mesh visibility between 0 and 1 (default is 1)
     */
    public get visibility(): number {
        return this._visibility;
    }

    /**
     * Gets or sets mesh visibility between 0 and 1 (default is 1)
     */
    public set visibility(value: number) {
        if (this._visibility === value) {
            return;
        }

        this._visibility = value;
        this._markSubMeshesAsMiscDirty();
    }

    /** Gets or sets the alpha index used to sort transparent meshes
     * @see http://doc.babylonjs.com/resources/transparency_and_how_meshes_are_rendered#alpha-index
     */
    public alphaIndex = Number.MAX_VALUE;

    /**
     * Gets or sets a boolean indicating if the mesh is visible (renderable). Default is true
     */
    public isVisible = true;

    /**
     * Gets or sets a boolean indicating if the mesh can be picked (by scene.pick for instance or through actions). Default is true
     */
    public isPickable = true;

    /** Gets or sets a boolean indicating that bounding boxes of subMeshes must be rendered as well (false by default) */
    public showSubMeshesBoundingBox = false;

    /** Gets or sets a boolean indicating if the mesh must be considered as a ray blocker for lens flares (false by default)
     * @see http://doc.babylonjs.com/how_to/how_to_use_lens_flares
     */
    public isBlocker = false;

    /**
     * Gets or sets a boolean indicating that pointer move events must be supported on this mesh (false by default)
     */
    public enablePointerMoveEvents = false;

    /**
     * Specifies the rendering group id for this mesh (0 by default)
     * @see http://doc.babylonjs.com/resources/transparency_and_how_meshes_are_rendered#rendering-groups
     */
    public renderingGroupId = 0;
    private _material: Nullable<Material>;

    /** Gets or sets current material */
    public get material(): Nullable<Material> {
        return this._material;
    }
    public set material(value: Nullable<Material>) {
        if (this._material === value) {
            return;
        }

        // remove from material mesh map id needed
        if (this._material && this._material.meshMap) {
            this._material.meshMap[this.uniqueId] = undefined;
        }

        this._material = value;

        if (value && value.meshMap) {
            value.meshMap[this.uniqueId] = this;
        }

        if (this.onMaterialChangedObservable.hasObservers) {
            this.onMaterialChangedObservable.notifyObservers(this);
        }

        if (!this.subMeshes) {
            return;
        }

        this._unBindEffect();
    }

    private _receiveShadows = false;

    /**
     * Gets or sets a boolean indicating that this mesh can receive realtime shadows
     * @see http://doc.babylonjs.com/babylon101/shadows
     */
    public get receiveShadows(): boolean {
        return this._receiveShadows;
    }
    public set receiveShadows(value: boolean) {
        if (this._receiveShadows === value) {
            return;
        }

        this._receiveShadows = value;
        this._markSubMeshesAsLightDirty();
    }

    /** Defines color to use when rendering outline */
    public outlineColor = Color3.Red();
    /** Define width to use when rendering outline */
    public outlineWidth = 0.02;

    /** Defines color to use when rendering overlay */
    public overlayColor = Color3.Red();
    /** Defines alpha to use when rendering overlay */
    public overlayAlpha = 0.5;

    private _hasVertexAlpha = false;
    /** Gets or sets a boolean indicating that this mesh contains vertex color data with alpha values */
    public get hasVertexAlpha(): boolean {
        return this._hasVertexAlpha;
    }
    public set hasVertexAlpha(value: boolean) {
        if (this._hasVertexAlpha === value) {
            return;
        }

        this._hasVertexAlpha = value;
        this._markSubMeshesAsAttributesDirty();
        this._markSubMeshesAsMiscDirty();
    }

    private _useVertexColors = true;

    /** Gets or sets a boolean indicating that this mesh needs to use vertex color data to render (if this kind of vertex data is available in the geometry) */
    public get useVertexColors(): boolean {
        return this._useVertexColors;
    }
    public set useVertexColors(value: boolean) {
        if (this._useVertexColors === value) {
            return;
        }

        this._useVertexColors = value;
        this._markSubMeshesAsAttributesDirty();
    }

    private _computeBonesUsingShaders = true;
    /**
     * Gets or sets a boolean indicating that bone animations must be computed by the CPU (false by default)
     */
    public get computeBonesUsingShaders(): boolean {
        return this._computeBonesUsingShaders;
    }
    public set computeBonesUsingShaders(value: boolean) {
        if (this._computeBonesUsingShaders === value) {
            return;
        }

        this._computeBonesUsingShaders = value;
        this._markSubMeshesAsAttributesDirty();
    }

    private _numBoneInfluencers = 4;
    /** Gets or sets the number of allowed bone influences per vertex (4 by default) */
    public get numBoneInfluencers(): number {
        return this._numBoneInfluencers;
    }
    public set numBoneInfluencers(value: number) {
        if (this._numBoneInfluencers === value) {
            return;
        }

        this._numBoneInfluencers = value;
        this._markSubMeshesAsAttributesDirty();
    }

    private _applyFog = true;

    /** Gets or sets a boolean indicating that this mesh will allow fog to be rendered on it (true by default) */
    public get applyFog(): boolean {
        return this._applyFog;
    }
    public set applyFog(value: boolean) {
        if (this._applyFog === value) {
            return;
        }

        this._applyFog = value;
        this._markSubMeshesAsMiscDirty();
    }

    /** Gets or sets a boolean indicating that internal octree (if available) can be used to boost submeshes selection (true by default) */
    public useOctreeForRenderingSelection = true;
    /** Gets or sets a boolean indicating that internal octree (if available) can be used to boost submeshes picking (true by default) */
    public useOctreeForPicking = true;
    /** Gets or sets a boolean indicating that internal octree (if available) can be used to boost submeshes collision (true by default) */
    public useOctreeForCollisions = true;

    private _layerMask: number = 0x0FFFFFFF;

    /**
     * Gets or sets the current layer mask (default is 0x0FFFFFFF)
     * @see http://doc.babylonjs.com/how_to/layermasks_and_multi-cam_textures
     */
    public get layerMask(): number {
        return this._layerMask;
    }

    public set layerMask(value: number) {
        if (value === this._layerMask) {
            return;
        }

        this._layerMask = value;
        this._resyncLightSources();
    }

    /**
     * True if the mesh must be rendered in any case (this will shortcut the frustum clipping phase)
     */
    public alwaysSelectAsActiveMesh = false;

    /**
     * Gets or sets the current action manager
     * @see http://doc.babylonjs.com/how_to/how_to_use_actions
     */
    public actionManager: Nullable<AbstractActionManager> = null;

    // Collisions
    private _checkCollisions = false;
    private _collisionMask = -1;
    private _collisionGroup = -1;

    /**
     * Gets or sets the ellipsoid used to impersonate this mesh when using collision engine (default is (0.5, 1, 0.5))
     * @see http://doc.babylonjs.com/babylon101/cameras,_mesh_collisions_and_gravity
     */
    public ellipsoid = new Vector3(0.5, 1, 0.5);
    /**
     * Gets or sets the ellipsoid offset used to impersonate this mesh when using collision engine (default is (0, 0, 0))
     * @see http://doc.babylonjs.com/babylon101/cameras,_mesh_collisions_and_gravity
     */
    public ellipsoidOffset = new Vector3(0, 0, 0);
    private _collider: Collider;
    private _oldPositionForCollisions = new Vector3(0, 0, 0);
    private _diffPositionForCollisions = new Vector3(0, 0, 0);

    /**
     * Gets or sets a collision mask used to mask collisions (default is -1).
     * A collision between A and B will happen if A.collisionGroup & b.collisionMask !== 0
     */
    public get collisionMask(): number {
        return this._collisionMask;
    }

    public set collisionMask(mask: number) {
        this._collisionMask = !isNaN(mask) ? mask : -1;
    }

    /**
     * Gets or sets the current collision group mask (-1 by default).
     * A collision between A and B will happen if A.collisionGroup & b.collisionMask !== 0
     */
    public get collisionGroup(): number {
        return this._collisionGroup;
    }

    public set collisionGroup(mask: number) {
        this._collisionGroup = !isNaN(mask) ? mask : -1;
    }

    // Edges
    /**
     * Defines edge width used when edgesRenderer is enabled
     * @see https://www.babylonjs-playground.com/#10OJSG#13
     */
    public edgesWidth = 1;
    /**
     * Defines edge color used when edgesRenderer is enabled
     * @see https://www.babylonjs-playground.com/#10OJSG#13
     */
    public edgesColor = new Color4(1, 0, 0, 1);
    /** @hidden */
    public _edgesRenderer: Nullable<IEdgesRenderer>;

    /** @hidden */
    public _masterMesh: Nullable<AbstractMesh>;
    /** @hidden */
    public _boundingInfo: Nullable<BoundingInfo>;
    /** @hidden */
    public _renderId = 0;

    /**
     * Gets or sets the list of subMeshes
     * @see http://doc.babylonjs.com/how_to/multi_materials
     */
    public subMeshes: SubMesh[];

    /** @hidden */
    public _intersectionsInProgress = new Array<AbstractMesh>();

    /** @hidden */
    public _unIndexed = false;

    /** @hidden */
    public _lightSources = new Array<Light>();

    /** @hidden */
    public get _positions(): Nullable<Vector3[]> {
        return null;
    }

    // Loading properties
    /** @hidden */
    public _waitingActions: any;
    /** @hidden */
    public _waitingFreezeWorldMatrix: Nullable<boolean>;

    // Skeleton
    private _skeleton: Nullable<Skeleton>;
    /** @hidden */
    public _bonesTransformMatrices: Nullable<Float32Array>;

    /**
     * Gets or sets a skeleton to apply skining transformations
     * @see http://doc.babylonjs.com/how_to/how_to_use_bones_and_skeletons
     */
    public set skeleton(value: Nullable<Skeleton>) {
        if (this._skeleton && this._skeleton.needInitialSkinMatrix) {
            this._skeleton._unregisterMeshWithPoseMatrix(this);
        }

        if (value && value.needInitialSkinMatrix) {
            value._registerMeshWithPoseMatrix(this);
        }

        this._skeleton = value;

        if (!this._skeleton) {
            this._bonesTransformMatrices = null;
        }

        this._markSubMeshesAsAttributesDirty();
    }

    public get skeleton(): Nullable<Skeleton> {
        return this._skeleton;
    }

    /**
     * An event triggered when the mesh is rebuilt.
     */
    public onRebuildObservable = new Observable<AbstractMesh>();

    // Constructor

    /**
     * Creates a new AbstractMesh
     * @param name defines the name of the mesh
     * @param scene defines the hosting scene
     */
    constructor(name: string, scene: Nullable<Scene> = null) {
        super(name, scene, false);

        this.getScene().addMesh(this);

        this._resyncLightSources();
    }

    /**
     * Returns the string "AbstractMesh"
     * @returns "AbstractMesh"
     */
    public getClassName(): string {
        return "AbstractMesh";
    }

    /**
     * Gets a string representation of the current mesh
     * @param fullDetails defines a boolean indicating if full details must be included
     * @returns a string representation of the current mesh
     */
    public toString(fullDetails?: boolean): string {
        var ret = "Name: " + this.name + ", isInstance: " + (this.getClassName() !== "InstancedMesh" ? "YES" : "NO");
        ret += ", # of submeshes: " + (this.subMeshes ? this.subMeshes.length : 0);
        if (this._skeleton) {
            ret += ", skeleton: " + this._skeleton.name;
        }
        if (fullDetails) {
            ret += ", billboard mode: " + (["NONE", "X", "Y", null, "Z", null, null, "ALL"])[this.billboardMode];
            ret += ", freeze wrld mat: " + (this._isWorldMatrixFrozen || this._waitingFreezeWorldMatrix ? "YES" : "NO");
        }
        return ret;
    }

    /** @hidden */
    public _getActionManagerForTrigger(trigger?: number, initialCall = true): Nullable<AbstractActionManager> {
        if (this.actionManager && (initialCall || this.actionManager.isRecursive)) {
            if (trigger) {
                if (this.actionManager.hasSpecificTrigger(trigger)) {
                    return this.actionManager;
                }
            }
            else {
                return this.actionManager;
            }
        }

        if (!this.parent) {
            return null;
        }

        return this.parent._getActionManagerForTrigger(trigger, false);
    }

    /** @hidden */
    public _rebuild(): void {
        this.onRebuildObservable.notifyObservers(this);

        if (this._occlusionQuery) {
            this._occlusionQuery = null;
        }

        if (!this.subMeshes) {
            return;
        }

        for (var subMesh of this.subMeshes) {
            subMesh._rebuild();
        }
    }

    /** @hidden */
    public _resyncLightSources(): void {
        this._lightSources.length = 0;

        for (var light of this.getScene().lights) {
            if (!light.isEnabled()) {
                continue;
            }

            if (light.canAffectMesh(this)) {
                this._lightSources.push(light);
            }
        }

        this._markSubMeshesAsLightDirty();
    }

    /** @hidden */
    public _resyncLighSource(light: Light): void {
        var isIn = light.isEnabled() && light.canAffectMesh(this);

        var index = this._lightSources.indexOf(light);

        if (index === -1) {
            if (!isIn) {
                return;
            }
            this._lightSources.push(light);
        } else {
            if (isIn) {
                return;
            }
            this._lightSources.splice(index, 1);
        }

        this._markSubMeshesAsLightDirty();
    }

    /** @hidden */
    public _unBindEffect() {
        for (var subMesh of this.subMeshes) {
            subMesh.setEffect(null);
        }
    }

    /** @hidden */
    public _removeLightSource(light: Light): void {
        var index = this._lightSources.indexOf(light);

        if (index === -1) {
            return;
        }
        this._lightSources.splice(index, 1);

        this._markSubMeshesAsLightDirty();
    }

    private _markSubMeshesAsDirty(func: (defines: MaterialDefines) => void) {
        if (!this.subMeshes) {
            return;
        }

        for (var subMesh of this.subMeshes) {
            if (subMesh._materialDefines) {
                func(subMesh._materialDefines);
            }
        }
    }

    /** @hidden */
    public _markSubMeshesAsLightDirty() {
        this._markSubMeshesAsDirty((defines) => defines.markAsLightDirty());
    }

    /** @hidden */
    public _markSubMeshesAsAttributesDirty() {
        this._markSubMeshesAsDirty((defines) => defines.markAsAttributesDirty());
    }

    /** @hidden */
    public _markSubMeshesAsMiscDirty() {
        if (!this.subMeshes) {
            return;
        }

        for (var subMesh of this.subMeshes) {
            var material = subMesh.getMaterial();
            if (material) {
                material.markAsDirty(Constants.MATERIAL_MiscDirtyFlag);
            }
        }
    }

    /**
    * Gets or sets a Vector3 depicting the mesh scaling along each local axis X, Y, Z.  Default is (1.0, 1.0, 1.0)
    */
    public get scaling(): Vector3 {
        return this._scaling;
    }

    public set scaling(newScaling: Vector3) {
        this._scaling = newScaling;
        if (this.physicsImpostor) {
            this.physicsImpostor.forceUpdate();
        }
    }

    // Methods
    /**
     * Returns true if the mesh is blocked. Implemented by child classes
     */
    public get isBlocked(): boolean {
        return false;
    }

    /**
     * Returns the mesh itself by default. Implemented by child classes
     * @param camera defines the camera to use to pick the right LOD level
     * @returns the currentAbstractMesh
     */
    public getLOD(camera: Camera): Nullable<AbstractMesh> {
        return this;
    }

    /**
     * Returns 0 by default. Implemented by child classes
     * @returns an integer
     */
    public getTotalVertices(): number {
        return 0;
    }

    /**
     * Returns a positive integer : the total number of indices in this mesh geometry.
     * @returns the numner of indices or zero if the mesh has no geometry.
     */
    public getTotalIndices(): number {
        return 0;
    }

    /**
     * Returns null by default. Implemented by child classes
     * @returns null
     */
    public getIndices(): Nullable<IndicesArray> {
        return null;
    }

    /**
     * Returns the array of the requested vertex data kind. Implemented by child classes
     * @param kind defines the vertex data kind to use
     * @returns null
     */
    public getVerticesData(kind: string): Nullable<FloatArray> {
        return null;
    }

    /**
     * Sets the vertex data of the mesh geometry for the requested `kind`.
     * If the mesh has no geometry, a new Geometry object is set to the mesh and then passed this vertex data.
     * Note that a new underlying VertexBuffer object is created each call.
     * If the `kind` is the `PositionKind`, the mesh BoundingInfo is renewed, so the bounding box and sphere, and the mesh World Matrix is recomputed.
     * @param kind defines vertex data kind:
     * * VertexBuffer.PositionKind
     * * VertexBuffer.UVKind
     * * VertexBuffer.UV2Kind
     * * VertexBuffer.UV3Kind
     * * VertexBuffer.UV4Kind
     * * VertexBuffer.UV5Kind
     * * VertexBuffer.UV6Kind
     * * VertexBuffer.ColorKind
     * * VertexBuffer.MatricesIndicesKind
     * * VertexBuffer.MatricesIndicesExtraKind
     * * VertexBuffer.MatricesWeightsKind
     * * VertexBuffer.MatricesWeightsExtraKind
     * @param data defines the data source
     * @param updatable defines if the data must be flagged as updatable (or static)
     * @param stride defines the vertex stride (size of an entire vertex). Can be null and in this case will be deduced from vertex data kind
     * @returns the current mesh
     */
    public setVerticesData(kind: string, data: FloatArray, updatable?: boolean, stride?: number): AbstractMesh {
        return this;
    }

    /**
     * Updates the existing vertex data of the mesh geometry for the requested `kind`.
     * If the mesh has no geometry, it is simply returned as it is.
     * @param kind defines vertex data kind:
     * * VertexBuffer.PositionKind
     * * VertexBuffer.UVKind
     * * VertexBuffer.UV2Kind
     * * VertexBuffer.UV3Kind
     * * VertexBuffer.UV4Kind
     * * VertexBuffer.UV5Kind
     * * VertexBuffer.UV6Kind
     * * VertexBuffer.ColorKind
     * * VertexBuffer.MatricesIndicesKind
     * * VertexBuffer.MatricesIndicesExtraKind
     * * VertexBuffer.MatricesWeightsKind
     * * VertexBuffer.MatricesWeightsExtraKind
     * @param data defines the data source
     * @param updateExtends If `kind` is `PositionKind` and if `updateExtends` is true, the mesh BoundingInfo is renewed, so the bounding box and sphere, and the mesh World Matrix is recomputed
     * @param makeItUnique If true, a new global geometry is created from this data and is set to the mesh
     * @returns the current mesh
     */
    public updateVerticesData(kind: string, data: FloatArray, updateExtends?: boolean, makeItUnique?: boolean): AbstractMesh {
        return this;
    }

    /**
     * Sets the mesh indices,
     * If the mesh has no geometry, a new Geometry object is created and set to the mesh.
     * @param indices Expects an array populated with integers or a typed array (Int32Array, Uint32Array, Uint16Array)
     * @param totalVertices Defines the total number of vertices
     * @returns the current mesh
     */
    public setIndices(indices: IndicesArray, totalVertices: Nullable<number>): AbstractMesh {
        return this;
    }

    /**
     * Gets a boolean indicating if specific vertex data is present
     * @param kind defines the vertex data kind to use
     * @returns true is data kind is present
     */
    public isVerticesDataPresent(kind: string): boolean {
        return false;
    }

    /**
     * Returns the mesh BoundingInfo object or creates a new one and returns if it was undefined
     * @returns a BoundingInfo
     */
    public getBoundingInfo(): BoundingInfo {
        if (this._masterMesh) {
            return this._masterMesh.getBoundingInfo();
        }

        if (!this._boundingInfo) {
            // this._boundingInfo is being created here
            this._updateBoundingInfo();
        }
        // cannot be null.
        return this._boundingInfo!;
    }

    /**
     * Uniformly scales the mesh to fit inside of a unit cube (1 X 1 X 1 units)
     * @param includeDescendants Use the hierarchy's bounding box instead of the mesh's bounding box. Default is false
     * @param ignoreRotation ignore rotation when computing the scale (ie. object will be axis aligned). Default is false
     * @returns the current mesh
     */
    public normalizeToUnitCube(includeDescendants = true, ignoreRotation = false): AbstractMesh {
        let storedRotation: Nullable<Vector3> = null;
        let storedRotationQuaternion: Nullable<Quaternion> = null;

        if (ignoreRotation) {
            if (this.rotationQuaternion) {
                storedRotationQuaternion = this.rotationQuaternion.clone();
                this.rotationQuaternion.copyFromFloats(0, 0, 0, 1);
            } else if (this.rotation) {
                storedRotation = this.rotation.clone();
                this.rotation.copyFromFloats(0, 0, 0);
            }
        }

        let boundingVectors = this.getHierarchyBoundingVectors(includeDescendants);
        let sizeVec = boundingVectors.max.subtract(boundingVectors.min);
        let maxDimension = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);

        if (maxDimension === 0) {
            return this;
        }

        let scale = 1 / maxDimension;

        this.scaling.scaleInPlace(scale);

        if (ignoreRotation) {
            if (this.rotationQuaternion && storedRotationQuaternion) {
                this.rotationQuaternion.copyFrom(storedRotationQuaternion);
            } else if (this.rotation && storedRotation) {
                this.rotation.copyFrom(storedRotation);
            }
        }

        return this;
    }

    /**
     * Overwrite the current bounding info
     * @param boundingInfo defines the new bounding info
     * @returns the current mesh
     */
    public setBoundingInfo(boundingInfo: BoundingInfo): AbstractMesh {
        this._boundingInfo = boundingInfo;
        return this;
    }

    /** Gets a boolean indicating if this mesh has skinning data and an attached skeleton */
    public get useBones(): boolean {
        return (<boolean>(this.skeleton && this.getScene().skeletonsEnabled && this.isVerticesDataPresent(VertexBuffer.MatricesIndicesKind) && this.isVerticesDataPresent(VertexBuffer.MatricesWeightsKind)));
    }

    /** @hidden */
    public _preActivate(): void {
    }

    /** @hidden */
    public _preActivateForIntermediateRendering(renderId: number): void {
    }

    /** @hidden */
    public _activate(renderId: number): void {
        this._renderId = renderId;
    }

    /**
     * Gets the current world matrix
     * @returns a Matrix
     */
    public getWorldMatrix(): Matrix {
        if (this._masterMesh && this.billboardMode === TransformNode.BILLBOARDMODE_NONE) {
            return this._masterMesh.getWorldMatrix();
        }

        return super.getWorldMatrix();
    }

    /** @hidden */
    public _getWorldMatrixDeterminant(): number {
        if (this._masterMesh) {
            return this._masterMesh._getWorldMatrixDeterminant();
        }

        return super._getWorldMatrixDeterminant();
    }

    // ================================== Point of View Movement =================================

    /**
     * Perform relative position change from the point of view of behind the front of the mesh.
     * This is performed taking into account the meshes current rotation, so you do not have to care.
     * Supports definition of mesh facing forward or backward
     * @param amountRight defines the distance on the right axis
     * @param amountUp defines the distance on the up axis
     * @param amountForward defines the distance on the forward axis
     * @returns the current mesh
     */
    public movePOV(amountRight: number, amountUp: number, amountForward: number): AbstractMesh {
        this.position.addInPlace(this.calcMovePOV(amountRight, amountUp, amountForward));
        return this;
    }

    /**
     * Calculate relative position change from the point of view of behind the front of the mesh.
     * This is performed taking into account the meshes current rotation, so you do not have to care.
     * Supports definition of mesh facing forward or backward
     * @param amountRight defines the distance on the right axis
     * @param amountUp defines the distance on the up axis
     * @param amountForward defines the distance on the forward axis
     * @returns the new displacement vector
     */
    public calcMovePOV(amountRight: number, amountUp: number, amountForward: number): Vector3 {
        var rotMatrix = new Matrix();
        var rotQuaternion = (this.rotationQuaternion) ? this.rotationQuaternion : Quaternion.RotationYawPitchRoll(this.rotation.y, this.rotation.x, this.rotation.z);
        rotQuaternion.toRotationMatrix(rotMatrix);

        var translationDelta = Vector3.Zero();
        var defForwardMult = this.definedFacingForward ? -1 : 1;
        Vector3.TransformCoordinatesFromFloatsToRef(amountRight * defForwardMult, amountUp, amountForward * defForwardMult, rotMatrix, translationDelta);
        return translationDelta;
    }
    // ================================== Point of View Rotation =================================
    /**
     * Perform relative rotation change from the point of view of behind the front of the mesh.
     * Supports definition of mesh facing forward or backward
     * @param flipBack defines the flip
     * @param twirlClockwise defines the twirl
     * @param tiltRight defines the tilt
     * @returns the current mesh
     */
    public rotatePOV(flipBack: number, twirlClockwise: number, tiltRight: number): AbstractMesh {
        this.rotation.addInPlace(this.calcRotatePOV(flipBack, twirlClockwise, tiltRight));
        return this;
    }

    /**
     * Calculate relative rotation change from the point of view of behind the front of the mesh.
     * Supports definition of mesh facing forward or backward.
     * @param flipBack defines the flip
     * @param twirlClockwise defines the twirl
     * @param tiltRight defines the tilt
     * @returns the new rotation vector
     */
    public calcRotatePOV(flipBack: number, twirlClockwise: number, tiltRight: number): Vector3 {
        var defForwardMult = this.definedFacingForward ? 1 : -1;
        return new Vector3(flipBack * defForwardMult, twirlClockwise, tiltRight * defForwardMult);
    }

    /**
     * Return the minimum and maximum world vectors of the entire hierarchy under current mesh
     * @param includeDescendants Include bounding info from descendants as well (true by default)
     * @param predicate defines a callback function that can be customize to filter what meshes should be included in the list used to compute the bounding vectors
     * @returns the new bounding vectors
     */
    public getHierarchyBoundingVectors(includeDescendants = true, predicate: Nullable<(abstractMesh: AbstractMesh) => boolean> = null): { min: Vector3, max: Vector3 } {
        // Ensures that all world matrix will be recomputed.
        this.getScene().incrementRenderId();

        this.computeWorldMatrix(true);

        let min: Vector3;
        let max: Vector3;
        let boundingInfo = this.getBoundingInfo();

        if (!this.subMeshes) {
            min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
            max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
        } else {
            min = boundingInfo.boundingBox.minimumWorld;
            max = boundingInfo.boundingBox.maximumWorld;
        }

        if (includeDescendants) {
            let descendants = this.getDescendants(false);

            for (var descendant of descendants) {
                let childMesh = <AbstractMesh>descendant;
                childMesh.computeWorldMatrix(true);

                // Filters meshes based on custom predicate function.
                if (predicate && !predicate(childMesh)) {
                    continue;
                }

                //make sure we have the needed params to get mix and max
                if (!childMesh.getBoundingInfo || childMesh.getTotalVertices() === 0) {
                    continue;
                }

                let childBoundingInfo = childMesh.getBoundingInfo();
                let boundingBox = childBoundingInfo.boundingBox;

                var minBox = boundingBox.minimumWorld;
                var maxBox = boundingBox.maximumWorld;

                Tools.CheckExtends(minBox, min, max);
                Tools.CheckExtends(maxBox, min, max);
            }
        }

        return {
            min: min,
            max: max
        };
    }

    /**
     * This method recomputes and sets a new BoundingInfo to the mesh unless it is locked.
     * This means the mesh underlying bounding box and sphere are recomputed.
     * @param applySkeleton defines whether to apply the skeleton before computing the bounding info
     * @returns the current mesh
     */
    public refreshBoundingInfo(applySkeleton: boolean = false): AbstractMesh {
        if (this._boundingInfo && this._boundingInfo.isLocked) {
            return this;
        }

        this._refreshBoundingInfo(this._getPositionData(applySkeleton), null);
        return this;
    }

    /** @hidden */
    public _refreshBoundingInfo(data: Nullable<FloatArray>, bias: Nullable<Vector2>): void {
        if (data) {
            var extend = Tools.ExtractMinAndMax(data, 0, this.getTotalVertices(), bias);
            if (this._boundingInfo) {
                this._boundingInfo.reConstruct(extend.minimum, extend.maximum);
            }
            else {
                this._boundingInfo = new BoundingInfo(extend.minimum, extend.maximum);
            }
        }

        if (this.subMeshes) {
            for (var index = 0; index < this.subMeshes.length; index++) {
                this.subMeshes[index].refreshBoundingInfo();
            }
        }

        this._updateBoundingInfo();
    }

    /** @hidden */
    public _getPositionData(applySkeleton: boolean): Nullable<FloatArray> {
        var data = this.getVerticesData(VertexBuffer.PositionKind);

        if (data && applySkeleton && this.skeleton) {
            data = Tools.Slice(data);

            var matricesIndicesData = this.getVerticesData(VertexBuffer.MatricesIndicesKind);
            var matricesWeightsData = this.getVerticesData(VertexBuffer.MatricesWeightsKind);
            if (matricesWeightsData && matricesIndicesData) {
                var needExtras = this.numBoneInfluencers > 4;
                var matricesIndicesExtraData = needExtras ? this.getVerticesData(VertexBuffer.MatricesIndicesExtraKind) : null;
                var matricesWeightsExtraData = needExtras ? this.getVerticesData(VertexBuffer.MatricesWeightsExtraKind) : null;

                this.skeleton.prepare();
                var skeletonMatrices = this.skeleton.getTransformMatrices(this);

                var tempVector = Tmp.Vector3[0];
                var finalMatrix = Tmp.Matrix[0];
                var tempMatrix = Tmp.Matrix[1];

                var matWeightIdx = 0;
                for (var index = 0; index < data.length; index += 3, matWeightIdx += 4) {
                    finalMatrix.reset();

                    var inf: number;
                    var weight: number;
                    for (inf = 0; inf < 4; inf++) {
                        weight = matricesWeightsData[matWeightIdx + inf];
                        if (weight > 0) {
                            Matrix.FromFloat32ArrayToRefScaled(skeletonMatrices, Math.floor(matricesIndicesData[matWeightIdx + inf] * 16), weight, tempMatrix);
                            finalMatrix.addToSelf(tempMatrix);
                        }
                    }
                    if (needExtras) {
                        for (inf = 0; inf < 4; inf++) {
                            weight = matricesWeightsExtraData![matWeightIdx + inf];
                            if (weight > 0) {
                                Matrix.FromFloat32ArrayToRefScaled(skeletonMatrices, Math.floor(matricesIndicesExtraData![matWeightIdx + inf] * 16), weight, tempMatrix);
                                finalMatrix.addToSelf(tempMatrix);
                            }
                        }
                    }

                    Vector3.TransformCoordinatesFromFloatsToRef(data[index], data[index + 1], data[index + 2], finalMatrix, tempVector);
                    tempVector.toArray(data, index);
                }
            }
        }

        return data;
    }

    /** @hidden */
    public _updateBoundingInfo(): AbstractMesh {
        const effectiveMesh = this._effectiveMesh;
        if (this._boundingInfo) {
            this._boundingInfo.update(effectiveMesh.worldMatrixFromCache);
        }
        else {
            this._boundingInfo = new BoundingInfo(this.absolutePosition, this.absolutePosition, effectiveMesh.worldMatrixFromCache);
        }
        this._updateSubMeshesBoundingInfo(effectiveMesh.worldMatrixFromCache);
        return this;
    }

    /** @hidden */
    public _updateSubMeshesBoundingInfo(matrix: DeepImmutable<Matrix>): AbstractMesh {
        if (!this.subMeshes) {
            return this;
        }
        let count = this.subMeshes.length;
        for (var subIndex = 0; subIndex < count; subIndex++) {
            var subMesh = this.subMeshes[subIndex];
            if (count > 1 || !subMesh.IsGlobal) {
                subMesh.updateBoundingInfo(matrix);
            }
        }
        return this;
    }

    /** @hidden */
    protected _afterComputeWorldMatrix(): void {
        // Bounding info
        this._updateBoundingInfo();
    }

    /** @hidden */
    public get _effectiveMesh(): AbstractMesh {
        return (this.skeleton && this.skeleton.overrideMesh) || this;
    }

    /**
     * Returns `true` if the mesh is within the frustum defined by the passed array of planes.
     * A mesh is in the frustum if its bounding box intersects the frustum
     * @param frustumPlanes defines the frustum to test
     * @returns true if the mesh is in the frustum planes
     */
    public isInFrustum(frustumPlanes: Plane[]): boolean {
        return this._boundingInfo !== null && this._boundingInfo.isInFrustum(frustumPlanes, this.cullingStrategy);
    }

    /**
     * Returns `true` if the mesh is completely in the frustum defined be the passed array of planes.
     * A mesh is completely in the frustum if its bounding box it completely inside the frustum.
     * @param frustumPlanes defines the frustum to test
     * @returns true if the mesh is completely in the frustum planes
     */
    public isCompletelyInFrustum(frustumPlanes: Plane[]): boolean {
        return this._boundingInfo !== null && this._boundingInfo.isCompletelyInFrustum(frustumPlanes);
    }

    /**
     * True if the mesh intersects another mesh or a SolidParticle object
     * @param mesh defines a target mesh or SolidParticle to test
     * @param precise Unless the parameter `precise` is set to `true` the intersection is computed according to Axis Aligned Bounding Boxes (AABB), else according to OBB (Oriented BBoxes)
     * @param includeDescendants Can be set to true to test if the mesh defined in parameters intersects with the current mesh or any child meshes
     * @returns true if there is an intersection
     */
    public intersectsMesh(mesh: AbstractMesh | SolidParticle, precise: boolean = false, includeDescendants?: boolean): boolean {
        if (!this._boundingInfo || !mesh._boundingInfo) {
            return false;
        }

        if (this._boundingInfo.intersects(mesh._boundingInfo, precise)) {
            return true;
        }

        if (includeDescendants) {
            for (var child of this.getChildMeshes()) {
                if (child.intersectsMesh(mesh, precise, true)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Returns true if the passed point (Vector3) is inside the mesh bounding box
     * @param point defines the point to test
     * @returns true if there is an intersection
     */
    public intersectsPoint(point: Vector3): boolean {
        if (!this._boundingInfo) {
            return false;
        }

        return this._boundingInfo.intersectsPoint(point);
    }

    // Collisions

    /**
     * Gets or sets a boolean indicating that this mesh can be used in the collision engine
     * @see http://doc.babylonjs.com/babylon101/cameras,_mesh_collisions_and_gravity
     */
    public get checkCollisions(): boolean {
        return this._checkCollisions;
    }

    public set checkCollisions(collisionEnabled: boolean) {
        this._checkCollisions = collisionEnabled;
    }

    /**
     * Gets Collider object used to compute collisions (not physics)
     * @see http://doc.babylonjs.com/babylon101/cameras,_mesh_collisions_and_gravity
     */
    public get collider(): Collider {
        return this._collider;
    }

    /**
     * Move the mesh using collision engine
     * @see http://doc.babylonjs.com/babylon101/cameras,_mesh_collisions_and_gravity
     * @param displacement defines the requested displacement vector
     * @returns the current mesh
     */
    public moveWithCollisions(displacement: Vector3): AbstractMesh {
        var globalPosition = this.getAbsolutePosition();

        globalPosition.addToRef(this.ellipsoidOffset, this._oldPositionForCollisions);
        let coordinator = this.getScene().collisionCoordinator;

        if (!this._collider) {
            this._collider = coordinator.createCollider();
        }

        this._collider._radius = this.ellipsoid;

        coordinator.getNewPosition(this._oldPositionForCollisions, displacement, this._collider, 3, this, this._onCollisionPositionChange, this.uniqueId);
        return this;
    }

    private _onCollisionPositionChange = (collisionId: number, newPosition: Vector3, collidedMesh: Nullable<AbstractMesh> = null) => {
        newPosition.subtractToRef(this._oldPositionForCollisions, this._diffPositionForCollisions);

        if (this._diffPositionForCollisions.length() > Engine.CollisionsEpsilon) {
            this.position.addInPlace(this._diffPositionForCollisions);
        }

        if (collidedMesh) {
            this.onCollideObservable.notifyObservers(collidedMesh);
        }

        this.onCollisionPositionChangeObservable.notifyObservers(this.position);
    }

    // Collisions
    /** @hidden */
    public _collideForSubMesh(subMesh: SubMesh, transformMatrix: Matrix, collider: Collider): AbstractMesh {
        this._generatePointsArray();

        if (!this._positions) {
            return this;
        }

        // Transformation
        if (!subMesh._lastColliderWorldVertices || !subMesh._lastColliderTransformMatrix.equals(transformMatrix)) {
            subMesh._lastColliderTransformMatrix = transformMatrix.clone();
            subMesh._lastColliderWorldVertices = [];
            subMesh._trianglePlanes = [];
            var start = subMesh.verticesStart;
            var end = (subMesh.verticesStart + subMesh.verticesCount);
            for (var i = start; i < end; i++) {
                subMesh._lastColliderWorldVertices.push(Vector3.TransformCoordinates(this._positions[i], transformMatrix));
            }
        }
        // Collide
        collider._collide(subMesh._trianglePlanes, subMesh._lastColliderWorldVertices, (<IndicesArray>this.getIndices()), subMesh.indexStart, subMesh.indexStart + subMesh.indexCount, subMesh.verticesStart, !!subMesh.getMaterial());
        if (collider.collisionFound) {
            collider.collidedMesh = this;
        }
        return this;
    }

    /** @hidden */
    public _processCollisionsForSubMeshes(collider: Collider, transformMatrix: Matrix): AbstractMesh {
        const subMeshes = this._scene.getCollidingSubMeshCandidates(this, collider);
        const len = subMeshes.length;

        for (var index = 0; index < len; index++) {
            var subMesh = subMeshes.data[index];

            // Bounding test
            if (len > 1 && !subMesh._checkCollision(collider)) {
                continue;
            }

            this._collideForSubMesh(subMesh, transformMatrix, collider);
        }
        return this;
    }

    /** @hidden */
    public _checkCollision(collider: Collider): AbstractMesh {
        // Bounding box test
        if (!this._boundingInfo || !this._boundingInfo._checkCollision(collider)) {
            return this;
        }

        // Transformation matrix
        const collisionsScalingMatrix = Tmp.Matrix[0];
        const collisionsTransformMatrix = Tmp.Matrix[1];
        Matrix.ScalingToRef(1.0 / collider._radius.x, 1.0 / collider._radius.y, 1.0 / collider._radius.z, collisionsScalingMatrix);
        this.worldMatrixFromCache.multiplyToRef(collisionsScalingMatrix, collisionsTransformMatrix);
        this._processCollisionsForSubMeshes(collider, collisionsTransformMatrix);
        return this;
    }

    // Picking
    /** @hidden */
    public _generatePointsArray(): boolean {
        return false;
    }

    /**
     * Checks if the passed Ray intersects with the mesh
     * @param ray defines the ray to use
     * @param fastCheck defines if fast mode (but less precise) must be used (false by default)
     * @param trianglePredicate defines an optional predicate used to select faces when a mesh intersection is detected
     * @returns the picking info
     * @see http://doc.babylonjs.com/babylon101/intersect_collisions_-_mesh
     */
    public intersects(ray: Ray, fastCheck?: boolean, trianglePredicate?: TrianglePickingPredicate): PickingInfo {
        var pickingInfo = new PickingInfo();
        const intersectionThreshold = this.getClassName() === "InstancedLinesMesh" || this.getClassName() === "LinesMesh" ? (this as any).intersectionThreshold : 0;
        const boundingInfo = this._boundingInfo;
        if (!this.subMeshes || !boundingInfo || !ray.intersectsSphere(boundingInfo.boundingSphere, intersectionThreshold) || !ray.intersectsBox(boundingInfo.boundingBox, intersectionThreshold)) {
            return pickingInfo;
        }

        if (!this._generatePointsArray()) {
            return pickingInfo;
        }

        var intersectInfo: Nullable<IntersectionInfo> = null;

        var subMeshes = this._scene.getIntersectingSubMeshCandidates(this, ray);
        var len: number = subMeshes.length;
        for (var index = 0; index < len; index++) {
            var subMesh = subMeshes.data[index];

            // Bounding test
            if (len > 1 && !subMesh.canIntersects(ray)) {
                continue;
            }

            var currentIntersectInfo = subMesh.intersects(ray, (<Vector3[]>this._positions),
                (<IndicesArray>this.getIndices()), fastCheck,
                trianglePredicate);

            if (currentIntersectInfo) {
                if (fastCheck || !intersectInfo || currentIntersectInfo.distance < intersectInfo.distance) {
                    intersectInfo = currentIntersectInfo;
                    intersectInfo.subMeshId = index;

                    if (fastCheck) {
                        break;
                    }
                }
            }
        }

        if (intersectInfo) {
            // Get picked point
            const world = this.getWorldMatrix();
            const worldOrigin = Tmp.Vector3[0];
            const direction = Tmp.Vector3[1];
            Vector3.TransformCoordinatesToRef(ray.origin, world, worldOrigin);
            ray.direction.scaleToRef(intersectInfo.distance, direction);
            const worldDirection = Vector3.TransformNormal(direction, world);
            const pickedPoint = worldDirection.addInPlace(worldOrigin);

            // Return result
            pickingInfo.hit = true;
            pickingInfo.distance = Vector3.Distance(worldOrigin, pickedPoint);
            pickingInfo.pickedPoint = pickedPoint;
            pickingInfo.pickedMesh = this;
            pickingInfo.bu = intersectInfo.bu || 0;
            pickingInfo.bv = intersectInfo.bv || 0;
            pickingInfo.faceId = intersectInfo.faceId;
            pickingInfo.subMeshId = intersectInfo.subMeshId;
            return pickingInfo;
        }

        return pickingInfo;
    }

    /**
     * Clones the current mesh
     * @param name defines the mesh name
     * @param newParent defines the new mesh parent
     * @param doNotCloneChildren defines a boolean indicating that children must not be cloned (false by default)
     * @returns the new mesh
     */
    public clone(name: string, newParent: Node, doNotCloneChildren?: boolean): Nullable<AbstractMesh> {
        return null;
    }

    /**
     * Disposes all the submeshes of the current meshnp
     * @returns the current mesh
     */
    public releaseSubMeshes(): AbstractMesh {
        if (this.subMeshes) {
            while (this.subMeshes.length) {
                this.subMeshes[0].dispose();
            }
        } else {
            this.subMeshes = new Array<SubMesh>();
        }
        return this;
    }

    /**
     * Releases resources associated with this abstract mesh.
     * @param doNotRecurse Set to true to not recurse into each children (recurse into each children by default)
     * @param disposeMaterialAndTextures Set to true to also dispose referenced materials and textures (false by default)
     */
    public dispose(doNotRecurse?: boolean, disposeMaterialAndTextures = false): void {
        var index: number;

        // Smart Array Retainers.
        this.getScene().freeActiveMeshes();
        this.getScene().freeRenderingGroups();

        // Action manager
        if (this.actionManager !== undefined && this.actionManager !== null) {
            this.actionManager.dispose();
            this.actionManager = null;
        }

        // Skeleton
        this._skeleton = null;

        // Intersections in progress
        for (index = 0; index < this._intersectionsInProgress.length; index++) {
            var other = this._intersectionsInProgress[index];

            var pos = other._intersectionsInProgress.indexOf(this);
            other._intersectionsInProgress.splice(pos, 1);
        }

        this._intersectionsInProgress = [];

        // Lights
        var lights = this.getScene().lights;

        lights.forEach((light: Light) => {
            var meshIndex = light.includedOnlyMeshes.indexOf(this);

            if (meshIndex !== -1) {
                light.includedOnlyMeshes.splice(meshIndex, 1);
            }

            meshIndex = light.excludedMeshes.indexOf(this);

            if (meshIndex !== -1) {
                light.excludedMeshes.splice(meshIndex, 1);
            }

            // Shadow generators
            var generator = light.getShadowGenerator();
            if (generator) {
                var shadowMap = generator.getShadowMap();

                if (shadowMap && shadowMap.renderList) {
                    meshIndex = shadowMap.renderList.indexOf(this);

                    if (meshIndex !== -1) {
                        shadowMap.renderList.splice(meshIndex, 1);
                    }
                }
            }
        });

        // SubMeshes
        if (this.getClassName() !== "InstancedMesh" || this.getClassName() !== "InstancedLinesMesh") {
            this.releaseSubMeshes();
        }

        // Query
        let engine = this.getScene().getEngine();
        if (this._occlusionQuery) {
            this.isOcclusionQueryInProgress = false;
            engine.deleteQuery(this._occlusionQuery);
            this._occlusionQuery = null;
        }

        // Engine
        engine.wipeCaches();

        // Remove from scene
        this.getScene().removeMesh(this);

        if (disposeMaterialAndTextures) {
            if (this.material) {
                if (this.material.getClassName() === "MultiMaterial") {
                    this.material.dispose(false, true, true);
                } else {
                    this.material.dispose(false, true);
                }
            }
        }

        if (!doNotRecurse) {
            // Particles
            for (index = 0; index < this.getScene().particleSystems.length; index++) {
                if (this.getScene().particleSystems[index].emitter === this) {
                    this.getScene().particleSystems[index].dispose();
                    index--;
                }
            }
        }

        // facet data
        if (this._facetData.facetDataEnabled) {
            this.disableFacetData();
        }

        this.onAfterWorldMatrixUpdateObservable.clear();
        this.onCollideObservable.clear();
        this.onCollisionPositionChangeObservable.clear();
        this.onRebuildObservable.clear();

        super.dispose(doNotRecurse, disposeMaterialAndTextures);
    }

    /**
     * Adds the passed mesh as a child to the current mesh
     * @param mesh defines the child mesh
     * @returns the current mesh
     */
    public addChild(mesh: AbstractMesh): AbstractMesh {
        mesh.setParent(this);
        return this;
    }

    /**
     * Removes the passed mesh from the current mesh children list
     * @param mesh defines the child mesh
     * @returns the current mesh
     */
    public removeChild(mesh: AbstractMesh): AbstractMesh {
        mesh.setParent(null);
        return this;
    }

    // Facet data
    /** @hidden */
    private _initFacetData(): AbstractMesh {
        const data = this._facetData;
        if (!data.facetNormals) {
            data.facetNormals = new Array<Vector3>();
        }
        if (!data.facetPositions) {
            data.facetPositions = new Array<Vector3>();
        }
        if (!data.facetPartitioning) {
            data.facetPartitioning = new Array<number[]>();
        }
        data.facetNb = ((<IndicesArray>this.getIndices()).length / 3) | 0;
        data.partitioningSubdivisions = (data.partitioningSubdivisions) ? data.partitioningSubdivisions : 10;   // default nb of partitioning subdivisions = 10
        data.partitioningBBoxRatio = (data.partitioningBBoxRatio) ? data.partitioningBBoxRatio : 1.01;          // default ratio 1.01 = the partitioning is 1% bigger than the bounding box
        for (var f = 0; f < data.facetNb; f++) {
            data.facetNormals[f] = Vector3.Zero();
            data.facetPositions[f] = Vector3.Zero();
        }
        data.facetDataEnabled = true;
        return this;
    }

    /**
     * Updates the mesh facetData arrays and the internal partitioning when the mesh is morphed or updated.
     * This method can be called within the render loop.
     * You don't need to call this method by yourself in the render loop when you update/morph a mesh with the methods CreateXXX() as they automatically manage this computation
     * @returns the current mesh
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public updateFacetData(): AbstractMesh {
        const data = this._facetData;
        if (!data.facetDataEnabled) {
            this._initFacetData();
        }
        var positions = this.getVerticesData(VertexBuffer.PositionKind);
        var indices = this.getIndices();
        var normals = this.getVerticesData(VertexBuffer.NormalKind);
        var bInfo = this.getBoundingInfo();

        if (data.facetDepthSort && !data.facetDepthSortEnabled) {
            // init arrays, matrix and sort function on first call
            data.facetDepthSortEnabled = true;
            if (indices instanceof Uint16Array) {
                data.depthSortedIndices = new Uint16Array(indices!);
            }
            else if (indices instanceof Uint32Array) {
                data.depthSortedIndices = new Uint32Array(indices!);
            }
            else {
                var needs32bits = false;
                for (var i = 0; i < indices!.length; i++) {
                    if (indices![i] > 65535) {
                        needs32bits = true;
                        break;
                    }
                }
                if (needs32bits) {
                    data.depthSortedIndices = new Uint32Array(indices!);
                }
                else {
                    data.depthSortedIndices = new Uint16Array(indices!);
                }
            }
            data.facetDepthSortFunction = function(f1, f2) {
                return (f2.sqDistance - f1.sqDistance);
            };
            if (!data.facetDepthSortFrom) {
                var camera = this.getScene().activeCamera;
                data.facetDepthSortFrom = (camera) ? camera.position : Vector3.Zero();
            }
            data.depthSortedFacets = [];
            for (var f = 0; f < data.facetNb; f++) {
                var depthSortedFacet = { ind: f * 3, sqDistance: 0.0 };
                data.depthSortedFacets.push(depthSortedFacet);
            }
            data.invertedMatrix = Matrix.Identity();
            data.facetDepthSortOrigin = Vector3.Zero();
        }

        data.bbSize.x = (bInfo.maximum.x - bInfo.minimum.x > Epsilon) ? bInfo.maximum.x - bInfo.minimum.x : Epsilon;
        data.bbSize.y = (bInfo.maximum.y - bInfo.minimum.y > Epsilon) ? bInfo.maximum.y - bInfo.minimum.y : Epsilon;
        data.bbSize.z = (bInfo.maximum.z - bInfo.minimum.z > Epsilon) ? bInfo.maximum.z - bInfo.minimum.z : Epsilon;
        var bbSizeMax = (data.bbSize.x > data.bbSize.y) ? data.bbSize.x : data.bbSize.y;
        bbSizeMax = (bbSizeMax > data.bbSize.z) ? bbSizeMax : data.bbSize.z;
        data.subDiv.max = data.partitioningSubdivisions;
        data.subDiv.X = Math.floor(data.subDiv.max * data.bbSize.x / bbSizeMax);   // adjust the number of subdivisions per axis
        data.subDiv.Y = Math.floor(data.subDiv.max * data.bbSize.y / bbSizeMax);   // according to each bbox size per axis
        data.subDiv.Z = Math.floor(data.subDiv.max * data.bbSize.z / bbSizeMax);
        data.subDiv.X = data.subDiv.X < 1 ? 1 : data.subDiv.X;                     // at least one subdivision
        data.subDiv.Y = data.subDiv.Y < 1 ? 1 : data.subDiv.Y;
        data.subDiv.Z = data.subDiv.Z < 1 ? 1 : data.subDiv.Z;
        // set the parameters for ComputeNormals()
        data.facetParameters.facetNormals = this.getFacetLocalNormals();
        data.facetParameters.facetPositions = this.getFacetLocalPositions();
        data.facetParameters.facetPartitioning = this.getFacetLocalPartitioning();
        data.facetParameters.bInfo = bInfo;
        data.facetParameters.bbSize = data.bbSize;
        data.facetParameters.subDiv = data.subDiv;
        data.facetParameters.ratio = this.partitioningBBoxRatio;
        data.facetParameters.depthSort = data.facetDepthSort;
        if (data.facetDepthSort && data.facetDepthSortEnabled) {
            this.computeWorldMatrix(true);
            this._worldMatrix.invertToRef(data.invertedMatrix);
            Vector3.TransformCoordinatesToRef(data.facetDepthSortFrom, data.invertedMatrix, data.facetDepthSortOrigin);
            data.facetParameters.distanceTo = data.facetDepthSortOrigin;
        }
        data.facetParameters.depthSortedFacets = data.depthSortedFacets;
        VertexData.ComputeNormals(positions, indices, normals, data.facetParameters);

        if (data.facetDepthSort && data.facetDepthSortEnabled) {
            data.depthSortedFacets.sort(data.facetDepthSortFunction);
            var l = (data.depthSortedIndices.length / 3) | 0;
            for (var f = 0; f < l; f++) {
                var sind = data.depthSortedFacets[f].ind;
                data.depthSortedIndices[f * 3] = indices![sind];
                data.depthSortedIndices[f * 3 + 1] = indices![sind + 1];
                data.depthSortedIndices[f * 3 + 2] = indices![sind + 2];
            }
            this.updateIndices(data.depthSortedIndices, undefined, true);
        }

        return this;
    }

    /**
     * Returns the facetLocalNormals array.
     * The normals are expressed in the mesh local spac
     * @returns an array of Vector3
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public getFacetLocalNormals(): Vector3[] {
        if (!this._facetData.facetNormals) {
            this.updateFacetData();
        }
        return this._facetData.facetNormals;
    }

    /**
     * Returns the facetLocalPositions array.
     * The facet positions are expressed in the mesh local space
     * @returns an array of Vector3
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public getFacetLocalPositions(): Vector3[] {
        if (!this._facetData.facetPositions) {
            this.updateFacetData();
        }
        return this._facetData.facetPositions;
    }

    /**
     * Returns the facetLocalPartioning array
     * @returns an array of array of numbers
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public getFacetLocalPartitioning(): number[][] {
        if (!this._facetData.facetPartitioning) {
            this.updateFacetData();
        }
        return this._facetData.facetPartitioning;
    }

    /**
     * Returns the i-th facet position in the world system.
     * This method allocates a new Vector3 per call
     * @param i defines the facet index
     * @returns a new Vector3
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public getFacetPosition(i: number): Vector3 {
        var pos = Vector3.Zero();
        this.getFacetPositionToRef(i, pos);
        return pos;
    }

    /**
     * Sets the reference Vector3 with the i-th facet position in the world system
     * @param i defines the facet index
     * @param ref defines the target vector
     * @returns the current mesh
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public getFacetPositionToRef(i: number, ref: Vector3): AbstractMesh {
        var localPos = (this.getFacetLocalPositions())[i];
        var world = this.getWorldMatrix();
        Vector3.TransformCoordinatesToRef(localPos, world, ref);
        return this;
    }

    /**
     * Returns the i-th facet normal in the world system.
     * This method allocates a new Vector3 per call
     * @param i defines the facet index
     * @returns a new Vector3
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public getFacetNormal(i: number): Vector3 {
        var norm = Vector3.Zero();
        this.getFacetNormalToRef(i, norm);
        return norm;
    }

    /**
     * Sets the reference Vector3 with the i-th facet normal in the world system
     * @param i defines the facet index
     * @param ref defines the target vector
     * @returns the current mesh
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public getFacetNormalToRef(i: number, ref: Vector3) {
        var localNorm = (this.getFacetLocalNormals())[i];
        Vector3.TransformNormalToRef(localNorm, this.getWorldMatrix(), ref);
        return this;
    }

    /**
     * Returns the facets (in an array) in the same partitioning block than the one the passed coordinates are located (expressed in the mesh local system)
     * @param x defines x coordinate
     * @param y defines y coordinate
     * @param z defines z coordinate
     * @returns the array of facet indexes
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public getFacetsAtLocalCoordinates(x: number, y: number, z: number): Nullable<number[]> {
        var bInfo = this.getBoundingInfo();
        const data = this._facetData;

        var ox = Math.floor((x - bInfo.minimum.x * data.partitioningBBoxRatio) * data.subDiv.X * data.partitioningBBoxRatio / data.bbSize.x);
        var oy = Math.floor((y - bInfo.minimum.y * data.partitioningBBoxRatio) * data.subDiv.Y * data.partitioningBBoxRatio / data.bbSize.y);
        var oz = Math.floor((z - bInfo.minimum.z * data.partitioningBBoxRatio) * data.subDiv.Z * data.partitioningBBoxRatio / data.bbSize.z);
        if (ox < 0 || ox > data.subDiv.max || oy < 0 || oy > data.subDiv.max || oz < 0 || oz > data.subDiv.max) {
            return null;
        }
        return data.facetPartitioning[ox + data.subDiv.max * oy + data.subDiv.max * data.subDiv.max * oz];
    }

    /**
     * Returns the closest mesh facet index at (x,y,z) World coordinates, null if not found
     * @param projected sets as the (x,y,z) world projection on the facet
     * @param checkFace if true (default false), only the facet "facing" to (x,y,z) or only the ones "turning their backs", according to the parameter "facing" are returned
     * @param facing if facing and checkFace are true, only the facet "facing" to (x, y, z) are returned : positive dot (x, y, z) * facet position. If facing si false and checkFace is true, only the facet "turning their backs" to (x, y, z) are returned : negative dot (x, y, z) * facet position
     * @param x defines x coordinate
     * @param y defines y coordinate
     * @param z defines z coordinate
     * @returns the face index if found (or null instead)
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public getClosestFacetAtCoordinates(x: number, y: number, z: number, projected?: Vector3, checkFace: boolean = false, facing: boolean = true): Nullable<number> {
        var world = this.getWorldMatrix();
        var invMat = Tmp.Matrix[5];
        world.invertToRef(invMat);
        var invVect = Tmp.Vector3[8];
        Vector3.TransformCoordinatesFromFloatsToRef(x, y, z, invMat, invVect);  // transform (x,y,z) to coordinates in the mesh local space
        var closest = this.getClosestFacetAtLocalCoordinates(invVect.x, invVect.y, invVect.z, projected, checkFace, facing);
        if (projected) {
            // tranform the local computed projected vector to world coordinates
            Vector3.TransformCoordinatesFromFloatsToRef(projected.x, projected.y, projected.z, world, projected);
        }
        return closest;
    }

    /**
     * Returns the closest mesh facet index at (x,y,z) local coordinates, null if not found
     * @param projected sets as the (x,y,z) local projection on the facet
     * @param checkFace if true (default false), only the facet "facing" to (x,y,z) or only the ones "turning their backs", according to the parameter "facing" are returned
     * @param facing if facing and checkFace are true, only the facet "facing" to (x, y, z) are returned : positive dot (x, y, z) * facet position. If facing si false and checkFace is true, only the facet "turning their backs" to (x, y, z) are returned : negative dot (x, y, z) * facet position
     * @param x defines x coordinate
     * @param y defines y coordinate
     * @param z defines z coordinate
     * @returns the face index if found (or null instead)
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public getClosestFacetAtLocalCoordinates(x: number, y: number, z: number, projected?: Vector3, checkFace: boolean = false, facing: boolean = true): Nullable<number> {
        var closest = null;
        var tmpx = 0.0;
        var tmpy = 0.0;
        var tmpz = 0.0;
        var d = 0.0;            // tmp dot facet normal * facet position
        var t0 = 0.0;
        var projx = 0.0;
        var projy = 0.0;
        var projz = 0.0;
        // Get all the facets in the same partitioning block than (x, y, z)
        var facetPositions = this.getFacetLocalPositions();
        var facetNormals = this.getFacetLocalNormals();
        var facetsInBlock = this.getFacetsAtLocalCoordinates(x, y, z);
        if (!facetsInBlock) {
            return null;
        }
        // Get the closest facet to (x, y, z)
        var shortest = Number.MAX_VALUE;            // init distance vars
        var tmpDistance = shortest;
        var fib;                                    // current facet in the block
        var norm;                                   // current facet normal
        var p0;                                     // current facet barycenter position
        // loop on all the facets in the current partitioning block
        for (var idx = 0; idx < facetsInBlock.length; idx++) {
            fib = facetsInBlock[idx];
            norm = facetNormals[fib];
            p0 = facetPositions[fib];

            d = (x - p0.x) * norm.x + (y - p0.y) * norm.y + (z - p0.z) * norm.z;
            if (!checkFace || (checkFace && facing && d >= 0.0) || (checkFace && !facing && d <= 0.0)) {
                // compute (x,y,z) projection on the facet = (projx, projy, projz)
                d = norm.x * p0.x + norm.y * p0.y + norm.z * p0.z;
                t0 = -(norm.x * x + norm.y * y + norm.z * z - d) / (norm.x * norm.x + norm.y * norm.y + norm.z * norm.z);
                projx = x + norm.x * t0;
                projy = y + norm.y * t0;
                projz = z + norm.z * t0;

                tmpx = projx - x;
                tmpy = projy - y;
                tmpz = projz - z;
                tmpDistance = tmpx * tmpx + tmpy * tmpy + tmpz * tmpz;             // compute length between (x, y, z) and its projection on the facet
                if (tmpDistance < shortest) {                                      // just keep the closest facet to (x, y, z)
                    shortest = tmpDistance;
                    closest = fib;
                    if (projected) {
                        projected.x = projx;
                        projected.y = projy;
                        projected.z = projz;
                    }
                }
            }
        }
        return closest;
    }

    /**
     * Returns the object "parameter" set with all the expected parameters for facetData computation by ComputeNormals()
     * @returns the parameters
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public getFacetDataParameters(): any {
        return this._facetData.facetParameters;
    }

    /**
     * Disables the feature FacetData and frees the related memory
     * @returns the current mesh
     * @see http://doc.babylonjs.com/how_to/how_to_use_facetdata
     */
    public disableFacetData(): AbstractMesh {
        if (this._facetData.facetDataEnabled) {
            this._facetData.facetDataEnabled = false;
            this._facetData.facetPositions = new Array<Vector3>();
            this._facetData.facetNormals = new Array<Vector3>();
            this._facetData.facetPartitioning = new Array<number[]>();
            this._facetData.facetParameters = null;
            this._facetData.depthSortedIndices = new Uint32Array(0);
        }
        return this;
    }

    /**
     * Updates the AbstractMesh indices array
     * @param indices defines the data source
     * @param offset defines the offset in the index buffer where to store the new data (can be null)
     * @param gpuMemoryOnly defines a boolean indicating that only the GPU memory must be updated leaving the CPU version of the indices unchanged (false by default)
     * @returns the current mesh
     */
    public updateIndices(indices: IndicesArray, offset?: number, gpuMemoryOnly = false): AbstractMesh {
        return this;
    }

    /**
     * Creates new normals data for the mesh
     * @param updatable defines if the normal vertex buffer must be flagged as updatable
     * @returns the current mesh
     */
    public createNormals(updatable: boolean): AbstractMesh {
        var positions = this.getVerticesData(VertexBuffer.PositionKind);
        var indices = this.getIndices();
        var normals: FloatArray;

        if (this.isVerticesDataPresent(VertexBuffer.NormalKind)) {
            normals = (<FloatArray>this.getVerticesData(VertexBuffer.NormalKind));
        } else {
            normals = [];
        }

        VertexData.ComputeNormals(positions, indices, normals, { useRightHandedSystem: this.getScene().useRightHandedSystem });
        this.setVerticesData(VertexBuffer.NormalKind, normals, updatable);
        return this;
    }

    /**
     * Align the mesh with a normal
     * @param normal defines the normal to use
     * @param upDirection can be used to redefined the up vector to use (will use the (0, 1, 0) by default)
     * @returns the current mesh
     */
    public alignWithNormal(normal: Vector3, upDirection?: Vector3): AbstractMesh {
        if (!upDirection) {
            upDirection = Axis.Y;
        }

        var axisX = Tmp.Vector3[0];
        var axisZ = Tmp.Vector3[1];
        Vector3.CrossToRef(upDirection, normal, axisZ);
        Vector3.CrossToRef(normal, axisZ, axisX);

        if (this.rotationQuaternion) {
            Quaternion.RotationQuaternionFromAxisToRef(axisX, normal, axisZ, this.rotationQuaternion);
        } else {
            Vector3.RotationFromAxisToRef(axisX, normal, axisZ, this.rotation);
        }
        return this;
    }

    /** @hidden */
    public _checkOcclusionQuery(): boolean { // Will be replaced by correct code if Occlusion queries are referenced
        return false;
    }
}
