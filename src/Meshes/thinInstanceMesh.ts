import { Nullable, DeepImmutableObject } from "../types";
import { Mesh, _InstancesBatch } from "../Meshes/mesh";
import { VertexBuffer, Buffer } from './buffer';
import { Matrix, Vector3, TmpVectors } from '../Maths/math.vector';

const isNonUniform = (buffer: DeepImmutableObject<Float32Array>, i: number) => {
    TmpVectors.Vector3[1].copyFromFloats(buffer[i * 16 + 0], buffer[i * 16 + 1], buffer[i * 16 + 2]);
    TmpVectors.Vector3[0].x = TmpVectors.Vector3[1].lengthSquared(); // scale x squared
    TmpVectors.Vector3[1].copyFromFloats(buffer[i * 16 + 4], buffer[i * 16 + 5], buffer[i * 16 + 6]);
    TmpVectors.Vector3[0].y = TmpVectors.Vector3[1].lengthSquared(); // scale y squared
    TmpVectors.Vector3[1].copyFromFloats(buffer[i * 16 + 8], buffer[i * 16 + 9], buffer[i * 16 + 10]);
    TmpVectors.Vector3[0].z = TmpVectors.Vector3[1].lengthSquared(); // scale z squared
    return TmpVectors.Vector3[0].isNonUniformWithinEpsilon(0.0001);
};

declare module "./mesh" {
    export interface Mesh {
        /**
         * Creates a new thin instance
         * @param matrix the matrix or array of matrices (position, rotation, scale) of the thin instance(s) to create
         * @param refresh true to refresh the underlying gpu buffer (default: true). If you do multiple calls to this method in a row, set refresh to true only for the last call to save performance
         * @returns the thin instance index number. If you pass an array of matrices, other instance indexes are index+1, index+2, etc
         */
        thinInstanceAdd(matrix: DeepImmutableObject<Matrix> | Array<DeepImmutableObject<Matrix>>, refresh: boolean): number;

        /**
         * Adds the transformation (matrix) of the current mesh as a thin instance
         * @param refresh true to refresh the underlying gpu buffer (default: true). If you do multiple calls to this method in a row, set refresh to true only for the last call to save performance
         * @returns the thin instance index number
         */
        thinInstanceAddSelf(refresh: boolean): number;

        /**
         * Registers a custom attribute to be used with thin instances
         * @param kind name of the attribute
         * @param stride size in floats of the attribute
         */
        thinInstanceRegisterAttribute(kind: string, stride: number): void;

        /**
         * Sets the matrix of a thin instance
         * @param index index of the thin instance
         * @param matrix matrix to set
         * @param refresh true to refresh the underlying gpu buffer (default: true). If you do multiple calls to this method in a row, set refresh to true only for the last call to save performance
         */
        thinInstanceSetMatrixAt(index: number, matrix: DeepImmutableObject<Matrix>, refresh: boolean): void;

        /**
         * Sets the value of a custom attribute for a thin instance
         * @param kind name of the attribute
         * @param index index of the thin instance
         * @param value value to set
         * @param refresh true to refresh the underlying gpu buffer (default: true). If you do multiple calls to this method in a row, set refresh to true only for the last call to save performance
         */
        thinInstanceSetAttributeAt(kind: string, index: number, value: Array<number>, refresh: boolean): void;

        /**
         * Sets a buffer to be used with thin instances. This method is a faster way to setup multiple instances than calling thinInstanceAdd repeatedly
         * @param kind name of the attribute. Use "matrix" to setup the buffer of matrices
         * @param buffer buffer to set
         * @param stride size in floats of each value of the buffer
         */
        thinInstanceSetBuffer(kind: string, buffer: Nullable<Float32Array>,  stride: number): void;

        /**
         * Synchronize the gpu buffers with a thin instance buffer. Call this method if you update later on the buffers passed to thinInstanceSetBuffer
         * @param kind name of the attribute to update. Use "matrix" to update the buffer of matrices
         */
        thinInstanceBufferUpdated(kind: string): void;

        /**
         * Refreshes the bounding info, taking into account all the thin instances defined
         * @param forceRefreshParentInfo true to force recomputing the mesh bounding info and use it to compute the aggregated bounding info
         */
        thinInstanceRefreshBoundingInfo(forceRefreshParentInfo: boolean): void;

