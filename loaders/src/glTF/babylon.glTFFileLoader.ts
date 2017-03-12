﻿/// <reference path="../../../dist/preview release/babylon.d.ts"/>

module BABYLON {
    /**
    * Values
    */
    var glTFAnimationPaths = ["translation", "rotation", "scale"];
    var babylonAnimationPaths = ["position", "rotationQuaternion", "scaling"];

    /**
    * Utils
    */
    var normalizeUVs = (buffer: any): void => {
        if (!buffer) {
            return;
        }

        for (var i = 0; i < buffer.length / 2; i++) {
            buffer[i * 2 + 1] = 1.0 - buffer[i * 2 + 1];
        }
    };

    /**
    * Returns the animation path (glTF -> Babylon)
    */
    var getAnimationPath = (path: string): string => {
        var index = glTFAnimationPaths.indexOf(path);

        if (index !== -1) {
            return babylonAnimationPaths[index];
        }

        return path;
    };

    /**
    * Loads and creates animations
    */
    var loadAnimations = (runtime: IGLTFRuntime): void => {
        var animations = runtime.gltf.animations;
        if (!animations) {
            return;
        }

        for (var animationIndex = 0; animationIndex < animations.length; animationIndex++) {
            var animation = animations[animationIndex];
            if (!animation || !animation.channels) {
                continue;
            }

            var lastAnimation: Animation = null;

            for (var channelIndex = 0; channelIndex < animation.channels.length; channelIndex++) {
                var channel = animation.channels[channelIndex];
                if (!channel) {
                    continue;
                }

                var sampler = animation.samplers[channel.sampler];
                if (!sampler) {
                    continue;
                }

                var inputData = sampler.input;
                var outputData = sampler.output;

                var bufferInput = GLTFUtils.GetBufferFromAccessor(runtime, runtime.gltf.accessors[inputData]);
                var bufferOutput = GLTFUtils.GetBufferFromAccessor(runtime, runtime.gltf.accessors[outputData]);

                var targetID = channel.target.id;
                var targetNode: any = runtime.gltf.nodes[channel.target.id].babylonNode;
                if (targetNode === null) {
                    Tools.Warn("Creating animation index " + animationIndex + " but cannot find node index " + targetID + " to attach to");
                    continue;
                }

                var isBone = targetNode instanceof Bone;

                // Get target path (position, rotation or scaling)
                var targetPath = channel.target.path;
                var targetPathIndex = glTFAnimationPaths.indexOf(targetPath);

                if (targetPathIndex !== -1) {
                    targetPath = babylonAnimationPaths[targetPathIndex];
                }

                // Determine animation type
                var animationType = Animation.ANIMATIONTYPE_MATRIX;

                if (!isBone) {
                    if (targetPath === "rotationQuaternion") {
                        animationType = Animation.ANIMATIONTYPE_QUATERNION;
                        targetNode.rotationQuaternion = new Quaternion();
                    }
                    else {
                        animationType = Animation.ANIMATIONTYPE_VECTOR3;
                    }
                }

                // Create animation and key frames
                var babylonAnimation: Animation = null;
                var keys = [];
                var arrayOffset = 0;
                var modifyKey = false;

                if (isBone && lastAnimation && lastAnimation.getKeys().length === bufferInput.length) {
                    babylonAnimation = lastAnimation;
                    modifyKey = true;
                }

                if (!modifyKey) {
                    var animationName = animation.name || "anim" + animationIndex;
                    babylonAnimation = new Animation(animationName, isBone ? "_matrix" : targetPath, 1, animationType, Animation.ANIMATIONLOOPMODE_CYCLE);
                }

                // For each frame
                for (var j = 0; j < bufferInput.length; j++) {
                    var value: any = null;

                    if (targetPath === "rotationQuaternion") { // VEC4
                        value = Quaternion.FromArray([bufferOutput[arrayOffset], bufferOutput[arrayOffset + 1], bufferOutput[arrayOffset + 2], bufferOutput[arrayOffset + 3]]);
                        arrayOffset += 4;
                    }
                    else { // Position and scaling are VEC3
                        value = Vector3.FromArray([bufferOutput[arrayOffset], bufferOutput[arrayOffset + 1], bufferOutput[arrayOffset + 2]]);
                        arrayOffset += 3;
                    }

                    if (isBone) {
                        var bone = <Bone>targetNode;
                        var translation = Vector3.Zero();
                        var rotationQuaternion = new Quaternion();
                        var scaling = Vector3.Zero();

                        // Warning on decompose
                        var mat = bone.getBaseMatrix();

                        if (modifyKey) {
                            mat = lastAnimation.getKeys()[j].value;
                        }

                        mat.decompose(scaling, rotationQuaternion, translation);

                        if (targetPath === "position") {
                            translation = value;
                        }
                        else if (targetPath === "rotationQuaternion") {
                            rotationQuaternion = value;
                        }
                        else {
                            scaling = value;
                        }

                        value = Matrix.Compose(scaling, rotationQuaternion, translation);
                    }

                    if (!modifyKey) {
                        keys.push({
                            frame: bufferInput[j],
                            value: value
                        });
                    }
                    else {
                        lastAnimation.getKeys()[j].value = value;
                    }
                }

                // Finish
                if (!modifyKey) {
                    babylonAnimation.setKeys(keys);
                    targetNode.animations.push(babylonAnimation);
                }

                lastAnimation = babylonAnimation;

                runtime.babylonScene.stopAnimation(targetNode);
                runtime.babylonScene.beginAnimation(targetNode, 0, bufferInput[bufferInput.length - 1], true, 1.0);
            }
        }
    };

