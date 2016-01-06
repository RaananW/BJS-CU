﻿module BABYLON {
    export class GroundMesh extends Mesh {
        public generateOctree = false;

        private _worldInverse = new Matrix();
        private _heightQuads: {slope: Vector2; facet1: Vector4; facet2: Vector4}[];
        public _subdivisions: number;
        public _width: number;
        public _height: number;
        public _minX: number;
        public _maxX: number;
        public _minZ: number;
        public _maxZ: number;

        constructor(name: string, scene: Scene) {
            super(name, scene);
        }

        public get subdivisions(): number {
            return this._subdivisions;
        }

        public optimize(chunksCount: number, octreeBlocksSize = 32): void {
            this._subdivisions = chunksCount;
            this.subdivide(this._subdivisions);
            this.createOrUpdateSubmeshesOctree(octreeBlocksSize);
        }

        public getHeightAtCoordinates(x: number, z: number): number {
            if (x < this._minX || x > this._maxX || z < this._minZ || z > this._maxZ) {
                return 0;
            }
            if (!this._heightQuads || this._heightQuads.length == 0) {
                this._computeHeightQuads();
            }
            // retrieve col and row from x, z coordinates
            var col = Math.floor((x + this._maxX) * this._subdivisions / this._width);
            var row = Math.floor(-(z + this._maxZ) * this._subdivisions / this._height + this._subdivisions);
            var quad = this._heightQuads[row * this._subdivisions + col];
            var facet;
            if (z < quad.slope.x * x + quad.slope.y) {
                facet = quad.facet1;
            } else {
                facet = quad.facet2;
            }
            var y = -(facet.x * x + facet.z * z + facet.w) / facet.y;
            return y;
        }

        private _computeHeightQuads(): void {
            this._heightQuads = new Array();
            var positions = this.getVerticesData(VertexBuffer.PositionKind);
            var v1 = Vector3.Zero();
            var v2 = Vector3.Zero();
            var v3 = Vector3.Zero();
            var v4 = Vector3.Zero();
            var v1v2 = Vector3.Zero();
            var v1v3 = Vector3.Zero();
            var v1v4 = Vector3.Zero();
            var norm1 = Vector3.Zero();
            var norm2 = Vector3.Zero();
            var i = 0;
            var j = 0;
            var k = 0;
            var cd = 0;     // 2D slope coefficient : z = cd * x + h
            var h = 0;
            var d1 = 0;     // facet plane equation : ax + by + cz + d = 0
            var d2 = 0;

            for (var row = 0; row < this._subdivisions; row ++) {
                for (var col = 0; col < this._subdivisions; col ++) {
                    i = col * 3;
                    j = row * (this._subdivisions + 1) * 3;
                    k = (row + 1) * (this._subdivisions + 1) * 3;
                    v1.x = positions[j + i];
                    v1.y = positions[j + i + 1];
                    v1.z = positions[j + i + 2];
                    v2.x = positions[j + i + 3];
                    v2.y = positions[j + i + 4];
                    v2.z = positions[j + i + 5];
                    v3.x = positions[k + i];
                    v3.y = positions[k + i + 1];
                    v3.z = positions[k + i + 2];
                    v4.x = positions[k + i + 3];
                    v4.y = positions[k + i + 4];
                    v4.z = positions[k + i + 5];

                    // 2D slope V1V4
                    cd = (v4.z - v1.z) / (v4.x - v1.x);
                    h = v1.z - cd * v1.x;             // v1 belongs to the slope
                    var slope = new Vector2(cd, h);

                    // facet equations :
                    // we compute each facet normal vector
                    // the equation of the facet plane is : norm.x * x + norm.y * y + norm.z * z + d = 0
                    // we compute the value d by applying the equation to v1 which belongs to the plane
                    // then we store the facet equation in a Vector4
                    v2.subtractToRef(v1, v1v2);
                    v3.subtractToRef(v1, v1v3);
                    v4.subtractToRef(v1, v1v4);
                    Vector3.CrossToRef(v1v3, v1v4, norm1);
                    Vector3.CrossToRef(v1v4, v1v2, norm2);
                    d1 = -(norm1.x * v1.x + norm1.y * v1.y + norm1.z * v1.z);
                    d2 = -(norm2.x * v2.x + norm2.y * v2.y + norm2.z * v2.z);
                    var facet1 = new BABYLON.Vector4(norm1.x, norm1.y, norm1.z, d1);
                    var facet2 = new BABYLON.Vector4(norm2.x, norm2.y, norm2.z, d2);

                    var quad = {slope: slope, facet1: facet1, facet2: facet2};
                    this._heightQuads.push(quad);
                }
            }


        }
    }
}