        /** @hidden */
        _thinInstanceInitializeUserStorage(): void;

        /** @hidden */
        _thinInstanceUpdateBufferSize(kind: string, numInstances: number): void;

        /** @hidden */
        _userThinInstanceBuffersStorage: {
            data: {[key: string]: Float32Array},
            sizes: {[key: string]: number},
            vertexBuffers: {[key: string]: Nullable<VertexBuffer>},
            strides: {[key: string]: number}
        };

    }
}

Mesh.prototype.thinInstanceAdd = function(matrix: DeepImmutableObject<Matrix> | Array<DeepImmutableObject<Matrix>>, refresh: boolean = true): number {
    this._thinInstanceUpdateBufferSize("matrix", Array.isArray(matrix) ? matrix.length : 1);

    const index = this._thinInstanceDataStorage.instancesCount;

    if (Array.isArray(matrix)) {
        for (let i = 0; i < matrix.length; ++i) {
            this.thinInstanceSetMatrixAt(this._thinInstanceDataStorage.instancesCount++, matrix[i], (i === matrix.length - 1) && refresh);
        }
    } else {
        this.thinInstanceSetMatrixAt(this._thinInstanceDataStorage.instancesCount++, matrix, refresh);
    }

    return index;
};

Mesh.prototype.thinInstanceAddSelf = function(refresh: boolean = true): number {
    return this.thinInstanceAdd(Matrix.IdentityReadOnly, refresh);
};

Mesh.prototype.thinInstanceRegisterAttribute = function(kind: string, stride: number): void {
    this.removeVerticesData(kind);

    this._thinInstanceInitializeUserStorage();

    this._userThinInstanceBuffersStorage.strides[kind] = stride;
    this._userThinInstanceBuffersStorage.sizes[kind] = stride * Math.max(32, this._thinInstanceDataStorage.instancesCount); // Initial size
    this._userThinInstanceBuffersStorage.data[kind] = new Float32Array(this._userThinInstanceBuffersStorage.sizes[kind]);
    this._userThinInstanceBuffersStorage.vertexBuffers[kind] = new VertexBuffer(this.getEngine(), this._userThinInstanceBuffersStorage.data[kind], kind, true, false, stride, true);

    this.setVerticesBuffer(this._userThinInstanceBuffersStorage.vertexBuffers[kind]!);
};

Mesh.prototype.thinInstanceSetMatrixAt = function(index: number, matrix: DeepImmutableObject<Matrix>, refresh: boolean = true): boolean {
    if (!this._thinInstanceDataStorage.matrixData || index >= this._thinInstanceDataStorage.instancesCount) {
        return false;
    }

    const matrixData = this._thinInstanceDataStorage.matrixData;

    matrix.copyToArray(matrixData, index * 16);

    if (!this.nonUniformScaling) {
        this._thinInstanceDataStorage.nonUniformScaling = isNonUniform(matrix.m, 0);
        if (this._thinInstanceDataStorage.nonUniformScaling) {
            this._updateNonUniformScalingState(true);
        }
    }

    if (refresh) {
        this.thinInstanceBufferUpdated("matrix");

        if (!this.doNotSyncBoundingInfo) {
            this.thinInstanceRefreshBoundingInfo(false);
        }
    }

    return true;
};

Mesh.prototype.thinInstanceSetAttributeAt = function(kind: string, index: number, value: Array<number>, refresh: boolean = true): boolean {
    if (!this._userThinInstanceBuffersStorage || !this._userThinInstanceBuffersStorage.data[kind] || index >= this._thinInstanceDataStorage.instancesCount) {
        return false;
    }

    this._thinInstanceUpdateBufferSize(kind, 0); // make sur the buffer for the kind attribute is big enough

    this._userThinInstanceBuffersStorage.data[kind].set(value, index * this._userThinInstanceBuffersStorage.strides[kind]);

    if (refresh) {
        this.thinInstanceBufferUpdated(kind);
    }

    return true;
};