    /**
    * Returns the bones transformation matrix
    */
    var configureBoneTransformation = (node: IGLTFNode): Matrix => {
        var mat: Matrix = null;

        if (node.translation || node.rotation || node.scale) {
            var scale = Vector3.FromArray(node.scale || [1, 1, 1]);
            var rotation = Quaternion.FromArray(node.rotation || [0, 0, 0, 1]);
            var position = Vector3.FromArray(node.translation || [0, 0, 0]);

            mat = Matrix.Compose(scale, rotation, position);
        }
        else {
            mat = Matrix.FromArray(node.matrix);
        }

        return mat;
    };

    /**
    * Returns the parent bone
    */
    var getParentBone = (runtime: IGLTFRuntime, skin: IGLTFSkin, jointName: string, newSkeleton: Skeleton): Bone => {
        // TODO: animation schema broken
        /*
        // Try to find
        for (var i = 0; i < newSkeleton.bones.length; i++) {
            if (newSkeleton.bones[i].name === jointName) {
                return newSkeleton.bones[i];
            }
        }

        // Not found, search in gltf nodes
        var nodes = runtime.gltf.nodes;
        for (var nde in nodes) {
            var node: IGLTFNode = nodes[nde];

            if (!node.jointName) {
                continue;
            }

            var children = node.children;
            for (var i = 0; i < children.length; i++) {
                var child: IGLTFNode = runtime.gltf.nodes[children[i]];
                if (!child.jointName) {
                    continue;
                }

                if (child.jointName === jointName) {
                    var mat = configureBoneTransformation(node);
                    var bone = new Bone(node.name, newSkeleton, getParentBone(runtime, skin, node.jointName, newSkeleton), mat);
                    bone.id = nde;
                    return bone;
                }
            }
        }
        */

        return null;
    }

    /**
    * Returns the appropriate root node
    */
    var getNodeToRoot = (nodesToRoot: INodeToRoot[], id: string): Bone => {
        // TODO: animation schema broken
        /*
        for (var i = 0; i < nodesToRoot.length; i++) {
            var nodeToRoot = nodesToRoot[i];

            for (var j = 0; j < nodeToRoot.node.children.length; j++) {
                var child = nodeToRoot.node.children[j];
                if (child === id) {
                    return nodeToRoot.bone;
                }
            }
        }
        */

        return null;
    };

    /**
    * Returns the node with the joint name
    */
    var getJointNode = (runtime: IGLTFRuntime, jointName: string): IJointNode => {
        // TODO: animation schema broken
        /*
        var nodes = runtime.nodes;
        var node: IGLTFNode = nodes[jointName];
        if (node) {
            return {
                node: node,
                id: jointName
            };
        }

        for (var nde in nodes) {
            node = nodes[nde];
            if (node.jointName === jointName) {
                return {
                    node: node,
                    id: nde
                };
            }
        }
        */

        return null;
    }

    /**
    * Checks if a nodes is in joints
    */
    var nodeIsInJoints = (skin: IGLTFSkin, id: string): boolean => {
        // TODO: animation schema broken
        /*
        for (var i = 0; i < skin.jointNames.length; i++) {
            if (skin.jointNames[i] === id) {
                return true;
            }
        }
        */

        return false;
    }

    /**
    * Fills the nodes to root for bones and builds hierarchy
    */
    var getNodesToRoot = (runtime: IGLTFRuntime, newSkeleton: Skeleton, skin: IGLTFSkin, nodesToRoot: INodeToRoot[]): void => {
        // TODO: animation schema broken
        /*
        // Creates nodes for root
        for (var nde in runtime.nodes) {
            var node: IGLTFNode = runtime.nodes[nde];
            var id = nde;

            if (!node.jointName || nodeIsInJoints(skin, node.jointName)) {
                continue;
            }

            // Create node to root bone
            var mat = configureBoneTransformation(node);
            var bone = new Bone(node.name, newSkeleton, null, mat);
            bone.id = id;
            nodesToRoot.push({ bone: bone, node: node, id: id });
        }

        // Parenting
        for (var i = 0; i < nodesToRoot.length; i++) {
            var nodeToRoot = nodesToRoot[i];
            var children = nodeToRoot.node.children;

            for (var j = 0; j < children.length; j++) {
                var child: INodeToRoot = null;

                for (var k = 0; k < nodesToRoot.length; k++) {
                    if (nodesToRoot[k].id === children[j]) {
                        child = nodesToRoot[k];
                        break;
                    }
                }

                if (child) {
                    (<any>child.bone)._parent = nodeToRoot.bone;
                    nodeToRoot.bone.children.push(child.bone);
                }
            }
        }
        */
    };

