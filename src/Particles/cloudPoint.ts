import { Nullable } from "../types";
import { Color4, Vector2, Vector3, TmpVectors, Matrix, Quaternion } from "../Maths/math";
import { Mesh } from "../Meshes/mesh";
import { BoundingInfo } from "../Culling/boundingInfo";
import { PointsCloudSystem } from "./pointsCloudSystem";
/**
 * Represents one particle of a points cloud system.
 */
export class CloudPoint {
    /**
     * particle global index
     */
    public idx: number = 0;
    /**
     * The color of the particle
     */
    public color: Nullable<Color4> = new Color4(1.0, 1.0, 1.0, 1.0);
    /**
     * The world space position of the particle.
     */
    public position: Vector3 = Vector3.Zero();
    /**
     * The world space rotation of the particle. (Not use if rotationQuaternion is set)
     */
    public rotation: Vector3 = Vector3.Zero();
    /**
     * The world space rotation quaternion of the particle.
     */
    public rotationQuaternion: Nullable<Quaternion>;
    /**
     * The uv of the particle.
     */
    public uv: Nullable<Vector2> = new Vector2(0.0, 0.0);
    /**
     * The current speed of the particle.
     */
    public velocity: Vector3 = Vector3.Zero();
    /**
     * The pivot point in the particle local space.
     */
    public pivot: Vector3 = Vector3.Zero();
    /**
     * Must the particle be translated from its pivot point in its local space ?
     * In this case, the pivot point is set at the origin of the particle local space and the particle is translated.
     * Default : false
     */
    public translateFromPivot: boolean = false;
    /**
     * Index of this particle in the global "positions" array (Internal use)
     * @hidden
     */
    public _pos: number = 0;
    /**
     * @hidden Index of this particle in the global "indices" array (Internal use)
     */
    public _ind: number = 0;
    /**
     * Group this particle belongs to
     */
    public _group: PointsGroup;
    /**
     * Group id of this particle
     */
    public groupId: number = 0;
    /**
     * Index of the particle in its group id (Internal use)
     */
    public idxInGroup: number = 0;
    /**
     * @hidden Particle BoundingInfo object (Internal use)
     */
    public _boundingInfo: BoundingInfo;
    /**
     * @hidden Reference to the PCS that the particle belongs to (Internal use)
     */
    public _pcs: PointsCloudSystem;
    /**
     * @hidden Still set as invisible in order to skip useless computations (Internal use)
     */
    public _stillInvisible: boolean = false;
    /**
     * @hidden Last computed particle rotation matrix
     */
    public _rotationMatrix: number[] = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];
    /**
     * Parent particle Id, if any.
     * Default null.
     */
    public parentId: Nullable<number> = null;
    /**
     * @hidden Internal global position in the PCS.
     */
    public _globalPosition: Vector3 = Vector3.Zero();

    /**
     * Creates a Point Cloud object.
     * Don't create particles manually, use instead the PCS internal tools like _addParticle()
     * @param particleIndex (integer) is the particle index in the PCS pool. It's also the particle identifier.
     * @param group (PointsGroup) is the group the particle belongs to
     * @param groupId (integer) is the group identifier in the PCS.
     * @param idxInGroup (integer) is the index of the particle in the current point group (ex: the 10th point of addPoints(30))
     * @param pcs defines the PCS it is associated to
     */
    constructor(particleIndex: number, group: PointsGroup, groupId: number, idxInGroup: number, pcs: PointsCloudSystem) {
        this.idx = particleIndex;
        this._group = group;
        this.groupId = groupId;
        this.idxInGroup = idxInGroup;
        this._pcs = pcs;
    }

    /**
     * get point size
     */
    public get size(): Vector3 {
        return this.size;
    }

    /**
     * Set point size
     */
    public set size(scale: Vector3) {
        this.size = scale;
    }

    /**
     * Legacy support, changed quaternion to rotationQuaternion
     */
    public get quaternion(): Nullable<Quaternion> {
        return this.rotationQuaternion;
    }

    /**
     * Legacy support, changed quaternion to rotationQuaternion
     */
    public set quaternion(q: Nullable<Quaternion>) {
        this.rotationQuaternion = q;
    }

    /**
     * Returns a boolean. True if the particle intersects another particle or another mesh, else false.
     * The intersection is computed on the particle bounding sphere and Axis Aligned Bounding Box (AABB)
     * @param target is the object (point or mesh) what the intersection is computed against.
     * @returns true if it intersects
     */
    public intersectsMesh(target: Mesh | CloudPoint): boolean {
        if (!(target instanceof CloudPoint) || !target._boundingInfo) {
            return false;
        }
        const radius = this._pcs._size;
        let maxX: number = 0;
        let minX: number = 0;
        let maxY: number = 0;
        let minY: number = 0;
        let maxZ: number = 0;
        let minZ: number = 0;
        if (target instanceof CloudPoint) {
            maxX = target.position.x + radius;
            minX = target.position.x - radius;
            maxY = target.position.y + radius;
            minY = target.position.y - radius;
            maxZ = target.position.z + radius;
            minZ = target.position.z - radius;
        }

        if (target._boundingInfo) {
            maxX = target._boundingInfo.maximum.x;
            minX = target._boundingInfo.minimum.x;
            maxY = target._boundingInfo.maximum.y;
            minY = target._boundingInfo.minimum.y;
            maxZ = target._boundingInfo.maximum.z;
            minZ = target._boundingInfo.minimum.z;
        }
        const x = this.position.x;
        const y = this.position.y;
        const z = this.position.z;
        return (minX <= x + radius || maxX >= x - radius) && (minY <= y + radius || maxY >= y - radius) && (minZ <= z + radius || maxZ >= z - radius);
    }

    /**
     * get the rotation matrix of the particle
     * @hidden
     */
    public getRotationMatrix(m: Matrix) {
        let quaternion: Quaternion;
        if (this.rotationQuaternion) {
            quaternion = this.rotationQuaternion;
        }
        else {
            quaternion = TmpVectors.Quaternion[0];
            const rotation = this.rotation;
            Quaternion.RotationYawPitchRollToRef(rotation.y, rotation.x, rotation.z, quaternion);
        }

        quaternion.toRotationMatrix(m);
    }
}

/**
 * Represents a group of points in a points cloud system
 *  * PCS internal tool, don't use it manually.
 */
export class PointsGroup {
    /**
     * The group id
     * @hidden
     */
    public groupID: number;
    /**
     * image data for group (internal use)
     * @hidden
     */
    public _groupImageData: Nullable<ArrayBufferView>;
    /**
     * Image Width (internal use)
     * @hidden
     */
    public _groupImgWidth: number;
    /**
     * Image Height (internal use)
     * @hidden
     */
    public _groupImgHeight: number;
    /**
     * Custom position function (internal use)
     * @hidden
     */
    public _positionFunction: Nullable<(particle: CloudPoint, i?: number, s?: number) => void>;
    /**
     * density per facet for surface points
     * @hidden
     */
    public _groupDensity: number[];

    /**
     * Creates a points group object. This is an internal reference to produce particles for the PCS.
     * PCS internal tool, don't use it manually.
     * @hidden
     */
    constructor(id: number, posFunction: Nullable<(particle: CloudPoint, i?: number, s?: number) => void>) {
        this.groupID = id;
        this._positionFunction = posFunction;
    }
}