Mesh.prototype.thinInstanceSetBuffer = function(kind: string, buffer: Nullable<Float32Array>, stride: number = 0): void {
    stride = stride || 16;

    if (kind === "matrix") {
        this._thinInstanceDataStorage.matrixBuffer?.dispose();
        this._thinInstanceDataStorage.matrixBuffer = null;
        this._thinInstanceDataStorage.matrixBufferSize = buffer ? buffer.length : 32 * stride;
        this._thinInstanceDataStorage.matrixData = buffer;

        if (buffer !== null) {
            this._thinInstanceDataStorage.instancesCount = buffer.length / stride;

            const matrixBuffer = new Buffer(this.getEngine(), buffer, true, stride, false, true);

            this._thinInstanceDataStorage.matrixBuffer = matrixBuffer;

            this.setVerticesBuffer(matrixBuffer.createVertexBuffer("world0", 0, 4));
            this.setVerticesBuffer(matrixBuffer.createVertexBuffer("world1", 4, 4));
            this.setVerticesBuffer(matrixBuffer.createVertexBuffer("world2", 8, 4));
            this.setVerticesBuffer(matrixBuffer.createVertexBuffer("world3", 12, 4));

            /*this._thinInstanceDataStorage.nonUniformScaling = false;

            if (!this.ignoreNonUniformScaling) {
                for (let i = 0; i < this._thinInstanceDataStorage.instancesCount && !this._thinInstanceDataStorage.nonUniformScaling; ++i) {
                    this._thinInstanceDataStorage.nonUniformScaling = isNonUniform(buffer, i);
                }

                if (this._thinInstanceDataStorage.nonUniformScaling && !this.nonUniformScaling) {
                    this._updateNonUniformScalingState(true);
                }
            }*/

            if (!this.doNotSyncBoundingInfo) {
                this.thinInstanceRefreshBoundingInfo(false);
            }
        } else {
            this._thinInstanceDataStorage.instancesCount = 0;
            if (!this.doNotSyncBoundingInfo) {
                // mesh has no more thin instances, so need to recompute the bounding box because it's the regular mesh that will now be displayed
                this.refreshBoundingInfo(true);
            }
        }
    } else {
        if (buffer === null) {
            if (this._userThinInstanceBuffersStorage?.data[kind]) {
                this.removeVerticesData(kind);
                delete this._userThinInstanceBuffersStorage.data[kind];
                delete this._userThinInstanceBuffersStorage.strides[kind];
                delete this._userThinInstanceBuffersStorage.sizes[kind];
                delete this._userThinInstanceBuffersStorage.vertexBuffers[kind];
            }
        } else {
            this._thinInstanceInitializeUserStorage();

            this._userThinInstanceBuffersStorage.data[kind] = buffer;
            this._userThinInstanceBuffersStorage.strides[kind] = stride;
            this._userThinInstanceBuffersStorage.sizes[kind] = buffer.length;
            this._userThinInstanceBuffersStorage.vertexBuffers[kind] = new VertexBuffer(this.getEngine(), buffer, kind, true, false, stride, true);

            this.setVerticesBuffer(this._userThinInstanceBuffersStorage.vertexBuffers[kind]!);
        }
    }
};

Mesh.prototype.thinInstanceBufferUpdated = function(kind: string): void {
    if (kind === "matrix") {
        if (this._thinInstanceDataStorage.matrixBuffer) {
            this._thinInstanceDataStorage.matrixBuffer!.updateDirectly(this._thinInstanceDataStorage.matrixData!, 0, this._thinInstanceDataStorage.instancesCount);
        }
    } else if (this._userThinInstanceBuffersStorage?.vertexBuffers[kind]) {
        this._userThinInstanceBuffersStorage.vertexBuffers[kind]!.updateDirectly(this._userThinInstanceBuffersStorage.data[kind], 0);
    }
};