    /**
    * Imports a skeleton
    */
    var importSkeleton = (runtime: IGLTFRuntime, skin: IGLTFSkin, mesh: Mesh, newSkeleton: Skeleton, index: number): Skeleton => {
        // TODO: animation schema broken
        return null;
        /*
        if (!newSkeleton) {
            newSkeleton = new Skeleton(skin.name, "", runtime.scene);
        }

        if (!skin.babylonSkeleton) {
            return newSkeleton;
        }

        // Matrices
        var accessor = runtime.accessors[skin.inverseBindMatrices];
        var buffer = GLTFUtils.GetBufferFromAccessor(runtime, accessor);

        var bindShapeMatrix = Matrix.FromArray(skin.bindShapeMatrix);

        // Find the root bones
        var nodesToRoot: INodeToRoot[] = [];
        var nodesToRootToAdd: Bone[] = [];

        getNodesToRoot(runtime, newSkeleton, skin, nodesToRoot);
        newSkeleton.bones = [];

        if (nodesToRoot.length === 0) {
            newSkeleton.needInitialSkinMatrix = true;
        }

        // Joints
        for (var i = 0; i < skin.jointNames.length; i++) {
            var jointNode = getJointNode(runtime, skin.jointNames[i]);
            var node = jointNode.node;

            if (!node) {
                Tools.Warn("Joint named " + skin.jointNames[i] + " does not exist");
                continue;
            }

            var id = jointNode.id;

            // Optimize, if the bone already exists...
            var existingBone = runtime.scene.getBoneByID(id);
            if (existingBone) {
                newSkeleton.bones.push(existingBone);
                continue;
            }

            // Search for parent bone
            var foundBone = false;
            var parentBone: Bone = null;

            for (var j = 0; j < i; j++) {
                var joint: IGLTFNode = getJointNode(runtime, skin.jointNames[j]).node;

                if (!joint) {
                    Tools.Warn("Joint named " + skin.jointNames[j] + " does not exist when looking for parent");
                    continue;
                }

                var children = joint.children;
                foundBone = false;

                for (var k = 0; k < children.length; k++) {
                    if (children[k] === id) {
                        parentBone = getParentBone(runtime, skin, skin.jointNames[j], newSkeleton);
                        foundBone = true;
                        break;
                    }
                }

                if (foundBone) {
                    break;
                }
            }

            // Create bone
            var mat = configureBoneTransformation(node);

            if (!parentBone && nodesToRoot.length > 0) {
                parentBone = getNodeToRoot(nodesToRoot, id);

                if (parentBone) {
                    if (nodesToRootToAdd.indexOf(parentBone) === -1) {
                        nodesToRootToAdd.push(parentBone);
                    }
                }
            }

            var bone = new Bone(node.jointName, newSkeleton, parentBone, mat);
            bone.id = id;
        }

        // Polish
        var bones = newSkeleton.bones;
        newSkeleton.bones = [];
        
        for (var i = 0; i < skin.jointNames.length; i++) {
            var jointNode: IJointNode = getJointNode(runtime, skin.jointNames[i]);

            if (!jointNode) {
                continue;
            }

            for (var j = 0; j < bones.length; j++) {
                if (bones[j].id === jointNode.id) {
                    newSkeleton.bones.push(bones[j]);
                    break;
                }
            }
        }

        newSkeleton.prepare();

        // Finish
        for (var i = 0; i < nodesToRootToAdd.length; i++) {
            newSkeleton.bones.push(nodesToRootToAdd[i]);
        }

        return newSkeleton;
        */
    };

