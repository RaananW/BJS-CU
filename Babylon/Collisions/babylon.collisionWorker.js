var BABYLON;
(function (BABYLON) {
    var CollisionCache = (function () {
        function CollisionCache() {
            this._meshes = {};
            this._geometries = {};
        }
        CollisionCache.prototype.getMeshes = function () {
            return this._meshes;
        };
        CollisionCache.prototype.getGeometries = function () {
            return this._geometries;
        };
        CollisionCache.prototype.getMesh = function (id) {
            return this._meshes[id];
        };
        CollisionCache.prototype.addMesh = function (mesh) {
            this._meshes[mesh.uniqueId] = mesh;
        };
        CollisionCache.prototype.getGeometry = function (id) {
            return this._geometries[id];
        };
        CollisionCache.prototype.addGeometry = function (geometry) {
            this._geometries[geometry.id] = geometry;
        };
        return CollisionCache;
    })();
    BABYLON.CollisionCache = CollisionCache;
    var CollideWorker = (function () {
        function CollideWorker(collider, _collisionCache, finalPosition) {
            this.collider = collider;
            this._collisionCache = _collisionCache;
            this.finalPosition = finalPosition;
            this.collisionsScalingMatrix = BABYLON.Matrix.Zero();
            this.collisionTranformationMatrix = BABYLON.Matrix.Zero();
        }
        CollideWorker.prototype.collideWithWorld = function (position, velocity, maximumRetry, excludedMeshUniqueId) {
            //TODO might be a redundant calculation!
            var closeDistance = 0.01;
            //is initializing here correct? A quick look - looks like it is fine.
            if (this.collider.retry >= maximumRetry) {
                this.finalPosition.copyFrom(position);
                return;
            }
            this.collider._initialize(position, velocity, closeDistance);
            // Check all meshes
            var meshes = this._collisionCache.getMeshes();
            for (var uniqueId in meshes) {
                if (meshes.hasOwnProperty(uniqueId) && parseInt(uniqueId) != excludedMeshUniqueId) {
                    var mesh = meshes[uniqueId];
                    if (mesh.checkCollisions)
                        this.checkCollision(mesh);
                }
            }
            if (!this.collider.collisionFound) {
                position.addToRef(velocity, this.finalPosition);
                return;
            }
            if (velocity.x !== 0 || velocity.y !== 0 || velocity.z !== 0) {
                this.collider._getResponse(position, velocity);
            }
            if (velocity.length() <= closeDistance) {
                //console.log("webworker collision with " + this.collider.collidedMesh);
                this.finalPosition.copyFrom(position);
                return;
            }
            this.collider.retry++;
            this.collideWithWorld(position, velocity, maximumRetry, excludedMeshUniqueId);
        };
        CollideWorker.prototype.checkCollision = function (mesh) {
            if (!this.collider._canDoCollision(BABYLON.Vector3.FromArray(mesh.sphereCenter), mesh.sphereRadius, BABYLON.Vector3.FromArray(mesh.boxMinimum), BABYLON.Vector3.FromArray(mesh.boxMaximum))) {
                return;
            }
            ;
            // Transformation matrix
            BABYLON.Matrix.ScalingToRef(1.0 / this.collider.radius.x, 1.0 / this.collider.radius.y, 1.0 / this.collider.radius.z, this.collisionsScalingMatrix);
            var worldFromCache = BABYLON.Matrix.FromArray(mesh.worldMatrixFromCache);
            worldFromCache.multiplyToRef(this.collisionsScalingMatrix, this.collisionTranformationMatrix);
            this.processCollisionsForSubMeshes(this.collisionTranformationMatrix, mesh);
            //return colTransMat;
        };
        CollideWorker.prototype.processCollisionsForSubMeshes = function (transformMatrix, mesh) {
            var len;
            var subMeshes;
            // No Octrees for now
            //if (this._submeshesOctree && this.useOctreeForCollisions) {
            //    var radius = collider.velocityWorldLength + Math.max(collider.radius.x, collider.radius.y, collider.radius.z);
            //    var intersections = this._submeshesOctree.intersects(collider.basePointWorld, radius);
            //    len = intersections.length;
            //    subMeshes = intersections.data;
            //} else {
            subMeshes = mesh.subMeshes;
            len = subMeshes.length;
            //}
            if (!mesh.geometryId) {
                console.log("no mesh geometry id");
                return;
            }
            var meshGeometry = this._collisionCache.getGeometry(mesh.geometryId);
            if (!meshGeometry) {
                console.log("couldn't find geometry", mesh.geometryId);
                return;
            }
            for (var index = 0; index < len; index++) {
                var subMesh = subMeshes[index];
                // Bounding test
                if (len > 1 && !this.checkSubmeshCollision(subMesh))
                    continue;
                //Unneeded
                //subMesh['getMesh'] = function () {
                //    return mesh.uniqueId;
                //}
                this.collideForSubMesh(subMesh, transformMatrix, meshGeometry);
            }
        };
        CollideWorker.prototype.collideForSubMesh = function (subMesh, transformMatrix, meshGeometry) {
            var positionsArray = [];
            for (var i = 0; i < meshGeometry.positions.length; i = i + 3) {
                var p = BABYLON.Vector3.FromArray([meshGeometry.positions[i], meshGeometry.positions[i + 1], meshGeometry.positions[i + 2]]);
                positionsArray.push(p);
            }
            subMesh['_lastColliderTransformMatrix'] = transformMatrix.clone();
            //The following two arrays should be initialized CORRECTLY to save some calculation time.
            subMesh['_lastColliderWorldVertices'] = [];
            subMesh['_trianglePlanes'] = [];
            var start = subMesh.verticesStart;
            var end = (subMesh.verticesStart + subMesh.verticesCount);
            for (var i = start; i < end; i++) {
                subMesh['_lastColliderWorldVertices'].push(BABYLON.Vector3.TransformCoordinates(positionsArray[i], transformMatrix));
            }
            //}
            // Collide
            this.collider._collide(subMesh['_trianglePlanes'] = [], subMesh['_lastColliderWorldVertices'], meshGeometry.indices, subMesh.indexStart, subMesh.indexStart + subMesh.indexCount, subMesh.verticesStart, subMesh.hasMaterial);
        };
        //TODO - this! :-)
        CollideWorker.prototype.checkSubmeshCollision = function (subMesh) {
            return true;
        };
        return CollideWorker;
    })();
    BABYLON.CollideWorker = CollideWorker;
    var CollisionDetectorTransferable = (function () {
        function CollisionDetectorTransferable() {
        }
        CollisionDetectorTransferable.prototype.onInit = function (payload) {
            this._collisionCache = new CollisionCache();
            var reply = {
                error: BABYLON.WorkerReplyType.SUCCESS,
                taskType: BABYLON.WorkerTaskType.INIT
            };
            postMessage(reply, undefined);
        };
        CollisionDetectorTransferable.prototype.onUpdate = function (payload) {
            for (var id in payload.updatedGeometries) {
                if (payload.updatedGeometries.hasOwnProperty(id)) {
                    this._collisionCache.addGeometry(payload.updatedGeometries[id]);
                }
            }
            for (var uniqueId in payload.updatedMeshes) {
                if (payload.updatedMeshes.hasOwnProperty(uniqueId)) {
                    this._collisionCache.addMesh(payload.updatedMeshes[uniqueId]);
                }
            }
            var replay = {
                error: BABYLON.WorkerReplyType.SUCCESS,
                taskType: BABYLON.WorkerTaskType.UPDATE
            };
            console.log("updated");
            postMessage(replay, undefined);
        };
        CollisionDetectorTransferable.prototype.onCollision = function (payload) {
            var finalPosition = BABYLON.Vector3.Zero();
            //create a new collider
            var collider = new BABYLON.Collider();
            collider.radius = BABYLON.Vector3.FromArray(payload.collider.radius);
            var colliderWorker = new CollideWorker(collider, this._collisionCache, finalPosition);
            colliderWorker.collideWithWorld(BABYLON.Vector3.FromArray(payload.collider.position), BABYLON.Vector3.FromArray(payload.collider.velocity), payload.maximumRetry, payload.excludedMeshUniqueId);
            var replyPayload = {
                collidedMeshUniqueId: collider.collidedMesh,
                collisionId: payload.collisionId,
                newPosition: finalPosition.asArray()
            };
            var reply = {
                error: BABYLON.WorkerReplyType.SUCCESS,
                taskType: BABYLON.WorkerTaskType.COLLIDE,
                payload: replyPayload
            };
            postMessage(reply, undefined);
        };
        return CollisionDetectorTransferable;
    })();
    BABYLON.CollisionDetectorTransferable = CollisionDetectorTransferable;
    //check if we are in a web worker, as this code should NOT run on the main UI thread
    if (self && !self.document) {
        var window = {};
        var collisionDetector = new CollisionDetectorTransferable();
        var onNewMessage = function (event) {
            var message = event.data;
            switch (message.taskType) {
                case BABYLON.WorkerTaskType.INIT:
                    collisionDetector.onInit(message.payload);
                    break;
                case BABYLON.WorkerTaskType.COLLIDE:
                    collisionDetector.onCollision(message.payload);
                    break;
                case BABYLON.WorkerTaskType.UPDATE:
                    collisionDetector.onUpdate(message.payload);
                    break;
            }
        };
        self.onmessage = onNewMessage;
    }
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.collisionWorker.js.map