Mesh.prototype.thinInstanceRefreshBoundingInfo = function(forceRefreshParentInfo: boolean = false) {
    if (!this._thinInstanceDataStorage.matrixData || !this._thinInstanceDataStorage.matrixBuffer) {
        return;
    }

    const vectors = this._thinInstanceDataStorage.boundingVectors;

    if (forceRefreshParentInfo) {
        vectors.length = 0;
        this.refreshBoundingInfo(true);
    }

    const boundingInfo = this.getBoundingInfo();
    const matrixData = this._thinInstanceDataStorage.matrixData;

    if (vectors.length === 0) {
        for (let v = 0; v < boundingInfo.boundingBox.vectors.length; ++v) {
            vectors.push(boundingInfo.boundingBox.vectors[v].clone());
        }
    }

    TmpVectors.Vector3[0].setAll(Number.MAX_VALUE); // min
    TmpVectors.Vector3[1].setAll(Number.MIN_VALUE); // max

    for (let i = 0; i < this._thinInstanceDataStorage.instancesCount; ++i) {
        Matrix.FromArrayToRef(matrixData, i * 16, TmpVectors.Matrix[0]);

        for (let v = 0; v < vectors.length; ++v) {
            Vector3.TransformCoordinatesToRef(vectors[v], TmpVectors.Matrix[0], TmpVectors.Vector3[2]);
            TmpVectors.Vector3[0].minimizeInPlace(TmpVectors.Vector3[2]);
            TmpVectors.Vector3[1].maximizeInPlace(TmpVectors.Vector3[2]);
        }
    }

    boundingInfo.reConstruct(TmpVectors.Vector3[0], TmpVectors.Vector3[1]);
};

Mesh.prototype._thinInstanceUpdateBufferSize = function(kind: string, numInstances: number = 1) {
    const kindIsMatrix = kind === "matrix";

    if (!kindIsMatrix && (!this._userThinInstanceBuffersStorage || !this._userThinInstanceBuffersStorage.strides[kind])) {
        return;
    }

    const stride = kindIsMatrix ? 16 : this._userThinInstanceBuffersStorage.strides[kind];
    const currentSize = kindIsMatrix ? this._thinInstanceDataStorage.matrixBufferSize : this._userThinInstanceBuffersStorage.sizes[kind];
    let data = kindIsMatrix ? this._thinInstanceDataStorage.matrixData : this._userThinInstanceBuffersStorage.data[kind];

    const bufferSize = (this._thinInstanceDataStorage.instancesCount + numInstances) * stride;

    let newSize = currentSize;

    while (newSize < bufferSize) {
        newSize *= 2;
    }

    if (!data || currentSize != newSize) {
        if (!data) {
            data = new Float32Array(newSize);
        } else {
            const newData = new Float32Array(newSize);
            newData.set(data, 0);
            data = newData;
        }

        if (kindIsMatrix) {
            this._thinInstanceDataStorage.matrixBuffer?.dispose();

            const matrixBuffer = new Buffer(this.getEngine(), data, true, stride, false, true);

            this._thinInstanceDataStorage.matrixBuffer = matrixBuffer;
            this._thinInstanceDataStorage.matrixData = data;
            this._thinInstanceDataStorage.matrixBufferSize = newSize;

            this.setVerticesBuffer(matrixBuffer.createVertexBuffer("world0", 0, 4));
            this.setVerticesBuffer(matrixBuffer.createVertexBuffer("world1", 4, 4));
            this.setVerticesBuffer(matrixBuffer.createVertexBuffer("world2", 8, 4));
            this.setVerticesBuffer(matrixBuffer.createVertexBuffer("world3", 12, 4));
        } else {
            this._userThinInstanceBuffersStorage.vertexBuffers[kind]?.dispose();

            this._userThinInstanceBuffersStorage.data[kind] = data;
            this._userThinInstanceBuffersStorage.sizes[kind] = newSize;
            this._userThinInstanceBuffersStorage.vertexBuffers[kind] = new VertexBuffer(this.getEngine(), data, kind, true, false, stride, true);

            this.setVerticesBuffer(this._userThinInstanceBuffersStorage.vertexBuffers[kind]!);
        }
    }
};

Mesh.prototype._thinInstanceInitializeUserStorage = function() {
    if (!this._userThinInstanceBuffersStorage) {
        this._userThinInstanceBuffersStorage = {
            data: {},
            sizes: {},
            vertexBuffers: {},
            strides: {},
        };
    }
};

Mesh.prototype._disposeThinInstanceSpecificData = function() {
    if (this._thinInstanceDataStorage?.matrixBuffer) {
        this._thinInstanceDataStorage.matrixBuffer.dispose();
        this._thinInstanceDataStorage.matrixBuffer = null;
    }
};