    /**
    * Imports a mesh and its geometries
    */
    var importMesh = (runtime: IGLTFRuntime, node: IGLTFNode, mesh: IGLTFMesh): Mesh => {
        var name = mesh.name || node.name || "mesh" + node.mesh;

        var babylonMesh = <Mesh>node.babylonNode;
        if (!babylonMesh) {
            babylonMesh = new Mesh(name, runtime.babylonScene);
        }

        if (!node.babylonNode) {
            return babylonMesh;
        }

        var multiMat = new MultiMaterial(name, runtime.babylonScene);

        if (!babylonMesh.material) {
            babylonMesh.material = multiMat;
        }

        var vertexData = new VertexData();
        var geometry = new Geometry(name, runtime.babylonScene, vertexData, false, babylonMesh);

        var verticesStarts = [];
        var verticesCounts = [];
        var indexStarts = [];
        var indexCounts = [];

        // Positions, normals and UVs
        for (var index = 0; index < mesh.primitives.length; index++) {
            // Temporary vertex data
            var tempVertexData = new VertexData();

            var primitive = mesh.primitives[index];
            if (primitive.mode !== EMeshPrimitiveMode.TRIANGLES) {
                // continue;
            }

            var attributes = primitive.attributes;
            var accessor: IGLTFAccessor = null;
            var buffer: any = null;

            // Set positions, normal and uvs
            for (var semantic in attributes) {

                // Link accessor and buffer view
                accessor = runtime.gltf.accessors[attributes[semantic]];
                buffer = GLTFUtils.GetBufferFromAccessor(runtime, accessor);

                if (semantic === "NORMAL") {
                    tempVertexData.normals = new Float32Array(buffer.length);
                    (<Float32Array>tempVertexData.normals).set(buffer);
                }
                else if (semantic === "POSITION") {
                    if (GLTFFileLoader.HomogeneousCoordinates) {
                        tempVertexData.positions = new Float32Array(buffer.length - buffer.length / 4);

                        for (var j = 0; j < buffer.length; j += 4) {
                            tempVertexData.positions[j] = buffer[j];
                            tempVertexData.positions[j + 1] = buffer[j + 1];
                            tempVertexData.positions[j + 2] = buffer[j + 2];
                        }
                    }
                    else {
                        tempVertexData.positions = new Float32Array(buffer.length);
                        (<Float32Array>tempVertexData.positions).set(buffer);
                    }

                    verticesCounts.push(tempVertexData.positions.length);
                }
                else if (semantic === "TANGENT") {
                    tempVertexData.tangents = new Float32Array(buffer.length);
                    (<Float32Array>tempVertexData.tangents).set(buffer);
                }
                else if (semantic.indexOf("TEXCOORD_") !== -1) {
                    var channel = Number(semantic.split("_")[1]);
                    var uvKind = VertexBuffer.UVKind + (channel === 0 ? "" : (channel + 1));
                    var uvs = new Float32Array(buffer.length);
                    (<Float32Array>uvs).set(buffer);
                    normalizeUVs(uvs);
                    tempVertexData.set(uvs, uvKind);
                }
                else if (semantic === "JOINT") {
                    tempVertexData.matricesIndices = new Float32Array(buffer.length);
                    (<Float32Array>tempVertexData.matricesIndices).set(buffer);
                }
                else if (semantic === "WEIGHT") {
                    tempVertexData.matricesWeights = new Float32Array(buffer.length);
                    (<Float32Array>tempVertexData.matricesWeights).set(buffer);
                }
                else if (semantic === "COLOR") {
                    tempVertexData.colors = new Float32Array(buffer.length);
                    (<Float32Array>tempVertexData.colors).set(buffer);
                }
            }

            // Indices
            accessor = runtime.gltf.accessors[primitive.indices];
            if (accessor) {
                buffer = GLTFUtils.GetBufferFromAccessor(runtime, accessor);

                tempVertexData.indices = new Int32Array(buffer.length);
                (<Float32Array>tempVertexData.indices).set(buffer);
                indexCounts.push(tempVertexData.indices.length);
            }
            else {
                // Set indices on the fly
                var indices: number[] = [];
                for (var j = 0; j < tempVertexData.positions.length / 3; j++) {
                    indices.push(j);
                }

                tempVertexData.indices = new Int32Array(indices);
                indexCounts.push(tempVertexData.indices.length);
            }
            
            vertexData.merge(tempVertexData);
            tempVertexData = undefined;

            // Sub material
            var material = runtime.gltf.materials[primitive.material].babylonMaterial;
            multiMat.subMaterials.push(material === undefined ? GLTFUtils.GetDefaultMaterial(runtime.babylonScene) : material);

            // Update vertices start and index start
            verticesStarts.push(verticesStarts.length === 0 ? 0 : verticesStarts[verticesStarts.length - 1] + verticesCounts[verticesCounts.length - 2]);
            indexStarts.push(indexStarts.length === 0 ? 0 : indexStarts[indexStarts.length - 1] + indexCounts[indexCounts.length - 2]);
        }

        // Apply geometry
        geometry.setAllVerticesData(vertexData, false);
        babylonMesh.computeWorldMatrix(true);

        // Apply submeshes
        babylonMesh.subMeshes = [];
        for (var index = 0; index < mesh.primitives.length; index++) {
            if (mesh.primitives[index].mode !== EMeshPrimitiveMode.TRIANGLES) {
                //continue;
            }

            var subMesh = new SubMesh(index, verticesStarts[index], verticesCounts[index], indexStarts[index], indexCounts[index], babylonMesh, babylonMesh, true);
        }

        // Finish
        return babylonMesh;
    };

    /**
    * Configure node transformation from position, rotation and scaling
    */
    var configureNode = (newNode: any, position: Vector3, rotation: Quaternion, scaling: Vector3): void => {
        if (newNode.position) {
            newNode.position = position;
        }

        if (newNode.rotationQuaternion || newNode.rotation) {
            newNode.rotationQuaternion = rotation;
        }

        if (newNode.scaling) {
            newNode.scaling = scaling;
        }
    };

    /**
    * Configures node transformation
    */
    var configureNodeFromGLTFNode = (newNode: Mesh, node: IGLTFNode, parent: Node): void => {
        if (node.matrix) {
            var position = new Vector3(0, 0, 0);
            var rotation = new Quaternion();
            var scaling = new Vector3(0, 0, 0);
            var mat = Matrix.FromArray(node.matrix);
            mat.decompose(scaling, rotation, position);

            configureNode(newNode, position, rotation, scaling);
            newNode.computeWorldMatrix(true);
        }
        else {
            configureNode(newNode,
                Vector3.FromArray(node.translation || [0, 0, 0]),
                Quaternion.FromArray(node.rotation || [0, 0, 0, 1]),
                Vector3.FromArray(node.scale || [1, 1, 1]));
        }
    };

