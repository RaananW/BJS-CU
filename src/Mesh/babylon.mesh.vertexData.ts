﻿module BABYLON {
    export interface IGetSetVerticesData {
        isVerticesDataPresent(kind: string): boolean;
        getVerticesData(kind: string, copyWhenShared?: boolean): number[] | Float32Array;
        getIndices(copyWhenShared?: boolean): number[];
        setVerticesData(kind: string, data: number[] | Float32Array, updatable?: boolean): void;
        updateVerticesData(kind: string, data: number[] | Float32Array, updateExtends?: boolean, makeItUnique?: boolean): void;
        setIndices(indices: number[] | Float32Array): void;
    }

    export class VertexData {
        public positions: number[] | Float32Array;
        public normals: number[] | Float32Array;
        public uvs: number[] | Float32Array;
        public uvs2: number[] | Float32Array;
        public uvs3: number[] | Float32Array;
        public uvs4: number[] | Float32Array;
        public uvs5: number[] | Float32Array;
        public uvs6: number[] | Float32Array;
        public colors: number[] | Float32Array;
        public matricesIndices: number[] | Float32Array;
        public matricesWeights: number[] | Float32Array;
        public indices: number[];

        public set(data: number[] | Float32Array, kind: string) {
            switch (kind) {
                case VertexBuffer.PositionKind:
                    this.positions = data;
                    break;
                case VertexBuffer.NormalKind:
                    this.normals = data;
                    break;
                case VertexBuffer.UVKind:
                    this.uvs = data;
                    break;
                case VertexBuffer.UV2Kind:
                    this.uvs2 = data;
                    break;
                case VertexBuffer.UV3Kind:
                    this.uvs3 = data;
                    break;
                case VertexBuffer.UV4Kind:
                    this.uvs4 = data;
                    break;
                case VertexBuffer.UV5Kind:
                    this.uvs5 = data;
                    break;
                case VertexBuffer.UV6Kind:
                    this.uvs6 = data;
                    break;
                case VertexBuffer.ColorKind:
                    this.colors = data;
                    break;
                case VertexBuffer.MatricesIndicesKind:
                    this.matricesIndices = data;
                    break;
                case VertexBuffer.MatricesWeightsKind:
                    this.matricesWeights = data;
                    break;
            }
        }

        public applyToMesh(mesh: Mesh, updatable?: boolean): void {
            this._applyTo(mesh, updatable);
        }

        public applyToGeometry(geometry: Geometry, updatable?: boolean): void {
            this._applyTo(geometry, updatable);
        }

        public updateMesh(mesh: Mesh, updateExtends?: boolean, makeItUnique?: boolean): void {
            this._update(mesh);
        }

        public updateGeometry(geometry: Geometry, updateExtends?: boolean, makeItUnique?: boolean): void {
            this._update(geometry);
        }

        private _applyTo(meshOrGeometry: IGetSetVerticesData, updatable?: boolean) {
            if (this.positions) {
                meshOrGeometry.setVerticesData(VertexBuffer.PositionKind, this.positions, updatable);
            }

            if (this.normals) {
                meshOrGeometry.setVerticesData(VertexBuffer.NormalKind, this.normals, updatable);
            }

            if (this.uvs) {
                meshOrGeometry.setVerticesData(VertexBuffer.UVKind, this.uvs, updatable);
            }

            if (this.uvs2) {
                meshOrGeometry.setVerticesData(VertexBuffer.UV2Kind, this.uvs2, updatable);
            }

            if (this.uvs3) {
                meshOrGeometry.setVerticesData(VertexBuffer.UV3Kind, this.uvs3, updatable);
            }

            if (this.uvs4) {
                meshOrGeometry.setVerticesData(VertexBuffer.UV4Kind, this.uvs4, updatable);
            }

            if (this.uvs5) {
                meshOrGeometry.setVerticesData(VertexBuffer.UV5Kind, this.uvs5, updatable);
            }

            if (this.uvs6) {
                meshOrGeometry.setVerticesData(VertexBuffer.UV6Kind, this.uvs6, updatable);
            }

            if (this.colors) {
                meshOrGeometry.setVerticesData(VertexBuffer.ColorKind, this.colors, updatable);
            }

            if (this.matricesIndices) {
                meshOrGeometry.setVerticesData(VertexBuffer.MatricesIndicesKind, this.matricesIndices, updatable);
            }

            if (this.matricesWeights) {
                meshOrGeometry.setVerticesData(VertexBuffer.MatricesWeightsKind, this.matricesWeights, updatable);
            }

            if (this.indices) {
                meshOrGeometry.setIndices(this.indices);
            }
        }

        private _update(meshOrGeometry: IGetSetVerticesData, updateExtends?: boolean, makeItUnique?: boolean) {
            if (this.positions) {
                meshOrGeometry.updateVerticesData(VertexBuffer.PositionKind, this.positions, updateExtends, makeItUnique);
            }

            if (this.normals) {
                meshOrGeometry.updateVerticesData(VertexBuffer.NormalKind, this.normals, updateExtends, makeItUnique);
            }

            if (this.uvs) {
                meshOrGeometry.updateVerticesData(VertexBuffer.UVKind, this.uvs, updateExtends, makeItUnique);
            }

            if (this.uvs2) {
                meshOrGeometry.updateVerticesData(VertexBuffer.UV2Kind, this.uvs2, updateExtends, makeItUnique);
            }

            if (this.uvs3) {
                meshOrGeometry.updateVerticesData(VertexBuffer.UV3Kind, this.uvs3, updateExtends, makeItUnique);
            }

            if (this.uvs4) {
                meshOrGeometry.updateVerticesData(VertexBuffer.UV4Kind, this.uvs4, updateExtends, makeItUnique);
            }

            if (this.uvs5) {
                meshOrGeometry.updateVerticesData(VertexBuffer.UV5Kind, this.uvs5, updateExtends, makeItUnique);
            }

            if (this.uvs6) {
                meshOrGeometry.updateVerticesData(VertexBuffer.UV6Kind, this.uvs6, updateExtends, makeItUnique);
            }

            if (this.colors) {
                meshOrGeometry.updateVerticesData(VertexBuffer.ColorKind, this.colors, updateExtends, makeItUnique);
            }

            if (this.matricesIndices) {
                meshOrGeometry.updateVerticesData(VertexBuffer.MatricesIndicesKind, this.matricesIndices, updateExtends, makeItUnique);
            }

            if (this.matricesWeights) {
                meshOrGeometry.updateVerticesData(VertexBuffer.MatricesWeightsKind, this.matricesWeights, updateExtends, makeItUnique);
            }

            if (this.indices) {
                meshOrGeometry.setIndices(this.indices);
            }
        }

        public transform(matrix: Matrix): void {
            var transformed = Vector3.Zero();
            var index: number;
            if (this.positions) {
                var position = Vector3.Zero();

                for (index = 0; index < this.positions.length; index += 3) {
                    Vector3.FromArrayToRef(this.positions, index, position);

                    Vector3.TransformCoordinatesToRef(position, matrix, transformed);
                    this.positions[index] = transformed.x;
                    this.positions[index + 1] = transformed.y;
                    this.positions[index + 2] = transformed.z;
                }
            }

            if (this.normals) {
                var normal = Vector3.Zero();

                for (index = 0; index < this.normals.length; index += 3) {
                    Vector3.FromArrayToRef(this.normals, index, normal);

                    Vector3.TransformNormalToRef(normal, matrix, transformed);
                    this.normals[index] = transformed.x;
                    this.normals[index + 1] = transformed.y;
                    this.normals[index + 2] = transformed.z;
                }
            }
        }

        public merge(other: VertexData): void {
            var index: number;
            if (other.indices) {
                if (!this.indices) {
                    this.indices = [];
                }

                var offset = this.positions ? this.positions.length / 3 : 0;
                for (index = 0; index < other.indices.length; index++) {
                    this.indices.push(other.indices[index] + offset);
                }
            }

            if (other.positions) {
                if (!this.positions) {
                    this.positions = [];
                }

                for (index = 0; index < other.positions.length; index++) {
                    (<number[]>this.positions).push(other.positions[index]);
                }
            }

            if (other.normals) {
                if (!this.normals) {
                    this.normals = [];
                }
                for (index = 0; index < other.normals.length; index++) {
                    (<number[]>this.normals).push(other.normals[index]);
                }
            }

            if (other.uvs) {
                if (!this.uvs) {
                    this.uvs = [];
                }
                for (index = 0; index < other.uvs.length; index++) {
                    (<number[]>this.uvs).push(other.uvs[index]);
                }
            }

            if (other.uvs2) {
                if (!this.uvs2) {
                    this.uvs2 = [];
                }
                for (index = 0; index < other.uvs2.length; index++) {
                    (<number[]>this.uvs2).push(other.uvs2[index]);
                }
            }

            if (other.uvs3) {
                if (!this.uvs3) {
                    this.uvs3 = [];
                }
                for (index = 0; index < other.uvs3.length; index++) {
                    (<number[]>this.uvs3).push(other.uvs3[index]);
                }
            }

            if (other.uvs4) {
                if (!this.uvs4) {
                    this.uvs4 = [];
                }
                for (index = 0; index < other.uvs4.length; index++) {
                    (<number[]>this.uvs4).push(other.uvs4[index]);
                }
            }

            if (other.uvs5) {
                if (!this.uvs5) {
                    this.uvs5 = [];
                }
                for (index = 0; index < other.uvs5.length; index++) {
                    (<number[]>this.uvs5).push(other.uvs5[index]);
                }
            }

            if (other.uvs6) {
                if (!this.uvs6) {
                    this.uvs6 = [];
                }
                for (index = 0; index < other.uvs6.length; index++) {
                    (<number[]>this.uvs6).push(other.uvs6[index]);
                }
            }

            if (other.matricesIndices) {
                if (!this.matricesIndices) {
                    this.matricesIndices = [];
                }
                for (index = 0; index < other.matricesIndices.length; index++) {
                    (<number[]>this.matricesIndices).push(other.matricesIndices[index]);
                }
            }

            if (other.matricesWeights) {
                if (!this.matricesWeights) {
                    this.matricesWeights = [];
                }
                for (index = 0; index < other.matricesWeights.length; index++) {
                    (<number[]>this.matricesWeights).push(other.matricesWeights[index]);
                }
            }

            if (other.colors) {
                if (!this.colors) {
                    this.colors = [];
                }
                for (index = 0; index < other.colors.length; index++) {
                    (<number[]>this.colors).push(other.colors[index]);
                }
            }
        }

        // Statics
        public static ExtractFromMesh(mesh: Mesh, copyWhenShared?: boolean): VertexData {
            return VertexData._ExtractFrom(mesh, copyWhenShared);
        }

        public static ExtractFromGeometry(geometry: Geometry, copyWhenShared?: boolean): VertexData {
            return VertexData._ExtractFrom(geometry, copyWhenShared);
        }

        private static _ExtractFrom(meshOrGeometry: IGetSetVerticesData, copyWhenShared?: boolean): VertexData {
            var result = new VertexData();

            if (meshOrGeometry.isVerticesDataPresent(VertexBuffer.PositionKind)) {
                result.positions = meshOrGeometry.getVerticesData(VertexBuffer.PositionKind, copyWhenShared);
            }

            if (meshOrGeometry.isVerticesDataPresent(VertexBuffer.NormalKind)) {
                result.normals = meshOrGeometry.getVerticesData(VertexBuffer.NormalKind, copyWhenShared);
            }

            if (meshOrGeometry.isVerticesDataPresent(VertexBuffer.UVKind)) {
                result.uvs = meshOrGeometry.getVerticesData(VertexBuffer.UVKind, copyWhenShared);
            }

            if (meshOrGeometry.isVerticesDataPresent(VertexBuffer.UV2Kind)) {
                result.uvs2 = meshOrGeometry.getVerticesData(VertexBuffer.UV2Kind, copyWhenShared);
            }

            if (meshOrGeometry.isVerticesDataPresent(VertexBuffer.UV3Kind)) {
                result.uvs3 = meshOrGeometry.getVerticesData(VertexBuffer.UV3Kind, copyWhenShared);
            }

            if (meshOrGeometry.isVerticesDataPresent(VertexBuffer.UV4Kind)) {
                result.uvs4 = meshOrGeometry.getVerticesData(VertexBuffer.UV4Kind, copyWhenShared);
            }

            if (meshOrGeometry.isVerticesDataPresent(VertexBuffer.UV5Kind)) {
                result.uvs5 = meshOrGeometry.getVerticesData(VertexBuffer.UV5Kind, copyWhenShared);
            }

            if (meshOrGeometry.isVerticesDataPresent(VertexBuffer.UV6Kind)) {
                result.uvs6 = meshOrGeometry.getVerticesData(VertexBuffer.UV6Kind, copyWhenShared);
            }

            if (meshOrGeometry.isVerticesDataPresent(VertexBuffer.ColorKind)) {
                result.colors = meshOrGeometry.getVerticesData(VertexBuffer.ColorKind, copyWhenShared);
            }

            if (meshOrGeometry.isVerticesDataPresent(VertexBuffer.MatricesIndicesKind)) {
                result.matricesIndices = meshOrGeometry.getVerticesData(VertexBuffer.MatricesIndicesKind, copyWhenShared);
            }

            if (meshOrGeometry.isVerticesDataPresent(VertexBuffer.MatricesWeightsKind)) {
                result.matricesWeights = meshOrGeometry.getVerticesData(VertexBuffer.MatricesWeightsKind, copyWhenShared);
            }

            result.indices = meshOrGeometry.getIndices(copyWhenShared);

            return result;
        }

        public static CreateRibbon(options: { pathArray: Vector3[][], closeArray?: boolean, closePath?: boolean, offset?: number, sideOrientation?: number }): VertexData {
            var pathArray: Vector3[][] = options.pathArray;
            var closeArray: boolean = options.closeArray || false;
            var closePath: boolean = options.closePath || false;
            var defaultOffset: number = Math.floor(pathArray[0].length / 2);
            var offset: number = options.offset || defaultOffset;
            offset = offset > defaultOffset ? defaultOffset : Math.floor(offset); // offset max allowed : defaultOffset
            var sideOrientation: number = (options.sideOrientation === 0) ? 0 : options.sideOrientation || Mesh.DEFAULTSIDE;

            var positions: number[] = [];
            var indices: number[] = [];
            var normals: number[] = [];
            var uvs: number[] = [];

            var us: number[][] = [];        		// us[path_id] = [uDist1, uDist2, uDist3 ... ] distances between points on path path_id
            var vs: number[][] = [];        		// vs[i] = [vDist1, vDist2, vDist3, ... ] distances between points i of consecutives paths from pathArray
            var uTotalDistance: number[] = []; 		// uTotalDistance[p] : total distance of path p
            var vTotalDistance: number[] = []; 		//  vTotalDistance[i] : total distance between points i of first and last path from pathArray
            var minlg: number;          	        // minimal length among all paths from pathArray
            var lg: number[] = [];        		    // array of path lengths : nb of vertex per path
            var idx: number[] = [];       		    // array of path indexes : index of each path (first vertex) in the total vertex number
            var p: number;							// path iterator
            var i: number;							// point iterator
            var j: number;							// point iterator

            // if single path in pathArray
            if (pathArray.length < 2) {
                var ar1: Vector3[] = [];
                var ar2: Vector3[] = [];
                for (i = 0; i < pathArray[0].length - offset; i++) {
                    ar1.push(pathArray[0][i]);
                    ar2.push(pathArray[0][i + offset]);
                }
                pathArray = [ar1, ar2];
            }

            // positions and horizontal distances (u)
            var idc: number = 0;
            var closePathCorr: number = (closePath) ? 1 : 0;
            var path: Vector3[];
            var l: number;
            minlg = pathArray[0].length;
            var vectlg: number;
            var dist: number;
            for (p = 0; p < pathArray.length; p++) {
                uTotalDistance[p] = 0;
                us[p] = [0];
                path = pathArray[p];
                l = path.length;
                minlg = (minlg < l) ? minlg : l;

                j = 0;
                while (j < l) {
                    positions.push(path[j].x, path[j].y, path[j].z);
                    if (j > 0) {
                        vectlg = path[j].subtract(path[j - 1]).length();
                        dist = vectlg + uTotalDistance[p];
                        us[p].push(dist);
                        uTotalDistance[p] = dist;
                    }
                    j++;
                }

                if (closePath) {
                    j--;
                    positions.push(path[0].x, path[0].y, path[0].z);
                    vectlg = path[j].subtract(path[0]).length();
                    dist = vectlg + uTotalDistance[p];
                    us[p].push(dist);
                    uTotalDistance[p] = dist;
                }

                lg[p] = l + closePathCorr;
                idx[p] = idc;
                idc += (l + closePathCorr);
            }

            // vertical distances (v)
            var path1: Vector3[];
            var path2: Vector3[];
            var vertex1: Vector3;
            var vertex2: Vector3;
            for (i = 0; i < minlg + closePathCorr; i++) {
                vTotalDistance[i] = 0;
                vs[i] = [0];
                for (p = 0; p < pathArray.length - 1; p++) {
                    path1 = pathArray[p];
                    path2 = pathArray[p + 1];
                    if (i === minlg) {   // closePath
                        vertex1 = path1[0];
                        vertex2 = path2[0];
                    }
                    else {
                        vertex1 = path1[i];
                        vertex2 = path2[i];
                    }
                    vectlg = vertex2.subtract(vertex1).length();
                    dist = vectlg + vTotalDistance[i];
                    vs[i].push(dist);
                    vTotalDistance[i] = dist;
                }
                if (closeArray) {
                    path1 = pathArray[p];
                    path2 = pathArray[0];
                    if (i === minlg) {   // closePath
                        vertex2 = path2[0];
                    }
                    vectlg = vertex2.subtract(vertex1).length();
                    dist = vectlg + vTotalDistance[i];
                    vTotalDistance[i] = dist;
                }
            }


            // uvs            
            var u: number;
            var v: number;
            for (p = 0; p < pathArray.length; p++) {
                for (i = 0; i < minlg + closePathCorr; i++) {
                    u = us[p][i] / uTotalDistance[p];
                    v = vs[i][p] / vTotalDistance[i];
                    uvs.push(u, v);
                }
            }

            // indices
            p = 0;                    					// path index
            var pi: number = 0;                    		// positions array index
            var l1: number = lg[p] - 1;           		// path1 length
            var l2: number = lg[p + 1] - 1;         	// path2 length
            var min: number = (l1 < l2) ? l1 : l2;   	// current path stop index
            var shft: number = idx[1] - idx[0];         // shift 
            var path1nb: number = closeArray ? lg.length : lg.length - 1;     // number of path1 to iterate	on

            while (pi <= min && p < path1nb) {       	//  stay under min and don't go over next to last path
                // draw two triangles between path1 (p1) and path2 (p2) : (p1.pi, p2.pi, p1.pi+1) and (p2.pi+1, p1.pi+1, p2.pi) clockwise

                indices.push(pi, pi + shft, pi + 1);
                indices.push(pi + shft + 1, pi + 1, pi + shft);
                pi += 1;
                if (pi === min) {                   			// if end of one of two consecutive paths reached, go to next existing path
                    p++;
                    if (p === lg.length - 1) {                 // last path of pathArray reached <=> closeArray == true
                        shft = idx[0] - idx[p];
                        l1 = lg[p] - 1;
                        l2 = lg[0] - 1;
                    }
                    else {
                        shft = idx[p + 1] - idx[p];
                        l1 = lg[p] - 1;
                        l2 = lg[p + 1] - 1;
                    }
                    pi = idx[p];
                    min = (l1 < l2) ? l1 + pi : l2 + pi;
                }
            }

            // normals
            VertexData.ComputeNormals(positions, indices, normals);

            if (closePath) {
                var indexFirst: number = 0;
                var indexLast: number = 0;
                for (p = 0; p < pathArray.length; p++) {
                    indexFirst = idx[p] * 3;
                    if (p + 1 < pathArray.length) {
                        indexLast = (idx[p + 1] - 1) * 3;
                    }
                    else {
                        indexLast = normals.length - 3;
                    }
                    normals[indexFirst] = (normals[indexFirst] + normals[indexLast]) * 0.5;
                    normals[indexFirst + 1] = (normals[indexFirst + 1] + normals[indexLast + 1]) * 0.5;
                    normals[indexFirst + 2] = (normals[indexFirst + 2] + normals[indexLast + 2]) * 0.5;
                    normals[indexLast] = normals[indexFirst];
                    normals[indexLast + 1] = normals[indexFirst + 1];
                    normals[indexLast + 2] = normals[indexFirst + 2];
                }
            }
            
            // sides
            VertexData._ComputeSides(sideOrientation, positions, indices, normals, uvs);

            // Result
            var vertexData = new VertexData();

            vertexData.indices = indices;
            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.uvs = uvs;

            if (closePath) {
                (<any>vertexData)._idx = idx;
            }

            return vertexData;
        }

        public static CreateBox(options: { size?: number, width?: number, height?: number, depth?: number, faceUV?: Vector4[], faceColors?: Color4[], sideOrientation?: number }): VertexData {
            var normalsSource = [
                new Vector3(0, 0, 1),
                new Vector3(0, 0, -1),
                new Vector3(1, 0, 0),
                new Vector3(-1, 0, 0),
                new Vector3(0, 1, 0),
                new Vector3(0, -1, 0)
            ];

            var indices = [];
            var positions = [];
            var normals = [];
            var uvs = [];

            var width = options.width || options.size || 1;
            var height = options.height || options.size || 1;
            var depth = options.depth || options.size || 1;
            var sideOrientation = (options.sideOrientation === 0) ? 0 : options.sideOrientation || Mesh.DEFAULTSIDE;
            var faceUV: Vector4[] = options.faceUV || new Array<Vector4>(6);
            var faceColors: Color4[] = options.faceColors;
            var colors = [];

            // default face colors and UV if undefined
            for (var f = 0; f < 6; f++) {
                if (faceUV[f] === undefined) {
                    faceUV[f] = new Vector4(0, 0, 1, 1);
                }
                if (faceColors && faceColors[f] === undefined) {
                    faceColors[f] = new Color4(1, 1, 1, 1);
                }
            }

            var scaleVector = new Vector3(width / 2, height / 2, depth / 2);

            // Create each face in turn.
            for (var index = 0; index < normalsSource.length; index++) {
                var normal = normalsSource[index];

                // Get two vectors perpendicular to the face normal and to each other.
                var side1 = new Vector3(normal.y, normal.z, normal.x);
                var side2 = Vector3.Cross(normal, side1);

                // Six indices (two triangles) per face.
                var verticesLength = positions.length / 3;
                indices.push(verticesLength);
                indices.push(verticesLength + 1);
                indices.push(verticesLength + 2);

                indices.push(verticesLength);
                indices.push(verticesLength + 2);
                indices.push(verticesLength + 3);

                // Four vertices per face.
                var vertex = normal.subtract(side1).subtract(side2).multiply(scaleVector);
                positions.push(vertex.x, vertex.y, vertex.z);
                normals.push(normal.x, normal.y, normal.z);
                uvs.push(faceUV[index].z, faceUV[index].w);
                if (faceColors) {
                    colors.push(faceColors[index].r, faceColors[index].g, faceColors[index].b, faceColors[index].a);
                }

                vertex = normal.subtract(side1).add(side2).multiply(scaleVector);
                positions.push(vertex.x, vertex.y, vertex.z);
                normals.push(normal.x, normal.y, normal.z);
                uvs.push(faceUV[index].x, faceUV[index].w);
                if (faceColors) {
                    colors.push(faceColors[index].r, faceColors[index].g, faceColors[index].b, faceColors[index].a);
                }

                vertex = normal.add(side1).add(side2).multiply(scaleVector);
                positions.push(vertex.x, vertex.y, vertex.z);
                normals.push(normal.x, normal.y, normal.z);
                uvs.push(faceUV[index].x, faceUV[index].y);
                if (faceColors) {
                    colors.push(faceColors[index].r, faceColors[index].g, faceColors[index].b, faceColors[index].a);
                }

                vertex = normal.add(side1).subtract(side2).multiply(scaleVector);
                positions.push(vertex.x, vertex.y, vertex.z);
                normals.push(normal.x, normal.y, normal.z);
                uvs.push(faceUV[index].z, faceUV[index].y);
                if (faceColors) {
                    colors.push(faceColors[index].r, faceColors[index].g, faceColors[index].b, faceColors[index].a);
                }
            }

            // sides
            VertexData._ComputeSides(sideOrientation, positions, indices, normals, uvs);

            // Result
            var vertexData = new VertexData();

            vertexData.indices = indices;
            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.uvs = uvs;

            if (faceColors) {
                var totalColors = (sideOrientation === Mesh.DOUBLESIDE) ? colors.concat(colors) : colors;
                vertexData.colors = totalColors;
            }

            return vertexData;
        }

        public static CreateSphere(options: { segments?: number, diameter?: number, diameterX?: number, diameterY?: number, diameterZ?: number, arc?: number, slice?: number, sideOrientation?: number }): VertexData {
            var segments: number = options.segments || 32;
            var diameterX: number = options.diameterX || options.diameter || 1;
            var diameterY: number = options.diameterY || options.diameter || 1;
            var diameterZ: number = options.diameterZ || options.diameter || 1;
            var arc: number = (options.arc <= 0) ? 1.0 : options.arc || 1.0;
            var slice: number = (options.slice <= 0) ? 1.0 : options.slice || 1.0;
            var sideOrientation = (options.sideOrientation === 0) ? 0 : options.sideOrientation || Mesh.DEFAULTSIDE;

            var radius = new Vector3(diameterX / 2, diameterY / 2, diameterZ / 2);

            var totalZRotationSteps = 2 + segments;
            var totalYRotationSteps = 2 * totalZRotationSteps;

            var indices = [];
            var positions = [];
            var normals = [];
            var uvs = [];

            for (var zRotationStep = 0; zRotationStep <= totalZRotationSteps; zRotationStep++) {
                var normalizedZ = zRotationStep / totalZRotationSteps;
                var angleZ = normalizedZ * Math.PI * slice;

                for (var yRotationStep = 0; yRotationStep <= totalYRotationSteps; yRotationStep++) {
                    var normalizedY = yRotationStep / totalYRotationSteps;

                    var angleY = normalizedY * Math.PI * 2 * arc;

                    var rotationZ = Matrix.RotationZ(-angleZ);
                    var rotationY = Matrix.RotationY(angleY);
                    var afterRotZ = Vector3.TransformCoordinates(Vector3.Up(), rotationZ);
                    var complete = Vector3.TransformCoordinates(afterRotZ, rotationY);

                    var vertex = complete.multiply(radius);
                    var normal = Vector3.Normalize(vertex);

                    positions.push(vertex.x, vertex.y, vertex.z);
                    normals.push(normal.x, normal.y, normal.z);
                    uvs.push(normalizedY, normalizedZ);
                }

                if (zRotationStep > 0) {
                    var verticesCount = positions.length / 3;
                    for (var firstIndex = verticesCount - 2 * (totalYRotationSteps + 1); (firstIndex + totalYRotationSteps + 2) < verticesCount; firstIndex++) {
                        indices.push((firstIndex));
                        indices.push((firstIndex + 1));
                        indices.push(firstIndex + totalYRotationSteps + 1);

                        indices.push((firstIndex + totalYRotationSteps + 1));
                        indices.push((firstIndex + 1));
                        indices.push((firstIndex + totalYRotationSteps + 2));
                    }
                }
            }

            // Sides
            VertexData._ComputeSides(sideOrientation, positions, indices, normals, uvs);

            // Result
            var vertexData = new VertexData();

            vertexData.indices = indices;
            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.uvs = uvs;

            return vertexData;
        }

        // Cylinder and cone 
        public static CreateCylinder(options: { height?: number, diameterTop?: number, diameterBottom?: number, diameter?: number, tessellation?: number, subdivisions?: number, arc?: number, faceColors?: Color4[], faceUV?: Vector4[], sideOrientation?: number }): VertexData {
            var height: number = options.height || 2;
            var diameterTop: number = (options.diameterTop === 0) ? 0 : options.diameterTop || options.diameter || 1;
            var diameterBottom: number = options.diameterBottom || options.diameter || 1;
            var tessellation: number = options.tessellation || 24;
            var subdivisions: number = options.subdivisions || 1;
            var arc = (options.arc <= 0) ? 1.0 : options.arc || 1.0;
            var sideOrientation: number = (options.sideOrientation === 0) ? 0 : options.sideOrientation || Mesh.DEFAULTSIDE;
            var faceUV: Vector4[] = options.faceUV || new Array<Vector4>(3);
            var faceColors: Color4[] = options.faceColors;
            // default face colors and UV if undefined
            for (var f = 0; f < 3; f++) {
                if (faceColors && faceColors[f] === undefined) {
                    faceColors[f] = new Color4(1, 1, 1, 1);
                }
                if (faceUV && faceUV[f] === undefined) {
                    faceUV[f] = new Vector4(0, 0, 1, 1);
                }
            }

            var indices = [];
            var positions = [];
            var normals = [];
            var uvs = [];
            var colors = [];

            var angle_step = Math.PI * 2 * arc / tessellation;
            var angle: number;
            var h: number;
            var radius: number;
            var tan = (diameterBottom - diameterTop) / 2 / height;
            var ringVertex: Vector3 = Vector3.Zero();
            var ringNormal: Vector3 = Vector3.Zero();

            // positions, normals, uvs
            var i: number;
            var j: number;
            for (i = 0; i <= subdivisions; i++) {
                h = i / subdivisions;
                radius = (h * (diameterTop - diameterBottom) + diameterBottom) / 2;
                for (j = 0; j <= tessellation; j++) {
                    angle = j * angle_step;
                    ringVertex.x = Math.cos(-angle) * radius;
                    ringVertex.y = -height / 2 + h * height;
                    ringVertex.z = Math.sin(-angle) * radius;
                    if (diameterTop === 0 && i === subdivisions) {
                        // if no top cap, reuse former normals
                        ringNormal.x = normals[normals.length - (tessellation + 1) * 3];
                        ringNormal.y = normals[normals.length - (tessellation + 1) * 3 + 1];
                        ringNormal.z = normals[normals.length - (tessellation + 1) * 3 + 2];
                    }
                    else {
                        ringNormal.x = ringVertex.x;
                        ringNormal.z = ringVertex.z;
                        ringNormal.y = Math.sqrt(ringNormal.x * ringNormal.x + ringNormal.z * ringNormal.z) * tan;
                        ringNormal.normalize();
                    }
                    positions.push(ringVertex.x, ringVertex.y, ringVertex.z);
                    normals.push(ringNormal.x, ringNormal.y, ringNormal.z);
                    uvs.push(faceUV[1].x + (faceUV[1].z - faceUV[1].x) * j / tessellation, faceUV[1].y + (faceUV[1].w - faceUV[1].y) * h);
                    if (faceColors) {
                        colors.push(faceColors[1].r, faceColors[1].g, faceColors[1].b, faceColors[1].a);
                    }
                }
            }

            // indices
            for (i = 0; i < subdivisions; i++) {
                for (j = 0; j < tessellation; j++) {
                    var i0 = i * (tessellation + 1) + j;
                    var i1 = (i + 1) * (tessellation + 1) + j;
                    var i2 = i * (tessellation + 1) + (j + 1);
                    var i3 = (i + 1) * (tessellation + 1) + (j + 1);
                    indices.push(i0, i1, i2);
                    indices.push(i3, i2, i1);
                }
            }

            // Caps
            var createCylinderCap = isTop => {
                var radius = isTop ? diameterTop / 2 : diameterBottom / 2;
                if (radius === 0) {
                    return;
                }

                // Cap positions, normals & uvs
                var angle;
                var circleVector;
                var i: number;
                var u: Vector4 = (isTop) ? faceUV[2] : faceUV[0];
                var c: Color4;
                if (faceColors) {
                    c = (isTop) ? faceColors[2] : faceColors[0];
                }
                // cap center
                var vbase = positions.length / 3;
                var offset = isTop ? height / 2 : -height / 2;
                var center = new Vector3(0, offset, 0);
                positions.push(center.x, center.y, center.z);
                normals.push(0, isTop ? 1 : -1, 0);
                uvs.push(u.x + (u.z - u.x) * 0.5, u.y + (u.w - u.y) * 0.5);
                if (faceColors) {
                    colors.push(c.r, c.g, c.b, c.a);
                }

                var textureScale = new Vector2(0.5, 0.5);
                for (i = 0; i <= tessellation; i++) {
                    angle = Math.PI * 2 * i * arc / tessellation;
                    var cos = Math.cos(-angle);
                    var sin = Math.sin(-angle);
                    circleVector = new Vector3(cos * radius, offset, sin * radius);
                    var textureCoordinate = new Vector2(cos * textureScale.x + 0.5, sin * textureScale.y + 0.5);
                    positions.push(circleVector.x, circleVector.y, circleVector.z);
                    normals.push(0, isTop ? 1 : -1, 0);
                    uvs.push(u.x + (u.z - u.x) * textureCoordinate.x, u.y + (u.w - u.y) * textureCoordinate.y);
                    if (faceColors) {
                        colors.push(c.r, c.g, c.b, c.a);
                    }
                }
                // Cap indices
                for (i = 0; i < tessellation; i++) {
                    if (!isTop) {
                        indices.push(vbase);
                        indices.push(vbase + (i + 1));
                        indices.push(vbase + (i + 2));
                    }
                    else {
                        indices.push(vbase);
                        indices.push(vbase + (i + 2));
                        indices.push(vbase + (i + 1));
                    }
                }
            };
            
            // add caps to geometry
            createCylinderCap(false);
            createCylinderCap(true);

            // Sides
            VertexData._ComputeSides(sideOrientation, positions, indices, normals, uvs);

            var vertexData = new VertexData();

            vertexData.indices = indices;
            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.uvs = uvs;
            if (faceColors) {
                vertexData.colors = colors;
            }

            return vertexData;
        }

        public static CreateTorus(options: { diameter?: number, thickness?: number, tessellation?: number, sideOrientation?: number }) {
            var indices = [];
            var positions = [];
            var normals = [];
            var uvs = [];

            var diameter = options.diameter || 1;
            var thickness = options.thickness || 0.5;
            var tessellation = options.tessellation || 16;
            var sideOrientation = (options.sideOrientation === 0) ? 0 : options.sideOrientation || Mesh.DEFAULTSIDE;

            var stride = tessellation + 1;

            for (var i = 0; i <= tessellation; i++) {
                var u = i / tessellation;

                var outerAngle = i * Math.PI * 2.0 / tessellation - Math.PI / 2.0;

                var transform = Matrix.Translation(diameter / 2.0, 0, 0).multiply(Matrix.RotationY(outerAngle));

                for (var j = 0; j <= tessellation; j++) {
                    var v = 1 - j / tessellation;

                    var innerAngle = j * Math.PI * 2.0 / tessellation + Math.PI;
                    var dx = Math.cos(innerAngle);
                    var dy = Math.sin(innerAngle);

                    // Create a vertex.
                    var normal = new Vector3(dx, dy, 0);
                    var position = normal.scale(thickness / 2);
                    var textureCoordinate = new Vector2(u, v);

                    position = Vector3.TransformCoordinates(position, transform);
                    normal = Vector3.TransformNormal(normal, transform);

                    positions.push(position.x, position.y, position.z);
                    normals.push(normal.x, normal.y, normal.z);
                    uvs.push(textureCoordinate.x, textureCoordinate.y);

                    // And create indices for two triangles.
                    var nextI = (i + 1) % stride;
                    var nextJ = (j + 1) % stride;

                    indices.push(i * stride + j);
                    indices.push(i * stride + nextJ);
                    indices.push(nextI * stride + j);

                    indices.push(i * stride + nextJ);
                    indices.push(nextI * stride + nextJ);
                    indices.push(nextI * stride + j);
                }
            }

            // Sides
            VertexData._ComputeSides(sideOrientation, positions, indices, normals, uvs);

            // Result
            var vertexData = new VertexData();


            vertexData.indices = indices;
            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.uvs = uvs;

            return vertexData;
        }

        public static CreateLines(options: { points: Vector3[] }): VertexData {
            var indices = [];
            var positions = [];
            var points = options.points;

            for (var index = 0; index < points.length; index++) {
                positions.push(points[index].x, points[index].y, points[index].z);

                if (index > 0) {
                    indices.push(index - 1);
                    indices.push(index);
                }
            }

            // Result
            var vertexData = new VertexData();

            vertexData.indices = indices;
            vertexData.positions = positions;

            return vertexData;
        }

        public static CreateDashedLines(options: { points: Vector3[], dashSize?: number, gapSize?: number, dashNb?: number }): VertexData {
            var dashSize = options.dashSize || 3;
            var gapSize = options.gapSize || 1;
            var dashNb = options.dashNb || 200;
            var points = options.points;

            var positions = new Array<number>();
            var indices = new Array<number>();

            var curvect = Vector3.Zero();
            var lg = 0;
            var nb = 0;
            var shft = 0;
            var dashshft = 0;
            var curshft = 0;
            var idx = 0;
            var i = 0;
            for (i = 0; i < points.length - 1; i++) {
                points[i + 1].subtractToRef(points[i], curvect);
                lg += curvect.length();
            }
            shft = lg / dashNb;
            dashshft = dashSize * shft / (dashSize + gapSize);
            for (i = 0; i < points.length - 1; i++) {
                points[i + 1].subtractToRef(points[i], curvect);
                nb = Math.floor(curvect.length() / shft);
                curvect.normalize();
                for (var j = 0; j < nb; j++) {
                    curshft = shft * j;
                    positions.push(points[i].x + curshft * curvect.x, points[i].y + curshft * curvect.y, points[i].z + curshft * curvect.z);
                    positions.push(points[i].x + (curshft + dashshft) * curvect.x, points[i].y + (curshft + dashshft) * curvect.y, points[i].z + (curshft + dashshft) * curvect.z);
                    indices.push(idx, idx + 1);
                    idx += 2;
                }
            }

            // Result
            var vertexData = new VertexData();
            vertexData.positions = positions;
            vertexData.indices = indices;

            return vertexData;
        }

        public static CreateGround(options: { width?: number, height?: number, subdivisions?: number }): VertexData {
            var indices = [];
            var positions = [];
            var normals = [];
            var uvs = [];
            var row: number, col: number;

            var width: number = options.width || 1;
            var height: number = options.height || 1;
            var subdivisions: number = options.subdivisions || 1;

            for (row = 0; row <= subdivisions; row++) {
                for (col = 0; col <= subdivisions; col++) {
                    var position = new Vector3((col * width) / subdivisions - (width / 2.0), 0, ((subdivisions - row) * height) / subdivisions - (height / 2.0));
                    var normal = new Vector3(0, 1.0, 0);

                    positions.push(position.x, position.y, position.z);
                    normals.push(normal.x, normal.y, normal.z);
                    uvs.push(col / subdivisions, 1.0 - row / subdivisions);
                }
            }

            for (row = 0; row < subdivisions; row++) {
                for (col = 0; col < subdivisions; col++) {
                    indices.push(col + 1 + (row + 1) * (subdivisions + 1));
                    indices.push(col + 1 + row * (subdivisions + 1));
                    indices.push(col + row * (subdivisions + 1));

                    indices.push(col + (row + 1) * (subdivisions + 1));
                    indices.push(col + 1 + (row + 1) * (subdivisions + 1));
                    indices.push(col + row * (subdivisions + 1));
                }
            }

            // Result
            var vertexData = new VertexData();

            vertexData.indices = indices;
            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.uvs = uvs;

            return vertexData;
        }

        public static CreateTiledGround(options: { xmin: number, zmin: number, xmax: number, zmax: number, subdivisions?: { w: number; h: number; }, precision?: { w: number; h: number; } }): VertexData {
            var xmin = options.xmin;
            var zmin = options.zmin;
            var xmax = options.xmax;
            var zmax = options.zmax;
            var subdivisions = options.subdivisions || { w: 1, h: 1 };
            var precision = options.precision || { w: 1, h: 1 };

            var indices = [];
            var positions = [];
            var normals = [];
            var uvs = [];
            var row: number, col: number, tileRow: number, tileCol: number;

            subdivisions.h = (subdivisions.w < 1) ? 1 : subdivisions.h;
            subdivisions.w = (subdivisions.w < 1) ? 1 : subdivisions.w;
            precision.w = (precision.w < 1) ? 1 : precision.w;
            precision.h = (precision.h < 1) ? 1 : precision.h;

            var tileSize = {
                'w': (xmax - xmin) / subdivisions.w,
                'h': (zmax - zmin) / subdivisions.h
            };

            function applyTile(xTileMin: number, zTileMin: number, xTileMax: number, zTileMax: number) {
                // Indices
                var base = positions.length / 3;
                var rowLength = precision.w + 1;
                for (row = 0; row < precision.h; row++) {
                    for (col = 0; col < precision.w; col++) {
                        var square = [
                            base + col + row * rowLength,
                            base + (col + 1) + row * rowLength,
                            base + (col + 1) + (row + 1) * rowLength,
                            base + col + (row + 1) * rowLength
                        ];

                        indices.push(square[1]);
                        indices.push(square[2]);
                        indices.push(square[3]);
                        indices.push(square[0]);
                        indices.push(square[1]);
                        indices.push(square[3]);
                    }
                }

                // Position, normals and uvs
                var position = Vector3.Zero();
                var normal = new Vector3(0, 1.0, 0);
                for (row = 0; row <= precision.h; row++) {
                    position.z = (row * (zTileMax - zTileMin)) / precision.h + zTileMin;
                    for (col = 0; col <= precision.w; col++) {
                        position.x = (col * (xTileMax - xTileMin)) / precision.w + xTileMin;
                        position.y = 0;

                        positions.push(position.x, position.y, position.z);
                        normals.push(normal.x, normal.y, normal.z);
                        uvs.push(col / precision.w, row / precision.h);
                    }
                }
            }

            for (tileRow = 0; tileRow < subdivisions.h; tileRow++) {
                for (tileCol = 0; tileCol < subdivisions.w; tileCol++) {
                    applyTile(
                        xmin + tileCol * tileSize.w,
                        zmin + tileRow * tileSize.h,
                        xmin + (tileCol + 1) * tileSize.w,
                        zmin + (tileRow + 1) * tileSize.h
                    );
                }
            }

            // Result
            var vertexData = new VertexData();

            vertexData.indices = indices;
            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.uvs = uvs;

            return vertexData;
        }

        public static CreateGroundFromHeightMap(options: { width: number, height: number, subdivisions: number, minHeight: number, maxHeight: number, buffer: Uint8Array, bufferWidth: number, bufferHeight: number }): VertexData {
            var indices = [];
            var positions = [];
            var normals = [];
            var uvs = [];
            var row, col;

            // Vertices
            for (row = 0; row <= options.subdivisions; row++) {
                for (col = 0; col <= options.subdivisions; col++) {
                    var position = new Vector3((col * options.width) / options.subdivisions - (options.width / 2.0), 0, ((options.subdivisions - row) * options.height) / options.subdivisions - (options.height / 2.0));

                    // Compute height
                    var heightMapX = (((position.x + options.width / 2) / options.width) * (options.bufferWidth - 1)) | 0;
                    var heightMapY = ((1.0 - (position.z + options.height / 2) / options.height) * (options.bufferHeight - 1)) | 0;

                    var pos = (heightMapX + heightMapY * options.bufferWidth) * 4;
                    var r = options.buffer[pos] / 255.0;
                    var g = options.buffer[pos + 1] / 255.0;
                    var b = options.buffer[pos + 2] / 255.0;

                    var gradient = r * 0.3 + g * 0.59 + b * 0.11;

                    position.y = options.minHeight + (options.maxHeight - options.minHeight) * gradient;

                    // Add  vertex
                    positions.push(position.x, position.y, position.z);
                    normals.push(0, 0, 0);
                    uvs.push(col / options.subdivisions, 1.0 - row / options.subdivisions);
                }
            }

            // Indices
            for (row = 0; row < options.subdivisions; row++) {
                for (col = 0; col < options.subdivisions; col++) {
                    indices.push(col + 1 + (row + 1) * (options.subdivisions + 1));
                    indices.push(col + 1 + row * (options.subdivisions + 1));
                    indices.push(col + row * (options.subdivisions + 1));

                    indices.push(col + (row + 1) * (options.subdivisions + 1));
                    indices.push(col + 1 + (row + 1) * (options.subdivisions + 1));
                    indices.push(col + row * (options.subdivisions + 1));
                }
            }

            // Normals
            VertexData.ComputeNormals(positions, indices, normals);

            // Result
            var vertexData = new VertexData();

            vertexData.indices = indices;
            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.uvs = uvs;

            return vertexData;
        }

        public static CreatePlane(options: { size?: number, width?: number, height?: number, sideOrientation?: number }): VertexData {
            var indices = [];
            var positions = [];
            var normals = [];
            var uvs = [];

            var width: number = options.width || options.size || 1;
            var height: number = options.height || options.size || 1;
            var sideOrientation = (options.sideOrientation === 0) ? 0 : options.sideOrientation || Mesh.DEFAULTSIDE;

            // Vertices
            var halfWidth = width / 2.0;
            var halfHeight = height / 2.0;

            positions.push(-halfWidth, -halfHeight, 0);
            normals.push(0, 0, -1.0);
            uvs.push(0.0, 0.0);

            positions.push(halfWidth, -halfHeight, 0);
            normals.push(0, 0, -1.0);
            uvs.push(1.0, 0.0);

            positions.push(halfWidth, halfHeight, 0);
            normals.push(0, 0, -1.0);
            uvs.push(1.0, 1.0);

            positions.push(-halfWidth, halfHeight, 0);
            normals.push(0, 0, -1.0);
            uvs.push(0.0, 1.0);

            // Indices
            indices.push(0);
            indices.push(1);
            indices.push(2);

            indices.push(0);
            indices.push(2);
            indices.push(3);

            // Sides
            VertexData._ComputeSides(sideOrientation, positions, indices, normals, uvs);

            // Result
            var vertexData = new VertexData();

            vertexData.indices = indices;
            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.uvs = uvs;

            return vertexData;
        }

        public static CreateDisc(options: { radius?: number, tessellation?: number, sideOrientation?: number }): VertexData {
            var positions = [];
            var indices = [];
            var normals = [];
            var uvs = [];

            var radius = options.radius || 0.5;
            var tessellation = options.tessellation || 64;
            var sideOrientation = (options.sideOrientation === 0) ? 0 : options.sideOrientation || Mesh.DEFAULTSIDE;

            // positions and uvs
            positions.push(0, 0, 0);    // disc center first
            uvs.push(0.5, 0.5);

            var step = Math.PI * 2 / tessellation;
            for (var a = 0; a < Math.PI * 2; a += step) {
                var x = Math.cos(a);
                var y = Math.sin(a);
                var u = (x + 1) / 2;
                var v = (1 - y) / 2;
                positions.push(radius * x, radius * y, 0);
                uvs.push(u, v);
            }
            positions.push(positions[3], positions[4], positions[5]); // close the circle
            uvs.push(uvs[2], uvs[3]);

            //indices
            var vertexNb = positions.length / 3;
            for (var i = 1; i < vertexNb - 1; i++) {
                indices.push(i + 1, 0, i);
            }

            // result
            VertexData.ComputeNormals(positions, indices, normals);
            VertexData._ComputeSides(sideOrientation, positions, indices, normals, uvs);

            var vertexData = new VertexData();

            vertexData.indices = indices;
            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.uvs = uvs;

            return vertexData;
        }

        // inspired from // http://stemkoski.github.io/Three.js/Polyhedra.html
        public static CreatePolyhedron(options: { type?: number, size?: number, sizeX?: number, sizeY?: number, sizeZ?: number, custom?: any, faceUV?: Vector4[], faceColors?: Color4[], singleFace?: boolean, sideOrientation?: number }): VertexData {
            // provided polyhedron types :
            // 0 : Tetrahedron, 1 : Octahedron, 2 : Dodecahedron, 3 : Icosahedron, 4 : Rhombicuboctahedron, 5 : Triangular Prism, 6 : Pentagonal Prism, 7 : Hexagonal Prism, 8 : Square Pyramid (J1)
            // 9 : Pentagonal Pyramid (J2), 10 : Triangular Dipyramid (J12), 11 : Pentagonal Dipyramid (J13), 12 : Elongated Square Dipyramid (J15), 13 : Elongated Pentagonal Dipyramid (J16), 14 : Elongated Pentagonal Cupola (J20)
            var polyhedra: { vertex: number[][], face: number[][] }[] = [];
            polyhedra[0] = { vertex: [[0, 0, 1.732051], [1.632993, 0, -0.5773503], [-0.8164966, 1.414214, -0.5773503], [-0.8164966, -1.414214, -0.5773503]], face: [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]] };
            polyhedra[1] = { vertex: [[0, 0, 1.414214], [1.414214, 0, 0], [0, 1.414214, 0], [-1.414214, 0, 0], [0, -1.414214, 0], [0, 0, -1.414214]], face: [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [1, 4, 5], [1, 5, 2], [2, 5, 3], [3, 5, 4]] };
            polyhedra[2] = {
                vertex: [[0, 0, 1.070466], [0.7136442, 0, 0.7978784], [-0.3568221, 0.618034, 0.7978784], [-0.3568221, -0.618034, 0.7978784], [0.7978784, 0.618034, 0.3568221], [0.7978784, -0.618034, 0.3568221], [-0.9341724, 0.381966, 0.3568221], [0.1362939, 1, 0.3568221], [0.1362939, -1, 0.3568221], [-0.9341724, -0.381966, 0.3568221], [0.9341724, 0.381966, -0.3568221], [0.9341724, -0.381966, -0.3568221], [-0.7978784, 0.618034, -0.3568221], [-0.1362939, 1, -0.3568221], [-0.1362939, -1, -0.3568221], [-0.7978784, -0.618034, -0.3568221], [0.3568221, 0.618034, -0.7978784], [0.3568221, -0.618034, -0.7978784], [-0.7136442, 0, -0.7978784], [0, 0, -1.070466]],
                face: [[0, 1, 4, 7, 2], [0, 2, 6, 9, 3], [0, 3, 8, 5, 1], [1, 5, 11, 10, 4], [2, 7, 13, 12, 6], [3, 9, 15, 14, 8], [4, 10, 16, 13, 7], [5, 8, 14, 17, 11], [6, 12, 18, 15, 9], [10, 11, 17, 19, 16], [12, 13, 16, 19, 18], [14, 15, 18, 19, 17]]
            };
            polyhedra[3] = {
                vertex: [[0, 0, 1.175571], [1.051462, 0, 0.5257311], [0.3249197, 1, 0.5257311], [-0.8506508, 0.618034, 0.5257311], [-0.8506508, -0.618034, 0.5257311], [0.3249197, -1, 0.5257311], [0.8506508, 0.618034, -0.5257311], [0.8506508, -0.618034, -0.5257311], [-0.3249197, 1, -0.5257311], [-1.051462, 0, -0.5257311], [-0.3249197, -1, -0.5257311], [0, 0, -1.175571]],
                face: [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 1], [1, 5, 7], [1, 7, 6], [1, 6, 2], [2, 6, 8], [2, 8, 3], [3, 8, 9], [3, 9, 4], [4, 9, 10], [4, 10, 5], [5, 10, 7], [6, 7, 11], [6, 11, 8], [7, 10, 11], [8, 11, 9], [9, 11, 10]]
            };
            polyhedra[4] = {
                vertex: [[0, 0, 1.070722], [0.7148135, 0, 0.7971752], [-0.104682, 0.7071068, 0.7971752], [-0.6841528, 0.2071068, 0.7971752], [-0.104682, -0.7071068, 0.7971752], [0.6101315, 0.7071068, 0.5236279], [1.04156, 0.2071068, 0.1367736], [0.6101315, -0.7071068, 0.5236279], [-0.3574067, 1, 0.1367736], [-0.7888348, -0.5, 0.5236279], [-0.9368776, 0.5, 0.1367736], [-0.3574067, -1, 0.1367736], [0.3574067, 1, -0.1367736], [0.9368776, -0.5, -0.1367736], [0.7888348, 0.5, -0.5236279], [0.3574067, -1, -0.1367736], [-0.6101315, 0.7071068, -0.5236279], [-1.04156, -0.2071068, -0.1367736], [-0.6101315, -0.7071068, -0.5236279], [0.104682, 0.7071068, -0.7971752], [0.6841528, -0.2071068, -0.7971752], [0.104682, -0.7071068, -0.7971752], [-0.7148135, 0, -0.7971752], [0, 0, -1.070722]],
                face: [[0, 2, 3], [1, 6, 5], [4, 9, 11], [7, 15, 13], [8, 16, 10], [12, 14, 19], [17, 22, 18], [20, 21, 23], [0, 1, 5, 2], [0, 3, 9, 4], [0, 4, 7, 1], [1, 7, 13, 6], [2, 5, 12, 8], [2, 8, 10, 3], [3, 10, 17, 9], [4, 11, 15, 7], [5, 6, 14, 12], [6, 13, 20, 14], [8, 12, 19, 16], [9, 17, 18, 11], [10, 16, 22, 17], [11, 18, 21, 15], [13, 15, 21, 20], [14, 20, 23, 19], [16, 19, 23, 22], [18, 22, 23, 21]]
            };
            polyhedra[5] = { vertex: [[0, 0, 1.322876], [1.309307, 0, 0.1889822], [-0.9819805, 0.8660254, 0.1889822], [0.1636634, -1.299038, 0.1889822], [0.3273268, 0.8660254, -0.9449112], [-0.8183171, -0.4330127, -0.9449112]], face: [[0, 3, 1], [2, 4, 5], [0, 1, 4, 2], [0, 2, 5, 3], [1, 3, 5, 4]] };
            polyhedra[6] = { vertex: [[0, 0, 1.159953], [1.013464, 0, 0.5642542], [-0.3501431, 0.9510565, 0.5642542], [-0.7715208, -0.6571639, 0.5642542], [0.6633206, 0.9510565, -0.03144481], [0.8682979, -0.6571639, -0.3996071], [-1.121664, 0.2938926, -0.03144481], [-0.2348831, -1.063314, -0.3996071], [0.5181548, 0.2938926, -0.9953061], [-0.5850262, -0.112257, -0.9953061]], face: [[0, 1, 4, 2], [0, 2, 6, 3], [1, 5, 8, 4], [3, 6, 9, 7], [5, 7, 9, 8], [0, 3, 7, 5, 1], [2, 4, 8, 9, 6]] };
            polyhedra[7] = { vertex: [[0, 0, 1.118034], [0.8944272, 0, 0.6708204], [-0.2236068, 0.8660254, 0.6708204], [-0.7826238, -0.4330127, 0.6708204], [0.6708204, 0.8660254, 0.2236068], [1.006231, -0.4330127, -0.2236068], [-1.006231, 0.4330127, 0.2236068], [-0.6708204, -0.8660254, -0.2236068], [0.7826238, 0.4330127, -0.6708204], [0.2236068, -0.8660254, -0.6708204], [-0.8944272, 0, -0.6708204], [0, 0, -1.118034]], face: [[0, 1, 4, 2], [0, 2, 6, 3], [1, 5, 8, 4], [3, 6, 10, 7], [5, 9, 11, 8], [7, 10, 11, 9], [0, 3, 7, 9, 5, 1], [2, 4, 8, 11, 10, 6]] };
            polyhedra[8] = { vertex: [[-0.729665, 0.670121, 0.319155], [-0.655235, -0.29213, -0.754096], [-0.093922, -0.607123, 0.537818], [0.702196, 0.595691, 0.485187], [0.776626, -0.36656, -0.588064]], face: [[1, 4, 2], [0, 1, 2], [3, 0, 2], [4, 3, 2], [4, 1, 0, 3]] };
            polyhedra[9] = { vertex: [[-0.868849, -0.100041, 0.61257], [-0.329458, 0.976099, 0.28078], [-0.26629, -0.013796, -0.477654], [-0.13392, -1.034115, 0.229829], [0.738834, 0.707117, -0.307018], [0.859683, -0.535264, -0.338508]], face: [[3, 0, 2], [5, 3, 2], [4, 5, 2], [1, 4, 2], [0, 1, 2], [0, 3, 5, 4, 1]] };
            polyhedra[10] = { vertex: [[-0.610389, 0.243975, 0.531213], [-0.187812, -0.48795, -0.664016], [-0.187812, 0.9759, -0.664016], [0.187812, -0.9759, 0.664016], [0.798201, 0.243975, 0.132803]], face: [[1, 3, 0], [3, 4, 0], [3, 1, 4], [0, 2, 1], [0, 4, 2], [2, 4, 1]] };
            polyhedra[11] = { vertex: [[-1.028778, 0.392027, -0.048786], [-0.640503, -0.646161, 0.621837], [-0.125162, -0.395663, -0.540059], [0.004683, 0.888447, -0.651988], [0.125161, 0.395663, 0.540059], [0.632925, -0.791376, 0.433102], [1.031672, 0.157063, -0.354165]], face: [[3, 2, 0], [2, 1, 0], [2, 5, 1], [0, 4, 3], [0, 1, 4], [4, 1, 5], [2, 3, 6], [3, 4, 6], [5, 2, 6], [4, 5, 6]] };
            polyhedra[12] = { vertex: [[-0.669867, 0.334933, -0.529576], [-0.669867, 0.334933, 0.529577], [-0.4043, 1.212901, 0], [-0.334933, -0.669867, -0.529576], [-0.334933, -0.669867, 0.529577], [0.334933, 0.669867, -0.529576], [0.334933, 0.669867, 0.529577], [0.4043, -1.212901, 0], [0.669867, -0.334933, -0.529576], [0.669867, -0.334933, 0.529577]], face: [[8, 9, 7], [6, 5, 2], [3, 8, 7], [5, 0, 2], [4, 3, 7], [0, 1, 2], [9, 4, 7], [1, 6, 2], [9, 8, 5, 6], [8, 3, 0, 5], [3, 4, 1, 0], [4, 9, 6, 1]] };
            polyhedra[13] = { vertex: [[-0.931836, 0.219976, -0.264632], [-0.636706, 0.318353, 0.692816], [-0.613483, -0.735083, -0.264632], [-0.326545, 0.979634, 0], [-0.318353, -0.636706, 0.692816], [-0.159176, 0.477529, -0.856368], [0.159176, -0.477529, -0.856368], [0.318353, 0.636706, 0.692816], [0.326545, -0.979634, 0], [0.613482, 0.735082, -0.264632], [0.636706, -0.318353, 0.692816], [0.931835, -0.219977, -0.264632]], face: [[11, 10, 8], [7, 9, 3], [6, 11, 8], [9, 5, 3], [2, 6, 8], [5, 0, 3], [4, 2, 8], [0, 1, 3], [10, 4, 8], [1, 7, 3], [10, 11, 9, 7], [11, 6, 5, 9], [6, 2, 0, 5], [2, 4, 1, 0], [4, 10, 7, 1]] };
            polyhedra[14] = {
                vertex: [[-0.93465, 0.300459, -0.271185], [-0.838689, -0.260219, -0.516017], [-0.711319, 0.717591, 0.128359], [-0.710334, -0.156922, 0.080946], [-0.599799, 0.556003, -0.725148], [-0.503838, -0.004675, -0.969981], [-0.487004, 0.26021, 0.48049], [-0.460089, -0.750282, -0.512622], [-0.376468, 0.973135, -0.325605], [-0.331735, -0.646985, 0.084342], [-0.254001, 0.831847, 0.530001], [-0.125239, -0.494738, -0.966586], [0.029622, 0.027949, 0.730817], [0.056536, -0.982543, -0.262295], [0.08085, 1.087391, 0.076037], [0.125583, -0.532729, 0.485984], [0.262625, 0.599586, 0.780328], [0.391387, -0.726999, -0.716259], [0.513854, -0.868287, 0.139347], [0.597475, 0.85513, 0.326364], [0.641224, 0.109523, 0.783723], [0.737185, -0.451155, 0.538891], [0.848705, -0.612742, -0.314616], [0.976075, 0.365067, 0.32976], [1.072036, -0.19561, 0.084927]],
                face: [[15, 18, 21], [12, 20, 16], [6, 10, 2], [3, 0, 1], [9, 7, 13], [2, 8, 4, 0], [0, 4, 5, 1], [1, 5, 11, 7], [7, 11, 17, 13], [13, 17, 22, 18], [18, 22, 24, 21], [21, 24, 23, 20], [20, 23, 19, 16], [16, 19, 14, 10], [10, 14, 8, 2], [15, 9, 13, 18], [12, 15, 21, 20], [6, 12, 16, 10], [3, 6, 2, 0], [9, 3, 1, 7], [9, 15, 12, 6, 3], [22, 17, 11, 5, 4, 8, 14, 19, 23, 24]]
            };

            var type: number = (options.type < 0 || options.type >= polyhedra.length) ? 0 : options.type || 0;
            var size: number = options.size;
            var sizeX: number = options.sizeX || size || 1;
            var sizeY: number = options.sizeY || size || 1;
            var sizeZ: number = options.sizeZ || size || 1;
            var data: { vertex: number[][], face: number[][], name?: string, category?: string } = options.custom || polyhedra[type];
            var nbfaces = data.face.length;
            var faceUV = options.faceUV || new Array(nbfaces);
            var faceColors = options.faceColors;
            var singleFace = options.singleFace;
            var sideOrientation = (options.sideOrientation === 0) ? 0 : options.sideOrientation || Mesh.DEFAULTSIDE;

            var positions = [];
            var indices = [];
            var normals = [];
            var uvs = [];
            var colors = [];
            var index = 0;
            var faceIdx = 0;  // face cursor in the array "indexes"
            var indexes = [];
            var i = 0;
            var f = 0;
            var u, v, ang, x, y, tmp;


            // default face colors and UV if undefined
            if (!singleFace) {
                for (f = 0; f < nbfaces; f++) {
                    if (faceColors && faceColors[f] === undefined) {
                        faceColors[f] = new Color4(1, 1, 1, 1);
                    }
                    if (faceUV && faceUV[f] === undefined) {
                        faceUV[f] = new Vector4(0, 0, 1, 1);
                    }
                }
            }   

            if (singleFace) {

                for (i = 0; i < data.vertex.length; i++) {
                    positions.push(data.vertex[i][0] * sizeX, data.vertex[i][1] * sizeY, data.vertex[i][2] * sizeZ);
                    uvs.push(0, 0);
                }
                for (var f = 0; f < nbfaces; f++) {
                    for (i = 0; i < data.face[f].length - 2; i++) {
                        indices.push(data.face[f][0], data.face[f][i + 2], data.face[f][i + 1]);
                    }
                }
                
            } else {

                for (f = 0; f < nbfaces; f++) {
                        var fl = data.face[f].length;  // number of vertices of the current face
                        ang = 2 * Math.PI / fl;
                        x = 0.5 * Math.tan(ang / 2);
                        y = 0.5;

                        // positions, uvs, colors
                        for (i = 0; i < fl; i++) {
                            // positions
                            positions.push(data.vertex[data.face[f][i]][0] * sizeX, data.vertex[data.face[f][i]][1] * sizeY, data.vertex[data.face[f][i]][2] * sizeZ);
                            indexes.push(index);
                            index++;
                            // uvs
                            u = faceUV[f].x + (faceUV[f].z - faceUV[f].x) * (0.5 + x);
                            v = faceUV[f].y + (faceUV[f].w - faceUV[f].y) * (y - 0.5);
                            uvs.push(u, v);
                            tmp = x * Math.cos(ang) - y * Math.sin(ang);
                            y = x * Math.sin(ang) + y * Math.cos(ang);
                            x = tmp;
                            // colors
                            if (faceColors) {
                                colors.push(faceColors[f].r, faceColors[f].g, faceColors[f].b, faceColors[f].a);
                            }
                        }

                    // indices from indexes
                    for (i = 0; i < fl - 2; i++) {
                        indices.push(indexes[0 + faceIdx], indexes[i + 2 + faceIdx], indexes[i + 1 + faceIdx]);
                    }
                    faceIdx += fl;
                }
            }

            VertexData.ComputeNormals(positions, indices, normals);
            VertexData._ComputeSides(sideOrientation, positions, indices, normals, uvs);

            var vertexData = new VertexData();
            vertexData.positions = positions;
            vertexData.indices = indices;
            vertexData.normals = normals;
            vertexData.uvs = uvs;
            if (faceColors && !singleFace) {
                vertexData.colors = colors;
            }
            return vertexData;
        }

        // based on http://code.google.com/p/away3d/source/browse/trunk/fp10/Away3D/src/away3d/primitives/TorusKnot.as?spec=svn2473&r=2473
        public static CreateTorusKnot(options: { radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number, p?: number, q?: number, sideOrientation?: number }): VertexData {
            var indices = [];
            var positions = [];
            var normals = [];
            var uvs = [];

            var radius = options.radius || 2;
            var tube = options.tube || 0.5;
            var radialSegments = options.radialSegments || 32;
            var tubularSegments = options.tubularSegments || 32;
            var p = options.p || 2;
            var q = options.q || 3;
            var sideOrientation = (options.sideOrientation === 0) ? 0 : options.sideOrientation || Mesh.DEFAULTSIDE;

            // Helper
            var getPos = (angle) => {

                var cu = Math.cos(angle);
                var su = Math.sin(angle);
                var quOverP = q / p * angle;
                var cs = Math.cos(quOverP);

                var tx = radius * (2 + cs) * 0.5 * cu;
                var ty = radius * (2 + cs) * su * 0.5;
                var tz = radius * Math.sin(quOverP) * 0.5;

                return new Vector3(tx, ty, tz);
            };

            // Vertices
            var i: number;
            var j: number;
            for (i = 0; i <= radialSegments; i++) {
                var modI = i % radialSegments;
                var u = modI / radialSegments * 2 * p * Math.PI;
                var p1 = getPos(u);
                var p2 = getPos(u + 0.01);
                var tang = p2.subtract(p1);
                var n = p2.add(p1);

                var bitan = Vector3.Cross(tang, n);
                n = Vector3.Cross(bitan, tang);

                bitan.normalize();
                n.normalize();

                for (j = 0; j < tubularSegments; j++) {
                    var modJ = j % tubularSegments;
                    var v = modJ / tubularSegments * 2 * Math.PI;
                    var cx = -tube * Math.cos(v);
                    var cy = tube * Math.sin(v);

                    positions.push(p1.x + cx * n.x + cy * bitan.x);
                    positions.push(p1.y + cx * n.y + cy * bitan.y);
                    positions.push(p1.z + cx * n.z + cy * bitan.z);

                    uvs.push(i / radialSegments);
                    uvs.push(j / tubularSegments);
                }
            }

            for (i = 0; i < radialSegments; i++) {
                for (j = 0; j < tubularSegments; j++) {
                    var jNext = (j + 1) % tubularSegments;
                    var a = i * tubularSegments + j;
                    var b = (i + 1) * tubularSegments + j;
                    var c = (i + 1) * tubularSegments + jNext;
                    var d = i * tubularSegments + jNext;

                    indices.push(d); indices.push(b); indices.push(a);
                    indices.push(d); indices.push(c); indices.push(b);
                }
            }

            // Normals
            VertexData.ComputeNormals(positions, indices, normals);

            // Sides
            VertexData._ComputeSides(sideOrientation, positions, indices, normals, uvs);

            // Result
            var vertexData = new VertexData();

            vertexData.indices = indices;
            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.uvs = uvs;

            return vertexData;
        }

        // Tools
        /**
         * @param {any} - positions (number[] or Float32Array)
         * @param {any} - indices   (number[] or Uint16Array)
         * @param {any} - normals   (number[] or Float32Array)
         */
        public static ComputeNormals(positions: any, indices: any, normals: any) {
            var index = 0;
            
            // temp Vector3
            var p1p2 = Vector3.Zero();
            var p3p2 = Vector3.Zero();
            var faceNormal = Vector3.Zero();

            var vertexNormali1 = Vector3.Zero();

            for (index = 0; index < positions.length; index++) {
                normals[index] = 0.0;
            }

            // indice triplet = 1 face
            var nbFaces = indices.length / 3;
            for (index = 0; index < nbFaces; index++) {
                var i1 = indices[index * 3];
                var i2 = indices[index * 3 + 1];
                var i3 = indices[index * 3 + 2];

                p1p2.x = positions[i1 * 3] - positions[i2 * 3];
                p1p2.y = positions[i1 * 3 + 1] - positions[i2 * 3 + 1];
                p1p2.z = positions[i1 * 3 + 2] - positions[i2 * 3 + 2];

                p3p2.x = positions[i3 * 3] - positions[i2 * 3];
                p3p2.y = positions[i3 * 3 + 1] - positions[i2 * 3 + 1];
                p3p2.z = positions[i3 * 3 + 2] - positions[i2 * 3 + 2];

                Vector3.CrossToRef(p1p2, p3p2, faceNormal);
                faceNormal.normalize();

                normals[i1 * 3] += faceNormal.x;
                normals[i1 * 3 + 1] += faceNormal.y;
                normals[i1 * 3 + 2] += faceNormal.z;
                normals[i2 * 3] += faceNormal.x;
                normals[i2 * 3 + 1] += faceNormal.y;
                normals[i2 * 3 + 2] += faceNormal.z;
                normals[i3 * 3] += faceNormal.x;
                normals[i3 * 3 + 1] += faceNormal.y;
                normals[i3 * 3 + 2] += faceNormal.z;
            }
            
            // last normalization
            for (index = 0; index < normals.length / 3; index++) {
                Vector3.FromFloatsToRef(normals[index * 3], normals[index * 3 + 1], normals[index * 3 + 2], vertexNormali1);
                vertexNormali1.normalize();
                normals[index * 3] = vertexNormali1.x;
                normals[index * 3 + 1] = vertexNormali1.y;
                normals[index * 3 + 2] = vertexNormali1.z;
            }
        }

        private static _ComputeSides(sideOrientation: number, positions: number[] | Float32Array, indices: number[] | Float32Array, normals: number[] | Float32Array, uvs: number[] | Float32Array) {
            var li: number = indices.length;
            var ln: number = normals.length;
            var i: number;
            var n: number;
            sideOrientation = sideOrientation || Mesh.DEFAULTSIDE;

            switch (sideOrientation) {

                case Mesh.FRONTSIDE:
                    // nothing changed
                    break;

                case Mesh.BACKSIDE:
                    var tmp: number;
                    // indices
                    for (i = 0; i < li; i += 3) {
                        tmp = indices[i];
                        indices[i] = indices[i + 2];
                        indices[i + 2] = tmp;
                    }
                    // normals
                    for (n = 0; n < ln; n++) {
                        normals[n] = -normals[n];
                    }
                    break;

                case Mesh.DOUBLESIDE:
                    // positions 
                    var lp: number = positions.length;
                    var l: number = lp / 3;
                    for (var p = 0; p < lp; p++) {
                        positions[lp + p] = positions[p];
                    }
                    // indices
                    for (i = 0; i < li; i += 3) {
                        indices[i + li] = indices[i + 2] + l;
                        indices[i + 1 + li] = indices[i + 1] + l;
                        indices[i + 2 + li] = indices[i] + l;
                    }
                    // normals
                    for (n = 0; n < ln; n++) {
                        normals[ln + n] = -normals[n];
                    }

                    // uvs
                    var lu: number = uvs.length;
                    for (var u: number = 0; u < lu; u++) {
                        uvs[u + lu] = uvs[u];
                    }
                    break;
            }
        }
    }
}


