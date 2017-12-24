/// <reference path="../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var GLTFLoaderTracker = /** @class */ (function () {
            function GLTFLoaderTracker(onComplete) {
                this._pendingCount = 0;
                this._callback = onComplete;
            }
            GLTFLoaderTracker.prototype._addPendingData = function (data) {
                this._pendingCount++;
            };
            GLTFLoaderTracker.prototype._removePendingData = function (data) {
                if (--this._pendingCount === 0) {
                    this._callback();
                }
            };
            return GLTFLoaderTracker;
        }());
        var GLTFLoader = /** @class */ (function () {
            function GLTFLoader(parent) {
                this._disposed = false;
                this._defaultSampler = {};
                this._renderReady = false;
                this._requests = new Array();
                this._renderReadyObservable = new BABYLON.Observable();
                // Count of pending work that needs to complete before the asset is rendered.
                this._renderPendingCount = 0;
                // Count of pending work that needs to complete before the loader is disposed.
                this._loaderPendingCount = 0;
                this._loaderTrackers = new Array();
                this._parent = parent;
                if (!GLTFLoader._progressEventFactory) {
                    if (typeof window["ProgressEvent"] === "function") {
                        GLTFLoader._progressEventFactory = GLTFLoader._createProgressEventByConstructor;
                    }
                    else {
                        GLTFLoader._progressEventFactory = GLTFLoader._createProgressEventByDocument;
                    }
                }
            }
            GLTFLoader.RegisterExtension = function (extension) {
                if (GLTFLoader.Extensions[extension.name]) {
                    BABYLON.Tools.Error("Extension with the same name '" + extension.name + "' already exists");
                    return;
                }
                GLTFLoader.Extensions[extension.name] = extension;
                // Keep the order of registration so that extensions registered first are called first.
                GLTF2.GLTFLoaderExtension._Extensions.push(extension);
            };
            GLTFLoader._createProgressEventByConstructor = function (name, data) {
                return new ProgressEvent(name, data);
            };
            GLTFLoader._createProgressEventByDocument = function (name, data) {
                var event = document.createEvent("ProgressEvent");
                event.initProgressEvent(name, false, false, data.lengthComputable, data.loaded, data.total);
                return event;
            };
            GLTFLoader.prototype.dispose = function () {
                if (this._disposed) {
                    return;
                }
                this._disposed = true;
                // Abort requests that are not complete
                for (var _i = 0, _a = this._requests; _i < _a.length; _i++) {
                    var request = _a[_i];
                    if (request.readyState !== (XMLHttpRequest.DONE || 4)) {
                        request.abort();
                    }
                }
                // Revoke object urls created during load
                if (this._gltf.textures) {
                    for (var _b = 0, _c = this._gltf.textures; _b < _c.length; _b++) {
                        var texture = _c[_b];
                        if (texture.url) {
                            URL.revokeObjectURL(texture.url);
                        }
                    }
                }
            };
            GLTFLoader.prototype.importMeshAsync = function (meshesNames, scene, data, rootUrl, onSuccess, onProgress, onError) {
                var _this = this;
                this._loadAsync(meshesNames, scene, data, rootUrl, function () {
                    onSuccess(_this._getMeshes(), [], _this._getSkeletons());
                }, onProgress, onError);
            };
            GLTFLoader.prototype.loadAsync = function (scene, data, rootUrl, onSuccess, onProgress, onError) {
                this._loadAsync(null, scene, data, rootUrl, onSuccess, onProgress, onError);
            };
            GLTFLoader.prototype._loadAsync = function (nodeNames, scene, data, rootUrl, onSuccess, onProgress, onError) {
                var _this = this;
                this._tryCatchOnError(function () {
                    _this._loadData(data);
                    _this._babylonScene = scene;
                    _this._rootUrl = rootUrl;
                    _this._successCallback = onSuccess;
                    _this._progressCallback = onProgress;
                    _this._errorCallback = onError;
                    _this._addPendingData(_this);
                    _this._loadDefaultScene(nodeNames);
                    _this._loadAnimations();
                    _this._removePendingData(_this);
                });
            };
            GLTFLoader.prototype._onProgress = function () {
                if (!this._progressCallback) {
                    return;
                }
                var loaded = 0;
                var total = 0;
                for (var _i = 0, _a = this._requests; _i < _a.length; _i++) {
                    var request = _a[_i];
                    if (!request._loaded || !request._total) {
                        return;
                    }
                    loaded += request._loaded;
                    total += request._total;
                }
                this._progressCallback(GLTFLoader._progressEventFactory("GLTFLoaderProgress", {
                    lengthComputable: true,
                    loaded: loaded,
                    total: total
                }));
            };
            GLTFLoader.prototype._executeWhenRenderReady = function (func) {
                if (this._renderReady) {
                    func();
                }
                else {
                    this._renderReadyObservable.add(func);
                }
            };
            GLTFLoader.prototype._onRenderReady = function () {
                this._rootNode.babylonMesh.setEnabled(true);
                this._startAnimations();
                this._successCallback();
                this._renderReadyObservable.notifyObservers(this);
            };
            GLTFLoader.prototype._onComplete = function () {
                if (this._parent.onComplete) {
                    this._parent.onComplete();
                }
                this.dispose();
            };
            GLTFLoader.prototype._loadData = function (data) {
                this._gltf = data.json;
                // Assign the index of each object for convinience.
                GLTFLoader._AssignIndices(this._gltf.accessors);
                GLTFLoader._AssignIndices(this._gltf.animations);
                GLTFLoader._AssignIndices(this._gltf.buffers);
                GLTFLoader._AssignIndices(this._gltf.bufferViews);
                GLTFLoader._AssignIndices(this._gltf.images);
                GLTFLoader._AssignIndices(this._gltf.materials);
                GLTFLoader._AssignIndices(this._gltf.meshes);
                GLTFLoader._AssignIndices(this._gltf.nodes);
                GLTFLoader._AssignIndices(this._gltf.samplers);
                GLTFLoader._AssignIndices(this._gltf.scenes);
                GLTFLoader._AssignIndices(this._gltf.skins);
                GLTFLoader._AssignIndices(this._gltf.textures);
                if (data.bin) {
                    var buffers = this._gltf.buffers;
                    if (buffers && buffers[0] && !buffers[0].uri) {
                        var binaryBuffer = buffers[0];
                        if (binaryBuffer.byteLength < data.bin.byteLength - 3 || binaryBuffer.byteLength > data.bin.byteLength) {
                            BABYLON.Tools.Warn("Binary buffer length (" + binaryBuffer.byteLength + ") from JSON does not match chunk length (" + data.bin.byteLength + ")");
                        }
                        binaryBuffer.loadedData = data.bin;
                    }
                    else {
                        BABYLON.Tools.Warn("Unexpected BIN chunk");
                    }
                }
            };
            GLTFLoader.prototype._getMeshes = function () {
                var meshes = new Array();
                // Root mesh is always first.
                meshes.push(this._rootNode.babylonMesh);
                var nodes = this._gltf.nodes;
                if (nodes) {
                    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                        var node = nodes_1[_i];
                        if (node.babylonMesh) {
                            meshes.push(node.babylonMesh);
                        }
                    }
                }
                return meshes;
            };
            GLTFLoader.prototype._getSkeletons = function () {
                var skeletons = new Array();
                var skins = this._gltf.skins;
                if (skins) {
                    for (var _i = 0, skins_1 = skins; _i < skins_1.length; _i++) {
                        var skin = skins_1[_i];
                        if (skin.babylonSkeleton) {
                            skeletons.push(skin.babylonSkeleton);
                        }
                    }
                }
                return skeletons;
            };
            GLTFLoader.prototype._startAnimations = function () {
                var animations = this._gltf.animations;
                if (!animations) {
                    return;
                }
                switch (this._parent.animationStartMode) {
                    case BABYLON.GLTFLoaderAnimationStartMode.NONE: {
                        // do nothing
                        break;
                    }
                    case BABYLON.GLTFLoaderAnimationStartMode.FIRST: {
                        var animation = animations[0];
                        for (var _i = 0, _a = animation.targets; _i < _a.length; _i++) {
                            var target = _a[_i];
                            this._babylonScene.beginAnimation(target, 0, Number.MAX_VALUE, true);
                        }
                        break;
                    }
                    case BABYLON.GLTFLoaderAnimationStartMode.ALL: {
                        for (var _b = 0, animations_1 = animations; _b < animations_1.length; _b++) {
                            var animation = animations_1[_b];
                            for (var _c = 0, _d = animation.targets; _c < _d.length; _c++) {
                                var target = _d[_c];
                                this._babylonScene.beginAnimation(target, 0, Number.MAX_VALUE, true);
                            }
                        }
                        break;
                    }
                    default: {
                        BABYLON.Tools.Error("Invalid animation start mode " + this._parent.animationStartMode);
                        return;
                    }
                }
            };
            GLTFLoader.prototype._loadDefaultScene = function (nodeNames) {
                var scene = GLTFLoader._GetProperty(this._gltf.scenes, this._gltf.scene || 0);
                if (!scene) {
                    throw new Error("Failed to find scene " + (this._gltf.scene || 0));
                }
                this._loadScene("#/scenes/" + scene.index, scene, nodeNames);
            };
            GLTFLoader.prototype._loadScene = function (context, scene, nodeNames) {
                var _this = this;
                this._rootNode = { babylonMesh: new BABYLON.Mesh("__root__", this._babylonScene) };
                switch (this._parent.coordinateSystemMode) {
                    case BABYLON.GLTFLoaderCoordinateSystemMode.AUTO: {
                        if (!this._babylonScene.useRightHandedSystem) {
                            this._rootNode.rotation = [0, 1, 0, 0];
                            this._rootNode.scale = [1, 1, -1];
                            this._loadTransform(this._rootNode);
                        }
                        break;
                    }
                    case BABYLON.GLTFLoaderCoordinateSystemMode.FORCE_RIGHT_HANDED: {
                        this._babylonScene.useRightHandedSystem = true;
                        break;
                    }
                    default: {
                        BABYLON.Tools.Error("Invalid coordinate system mode " + this._parent.coordinateSystemMode);
                        return;
                    }
                }
                if (this._parent.onMeshLoaded) {
                    this._parent.onMeshLoaded(this._rootNode.babylonMesh);
                }
                var nodeIndices = scene.nodes;
                this._traverseNodes(context, nodeIndices, function (node, parentNode) {
                    node.parent = parentNode;
                    return true;
                }, this._rootNode);
                if (nodeNames) {
                    if (!(nodeNames instanceof Array)) {
                        nodeNames = [nodeNames];
                    }
                    var filteredNodeIndices_1 = new Array();
                    this._traverseNodes(context, nodeIndices, function (node) {
                        if (nodeNames.indexOf(node.name) !== -1) {
                            filteredNodeIndices_1.push(node.index);
                            node.parent = _this._rootNode;
                            return false;
                        }
                        return true;
                    }, this._rootNode);
                    nodeIndices = filteredNodeIndices_1;
                }
                for (var _i = 0, nodeIndices_1 = nodeIndices; _i < nodeIndices_1.length; _i++) {
                    var index = nodeIndices_1[_i];
                    var node = GLTFLoader._GetProperty(this._gltf.nodes, index);
                    if (!node) {
                        throw new Error(context + ": Failed to find node " + index);
                    }
                    this._loadNode("#/nodes/" + index, node);
                }
                // Disable the root mesh until the asset is ready to render.
                this._rootNode.babylonMesh.setEnabled(false);
            };
            GLTFLoader.prototype._loadNode = function (context, node) {
                if (GLTF2.GLTFLoaderExtension.LoadNode(this, context, node)) {
                    return;
                }
                node.babylonMesh = new BABYLON.Mesh(node.name || "mesh" + node.index, this._babylonScene);
                node.babylonMesh.hasVertexAlpha = true;
                this._loadTransform(node);
                if (node.mesh != null) {
                    var mesh = GLTFLoader._GetProperty(this._gltf.meshes, node.mesh);
                    if (!mesh) {
                        throw new Error(context + ": Failed to find mesh " + node.mesh);
                    }
                    this._loadMesh("#/meshes/" + node.mesh, node, mesh);
                }
                node.babylonMesh.parent = node.parent.babylonMesh;
                node.babylonAnimationTargets = node.babylonAnimationTargets || [];
                node.babylonAnimationTargets.push(node.babylonMesh);
                if (node.skin != null) {
                    var skin_1 = GLTFLoader._GetProperty(this._gltf.skins, node.skin);
                    if (!skin_1) {
                        throw new Error(context + ": Failed to find skin " + node.skin);
                    }
                    this._loadSkinAsync("#/skins/" + node.skin, skin_1, function () {
                        node.babylonMesh.skeleton = skin_1.babylonSkeleton;
                        node.babylonMesh._refreshBoundingInfo(true);
                    });
                    node.babylonMesh.parent = this._rootNode.babylonMesh;
                    node.babylonMesh.position = BABYLON.Vector3.Zero();
                    node.babylonMesh.rotationQuaternion = BABYLON.Quaternion.Identity();
                    node.babylonMesh.scaling = BABYLON.Vector3.One();
                }
                if (node.camera != null) {
                    // TODO: handle cameras
                }
                if (node.children) {
                    for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
                        var index = _a[_i];
                        var childNode = GLTFLoader._GetProperty(this._gltf.nodes, index);
                        if (!childNode) {
                            throw new Error(context + ": Failed to find child node " + index);
                        }
                        this._loadNode("#/nodes/" + index, childNode);
                    }
                }
                if (this._parent.onMeshLoaded) {
                    this._parent.onMeshLoaded(node.babylonMesh);
                }
            };
            GLTFLoader.prototype._loadMesh = function (context, node, mesh) {
                var _this = this;
                var primitives = mesh.primitives;
                if (!primitives || primitives.length === 0) {
                    throw new Error(context + ": Primitives are missing");
                }
                this._createMorphTargets(context, node, mesh);
                this._loadAllVertexDataAsync(context, mesh, function () {
                    _this._loadMorphTargets(context, node, mesh);
                    var vertexData = new BABYLON.VertexData();
                    for (var _i = 0, primitives_1 = primitives; _i < primitives_1.length; _i++) {
                        var primitive = primitives_1[_i];
                        vertexData.merge(primitive.vertexData);
                    }
                    new BABYLON.Geometry(node.babylonMesh.name, _this._babylonScene, vertexData, false, node.babylonMesh);
                    // TODO: optimize this so that sub meshes can be created without being overwritten after setting vertex data.
                    // Sub meshes must be cleared and created after setting vertex data because of mesh._createGlobalSubMesh.
                    node.babylonMesh.subMeshes = [];
                    var verticesStart = 0;
                    var indicesStart = 0;
                    for (var index = 0; index < primitives.length; index++) {
                        var vertexData_1 = primitives[index].vertexData;
                        var verticesCount = vertexData_1.positions.length;
                        var indicesCount = vertexData_1.indices.length;
                        BABYLON.SubMesh.AddToMesh(index, verticesStart, verticesCount, indicesStart, indicesCount, node.babylonMesh);
                        verticesStart += verticesCount;
                        indicesStart += indicesCount;
                    }
                    ;
                });
                if (primitives.length === 1) {
                    var primitive = primitives[0];
                    if (primitive.material == null) {
                        node.babylonMesh.material = this._getDefaultMaterial();
                    }
                    else {
                        var material = GLTFLoader._GetProperty(this._gltf.materials, primitive.material);
                        if (!material) {
                            throw new Error(context + ": Failed to find material " + primitive.material);
                        }
                        this._loadMaterial("#/materials/" + material.index, material, function (babylonMaterial, isNew) {
                            if (isNew && _this._parent.onMaterialLoaded) {
                                _this._parent.onMaterialLoaded(babylonMaterial);
                            }
                            node.babylonMesh.material = babylonMaterial;
                        });
                    }
                }
                else {
                    var multiMaterial = new BABYLON.MultiMaterial(node.babylonMesh.name, this._babylonScene);
                    node.babylonMesh.material = multiMaterial;
                    var subMaterials_1 = multiMaterial.subMaterials;
                    var _loop_1 = function (index) {
                        var primitive = primitives[index];
                        if (primitive.material == null) {
                            subMaterials_1[index] = this_1._getDefaultMaterial();
                        }
                        else {
                            var material = GLTFLoader._GetProperty(this_1._gltf.materials, primitive.material);
                            if (!material) {
                                throw new Error(context + ": Failed to find material " + primitive.material);
                            }
                            this_1._loadMaterial("#/materials/" + material.index, material, function (babylonMaterial, isNew) {
                                if (isNew && _this._parent.onMaterialLoaded) {
                                    _this._parent.onMaterialLoaded(babylonMaterial);
                                }
                                subMaterials_1[index] = babylonMaterial;
                            });
                        }
                    };
                    var this_1 = this;
                    for (var index = 0; index < primitives.length; index++) {
                        _loop_1(index);
                    }
                    ;
                }
            };
            GLTFLoader.prototype._loadAllVertexDataAsync = function (context, mesh, onSuccess) {
                var primitives = mesh.primitives;
                var numRemainingPrimitives = primitives.length;
                var _loop_2 = function (index) {
                    var primitive = primitives[index];
                    this_2._loadVertexDataAsync(context + "/primitive/" + index, mesh, primitive, function (vertexData) {
                        primitive.vertexData = vertexData;
                        if (--numRemainingPrimitives === 0) {
                            onSuccess();
                        }
                    });
                };
                var this_2 = this;
                for (var index = 0; index < primitives.length; index++) {
                    _loop_2(index);
                }
            };
            /**
             * Converts a data bufferview into a Float4 Texture Coordinate Array, based on the accessor component type
             * @param {ArrayBufferView} data
             * @param {IGLTFAccessor} accessor
             */
            GLTFLoader.prototype._convertToFloat4TextureCoordArray = function (context, data, accessor) {
                if (accessor.componentType == GLTF2.EComponentType.FLOAT) {
                    return data;
                }
                var buffer = data;
                var factor = 1;
                switch (accessor.componentType) {
                    case GLTF2.EComponentType.UNSIGNED_BYTE: {
                        factor = 1 / 255;
                        break;
                    }
                    case GLTF2.EComponentType.UNSIGNED_SHORT: {
                        factor = 1 / 65535;
                        break;
                    }
                    default: {
                        throw new Error(context + ": Invalid component type (" + accessor.componentType + ")");
                    }
                }
                var result = new Float32Array(accessor.count * 2);
                for (var i = 0; i < result.length; ++i) {
                    result[i] = buffer[i] * factor;
                }
                return result;
            };
            /**
             * Converts a data bufferview into a Float4 Color Array, based on the accessor component type
             * @param {ArrayBufferView} data
             * @param {IGLTFAccessor} accessor
             */
            GLTFLoader.prototype._convertToFloat4ColorArray = function (context, data, accessor) {
                var colorComponentCount = GLTFLoader._GetNumComponents(context, accessor.type);
                if (colorComponentCount === 4 && accessor.componentType === GLTF2.EComponentType.FLOAT) {
                    return data;
                }
                var buffer = data;
                var factor = 1;
                switch (accessor.componentType) {
                    case GLTF2.EComponentType.FLOAT: {
                        factor = 1;
                        break;
                    }
                    case GLTF2.EComponentType.UNSIGNED_BYTE: {
                        factor = 1 / 255;
                        break;
                    }
                    case GLTF2.EComponentType.UNSIGNED_SHORT: {
                        factor = 1 / 65535;
                        break;
                    }
                    default: {
                        throw new Error(context + ": Invalid component type (" + accessor.componentType + ")");
                    }
                }
                var result = new Float32Array(accessor.count * 4);
                if (colorComponentCount === 4) {
                    for (var i = 0; i < result.length; ++i) {
                        result[i] = buffer[i] * factor;
                    }
                }
                else {
                    var offset = 0;
                    for (var i = 0; i < result.length; ++i) {
                        if ((i + 1) % 4 === 0) {
                            result[i] = 1;
                        }
                        else {
                            result[i] = buffer[offset++] * factor;
                        }
                    }
                }
                return result;
            };
            GLTFLoader.prototype._loadVertexDataAsync = function (context, mesh, primitive, onSuccess) {
                var _this = this;
                var attributes = primitive.attributes;
                if (!attributes) {
                    throw new Error(context + ": Attributes are missing");
                }
                if (primitive.mode && primitive.mode !== GLTF2.EMeshPrimitiveMode.TRIANGLES) {
                    // TODO: handle other primitive modes
                    throw new Error(context + ": Mode " + primitive.mode + " is not currently supported");
                }
                var vertexData = new BABYLON.VertexData();
                var numRemainingAttributes = Object.keys(attributes).length;
                var _loop_3 = function (attribute) {
                    var accessor = GLTFLoader._GetProperty(this_3._gltf.accessors, attributes[attribute]);
                    if (!accessor) {
                        throw new Error(context + ": Failed to find attribute '" + attribute + "' accessor " + attributes[attribute]);
                    }
                    this_3._loadAccessorAsync("#/accessors/" + accessor.index, accessor, function (data) {
                        switch (attribute) {
                            case "POSITION": {
                                vertexData.positions = data;
                                break;
                            }
                            case "NORMAL": {
                                vertexData.normals = data;
                                break;
                            }
                            case "TANGENT": {
                                vertexData.tangents = data;
                                break;
                            }
                            case "TEXCOORD_0": {
                                vertexData.uvs = _this._convertToFloat4TextureCoordArray(context, data, accessor);
                                break;
                            }
                            case "TEXCOORD_1": {
                                vertexData.uvs2 = _this._convertToFloat4TextureCoordArray(context, data, accessor);
                                break;
                            }
                            case "JOINTS_0": {
                                vertexData.matricesIndices = new Float32Array(Array.prototype.slice.apply(data));
                                break;
                            }
                            case "WEIGHTS_0": {
                                //TODO: need to add support for normalized weights.
                                vertexData.matricesWeights = data;
                                break;
                            }
                            case "COLOR_0": {
                                vertexData.colors = _this._convertToFloat4ColorArray(context, data, accessor);
                                break;
                            }
                            default: {
                                BABYLON.Tools.Warn(context + ": Ignoring unrecognized attribute '" + attribute + "'");
                                break;
                            }
                        }
                        if (--numRemainingAttributes === 0) {
                            if (primitive.indices == null) {
                                vertexData.indices = new Uint32Array(vertexData.positions.length / 3);
                                for (var i = 0; i < vertexData.indices.length; i++) {
                                    vertexData.indices[i] = i;
                                }
                                onSuccess(vertexData);
                            }
                            else {
                                var indicesAccessor = GLTFLoader._GetProperty(_this._gltf.accessors, primitive.indices);
                                if (!indicesAccessor) {
                                    throw new Error(context + ": Failed to find indices accessor " + primitive.indices);
                                }
                                _this._loadAccessorAsync("#/accessors/" + indicesAccessor.index, indicesAccessor, function (data) {
                                    vertexData.indices = data;
                                    onSuccess(vertexData);
                                });
                            }
                        }
                    });
                };
                var this_3 = this;
                for (var attribute in attributes) {
                    _loop_3(attribute);
                }
            };
            GLTFLoader.prototype._createMorphTargets = function (context, node, mesh) {
                var primitives = mesh.primitives;
                var targets = primitives[0].targets;
                if (!targets) {
                    return;
                }
                for (var _i = 0, primitives_2 = primitives; _i < primitives_2.length; _i++) {
                    var primitive = primitives_2[_i];
                    if (!primitive.targets || primitive.targets.length != targets.length) {
                        throw new Error(context + ": All primitives are required to list the same number of targets");
                    }
                }
                var morphTargetManager = new BABYLON.MorphTargetManager();
                node.babylonMesh.morphTargetManager = morphTargetManager;
                for (var index = 0; index < targets.length; index++) {
                    var weight = node.weights ? node.weights[index] : mesh.weights ? mesh.weights[index] : 0;
                    morphTargetManager.addTarget(new BABYLON.MorphTarget("morphTarget" + index, weight));
                }
            };
            GLTFLoader.prototype._loadMorphTargets = function (context, node, mesh) {
                var morphTargetManager = node.babylonMesh.morphTargetManager;
                if (!morphTargetManager) {
                    return;
                }
                this._loadAllMorphTargetVertexDataAsync(context, node, mesh, function () {
                    var numTargets = morphTargetManager.numTargets;
                    for (var index = 0; index < numTargets; index++) {
                        var vertexData = new BABYLON.VertexData();
                        for (var _i = 0, _a = mesh.primitives; _i < _a.length; _i++) {
                            var primitive = _a[_i];
                            vertexData.merge(primitive.targetsVertexData[index], { tangentLength: 3 });
                        }
                        if (!vertexData.positions) {
                            throw new Error(context + ": Positions are missing");
                        }
                        var target = morphTargetManager.getTarget(index);
                        target.setPositions(vertexData.positions);
                        target.setNormals(vertexData.normals);
                        target.setTangents(vertexData.tangents);
                    }
                });
            };
            GLTFLoader.prototype._loadAllMorphTargetVertexDataAsync = function (context, node, mesh, onSuccess) {
                var numRemainingTargets = mesh.primitives.length * node.babylonMesh.morphTargetManager.numTargets;
                var _loop_4 = function (primitive) {
                    var targets = primitive.targets;
                    primitive.targetsVertexData = new Array(targets.length);
                    var _loop_5 = function (index) {
                        this_4._loadMorphTargetVertexDataAsync(context + "/targets/" + index, primitive.vertexData, targets[index], function (vertexData) {
                            primitive.targetsVertexData[index] = vertexData;
                            if (--numRemainingTargets === 0) {
                                onSuccess();
                            }
                        });
                    };
                    for (var index = 0; index < targets.length; index++) {
                        _loop_5(index);
                    }
                };
                var this_4 = this;
                for (var _i = 0, _a = mesh.primitives; _i < _a.length; _i++) {
                    var primitive = _a[_i];
                    _loop_4(primitive);
                }
            };
            GLTFLoader.prototype._loadMorphTargetVertexDataAsync = function (context, vertexData, attributes, onSuccess) {
                var targetVertexData = new BABYLON.VertexData();
                var numRemainingAttributes = Object.keys(attributes).length;
                var _loop_6 = function (attribute) {
                    var accessor = GLTFLoader._GetProperty(this_5._gltf.accessors, attributes[attribute]);
                    if (!accessor) {
                        throw new Error(context + ": Failed to find attribute '" + attribute + "' accessor " + attributes[attribute]);
                    }
                    this_5._loadAccessorAsync("#/accessors/" + accessor.index, accessor, function (data) {
                        // glTF stores morph target information as deltas while babylon.js expects the final data.
                        // As a result we have to add the original data to the delta to calculate the final data.
                        var values = data;
                        switch (attribute) {
                            case "POSITION": {
                                for (var i = 0; i < values.length; i++) {
                                    values[i] += vertexData.positions[i];
                                }
                                targetVertexData.positions = values;
                                break;
                            }
                            case "NORMAL": {
                                for (var i = 0; i < values.length; i++) {
                                    values[i] += vertexData.normals[i];
                                }
                                targetVertexData.normals = values;
                                break;
                            }
                            case "TANGENT": {
                                // Tangent data for morph targets is stored as xyz delta.
                                // The vertexData.tangent is stored as xyzw.
                                // So we need to skip every fourth vertexData.tangent.
                                for (var i = 0, j = 0; i < values.length; i++, j++) {
                                    values[i] += vertexData.tangents[j];
                                    if ((i + 1) % 3 == 0) {
                                        j++;
                                    }
                                }
                                targetVertexData.tangents = values;
                                break;
                            }
                            default: {
                                BABYLON.Tools.Warn(context + ": Ignoring unrecognized attribute '" + attribute + "'");
                                break;
                            }
                        }
                        if (--numRemainingAttributes === 0) {
                            onSuccess(targetVertexData);
                        }
                    });
                };
                var this_5 = this;
                for (var attribute in attributes) {
                    _loop_6(attribute);
                }
            };
            GLTFLoader.prototype._loadTransform = function (node) {
                var position = BABYLON.Vector3.Zero();
                var rotation = BABYLON.Quaternion.Identity();
                var scaling = BABYLON.Vector3.One();
                if (node.matrix) {
                    var matrix = BABYLON.Matrix.FromArray(node.matrix);
                    matrix.decompose(scaling, rotation, position);
                }
                else {
                    if (node.translation)
                        position = BABYLON.Vector3.FromArray(node.translation);
                    if (node.rotation)
                        rotation = BABYLON.Quaternion.FromArray(node.rotation);
                    if (node.scale)
                        scaling = BABYLON.Vector3.FromArray(node.scale);
                }
                node.babylonMesh.position = position;
                node.babylonMesh.rotationQuaternion = rotation;
                node.babylonMesh.scaling = scaling;
            };
            GLTFLoader.prototype._loadSkinAsync = function (context, skin, onSuccess) {
                var _this = this;
                if (skin.babylonSkeleton) {
                    onSuccess();
                    return;
                }
                var skeletonId = "skeleton" + skin.index;
                skin.babylonSkeleton = new BABYLON.Skeleton(skin.name || skeletonId, skeletonId, this._babylonScene);
                if (skin.inverseBindMatrices == null) {
                    this._loadBones(context, skin, null);
                    onSuccess();
                }
                else {
                    var accessor = GLTFLoader._GetProperty(this._gltf.accessors, skin.inverseBindMatrices);
                    if (!accessor) {
                        throw new Error(context + ": Failed to find inverse bind matrices attribute " + skin.inverseBindMatrices);
                    }
                    this._loadAccessorAsync("#/accessors/" + accessor.index, accessor, function (data) {
                        _this._loadBones(context, skin, data);
                        onSuccess();
                    });
                }
            };
            GLTFLoader.prototype._createBone = function (node, skin, parent, localMatrix, baseMatrix, index) {
                var babylonBone = new BABYLON.Bone(node.name || "bone" + node.index, skin.babylonSkeleton, parent, localMatrix, null, baseMatrix, index);
                node.babylonAnimationTargets = node.babylonAnimationTargets || [];
                node.babylonAnimationTargets.push(babylonBone);
                return babylonBone;
            };
            GLTFLoader.prototype._loadBones = function (context, skin, inverseBindMatrixData) {
                var babylonBones = {};
                for (var _i = 0, _a = skin.joints; _i < _a.length; _i++) {
                    var index = _a[_i];
                    var node = GLTFLoader._GetProperty(this._gltf.nodes, index);
                    if (!node) {
                        throw new Error(context + ": Failed to find joint " + index);
                    }
                    this._loadBone(node, skin, inverseBindMatrixData, babylonBones);
                }
            };
            GLTFLoader.prototype._loadBone = function (node, skin, inverseBindMatrixData, babylonBones) {
                var babylonBone = babylonBones[node.index];
                if (babylonBone) {
                    return babylonBone;
                }
                var boneIndex = skin.joints.indexOf(node.index);
                var baseMatrix = BABYLON.Matrix.Identity();
                if (inverseBindMatrixData && boneIndex !== -1) {
                    baseMatrix = BABYLON.Matrix.FromArray(inverseBindMatrixData, boneIndex * 16);
                    baseMatrix.invertToRef(baseMatrix);
                }
                var babylonParentBone = null;
                if (node.parent !== this._rootNode) {
                    babylonParentBone = this._loadBone(node.parent, skin, inverseBindMatrixData, babylonBones);
                    baseMatrix.multiplyToRef(babylonParentBone.getInvertedAbsoluteTransform(), baseMatrix);
                }
                babylonBone = this._createBone(node, skin, babylonParentBone, this._getNodeMatrix(node), baseMatrix, boneIndex);
                babylonBones[node.index] = babylonBone;
                return babylonBone;
            };
            GLTFLoader.prototype._getNodeMatrix = function (node) {
                return node.matrix ?
                    BABYLON.Matrix.FromArray(node.matrix) :
                    BABYLON.Matrix.Compose(node.scale ? BABYLON.Vector3.FromArray(node.scale) : BABYLON.Vector3.One(), node.rotation ? BABYLON.Quaternion.FromArray(node.rotation) : BABYLON.Quaternion.Identity(), node.translation ? BABYLON.Vector3.FromArray(node.translation) : BABYLON.Vector3.Zero());
            };
            GLTFLoader.prototype._traverseNodes = function (context, indices, action, parentNode) {
                for (var _i = 0, indices_1 = indices; _i < indices_1.length; _i++) {
                    var index = indices_1[_i];
                    var node = GLTFLoader._GetProperty(this._gltf.nodes, index);
                    if (!node) {
                        throw new Error(context + ": Failed to find node " + index);
                    }
                    this._traverseNode(context, node, action, parentNode);
                }
            };
            GLTFLoader.prototype._traverseNode = function (context, node, action, parentNode) {
                if (GLTF2.GLTFLoaderExtension.TraverseNode(this, context, node, action, parentNode)) {
                    return;
                }
                if (!action(node, parentNode)) {
                    return;
                }
                if (node.children) {
                    this._traverseNodes(context, node.children, action, node);
                }
            };
            GLTFLoader.prototype._loadAnimations = function () {
                var animations = this._gltf.animations;
                if (!animations) {
                    return;
                }
                for (var index = 0; index < animations.length; index++) {
                    var animation = animations[index];
                    this._loadAnimation("#/animations/" + index, animation);
                }
            };
            GLTFLoader.prototype._loadAnimation = function (context, animation) {
                animation.targets = [];
                for (var index = 0; index < animation.channels.length; index++) {
                    var channel = GLTFLoader._GetProperty(animation.channels, index);
                    if (!channel) {
                        throw new Error(context + ": Failed to find channel " + index);
                    }
                    var sampler = GLTFLoader._GetProperty(animation.samplers, channel.sampler);
                    if (!sampler) {
                        throw new Error(context + ": Failed to find sampler " + channel.sampler);
                    }
                    this._loadAnimationChannel(animation, context + "/channels/" + index, channel, context + "/samplers/" + channel.sampler, sampler);
                }
            };
            GLTFLoader.prototype._loadAnimationChannel = function (animation, channelContext, channel, samplerContext, sampler) {
                var targetNode = GLTFLoader._GetProperty(this._gltf.nodes, channel.target.node);
                if (!targetNode) {
                    throw new Error(channelContext + ": Failed to find target node " + channel.target.node);
                }
                var targetPath;
                var animationType;
                switch (channel.target.path) {
                    case "translation": {
                        targetPath = "position";
                        animationType = BABYLON.Animation.ANIMATIONTYPE_VECTOR3;
                        break;
                    }
                    case "rotation": {
                        targetPath = "rotationQuaternion";
                        animationType = BABYLON.Animation.ANIMATIONTYPE_QUATERNION;
                        break;
                    }
                    case "scale": {
                        targetPath = "scaling";
                        animationType = BABYLON.Animation.ANIMATIONTYPE_VECTOR3;
                        break;
                    }
                    case "weights": {
                        targetPath = "influence";
                        animationType = BABYLON.Animation.ANIMATIONTYPE_FLOAT;
                        break;
                    }
                    default: {
                        throw new Error(channelContext + ": Invalid target path " + channel.target.path);
                    }
                }
                var inputData;
                var outputData;
                var checkSuccess = function () {
                    if (!inputData || !outputData) {
                        return;
                    }
                    var outputBufferOffset = 0;
                    var getNextOutputValue;
                    switch (targetPath) {
                        case "position": {
                            getNextOutputValue = function () {
                                var value = BABYLON.Vector3.FromArray(outputData, outputBufferOffset);
                                outputBufferOffset += 3;
                                return value;
                            };
                            break;
                        }
                        case "rotationQuaternion": {
                            getNextOutputValue = function () {
                                var value = BABYLON.Quaternion.FromArray(outputData, outputBufferOffset);
                                outputBufferOffset += 4;
                                return value;
                            };
                            break;
                        }
                        case "scaling": {
                            getNextOutputValue = function () {
                                var value = BABYLON.Vector3.FromArray(outputData, outputBufferOffset);
                                outputBufferOffset += 3;
                                return value;
                            };
                            break;
                        }
                        case "influence": {
                            getNextOutputValue = function () {
                                var numTargets = targetNode.babylonMesh.morphTargetManager.numTargets;
                                var value = new Array(numTargets);
                                for (var i = 0; i < numTargets; i++) {
                                    value[i] = outputData[outputBufferOffset++];
                                }
                                return value;
                            };
                            break;
                        }
                    }
                    var getNextKey;
                    switch (sampler.interpolation) {
                        case "LINEAR": {
                            getNextKey = function (frameIndex) { return ({
                                frame: inputData[frameIndex],
                                value: getNextOutputValue()
                            }); };
                            break;
                        }
                        case "CUBICSPLINE": {
                            getNextKey = function (frameIndex) { return ({
                                frame: inputData[frameIndex],
                                inTangent: getNextOutputValue(),
                                value: getNextOutputValue(),
                                outTangent: getNextOutputValue()
                            }); };
                            break;
                        }
                        default: {
                            throw new Error(samplerContext + ": Invalid interpolation " + sampler.interpolation);
                        }
                    }
                    ;
                    var keys;
                    if (inputData.length === 1) {
                        var key = getNextKey(0);
                        keys = [
                            { frame: key.frame, value: key.value },
                            { frame: key.frame + 1, value: key.value }
                        ];
                    }
                    else {
                        keys = new Array(inputData.length);
                        for (var frameIndex = 0; frameIndex < inputData.length; frameIndex++) {
                            keys[frameIndex] = getNextKey(frameIndex);
                        }
                    }
                    if (targetPath === "influence") {
                        var morphTargetManager = targetNode.babylonMesh.morphTargetManager;
                        var _loop_7 = function (targetIndex) {
                            var morphTarget = morphTargetManager.getTarget(targetIndex);
                            var animationName = (animation.name || "anim" + animation.index) + "_" + targetIndex;
                            var babylonAnimation = new BABYLON.Animation(animationName, targetPath, 1, animationType);
                            babylonAnimation.setKeys(keys.map(function (key) { return ({
                                frame: key.frame,
                                inTangent: key.inTangent ? key.inTangent[targetIndex] : undefined,
                                value: key.value[targetIndex],
                                outTangent: key.outTangent ? key.outTangent[targetIndex] : undefined
                            }); }));
                            morphTarget.animations.push(babylonAnimation);
                            animation.targets.push(morphTarget);
                        };
                        for (var targetIndex = 0; targetIndex < morphTargetManager.numTargets; targetIndex++) {
                            _loop_7(targetIndex);
                        }
                    }
                    else {
                        var animationName = animation.name || "anim" + animation.index;
                        var babylonAnimation = new BABYLON.Animation(animationName, targetPath, 1, animationType);
                        babylonAnimation.setKeys(keys);
                        if (targetNode.babylonAnimationTargets) {
                            for (var _i = 0, _a = targetNode.babylonAnimationTargets; _i < _a.length; _i++) {
                                var target = _a[_i];
                                target.animations.push(babylonAnimation.clone());
                                animation.targets.push(target);
                            }
                        }
                    }
                };
                var inputAccessor = GLTFLoader._GetProperty(this._gltf.accessors, sampler.input);
                if (!inputAccessor) {
                    throw new Error(samplerContext + ": Failed to find input accessor " + sampler.input);
                }
                this._loadAccessorAsync("#/accessors/" + inputAccessor.index, inputAccessor, function (data) {
                    inputData = data;
                    checkSuccess();
                });
                var outputAccessor = GLTFLoader._GetProperty(this._gltf.accessors, sampler.output);
                if (!outputAccessor) {
                    throw new Error(samplerContext + ": Failed to find output accessor " + sampler.output);
                }
                this._loadAccessorAsync("#/accessors/" + outputAccessor.index, outputAccessor, function (data) {
                    outputData = data;
                    checkSuccess();
                });
            };
            GLTFLoader.prototype._loadBufferAsync = function (context, buffer, onSuccess) {
                var _this = this;
                this._addPendingData(buffer);
                if (buffer.loadedData) {
                    onSuccess(buffer.loadedData);
                    this._removePendingData(buffer);
                }
                else if (buffer.loadedObservable) {
                    buffer.loadedObservable.add(function (buffer) {
                        onSuccess(buffer.loadedData);
                        _this._removePendingData(buffer);
                    });
                }
                else {
                    if (!buffer.uri) {
                        throw new Error(context + ": Uri is missing");
                    }
                    buffer.loadedObservable = new BABYLON.Observable();
                    buffer.loadedObservable.add(function (buffer) {
                        onSuccess(buffer.loadedData);
                        _this._removePendingData(buffer);
                    });
                    this._loadUriAsync(context, buffer.uri, function (data) {
                        buffer.loadedData = data;
                        buffer.loadedObservable.notifyObservers(buffer);
                        buffer.loadedObservable = undefined;
                    });
                }
            };
            GLTFLoader.prototype._loadBufferViewAsync = function (context, bufferView, onSuccess) {
                var buffer = GLTFLoader._GetProperty(this._gltf.buffers, bufferView.buffer);
                if (!buffer) {
                    throw new Error(context + ": Failed to find buffer " + bufferView.buffer);
                }
                this._loadBufferAsync("#/buffers/" + buffer.index, buffer, function (bufferData) {
                    var data;
                    try {
                        data = new Uint8Array(bufferData.buffer, bufferData.byteOffset + (bufferView.byteOffset || 0), bufferView.byteLength);
                    }
                    catch (e) {
                        throw new Error(context + ": " + e.message);
                    }
                    onSuccess(data);
                });
            };
            GLTFLoader.prototype._loadAccessorAsync = function (context, accessor, onSuccess) {
                var _this = this;
                if (accessor.sparse) {
                    throw new Error(context + ": Sparse accessors are not currently supported");
                }
                var bufferView = GLTFLoader._GetProperty(this._gltf.bufferViews, accessor.bufferView);
                if (!bufferView) {
                    throw new Error(context + ": Failed to find buffer view " + accessor.bufferView);
                }
                this._loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView, function (bufferViewData) {
                    var numComponents = GLTFLoader._GetNumComponents(context, accessor.type);
                    var data;
                    var byteOffset = accessor.byteOffset || 0;
                    var byteStride = bufferView.byteStride;
                    if (byteStride === 0) {
                        BABYLON.Tools.Warn(context + ": Byte stride of 0 is not valid");
                    }
                    try {
                        switch (accessor.componentType) {
                            case GLTF2.EComponentType.BYTE: {
                                data = _this._buildArrayBuffer(Float32Array, bufferViewData, byteOffset, accessor.count, numComponents, byteStride);
                                break;
                            }
                            case GLTF2.EComponentType.UNSIGNED_BYTE: {
                                data = _this._buildArrayBuffer(Uint8Array, bufferViewData, byteOffset, accessor.count, numComponents, byteStride);
                                break;
                            }
                            case GLTF2.EComponentType.SHORT: {
                                data = _this._buildArrayBuffer(Int16Array, bufferViewData, byteOffset, accessor.count, numComponents, byteStride);
                                break;
                            }
                            case GLTF2.EComponentType.UNSIGNED_SHORT: {
                                data = _this._buildArrayBuffer(Uint16Array, bufferViewData, byteOffset, accessor.count, numComponents, byteStride);
                                break;
                            }
                            case GLTF2.EComponentType.UNSIGNED_INT: {
                                data = _this._buildArrayBuffer(Uint32Array, bufferViewData, byteOffset, accessor.count, numComponents, byteStride);
                                break;
                            }
                            case GLTF2.EComponentType.FLOAT: {
                                data = _this._buildArrayBuffer(Float32Array, bufferViewData, byteOffset, accessor.count, numComponents, byteStride);
                                break;
                            }
                            default: {
                                throw new Error(context + ": Invalid component type " + accessor.componentType);
                            }
                        }
                    }
                    catch (e) {
                        throw new Error(context + ": " + e);
                    }
                    onSuccess(data);
                });
            };
            GLTFLoader.prototype._buildArrayBuffer = function (typedArray, data, byteOffset, count, numComponents, byteStride) {
                byteOffset += data.byteOffset;
                var targetLength = count * numComponents;
                if (!byteStride || byteStride === numComponents * typedArray.BYTES_PER_ELEMENT) {
                    return new typedArray(data.buffer, byteOffset, targetLength);
                }
                var elementStride = byteStride / typedArray.BYTES_PER_ELEMENT;
                var sourceBuffer = new typedArray(data.buffer, byteOffset, elementStride * count);
                var targetBuffer = new typedArray(targetLength);
                var sourceIndex = 0;
                var targetIndex = 0;
                while (targetIndex < targetLength) {
                    for (var componentIndex = 0; componentIndex < numComponents; componentIndex++) {
                        targetBuffer[targetIndex] = sourceBuffer[sourceIndex + componentIndex];
                        targetIndex++;
                    }
                    sourceIndex += elementStride;
                }
                return targetBuffer;
            };
            GLTFLoader.prototype._addPendingData = function (data) {
                if (!this._renderReady) {
                    this._renderPendingCount++;
                }
                this._addLoaderPendingData(data);
            };
            GLTFLoader.prototype._removePendingData = function (data) {
                var _this = this;
                if (!this._renderReady) {
                    if (--this._renderPendingCount === 0) {
                        this._addLoaderPendingData(this);
                        this._compileMaterialsAsync(function () {
                            _this._compileShadowGeneratorsAsync(function () {
                                _this._removeLoaderPendingData(_this);
                                _this._renderReady = true;
                                _this._onRenderReady();
                            });
                        });
                    }
                }
                this._removeLoaderPendingData(data);
            };
            GLTFLoader.prototype._addLoaderPendingData = function (data) {
                this._loaderPendingCount++;
                for (var _i = 0, _a = this._loaderTrackers; _i < _a.length; _i++) {
                    var tracker = _a[_i];
                    tracker._addPendingData(data);
                }
            };
            GLTFLoader.prototype._removeLoaderPendingData = function (data) {
                for (var _i = 0, _a = this._loaderTrackers; _i < _a.length; _i++) {
                    var tracker = _a[_i];
                    tracker._removePendingData(data);
                }
                if (--this._loaderPendingCount === 0) {
                    this._onComplete();
                }
            };
            GLTFLoader.prototype._whenAction = function (action, onComplete) {
                var _this = this;
                var tracker = new GLTFLoaderTracker(function () {
                    _this._loaderTrackers.splice(_this._loaderTrackers.indexOf(tracker), 1);
                    onComplete();
                });
                this._loaderTrackers.push(tracker);
                this._addLoaderPendingData(tracker);
                action();
                this._removeLoaderPendingData(tracker);
            };
            GLTFLoader.prototype._getDefaultMaterial = function () {
                if (!this._defaultMaterial) {
                    var id = "__gltf_default";
                    var material = this._babylonScene.getMaterialByName(id);
                    if (!material) {
                        material = new BABYLON.PBRMaterial(id, this._babylonScene);
                        material.sideOrientation = BABYLON.Material.CounterClockWiseSideOrientation;
                        material.metallic = 1;
                        material.roughness = 1;
                    }
                    this._defaultMaterial = material;
                }
                return this._defaultMaterial;
            };
            GLTFLoader.prototype._loadMaterialMetallicRoughnessProperties = function (context, material) {
                var babylonMaterial = material.babylonMaterial;
                // Ensure metallic workflow
                babylonMaterial.metallic = 1;
                babylonMaterial.roughness = 1;
                var properties = material.pbrMetallicRoughness;
                if (!properties) {
                    return;
                }
                babylonMaterial.albedoColor = properties.baseColorFactor ? BABYLON.Color3.FromArray(properties.baseColorFactor) : new BABYLON.Color3(1, 1, 1);
                babylonMaterial.metallic = properties.metallicFactor == null ? 1 : properties.metallicFactor;
                babylonMaterial.roughness = properties.roughnessFactor == null ? 1 : properties.roughnessFactor;
                if (properties.baseColorTexture) {
                    var texture = GLTFLoader._GetProperty(this._gltf.textures, properties.baseColorTexture.index);
                    if (!texture) {
                        throw new Error(context + ": Failed to find base color texture " + properties.baseColorTexture.index);
                    }
                    babylonMaterial.albedoTexture = this._loadTexture("#/textures/" + texture.index, texture, properties.baseColorTexture.texCoord);
                }
                if (properties.metallicRoughnessTexture) {
                    var texture = GLTFLoader._GetProperty(this._gltf.textures, properties.metallicRoughnessTexture.index);
                    if (!texture) {
                        throw new Error(context + ": Failed to find metallic roughness texture " + properties.metallicRoughnessTexture.index);
                    }
                    babylonMaterial.metallicTexture = this._loadTexture("#/textures/" + texture.index, texture, properties.metallicRoughnessTexture.texCoord);
                    babylonMaterial.useMetallnessFromMetallicTextureBlue = true;
                    babylonMaterial.useRoughnessFromMetallicTextureGreen = true;
                    babylonMaterial.useRoughnessFromMetallicTextureAlpha = false;
                }
                this._loadMaterialAlphaProperties(context, material, properties.baseColorFactor);
            };
            GLTFLoader.prototype._loadMaterial = function (context, material, assign) {
                if (material.babylonMaterial) {
                    assign(material.babylonMaterial, false);
                    return;
                }
                if (GLTF2.GLTFLoaderExtension.LoadMaterial(this, context, material, assign)) {
                    return;
                }
                this._createPbrMaterial(material);
                this._loadMaterialBaseProperties(context, material);
                this._loadMaterialMetallicRoughnessProperties(context, material);
                assign(material.babylonMaterial, true);
            };
            GLTFLoader.prototype._createPbrMaterial = function (material) {
                var babylonMaterial = new BABYLON.PBRMaterial(material.name || "mat" + material.index, this._babylonScene);
                babylonMaterial.sideOrientation = BABYLON.Material.CounterClockWiseSideOrientation;
                material.babylonMaterial = babylonMaterial;
            };
            GLTFLoader.prototype._loadMaterialBaseProperties = function (context, material) {
                var babylonMaterial = material.babylonMaterial;
                babylonMaterial.emissiveColor = material.emissiveFactor ? BABYLON.Color3.FromArray(material.emissiveFactor) : new BABYLON.Color3(0, 0, 0);
                if (material.doubleSided) {
                    babylonMaterial.backFaceCulling = false;
                    babylonMaterial.twoSidedLighting = true;
                }
                if (material.normalTexture) {
                    var texture = GLTFLoader._GetProperty(this._gltf.textures, material.normalTexture.index);
                    if (!texture) {
                        throw new Error(context + ": Failed to find normal texture " + material.normalTexture.index);
                    }
                    babylonMaterial.bumpTexture = this._loadTexture("#/textures/" + texture.index, texture, material.normalTexture.texCoord);
                    babylonMaterial.invertNormalMapX = !this._babylonScene.useRightHandedSystem;
                    babylonMaterial.invertNormalMapY = this._babylonScene.useRightHandedSystem;
                    if (material.normalTexture.scale != null) {
                        babylonMaterial.bumpTexture.level = material.normalTexture.scale;
                    }
                }
                if (material.occlusionTexture) {
                    var texture = GLTFLoader._GetProperty(this._gltf.textures, material.occlusionTexture.index);
                    if (!texture) {
                        throw new Error(context + ": Failed to find occlusion texture " + material.occlusionTexture.index);
                    }
                    babylonMaterial.ambientTexture = this._loadTexture("#/textures/" + texture.index, texture, material.occlusionTexture.texCoord);
                    babylonMaterial.useAmbientInGrayScale = true;
                    if (material.occlusionTexture.strength != null) {
                        babylonMaterial.ambientTextureStrength = material.occlusionTexture.strength;
                    }
                }
                if (material.emissiveTexture) {
                    var texture = GLTFLoader._GetProperty(this._gltf.textures, material.emissiveTexture.index);
                    if (!texture) {
                        throw new Error(context + ": Failed to find emissive texture " + material.emissiveTexture.index);
                    }
                    babylonMaterial.emissiveTexture = this._loadTexture("#/textures/" + texture.index, texture, material.emissiveTexture.texCoord);
                }
            };
            GLTFLoader.prototype._loadMaterialAlphaProperties = function (context, material, colorFactor) {
                var babylonMaterial = material.babylonMaterial;
                var alphaMode = material.alphaMode || "OPAQUE";
                switch (alphaMode) {
                    case "OPAQUE": {
                        babylonMaterial.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
                        break;
                    }
                    case "MASK": {
                        babylonMaterial.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATEST;
                        babylonMaterial.alphaCutOff = (material.alphaCutoff == null ? 0.5 : material.alphaCutoff);
                        if (colorFactor) {
                            if (colorFactor[3] == 0) {
                                babylonMaterial.alphaCutOff = 1;
                            }
                            else {
                                babylonMaterial.alphaCutOff /= colorFactor[3];
                            }
                        }
                        if (babylonMaterial.albedoTexture) {
                            babylonMaterial.albedoTexture.hasAlpha = true;
                        }
                        break;
                    }
                    case "BLEND": {
                        babylonMaterial.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
                        if (colorFactor) {
                            babylonMaterial.alpha = colorFactor[3];
                        }
                        if (babylonMaterial.albedoTexture) {
                            babylonMaterial.albedoTexture.hasAlpha = true;
                            babylonMaterial.useAlphaFromAlbedoTexture = true;
                        }
                        break;
                    }
                    default: {
                        throw new Error(context + ": Invalid alpha mode " + material.alphaMode);
                    }
                }
            };
            GLTFLoader.prototype._loadTexture = function (context, texture, coordinatesIndex) {
                var _this = this;
                var sampler = (texture.sampler == undefined ? this._defaultSampler : GLTFLoader._GetProperty(this._gltf.samplers, texture.sampler));
                if (!sampler) {
                    throw new Error(context + ": Failed to find sampler " + texture.sampler);
                }
                this._loadSampler("#/samplers/" + sampler.index, sampler);
                this._addPendingData(texture);
                var babylonTexture = new BABYLON.Texture(null, this._babylonScene, sampler.noMipMaps, false, sampler.samplingMode, function () {
                    _this._tryCatchOnError(function () {
                        _this._removePendingData(texture);
                    });
                }, function (message) {
                    _this._tryCatchOnError(function () {
                        throw new Error(context + ": " + message);
                    });
                });
                if (texture.url) {
                    babylonTexture.updateURL(texture.url);
                }
                else if (texture.dataReadyObservable) {
                    texture.dataReadyObservable.add(function (texture) {
                        babylonTexture.updateURL(texture.url);
                    });
                }
                else {
                    texture.dataReadyObservable = new BABYLON.Observable();
                    texture.dataReadyObservable.add(function (texture) {
                        babylonTexture.updateURL(texture.url);
                    });
                    var image_1 = GLTFLoader._GetProperty(this._gltf.images, texture.source);
                    if (!image_1) {
                        throw new Error(context + ": Failed to find source " + texture.source);
                    }
                    this._loadImageAsync("#/images/" + image_1.index, image_1, function (data) {
                        texture.url = URL.createObjectURL(new Blob([data], { type: image_1.mimeType }));
                        texture.dataReadyObservable.notifyObservers(texture);
                        texture.dataReadyObservable = undefined;
                    });
                }
                babylonTexture.coordinatesIndex = coordinatesIndex || 0;
                babylonTexture.wrapU = sampler.wrapU;
                babylonTexture.wrapV = sampler.wrapV;
                babylonTexture.name = texture.name || "texture" + texture.index;
                if (this._parent.onTextureLoaded) {
                    this._parent.onTextureLoaded(babylonTexture);
                }
                return babylonTexture;
            };
            GLTFLoader.prototype._loadSampler = function (context, sampler) {
                if (sampler.noMipMaps != undefined) {
                    return;
                }
                sampler.noMipMaps = (sampler.minFilter === GLTF2.ETextureMinFilter.NEAREST || sampler.minFilter === GLTF2.ETextureMinFilter.LINEAR);
                sampler.samplingMode = GLTFLoader._GetTextureSamplingMode(context, sampler.magFilter, sampler.minFilter);
                sampler.wrapU = GLTFLoader._GetTextureWrapMode(context, sampler.wrapS);
                sampler.wrapV = GLTFLoader._GetTextureWrapMode(context, sampler.wrapT);
            };
            GLTFLoader.prototype._loadImageAsync = function (context, image, onSuccess) {
                if (image.uri) {
                    this._loadUriAsync(context, image.uri, onSuccess);
                }
                else {
                    var bufferView = GLTFLoader._GetProperty(this._gltf.bufferViews, image.bufferView);
                    if (!bufferView) {
                        throw new Error(context + ": Failed to find buffer view " + image.bufferView);
                    }
                    this._loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView, onSuccess);
                }
            };
            GLTFLoader.prototype._loadUriAsync = function (context, uri, onSuccess) {
                var _this = this;
                if (GLTF2.GLTFUtils.IsBase64(uri)) {
                    onSuccess(new Uint8Array(GLTF2.GLTFUtils.DecodeBase64(uri)));
                    return;
                }
                if (!GLTF2.GLTFUtils.ValidateUri(uri)) {
                    throw new Error(context + ": Uri '" + uri + "' is invalid");
                }
                var request = BABYLON.Tools.LoadFile(this._rootUrl + uri, function (data) {
                    _this._tryCatchOnError(function () {
                        onSuccess(new Uint8Array(data));
                    });
                }, function (event) {
                    _this._tryCatchOnError(function () {
                        if (request && !_this._renderReady) {
                            request._loaded = event.loaded;
                            request._total = event.total;
                            _this._onProgress();
                        }
                    });
                }, this._babylonScene.database, true, function (request) {
                    _this._tryCatchOnError(function () {
                        throw new Error(context + ": Failed to load '" + uri + "'" + (request ? ": " + request.status + " " + request.statusText : ""));
                    });
                });
                if (request) {
                    request._loaded = null;
                    request._total = null;
                    this._requests.push(request);
                }
            };
            GLTFLoader.prototype._tryCatchOnError = function (handler) {
                if (this._disposed) {
                    return;
                }
                try {
                    handler();
                }
                catch (e) {
                    BABYLON.Tools.Error("glTF Loader: " + e.message);
                    if (this._errorCallback) {
                        this._errorCallback(e.message);
                    }
                    this.dispose();
                }
            };
            GLTFLoader._AssignIndices = function (array) {
                if (array) {
                    for (var index = 0; index < array.length; index++) {
                        array[index].index = index;
                    }
                }
            };
            GLTFLoader._GetProperty = function (array, index) {
                if (!array || index == undefined || !array[index]) {
                    return null;
                }
                return array[index];
            };
            GLTFLoader._GetTextureWrapMode = function (context, mode) {
                // Set defaults if undefined
                mode = mode == undefined ? GLTF2.ETextureWrapMode.REPEAT : mode;
                switch (mode) {
                    case GLTF2.ETextureWrapMode.CLAMP_TO_EDGE: return BABYLON.Texture.CLAMP_ADDRESSMODE;
                    case GLTF2.ETextureWrapMode.MIRRORED_REPEAT: return BABYLON.Texture.MIRROR_ADDRESSMODE;
                    case GLTF2.ETextureWrapMode.REPEAT: return BABYLON.Texture.WRAP_ADDRESSMODE;
                    default:
                        BABYLON.Tools.Warn(context + ": Invalid texture wrap mode " + mode);
                        return BABYLON.Texture.WRAP_ADDRESSMODE;
                }
            };
            GLTFLoader._GetTextureSamplingMode = function (context, magFilter, minFilter) {
                // Set defaults if undefined
                magFilter = magFilter == undefined ? GLTF2.ETextureMagFilter.LINEAR : magFilter;
                minFilter = minFilter == undefined ? GLTF2.ETextureMinFilter.LINEAR_MIPMAP_LINEAR : minFilter;
                if (magFilter === GLTF2.ETextureMagFilter.LINEAR) {
                    switch (minFilter) {
                        case GLTF2.ETextureMinFilter.NEAREST: return BABYLON.Texture.LINEAR_NEAREST;
                        case GLTF2.ETextureMinFilter.LINEAR: return BABYLON.Texture.LINEAR_LINEAR;
                        case GLTF2.ETextureMinFilter.NEAREST_MIPMAP_NEAREST: return BABYLON.Texture.LINEAR_NEAREST_MIPNEAREST;
                        case GLTF2.ETextureMinFilter.LINEAR_MIPMAP_NEAREST: return BABYLON.Texture.LINEAR_LINEAR_MIPNEAREST;
                        case GLTF2.ETextureMinFilter.NEAREST_MIPMAP_LINEAR: return BABYLON.Texture.LINEAR_NEAREST_MIPLINEAR;
                        case GLTF2.ETextureMinFilter.LINEAR_MIPMAP_LINEAR: return BABYLON.Texture.LINEAR_LINEAR_MIPLINEAR;
                        default:
                            BABYLON.Tools.Warn(context + ": Invalid texture minification filter " + minFilter);
                            return BABYLON.Texture.LINEAR_LINEAR_MIPLINEAR;
                    }
                }
                else {
                    if (magFilter !== GLTF2.ETextureMagFilter.NEAREST) {
                        BABYLON.Tools.Warn(context + ": Invalid texture magnification filter " + magFilter);
                    }
                    switch (minFilter) {
                        case GLTF2.ETextureMinFilter.NEAREST: return BABYLON.Texture.NEAREST_NEAREST;
                        case GLTF2.ETextureMinFilter.LINEAR: return BABYLON.Texture.NEAREST_LINEAR;
                        case GLTF2.ETextureMinFilter.NEAREST_MIPMAP_NEAREST: return BABYLON.Texture.NEAREST_NEAREST_MIPNEAREST;
                        case GLTF2.ETextureMinFilter.LINEAR_MIPMAP_NEAREST: return BABYLON.Texture.NEAREST_LINEAR_MIPNEAREST;
                        case GLTF2.ETextureMinFilter.NEAREST_MIPMAP_LINEAR: return BABYLON.Texture.NEAREST_NEAREST_MIPLINEAR;
                        case GLTF2.ETextureMinFilter.LINEAR_MIPMAP_LINEAR: return BABYLON.Texture.NEAREST_LINEAR_MIPLINEAR;
                        default:
                            BABYLON.Tools.Warn(context + ": Invalid texture minification filter " + minFilter);
                            return BABYLON.Texture.NEAREST_NEAREST_MIPNEAREST;
                    }
                }
            };
            GLTFLoader._GetNumComponents = function (context, type) {
                switch (type) {
                    case "SCALAR": return 1;
                    case "VEC2": return 2;
                    case "VEC3": return 3;
                    case "VEC4": return 4;
                    case "MAT2": return 4;
                    case "MAT3": return 9;
                    case "MAT4": return 16;
                }
                throw new Error(context + ": Invalid type " + type);
            };
            GLTFLoader.prototype._compileMaterialAsync = function (babylonMaterial, babylonMesh, onSuccess) {
                var _this = this;
                if (this._parent.useClipPlane) {
                    babylonMaterial.forceCompilation(babylonMesh, function () {
                        babylonMaterial.forceCompilation(babylonMesh, function () {
                            _this._tryCatchOnError(onSuccess);
                        }, { clipPlane: true });
                    });
                }
                else {
                    babylonMaterial.forceCompilation(babylonMesh, function () {
                        _this._tryCatchOnError(onSuccess);
                    });
                }
            };
            GLTFLoader.prototype._compileMaterialsAsync = function (onSuccess) {
                if (!this._parent.compileMaterials || !this._gltf.materials) {
                    onSuccess();
                    return;
                }
                var meshes = this._getMeshes();
                var remaining = 0;
                for (var _i = 0, meshes_1 = meshes; _i < meshes_1.length; _i++) {
                    var mesh = meshes_1[_i];
                    if (mesh.material instanceof BABYLON.MultiMaterial) {
                        for (var _a = 0, _b = mesh.material.subMaterials; _a < _b.length; _a++) {
                            var subMaterial = _b[_a];
                            if (subMaterial) {
                                remaining++;
                            }
                        }
                    }
                    else if (mesh.material) {
                        remaining++;
                    }
                }
                if (remaining === 0) {
                    onSuccess();
                    return;
                }
                for (var _c = 0, meshes_2 = meshes; _c < meshes_2.length; _c++) {
                    var mesh = meshes_2[_c];
                    if (mesh.material instanceof BABYLON.MultiMaterial) {
                        for (var _d = 0, _e = mesh.material.subMaterials; _d < _e.length; _d++) {
                            var subMaterial = _e[_d];
                            if (subMaterial) {
                                this._compileMaterialAsync(subMaterial, mesh, function () {
                                    if (--remaining === 0) {
                                        onSuccess();
                                    }
                                });
                            }
                        }
                    }
                    else if (mesh.material) {
                        this._compileMaterialAsync(mesh.material, mesh, function () {
                            if (--remaining === 0) {
                                onSuccess();
                            }
                        });
                    }
                }
            };
            GLTFLoader.prototype._compileShadowGeneratorsAsync = function (onSuccess) {
                var _this = this;
                if (!this._parent.compileShadowGenerators) {
                    onSuccess();
                    return;
                }
                var lights = this._babylonScene.lights;
                var remaining = 0;
                for (var _i = 0, lights_1 = lights; _i < lights_1.length; _i++) {
                    var light = lights_1[_i];
                    var generator = light.getShadowGenerator();
                    if (generator) {
                        remaining++;
                    }
                }
                if (remaining === 0) {
                    onSuccess();
                    return;
                }
                for (var _a = 0, lights_2 = lights; _a < lights_2.length; _a++) {
                    var light = lights_2[_a];
                    var generator = light.getShadowGenerator();
                    if (generator) {
                        generator.forceCompilation(function () {
                            if (--remaining === 0) {
                                _this._tryCatchOnError(onSuccess);
                            }
                        });
                    }
                }
            };
            GLTFLoader.Extensions = {};
            return GLTFLoader;
        }());
        GLTF2.GLTFLoader = GLTFLoader;
        BABYLON.GLTFFileLoader.CreateGLTFLoaderV2 = function (parent) { return new GLTFLoader(parent); };
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.glTFLoader.js.map