    /**
    * Imports a node
    */
    var importNode = (runtime: IGLTFRuntime, node: IGLTFNode, parent: Node): Node => {
        var babylonNode: Node = null;

        if (runtime.importOnlyMeshes && (node.skin !== undefined || node.mesh !== undefined)) {
            if (runtime.importMeshesNames.length > 0 && runtime.importMeshesNames.indexOf(node.name) === -1) {
                return null;
            }
        }

        // Meshes
        if (node.skin !== undefined) {
            // TODO: animation schema broken
            /*
            if (node.mesh) {
                var skin: IGLTFSkin = runtime.gltf.skins[node.skin];

                var newMesh = importMesh(runtime, node);
                newMesh.skeleton = runtime.babylonScene.getLastSkeletonByID(node.skin);

                if (newMesh.skeleton === null) {
                    newMesh.skeleton = importSkeleton(runtime, skin, newMesh, skin.babylonSkeleton, node.skin);

                    if (!skin.babylonSkeleton) {
                        skin.babylonSkeleton = newMesh.skeleton;
                    }
                }

                lastNode = newMesh;
            }
            */
        }
        else if (node.mesh !== undefined) {
            babylonNode = importMesh(runtime, node, runtime.gltf.meshes[node.mesh]);
        }
        // Cameras
        else if (node.camera !== undefined && !node.babylonNode && !runtime.importOnlyMeshes) {
            var camera = runtime.gltf.cameras[node.camera];

            if (camera) {
                if (camera.type === "orthographic") {
                    var orthographicCamera = camera.orthographic;
                    var orthoCamera = new FreeCamera(node.name || "camera" + node.camera, Vector3.Zero(), runtime.babylonScene);

                    orthoCamera.name = node.name;
                    orthoCamera.mode = Camera.ORTHOGRAPHIC_CAMERA;
                    orthoCamera.attachControl(runtime.babylonScene.getEngine().getRenderingCanvas());

                    babylonNode = orthoCamera;
                }
                else if (camera.type === "perspective") {
                    var perspectiveCamera = camera.perspective;
                    var persCamera = new FreeCamera(node.name || "camera" + node.camera, Vector3.Zero(), runtime.babylonScene);

                    persCamera.name = node.name;
                    persCamera.attachControl(runtime.babylonScene.getEngine().getRenderingCanvas());

                    if (!perspectiveCamera.aspectRatio) {
                        perspectiveCamera.aspectRatio = runtime.babylonScene.getEngine().getRenderWidth() / runtime.babylonScene.getEngine().getRenderHeight();
                    }

                    if (perspectiveCamera.znear && perspectiveCamera.zfar) {
                        persCamera.maxZ = perspectiveCamera.zfar;
                        persCamera.minZ = perspectiveCamera.znear;
                    }

                    babylonNode = persCamera;
                }
            }
        }

        // Empty node
        if (node.jointName === undefined) {
            if (node.babylonNode) {
                return node.babylonNode;
            }
            else if (babylonNode === null) {
                var dummy = new Mesh(node.name, runtime.babylonScene);
                node.babylonNode = dummy;
                babylonNode = dummy;
            }
        }

        if (babylonNode !== null) {
            if (babylonNode instanceof Mesh) {
                configureNodeFromGLTFNode(babylonNode, node, parent);
            }
            else {
                var translation = node.translation || [0, 0, 0];
                var rotation = node.rotation || [0, 0, 0, 1];
                var scale = node.scale || [1, 1, 1];
                configureNode(babylonNode, Vector3.FromArray(translation), Quaternion.RotationAxis(Vector3.FromArray(rotation).normalize(), rotation[3]), Vector3.FromArray(scale));
            }

            babylonNode.updateCache(true);
            node.babylonNode = babylonNode;
        }

        return babylonNode;
    };

    /**
    * Traverses nodes and creates them
    */
    var traverseNodes = (runtime: IGLTFRuntime, index: number, parent: Node, meshIncluded?: boolean): void => {
        var node: IGLTFNode = runtime.gltf.nodes[index];
        var newNode: Node = null;

        if (runtime.importOnlyMeshes && !meshIncluded) {
            if (runtime.importMeshesNames.indexOf(node.name) !== -1 || runtime.importMeshesNames.length === 0) {
                meshIncluded = true;
            }
            else {
                meshIncluded = false;
            }
        }
        else {
            meshIncluded = true;
        }

        if (node.jointName === undefined && meshIncluded) {
            newNode = importNode(runtime, node, parent);

            if (newNode !== null) {
                newNode.parent = parent;
            }
        }

        if (node.children) {
            for (var i = 0; i < node.children.length; i++) {
                traverseNodes(runtime, node.children[i], newNode, meshIncluded);
            }
        }
    };

    var importScene = (runtime: IGLTFRuntime): void => {
        var scene = runtime.gltf.scene || 0;
        var scenes = runtime.gltf.scenes;

        if (scenes) {
            var nodes = scenes[scene].nodes;
            for (var i = 0; i < nodes.length; i++) {
                traverseNodes(runtime, nodes[i], null);
            }
        }
        else {
            for (var i = 0; i < runtime.gltf.nodes.length; i++) {
                traverseNodes(runtime, i, null);
            }
        }
    }

    /**
    * do stuff after buffers are loaded (e.g. hook up materials, load animations, etc.)
    */
    var postLoad = (runtime: IGLTFRuntime): void => {
        importScene(runtime);

        // Set animations
        loadAnimations(runtime);

        for (var i = 0; i < runtime.babylonScene.skeletons.length; i++) {
            var skeleton = runtime.babylonScene.skeletons[i];
            runtime.babylonScene.beginAnimation(skeleton, 0, Number.MAX_VALUE, true, 1.0);
        }
    };

    var importMaterials = (runtime: IGLTFRuntime): void => {
        for (var i = 0; i < runtime.gltf.materials.length; i++) {
            GLTFFileLoaderExtension.LoadMaterial(runtime, i);
        }
    };

    class BinaryReader {
        private _arrayBuffer: ArrayBuffer;
        private _dataView: DataView;
        private _byteOffset: number;

        constructor(arrayBuffer: ArrayBuffer) {
            this._arrayBuffer = arrayBuffer;
            this._dataView = new DataView(arrayBuffer);
            this._byteOffset = 0;
        }

        public getPosition(): number {
            return this._byteOffset;
        }

        public getLength(): number {
            return this._arrayBuffer.byteLength;
        }

        public readUint32(): number {
            var value = this._dataView.getUint32(this._byteOffset, true);
            this._byteOffset += 4;
            return value;
        }

        public readUint8Array(length: number): Uint8Array {
            var value = new Uint8Array(this._arrayBuffer, this._byteOffset, length);
            this._byteOffset += length;
            return value;
        }

        public skipBytes(length: number): void {
            this._byteOffset += length;
        }
    }

    /**
    * glTF File Loader Plugin
    */
    export class GLTFFileLoader implements ISceneLoaderPluginAsync {
        /**
        * Public members
        */
        public extensions: ISceneLoaderPluginExtensions = {
            ".gltf": { isBinary: false },
            ".glb": { isBinary: true }
        };

        /**
        * Private members
        */
        // None

        /**
        * Static members
        */
        public static HomogeneousCoordinates: boolean = false;
        public static IncrementalLoading: boolean = true;

        public static Extensions: { [name: string]: GLTFFileLoaderExtension } = {};

        public static RegisterExtension(extension: GLTFFileLoaderExtension): void {
            if (GLTFFileLoader.Extensions[extension.name]) {
                Tools.Error("Tool with the same name \"" + extension.name + "\" already exists");
                return;
            }

            GLTFFileLoader.Extensions[extension.name] = extension;
        }

        public static LoadMaterial(runtime: IGLTFRuntime, index: number): IGLTFMaterial {
            var material = runtime.gltf.materials[index];
            if (!material) return null;

            material.babylonMaterial = new PBRMaterial(material.name || "mat" + index, runtime.babylonScene);
            material.babylonMaterial.sideOrientation = Material.CounterClockWiseSideOrientation;
            material.babylonMaterial.useScalarInLinearSpace = true;
            return material;
        }

        public static LoadMetallicRoughnessMaterialProperties = (runtime: IGLTFRuntime, material: IGLTFMaterial): void => {
            var properties = material.pbrMetallicRoughness;
            if (!properties) return;

            material.babylonMaterial.albedoColor = properties.baseColorFactor ? Color3.FromArray(properties.baseColorFactor) : new Color3(1, 1, 1);
            material.babylonMaterial.metallic = properties.metallicFactor === undefined ? 1 : properties.metallicFactor;
            material.babylonMaterial.roughness = properties.roughnessFactor === undefined ? 1 : properties.roughnessFactor;

            if (properties.baseColorTexture) {
                GLTFFileLoader.LoadTextureAsync(runtime, properties.baseColorTexture,
                    texture => {
                        material.babylonMaterial.albedoTexture = texture;
                        GLTFFileLoader.LoadAlphaProperties(runtime, material);
                    },
                    () => {
                        Tools.Warn("Failed to load base color texture");
                    });
            }

            if (properties.metallicRoughnessTexture) {
                GLTFFileLoader.LoadTextureAsync(runtime, properties.metallicRoughnessTexture,
                    texture => {
                        material.babylonMaterial.metallicTexture = texture;
                        material.babylonMaterial.useRoughnessFromMetallicTextureGreen = true;
                        material.babylonMaterial.useRoughnessFromMetallicTextureAlpha = false;
                    },
                    () => {
                        Tools.Warn("Failed to load metallic roughness texture");
                    });
            }
        }

        public static LoadCommonMaterialProperties(runtime: IGLTFRuntime, material: IGLTFMaterial): void {
            if (material.normalTexture) {
                GLTFFileLoader.LoadTextureAsync(runtime, material.normalTexture, babylonTexture => {
                    material.babylonMaterial.bumpTexture = babylonTexture;
                    if (material.normalTexture.scale !== undefined) {
                        material.babylonMaterial.bumpTexture.level = material.normalTexture.scale;
                    }
                }, () => Tools.Warn("Failed to load normal texture"));
            }

            if (material.occlusionTexture) {
                GLTFFileLoader.LoadTextureAsync(runtime, material.occlusionTexture, babylonTexture => {
                    material.babylonMaterial.ambientTexture = babylonTexture;
                    if (material.occlusionTexture.strength !== undefined) {
                        material.babylonMaterial.ambientTextureStrength = material.occlusionTexture.strength;
                    }
                }, () => Tools.Warn("Failed to load normal texture"));
            }

            material.babylonMaterial.useEmissiveAsIllumination = (material.emissiveFactor || material.emissiveTexture) ? true : false;
            material.babylonMaterial.emissiveColor = material.emissiveFactor ? Color3.FromArray(material.emissiveFactor) : new Color3(0, 0, 0);
            if (material.emissiveTexture) {
                GLTFFileLoader.LoadTextureAsync(runtime, material.emissiveTexture, babylonTexture => {
                    material.babylonMaterial.emissiveTexture = babylonTexture;
                }, () => Tools.Warn("Failed to load normal texture"));
            }
        }

        public static LoadAlphaProperties(runtime: IGLTFRuntime, material: IGLTFMaterial): void {
            if (material.alphaMode) {
                material.babylonMaterial.albedoTexture.hasAlpha = true;

                switch (material.alphaMode) {
                    case "MASK":
                        material.babylonMaterial.useAlphaFromAlbedoTexture = false;
                        material.babylonMaterial.alphaMode = Engine.ALPHA_DISABLE;
                        break;
                    case "BLEND":
                        material.babylonMaterial.useAlphaFromAlbedoTexture = true;
                        material.babylonMaterial.alphaMode = Engine.ALPHA_COMBINE;
                        break;
                    default:
                        Tools.Error("Invalid alpha mode '" + material.alphaMode + "'");
                }
            }
        }

        public static LoadTextureAsync(runtime: IGLTFRuntime, textureInfo: IGLTFTextureInfo, onSuccess: (babylonTexture: Texture) => void, onError: () => void): void {
            var texture = runtime.gltf.textures[textureInfo.index];

            if (!texture || texture.source === undefined || texture.sampler === undefined) {
                onError();
                return;
            }

            if (texture.babylonTexture) {
                onSuccess(texture.babylonTexture);
                return;
            }

            var source = runtime.gltf.images[texture.source];

            if (source.uri === undefined) {
                var bufferView: IGLTFBufferView = runtime.gltf.bufferViews[source.bufferView];
                var buffer = GLTFUtils.GetBufferFromBufferView(runtime, bufferView, 0, bufferView.byteLength, EComponentType.UNSIGNED_BYTE);
                GLTFFileLoader.CreateTextureAsync(runtime, textureInfo, buffer, source.mimeType, onSuccess, onError);
            }
            else if (GLTFUtils.IsBase64(source.uri)) {
                GLTFFileLoader.CreateTextureAsync(runtime, textureInfo, new Uint8Array(GLTFUtils.DecodeBase64(source.uri)), source.mimeType, onSuccess, onError);
            }
            else {
                Tools.LoadFile(runtime.rootUrl + source.uri, data => {
                    GLTFFileLoader.CreateTextureAsync(runtime, textureInfo, new Uint8Array(data), source.mimeType, onSuccess, onError);
                }, null, null, true, onError);
            }
        }

        public static CreateTextureAsync(runtime: IGLTFRuntime, textureInfo: IGLTFTextureInfo, buffer: ArrayBufferView, mimeType: string, onSuccess: (babylonTexture: Texture) => void, onError: () => void): void {
            var texture = runtime.gltf.textures[textureInfo.index];

            if (!texture || texture.source === undefined || texture.sampler === undefined) {
                onError();
                return;
            }

            if (texture.babylonTexture) {
                onSuccess(texture.babylonTexture);
                return;
            }

            var sampler: IGLTFSampler = runtime.gltf.samplers[texture.sampler];

            var createMipMaps =
                (sampler.minFilter === ETextureMinFilter.NEAREST_MIPMAP_NEAREST) ||
                (sampler.minFilter === ETextureMinFilter.NEAREST_MIPMAP_LINEAR) ||
                (sampler.minFilter === ETextureMinFilter.LINEAR_MIPMAP_NEAREST) ||
                (sampler.minFilter === ETextureMinFilter.LINEAR_MIPMAP_LINEAR);

            var samplingMode = Texture.BILINEAR_SAMPLINGMODE;

            var blob = new Blob([buffer], { type: mimeType });
            var blobURL = URL.createObjectURL(blob);
            var revokeBlobURL = () => URL.revokeObjectURL(blobURL);
            texture.babylonTexture = new Texture(blobURL, runtime.babylonScene, !createMipMaps, true, samplingMode, revokeBlobURL, revokeBlobURL);
            texture.babylonTexture.coordinatesIndex = textureInfo.texCoord === undefined ? 0 : textureInfo.texCoord;
            texture.babylonTexture.wrapU = GLTFUtils.GetWrapMode(sampler.wrapS);
            texture.babylonTexture.wrapV = GLTFUtils.GetWrapMode(sampler.wrapT);
            texture.babylonTexture.name = texture.name;

            onSuccess(texture.babylonTexture);
        }

        /**
        * Import meshes
        */
        public importMeshAsync(meshesNames: any, scene: Scene, data: any, rootUrl: string, onSuccess?: (meshes: AbstractMesh[], particleSystems: ParticleSystem[], skeletons: Skeleton[]) => void, onError?: () => void): boolean {
            scene.useRightHandedSystem = true;

            var runtime = this._createRuntime(scene, data, rootUrl, true);
            if (!runtime) {
                if (onError) onError();
                return;
            }

            if (meshesNames === "") {
                runtime.importMeshesNames = [];
            }
            else if (typeof meshesNames === "string") {
                runtime.importMeshesNames = [meshesNames];
            }
            else if (meshesNames && !(meshesNames instanceof Array)) {
                runtime.importMeshesNames = [meshesNames];
            }
            else {
                runtime.importMeshesNames = [];
                Tools.Warn("Argument meshesNames must be of type string or string[]");
            }

            // Load scene
            importScene(runtime);

            var meshes = [];
            var skeletons = [];

            // Fill arrays of meshes and skeletons
            for (var nde in runtime.gltf.nodes) {
                var node: IGLTFNode = runtime.gltf.nodes[nde];

                if (node.babylonNode instanceof AbstractMesh) {
                    meshes.push(<AbstractMesh>node.babylonNode);
                }
            }

            for (var skl in runtime.gltf.skins) {
                var skin: IGLTFSkin = runtime.gltf.skins[skl];

                if (skin.babylonSkeleton instanceof Skeleton) {
                    skeletons.push(skin.babylonSkeleton);
                }
            }

            // Load buffers, materials, etc.
            this._loadBuffersAsync(runtime, () => {
                importMaterials(runtime);
                postLoad(runtime);

                if (!GLTFFileLoader.IncrementalLoading && onSuccess) {
                    onSuccess(meshes, null, skeletons);
                }
            }, onError);

            if (GLTFFileLoader.IncrementalLoading && onSuccess) {
                onSuccess(meshes, null, skeletons);
            }

            return true;
        }

        /**
        * Load scene
        */
        public loadAsync(scene: Scene, data: string | ArrayBuffer, rootUrl: string, onSuccess: () => void, onError: () => void): boolean {
            scene.useRightHandedSystem = true;

            var runtime = this._createRuntime(scene, data, rootUrl, false);
            if (!runtime) {
                if (onError) onError();
                return;
            }

            importScene(runtime);

            this._loadBuffersAsync(runtime, () => {
                importMaterials(runtime);
                postLoad(runtime);

                if (!GLTFFileLoader.IncrementalLoading) {
                    onSuccess();
                }
            }, onError);

            if (GLTFFileLoader.IncrementalLoading) {
                onSuccess();
            }

            return true;
        }

        private _loadBuffersAsync(runtime: IGLTFRuntime, onSuccess: () => void, onError: () => void): void {
            if (runtime.gltf.buffers.length == 0) {
                onSuccess();
                return;
            }

            var loadedCount = 0;
            runtime.gltf.buffers.forEach((buffer, index) => {
                this._loadBufferAsync(runtime, index, () => {
                    if (++loadedCount >= runtime.gltf.buffers.length) {
                        onSuccess();
                    }
                }, onError);
            });
        }

        private _loadBufferAsync(runtime: IGLTFRuntime, index: number, onSuccess: () => void, onError: () => void): void {
            var buffer = runtime.gltf.buffers[index];

            if (buffer.uri === undefined) {
                // buffer.loadedBufferView should already be set in _parseBinary
                onSuccess();
            }
            else if (GLTFUtils.IsBase64(buffer.uri)) {
                var data = GLTFUtils.DecodeBase64(buffer.uri);
                setTimeout(() => {
                    buffer.loadedBufferView = new Uint8Array(data);
                    onSuccess();
                });
            }
            else {
                Tools.LoadFile(runtime.rootUrl + buffer.uri, data => {
                    buffer.loadedBufferView = new Uint8Array(data);
                    onSuccess();
                }, null, null, true, onError);
            }
        }

        private _createRuntime(scene: Scene, data: any, rootUrl: string, importOnlyMeshes: boolean): IGLTFRuntime {
            var runtime: IGLTFRuntime = {
                gltf: null,

                babylonScene: scene,
                rootUrl: rootUrl,

                importOnlyMeshes: importOnlyMeshes,

                dummyNodes: []
            }

            if (data instanceof ArrayBuffer) {
                if (!this._parseBinary(runtime, <ArrayBuffer>data)) {
                    return null;
                }
            }
            else {
                runtime.gltf = JSON.parse(<string>data);
            }

            GLTFFileLoaderExtension.PostCreateRuntime(runtime);
            return runtime;
        }

        private _parseBinary(runtime: IGLTFRuntime, data: ArrayBuffer): boolean {
            const Binary = {
                Magic: 0x46546C67,
                Version: 2,
                ChunkFormat: {
                    JSON: 0x4E4F534A,
                    BIN: 0x004E4942
                }
            };

            var binaryReader = new BinaryReader(data);

            var magic = binaryReader.readUint32();
            if (magic !== Binary.Magic) {
                Tools.Error("Unexpected magic: " + magic);
                return false;
            }

            var version = binaryReader.readUint32();
            if (version !== Binary.Version) {
                Tools.Error("Unsupported version: " + version);
                return false;
            }

            var length = binaryReader.readUint32();
            if (length !== data.byteLength) {
                Tools.Error("Length in header does not match actual data length: " + length + " != " + data.byteLength);
                return false;
            }

            var chunkLength = binaryReader.readUint32();
            var chunkFormat = binaryReader.readUint32();
            if (chunkFormat !== Binary.ChunkFormat.JSON) {
                Tools.Error("First chunk format is not JSON");
                return false;
            }

            var jsonText = GLTFUtils.DecodeBufferToText(binaryReader.readUint8Array(chunkLength));
            runtime.gltf = JSON.parse(jsonText);

            var binaryBuffer: IGLTFBuffer;
            var buffers = runtime.gltf.buffers;
            if (buffers.length > 0 && buffers[0].uri === undefined) {
                binaryBuffer = buffers[0];
            }

            while (binaryReader.getPosition() < binaryReader.getLength()) {
                chunkLength = binaryReader.readUint32();
                chunkFormat = binaryReader.readUint32();
                if (chunkFormat === Binary.ChunkFormat.JSON) {
                    Tools.Error("Unexpected JSON chunk");
                    return false;
                }

                if (chunkFormat === Binary.ChunkFormat.BIN) {
                    if (!binaryBuffer) {
                        Tools.Error("Unexpected BIN chunk");
                        return false;
                    }

                    if (binaryBuffer.byteLength != chunkLength) {
                        Tools.Error("Binary buffer length from JSON does not match chunk length");
                        return false;
                    }

                    binaryBuffer.loadedBufferView = binaryReader.readUint8Array(chunkLength);
                }
                else {
                    // ignore unrecognized chunkFormat
                    binaryReader.skipBytes(chunkLength);
                }
            }

            return true;
        };
    };

    BABYLON.SceneLoader.RegisterPlugin(new GLTFFileLoader());
}
