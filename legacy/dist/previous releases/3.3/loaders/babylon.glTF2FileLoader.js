/// <reference path="../../../dist/preview release/babylon.d.ts"/>
/// <reference path="../../../dist/preview release/glTF2Interface/babylon.glTF2Interface.d.ts"/>
var BABYLON;
(function (BABYLON) {
    /**
     * Mode that determines the coordinate system to use.
     */
    var GLTFLoaderCoordinateSystemMode;
    (function (GLTFLoaderCoordinateSystemMode) {
        /**
         * Automatically convert the glTF right-handed data to the appropriate system based on the current coordinate system mode of the scene.
         */
        GLTFLoaderCoordinateSystemMode[GLTFLoaderCoordinateSystemMode["AUTO"] = 0] = "AUTO";
        /**
         * Sets the useRightHandedSystem flag on the scene.
         */
        GLTFLoaderCoordinateSystemMode[GLTFLoaderCoordinateSystemMode["FORCE_RIGHT_HANDED"] = 1] = "FORCE_RIGHT_HANDED";
    })(GLTFLoaderCoordinateSystemMode = BABYLON.GLTFLoaderCoordinateSystemMode || (BABYLON.GLTFLoaderCoordinateSystemMode = {}));
    /**
     * Mode that determines what animations will start.
     */
    var GLTFLoaderAnimationStartMode;
    (function (GLTFLoaderAnimationStartMode) {
        /**
         * No animation will start.
         */
        GLTFLoaderAnimationStartMode[GLTFLoaderAnimationStartMode["NONE"] = 0] = "NONE";
        /**
         * The first animation will start.
         */
        GLTFLoaderAnimationStartMode[GLTFLoaderAnimationStartMode["FIRST"] = 1] = "FIRST";
        /**
         * All animations will start.
         */
        GLTFLoaderAnimationStartMode[GLTFLoaderAnimationStartMode["ALL"] = 2] = "ALL";
    })(GLTFLoaderAnimationStartMode = BABYLON.GLTFLoaderAnimationStartMode || (BABYLON.GLTFLoaderAnimationStartMode = {}));
    /**
     * Loader state.
     */
    var GLTFLoaderState;
    (function (GLTFLoaderState) {
        /**
         * The asset is loading.
         */
        GLTFLoaderState[GLTFLoaderState["LOADING"] = 0] = "LOADING";
        /**
         * The asset is ready for rendering.
         */
        GLTFLoaderState[GLTFLoaderState["READY"] = 1] = "READY";
        /**
         * The asset is completely loaded.
         */
        GLTFLoaderState[GLTFLoaderState["COMPLETE"] = 2] = "COMPLETE";
    })(GLTFLoaderState = BABYLON.GLTFLoaderState || (BABYLON.GLTFLoaderState = {}));
    /**
     * File loader for loading glTF files into a scene.
     */
    var GLTFFileLoader = /** @class */ (function () {
        function GLTFFileLoader() {
            // --------------
            // Common options
            // --------------
            /**
             * Raised when the asset has been parsed
             */
            this.onParsedObservable = new BABYLON.Observable();
            // ----------
            // V2 options
            // ----------
            /**
             * The coordinate system mode. Defaults to AUTO.
             */
            this.coordinateSystemMode = GLTFLoaderCoordinateSystemMode.AUTO;
            /**
            * The animation start mode. Defaults to FIRST.
            */
            this.animationStartMode = GLTFLoaderAnimationStartMode.FIRST;
            /**
             * Defines if the loader should compile materials before raising the success callback. Defaults to false.
             */
            this.compileMaterials = false;
            /**
             * Defines if the loader should also compile materials with clip planes. Defaults to false.
             */
            this.useClipPlane = false;
            /**
             * Defines if the loader should compile shadow generators before raising the success callback. Defaults to false.
             */
            this.compileShadowGenerators = false;
            /**
             * Defines if the Alpha blended materials are only applied as coverage.
             * If false, (default) The luminance of each pixel will reduce its opacity to simulate the behaviour of most physical materials.
             * If true, no extra effects are applied to transparent pixels.
             */
            this.transparencyAsCoverage = false;
            /**
             * Function called before loading a url referenced by the asset.
             */
            this.preprocessUrlAsync = function (url) { return Promise.resolve(url); };
            /**
             * Observable raised when the loader creates a mesh after parsing the glTF properties of the mesh.
             */
            this.onMeshLoadedObservable = new BABYLON.Observable();
            /**
             * Observable raised when the loader creates a texture after parsing the glTF properties of the texture.
             */
            this.onTextureLoadedObservable = new BABYLON.Observable();
            /**
             * Observable raised when the loader creates a material after parsing the glTF properties of the material.
             */
            this.onMaterialLoadedObservable = new BABYLON.Observable();
            /**
             * Observable raised when the loader creates a camera after parsing the glTF properties of the camera.
             */
            this.onCameraLoadedObservable = new BABYLON.Observable();
            /**
             * Observable raised when the asset is completely loaded, immediately before the loader is disposed.
             * For assets with LODs, raised when all of the LODs are complete.
             * For assets without LODs, raised when the model is complete, immediately after the loader resolves the returned promise.
             */
            this.onCompleteObservable = new BABYLON.Observable();
            /**
             * Observable raised when an error occurs.
             */
            this.onErrorObservable = new BABYLON.Observable();
            /**
             * Observable raised after the loader is disposed.
             */
            this.onDisposeObservable = new BABYLON.Observable();
            /**
             * Observable raised after a loader extension is created.
             * Set additional options for a loader extension in this event.
             */
            this.onExtensionLoadedObservable = new BABYLON.Observable();
            /**
             * Defines if the loader should validate the asset.
             */
            this.validate = false;
            /**
             * Observable raised after validation when validate is set to true. The event data is the result of the validation.
             */
            this.onValidatedObservable = new BABYLON.Observable();
            this._loader = null;
            /**
             * Name of the loader ("gltf")
             */
            this.name = "gltf";
            /**
             * Supported file extensions of the loader (.gltf, .glb)
             */
            this.extensions = {
                ".gltf": { isBinary: false },
                ".glb": { isBinary: true }
            };
            this._logIndentLevel = 0;
            this._loggingEnabled = false;
            /** @hidden */
            this._log = this._logDisabled;
            this._capturePerformanceCounters = false;
            /** @hidden */
            this._startPerformanceCounter = this._startPerformanceCounterDisabled;
            /** @hidden */
            this._endPerformanceCounter = this._endPerformanceCounterDisabled;
        }
        Object.defineProperty(GLTFFileLoader.prototype, "onParsed", {
            /**
             * Raised when the asset has been parsed
             */
            set: function (callback) {
                if (this._onParsedObserver) {
                    this.onParsedObservable.remove(this._onParsedObserver);
                }
                this._onParsedObserver = this.onParsedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onMeshLoaded", {
            /**
             * Callback raised when the loader creates a mesh after parsing the glTF properties of the mesh.
             */
            set: function (callback) {
                if (this._onMeshLoadedObserver) {
                    this.onMeshLoadedObservable.remove(this._onMeshLoadedObserver);
                }
                this._onMeshLoadedObserver = this.onMeshLoadedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onTextureLoaded", {
            /**
             * Callback raised when the loader creates a texture after parsing the glTF properties of the texture.
             */
            set: function (callback) {
                if (this._onTextureLoadedObserver) {
                    this.onTextureLoadedObservable.remove(this._onTextureLoadedObserver);
                }
                this._onTextureLoadedObserver = this.onTextureLoadedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onMaterialLoaded", {
            /**
             * Callback raised when the loader creates a material after parsing the glTF properties of the material.
             */
            set: function (callback) {
                if (this._onMaterialLoadedObserver) {
                    this.onMaterialLoadedObservable.remove(this._onMaterialLoadedObserver);
                }
                this._onMaterialLoadedObserver = this.onMaterialLoadedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onCameraLoaded", {
            /**
             * Callback raised when the loader creates a camera after parsing the glTF properties of the camera.
             */
            set: function (callback) {
                if (this._onCameraLoadedObserver) {
                    this.onCameraLoadedObservable.remove(this._onCameraLoadedObserver);
                }
                this._onCameraLoadedObserver = this.onCameraLoadedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onComplete", {
            /**
             * Callback raised when the asset is completely loaded, immediately before the loader is disposed.
             * For assets with LODs, raised when all of the LODs are complete.
             * For assets without LODs, raised when the model is complete, immediately after the loader resolves the returned promise.
             */
            set: function (callback) {
                if (this._onCompleteObserver) {
                    this.onCompleteObservable.remove(this._onCompleteObserver);
                }
                this._onCompleteObserver = this.onCompleteObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onError", {
            /**
             * Callback raised when an error occurs.
             */
            set: function (callback) {
                if (this._onErrorObserver) {
                    this.onErrorObservable.remove(this._onErrorObserver);
                }
                this._onErrorObserver = this.onErrorObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onDispose", {
            /**
             * Callback raised after the loader is disposed.
             */
            set: function (callback) {
                if (this._onDisposeObserver) {
                    this.onDisposeObservable.remove(this._onDisposeObserver);
                }
                this._onDisposeObserver = this.onDisposeObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onExtensionLoaded", {
            /**
             * Callback raised after a loader extension is created.
             */
            set: function (callback) {
                if (this._onExtensionLoadedObserver) {
                    this.onExtensionLoadedObservable.remove(this._onExtensionLoadedObserver);
                }
                this._onExtensionLoadedObserver = this.onExtensionLoadedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "loggingEnabled", {
            /**
             * Defines if the loader logging is enabled.
             */
            get: function () {
                return this._loggingEnabled;
            },
            set: function (value) {
                if (this._loggingEnabled === value) {
                    return;
                }
                this._loggingEnabled = value;
                if (this._loggingEnabled) {
                    this._log = this._logEnabled;
                }
                else {
                    this._log = this._logDisabled;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "capturePerformanceCounters", {
            /**
             * Defines if the loader should capture performance counters.
             */
            get: function () {
                return this._capturePerformanceCounters;
            },
            set: function (value) {
                if (this._capturePerformanceCounters === value) {
                    return;
                }
                this._capturePerformanceCounters = value;
                if (this._capturePerformanceCounters) {
                    this._startPerformanceCounter = this._startPerformanceCounterEnabled;
                    this._endPerformanceCounter = this._endPerformanceCounterEnabled;
                }
                else {
                    this._startPerformanceCounter = this._startPerformanceCounterDisabled;
                    this._endPerformanceCounter = this._endPerformanceCounterDisabled;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onValidated", {
            /**
             * Callback raised after a loader extension is created.
             */
            set: function (callback) {
                if (this._onValidatedObserver) {
                    this.onValidatedObservable.remove(this._onValidatedObserver);
                }
                this._onValidatedObserver = this.onValidatedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Disposes the loader, releases resources during load, and cancels any outstanding requests.
         */
        GLTFFileLoader.prototype.dispose = function () {
            if (this._loader) {
                this._loader.dispose();
                this._loader = null;
            }
            this._clear();
            this.onDisposeObservable.notifyObservers(undefined);
            this.onDisposeObservable.clear();
        };
        /** @hidden */
        GLTFFileLoader.prototype._clear = function () {
            this.preprocessUrlAsync = function (url) { return Promise.resolve(url); };
            this.onMeshLoadedObservable.clear();
            this.onTextureLoadedObservable.clear();
            this.onMaterialLoadedObservable.clear();
            this.onCameraLoadedObservable.clear();
            this.onCompleteObservable.clear();
            this.onExtensionLoadedObservable.clear();
        };
        /**
         * Imports one or more meshes from the loaded glTF data and adds them to the scene
         * @param meshesNames a string or array of strings of the mesh names that should be loaded from the file
         * @param scene the scene the meshes should be added to
         * @param data the glTF data to load
         * @param rootUrl root url to load from
         * @param onProgress event that fires when loading progress has occured
         * @param fileName Defines the name of the file to load
         * @returns a promise containg the loaded meshes, particles, skeletons and animations
         */
        GLTFFileLoader.prototype.importMeshAsync = function (meshesNames, scene, data, rootUrl, onProgress, fileName) {
            var _this = this;
            return this._parseAsync(scene, data, rootUrl, fileName).then(function (loaderData) {
                _this._log("Loading " + (fileName || ""));
                _this._loader = _this._getLoader(loaderData);
                return _this._loader.importMeshAsync(meshesNames, scene, loaderData, rootUrl, onProgress, fileName);
            });
        };
        /**
         * Imports all objects from the loaded glTF data and adds them to the scene
         * @param scene the scene the objects should be added to
         * @param data the glTF data to load
         * @param rootUrl root url to load from
         * @param onProgress event that fires when loading progress has occured
         * @param fileName Defines the name of the file to load
         * @returns a promise which completes when objects have been loaded to the scene
         */
        GLTFFileLoader.prototype.loadAsync = function (scene, data, rootUrl, onProgress, fileName) {
            var _this = this;
            return this._parseAsync(scene, data, rootUrl, fileName).then(function (loaderData) {
                _this._log("Loading " + (fileName || ""));
                _this._loader = _this._getLoader(loaderData);
                return _this._loader.loadAsync(scene, loaderData, rootUrl, onProgress, fileName);
            });
        };
        /**
         * Load into an asset container.
         * @param scene The scene to load into
         * @param data The data to import
         * @param rootUrl The root url for scene and resources
         * @param onProgress The callback when the load progresses
         * @param fileName Defines the name of the file to load
         * @returns The loaded asset container
         */
        GLTFFileLoader.prototype.loadAssetContainerAsync = function (scene, data, rootUrl, onProgress, fileName) {
            var _this = this;
            return this._parseAsync(scene, data, rootUrl, fileName).then(function (loaderData) {
                _this._log("Loading " + (fileName || ""));
                _this._loader = _this._getLoader(loaderData);
                return _this._loader.importMeshAsync(null, scene, loaderData, rootUrl, onProgress, fileName).then(function (result) {
                    var container = new BABYLON.AssetContainer(scene);
                    Array.prototype.push.apply(container.meshes, result.meshes);
                    Array.prototype.push.apply(container.particleSystems, result.particleSystems);
                    Array.prototype.push.apply(container.skeletons, result.skeletons);
                    Array.prototype.push.apply(container.animationGroups, result.animationGroups);
                    container.removeAllFromScene();
                    return container;
                });
            });
        };
        /**
         * If the data string can be loaded directly.
         * @param data string contianing the file data
         * @returns if the data can be loaded directly
         */
        GLTFFileLoader.prototype.canDirectLoad = function (data) {
            return ((data.indexOf("scene") !== -1) && (data.indexOf("node") !== -1));
        };
        /**
         * Instantiates a glTF file loader plugin.
         * @returns the created plugin
         */
        GLTFFileLoader.prototype.createPlugin = function () {
            return new GLTFFileLoader();
        };
        Object.defineProperty(GLTFFileLoader.prototype, "loaderState", {
            /**
             * The loader state or null if the loader is not active.
             */
            get: function () {
                return this._loader ? this._loader.state : null;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Returns a promise that resolves when the asset is completely loaded.
         * @returns a promise that resolves when the asset is completely loaded.
         */
        GLTFFileLoader.prototype.whenCompleteAsync = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.onCompleteObservable.addOnce(function () {
                    resolve();
                });
                _this.onErrorObservable.addOnce(function (reason) {
                    reject(reason);
                });
            });
        };
        GLTFFileLoader.prototype._parseAsync = function (scene, data, rootUrl, fileName) {
            var _this = this;
            return Promise.resolve().then(function () {
                var unpacked = (data instanceof ArrayBuffer) ? _this._unpackBinary(data) : { json: data, bin: null };
                return _this._validateAsync(scene, unpacked.json, rootUrl, fileName).then(function () {
                    _this._startPerformanceCounter("Parse JSON");
                    _this._log("JSON length: " + unpacked.json.length);
                    var loaderData = {
                        json: JSON.parse(unpacked.json),
                        bin: unpacked.bin
                    };
                    _this._endPerformanceCounter("Parse JSON");
                    _this.onParsedObservable.notifyObservers(loaderData);
                    _this.onParsedObservable.clear();
                    return loaderData;
                });
            });
        };
        GLTFFileLoader.prototype._validateAsync = function (scene, json, rootUrl, fileName) {
            var _this = this;
            if (!this.validate || typeof GLTFValidator === "undefined") {
                return Promise.resolve();
            }
            this._startPerformanceCounter("Validate JSON");
            var options = {
                externalResourceFunction: function (uri) {
                    return _this.preprocessUrlAsync(rootUrl + uri)
                        .then(function (url) { return scene._loadFileAsync(url, true, true); })
                        .then(function (data) { return new Uint8Array(data); });
                }
            };
            if (fileName && fileName.substr(0, 5) !== "data:") {
                options.uri = (rootUrl === "file:" ? fileName : "" + rootUrl + fileName);
            }
            return GLTFValidator.validateString(json, options).then(function (result) {
                _this._endPerformanceCounter("Validate JSON");
                _this.onValidatedObservable.notifyObservers(result);
                _this.onValidatedObservable.clear();
            });
        };
        GLTFFileLoader.prototype._getLoader = function (loaderData) {
            var asset = loaderData.json.asset || {};
            this._log("Asset version: " + asset.version);
            asset.minVersion && this._log("Asset minimum version: " + asset.minVersion);
            asset.generator && this._log("Asset generator: " + asset.generator);
            var version = GLTFFileLoader._parseVersion(asset.version);
            if (!version) {
                throw new Error("Invalid version: " + asset.version);
            }
            if (asset.minVersion !== undefined) {
                var minVersion = GLTFFileLoader._parseVersion(asset.minVersion);
                if (!minVersion) {
                    throw new Error("Invalid minimum version: " + asset.minVersion);
                }
                if (GLTFFileLoader._compareVersion(minVersion, { major: 2, minor: 0 }) > 0) {
                    throw new Error("Incompatible minimum version: " + asset.minVersion);
                }
            }
            var createLoaders = {
                1: GLTFFileLoader._CreateGLTFLoaderV1,
                2: GLTFFileLoader._CreateGLTFLoaderV2
            };
            var createLoader = createLoaders[version.major];
            if (!createLoader) {
                throw new Error("Unsupported version: " + asset.version);
            }
            return createLoader(this);
        };
        GLTFFileLoader.prototype._unpackBinary = function (data) {
            this._startPerformanceCounter("Unpack binary");
            this._log("Binary length: " + data.byteLength);
            var Binary = {
                Magic: 0x46546C67
            };
            var binaryReader = new BinaryReader(data);
            var magic = binaryReader.readUint32();
            if (magic !== Binary.Magic) {
                throw new Error("Unexpected magic: " + magic);
            }
            var version = binaryReader.readUint32();
            if (this.loggingEnabled) {
                this._log("Binary version: " + version);
            }
            var unpacked;
            switch (version) {
                case 1: {
                    unpacked = this._unpackBinaryV1(binaryReader);
                    break;
                }
                case 2: {
                    unpacked = this._unpackBinaryV2(binaryReader);
                    break;
                }
                default: {
                    throw new Error("Unsupported version: " + version);
                }
            }
            this._endPerformanceCounter("Unpack binary");
            return unpacked;
        };
        GLTFFileLoader.prototype._unpackBinaryV1 = function (binaryReader) {
            var ContentFormat = {
                JSON: 0
            };
            var length = binaryReader.readUint32();
            if (length != binaryReader.getLength()) {
                throw new Error("Length in header does not match actual data length: " + length + " != " + binaryReader.getLength());
            }
            var contentLength = binaryReader.readUint32();
            var contentFormat = binaryReader.readUint32();
            var content;
            switch (contentFormat) {
                case ContentFormat.JSON: {
                    content = GLTFFileLoader._decodeBufferToText(binaryReader.readUint8Array(contentLength));
                    break;
                }
                default: {
                    throw new Error("Unexpected content format: " + contentFormat);
                }
            }
            var bytesRemaining = binaryReader.getLength() - binaryReader.getPosition();
            var body = binaryReader.readUint8Array(bytesRemaining);
            return {
                json: content,
                bin: body
            };
        };
        GLTFFileLoader.prototype._unpackBinaryV2 = function (binaryReader) {
            var ChunkFormat = {
                JSON: 0x4E4F534A,
                BIN: 0x004E4942
            };
            var length = binaryReader.readUint32();
            if (length !== binaryReader.getLength()) {
                throw new Error("Length in header does not match actual data length: " + length + " != " + binaryReader.getLength());
            }
            // JSON chunk
            var chunkLength = binaryReader.readUint32();
            var chunkFormat = binaryReader.readUint32();
            if (chunkFormat !== ChunkFormat.JSON) {
                throw new Error("First chunk format is not JSON");
            }
            var json = GLTFFileLoader._decodeBufferToText(binaryReader.readUint8Array(chunkLength));
            // Look for BIN chunk
            var bin = null;
            while (binaryReader.getPosition() < binaryReader.getLength()) {
                var chunkLength_1 = binaryReader.readUint32();
                var chunkFormat_1 = binaryReader.readUint32();
                switch (chunkFormat_1) {
                    case ChunkFormat.JSON: {
                        throw new Error("Unexpected JSON chunk");
                    }
                    case ChunkFormat.BIN: {
                        bin = binaryReader.readUint8Array(chunkLength_1);
                        break;
                    }
                    default: {
                        // ignore unrecognized chunkFormat
                        binaryReader.skipBytes(chunkLength_1);
                        break;
                    }
                }
            }
            return {
                json: json,
                bin: bin
            };
        };
        GLTFFileLoader._parseVersion = function (version) {
            if (version === "1.0" || version === "1.0.1") {
                return {
                    major: 1,
                    minor: 0
                };
            }
            var match = (version + "").match(/^(\d+)\.(\d+)/);
            if (!match) {
                return null;
            }
            return {
                major: parseInt(match[1]),
                minor: parseInt(match[2])
            };
        };
        GLTFFileLoader._compareVersion = function (a, b) {
            if (a.major > b.major) {
                return 1;
            }
            if (a.major < b.major) {
                return -1;
            }
            if (a.minor > b.minor) {
                return 1;
            }
            if (a.minor < b.minor) {
                return -1;
            }
            return 0;
        };
        GLTFFileLoader._decodeBufferToText = function (buffer) {
            var result = "";
            var length = buffer.byteLength;
            for (var i = 0; i < length; i++) {
                result += String.fromCharCode(buffer[i]);
            }
            return result;
        };
        /** @hidden */
        GLTFFileLoader.prototype._logOpen = function (message) {
            this._log(message);
            this._logIndentLevel++;
        };
        /** @hidden */
        GLTFFileLoader.prototype._logClose = function () {
            --this._logIndentLevel;
        };
        GLTFFileLoader.prototype._logEnabled = function (message) {
            var spaces = GLTFFileLoader._logSpaces.substr(0, this._logIndentLevel * 2);
            BABYLON.Tools.Log("" + spaces + message);
        };
        GLTFFileLoader.prototype._logDisabled = function (message) {
        };
        GLTFFileLoader.prototype._startPerformanceCounterEnabled = function (counterName) {
            BABYLON.Tools.StartPerformanceCounter(counterName);
        };
        GLTFFileLoader.prototype._startPerformanceCounterDisabled = function (counterName) {
        };
        GLTFFileLoader.prototype._endPerformanceCounterEnabled = function (counterName) {
            BABYLON.Tools.EndPerformanceCounter(counterName);
        };
        GLTFFileLoader.prototype._endPerformanceCounterDisabled = function (counterName) {
        };
        // ----------
        // V1 options
        // ----------
        /**
         * Set this property to false to disable incremental loading which delays the loader from calling the success callback until after loading the meshes and shaders.
         * Textures always loads asynchronously. For example, the success callback can compute the bounding information of the loaded meshes when incremental loading is disabled.
         * Defaults to true.
         * @hidden
         */
        GLTFFileLoader.IncrementalLoading = true;
        /**
         * Set this property to true in order to work with homogeneous coordinates, available with some converters and exporters.
         * Defaults to false. See https://en.wikipedia.org/wiki/Homogeneous_coordinates.
         * @hidden
         */
        GLTFFileLoader.HomogeneousCoordinates = false;
        GLTFFileLoader._logSpaces = "                                ";
        return GLTFFileLoader;
    }());
    BABYLON.GLTFFileLoader = GLTFFileLoader;
    var BinaryReader = /** @class */ (function () {
        function BinaryReader(arrayBuffer) {
            this._arrayBuffer = arrayBuffer;
            this._dataView = new DataView(arrayBuffer);
            this._byteOffset = 0;
        }
        BinaryReader.prototype.getPosition = function () {
            return this._byteOffset;
        };
        BinaryReader.prototype.getLength = function () {
            return this._arrayBuffer.byteLength;
        };
        BinaryReader.prototype.readUint32 = function () {
            var value = this._dataView.getUint32(this._byteOffset, true);
            this._byteOffset += 4;
            return value;
        };
        BinaryReader.prototype.readUint8Array = function (length) {
            var value = new Uint8Array(this._arrayBuffer, this._byteOffset, length);
            this._byteOffset += length;
            return value;
        };
        BinaryReader.prototype.skipBytes = function (length) {
            this._byteOffset += length;
        };
        return BinaryReader;
    }());
    if (BABYLON.SceneLoader) {
        BABYLON.SceneLoader.RegisterPlugin(new GLTFFileLoader());
    }
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.glTFFileLoader.js.map

/// <reference path="../../../../dist/preview release/babylon.d.ts"/>

//# sourceMappingURL=babylon.glTFLoaderInterfaces.js.map

/// <reference path="../../../../dist/preview release/babylon.d.ts"/>
/**
 * Defines the module for importing and exporting glTF 2.0 assets
 */
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        /**
         * Helper class for working with arrays when loading the glTF asset
         */
        var ArrayItem = /** @class */ (function () {
            function ArrayItem() {
            }
            /**
             * Gets an item from the given array.
             * @param context The context when loading the asset
             * @param array The array to get the item from
             * @param index The index to the array
             * @returns The array item
             */
            ArrayItem.Get = function (context, array, index) {
                if (!array || index == undefined || !array[index]) {
                    throw new Error(context + ": Failed to find index (" + index + ")");
                }
                return array[index];
            };
            /**
             * Assign an `index` field to each item of the given array.
             * @param array The array of items
             */
            ArrayItem.Assign = function (array) {
                if (array) {
                    for (var index = 0; index < array.length; index++) {
                        array[index].index = index;
                    }
                }
            };
            return ArrayItem;
        }());
        GLTF2.ArrayItem = ArrayItem;
        /**
         * The glTF 2.0 loader
         */
        var GLTFLoader = /** @class */ (function () {
            /** @hidden */
            function GLTFLoader(parent) {
                /** @hidden */
                this._completePromises = new Array();
                this._disposed = false;
                this._state = null;
                this._extensions = {};
                this._defaultBabylonMaterialData = {};
                this._requests = new Array();
                this._parent = parent;
            }
            /**
             * Registers a loader extension.
             * @param name The name of the loader extension.
             * @param factory The factory function that creates the loader extension.
             */
            GLTFLoader.RegisterExtension = function (name, factory) {
                if (GLTFLoader.UnregisterExtension(name)) {
                    BABYLON.Tools.Warn("Extension with the name '" + name + "' already exists");
                }
                GLTFLoader._ExtensionFactories[name] = factory;
                // Keep the order of registration so that extensions registered first are called first.
                GLTFLoader._ExtensionNames.push(name);
            };
            /**
             * Unregisters a loader extension.
             * @param name The name of the loader extenion.
             * @returns A boolean indicating whether the extension has been unregistered
             */
            GLTFLoader.UnregisterExtension = function (name) {
                if (!GLTFLoader._ExtensionFactories[name]) {
                    return false;
                }
                delete GLTFLoader._ExtensionFactories[name];
                var index = GLTFLoader._ExtensionNames.indexOf(name);
                if (index !== -1) {
                    GLTFLoader._ExtensionNames.splice(index, 1);
                }
                return true;
            };
            Object.defineProperty(GLTFLoader.prototype, "state", {
                /**
                 * Gets the loader state.
                 */
                get: function () {
                    return this._state;
                },
                enumerable: true,
                configurable: true
            });
            /** @hidden */
            GLTFLoader.prototype.dispose = function () {
                if (this._disposed) {
                    return;
                }
                this._disposed = true;
                for (var _i = 0, _a = this._requests; _i < _a.length; _i++) {
                    var request = _a[_i];
                    request.abort();
                }
                this._requests.length = 0;
                delete this.gltf;
                delete this.babylonScene;
                this._completePromises.length = 0;
                for (var name_1 in this._extensions) {
                    var extension = this._extensions[name_1];
                    if (extension.dispose) {
                        this._extensions[name_1].dispose();
                    }
                }
                this._extensions = {};
                delete this._rootBabylonMesh;
                delete this._progressCallback;
                this._parent._clear();
            };
            /** @hidden */
            GLTFLoader.prototype.importMeshAsync = function (meshesNames, scene, data, rootUrl, onProgress, fileName) {
                var _this = this;
                return Promise.resolve().then(function () {
                    _this.babylonScene = scene;
                    _this._rootUrl = rootUrl;
                    _this._fileName = fileName || "scene";
                    _this._progressCallback = onProgress;
                    _this._loadData(data);
                    var nodes = null;
                    if (meshesNames) {
                        var nodeMap_1 = {};
                        if (_this.gltf.nodes) {
                            for (var _i = 0, _a = _this.gltf.nodes; _i < _a.length; _i++) {
                                var node = _a[_i];
                                if (node.name) {
                                    nodeMap_1[node.name] = node.index;
                                }
                            }
                        }
                        var names = (meshesNames instanceof Array) ? meshesNames : [meshesNames];
                        nodes = names.map(function (name) {
                            var node = nodeMap_1[name];
                            if (node === undefined) {
                                throw new Error("Failed to find node '" + name + "'");
                            }
                            return node;
                        });
                    }
                    return _this._loadAsync(nodes, function () {
                        return {
                            meshes: _this._getMeshes(),
                            particleSystems: [],
                            skeletons: _this._getSkeletons(),
                            animationGroups: _this._getAnimationGroups()
                        };
                    });
                });
            };
            /** @hidden */
            GLTFLoader.prototype.loadAsync = function (scene, data, rootUrl, onProgress, fileName) {
                var _this = this;
                return Promise.resolve().then(function () {
                    _this.babylonScene = scene;
                    _this._rootUrl = rootUrl;
                    _this._fileName = fileName || "scene";
                    _this._progressCallback = onProgress;
                    _this._loadData(data);
                    return _this._loadAsync(null, function () { return undefined; });
                });
            };
            GLTFLoader.prototype._loadAsync = function (nodes, resultFunc) {
                var _this = this;
                return Promise.resolve().then(function () {
                    _this._uniqueRootUrl = (_this._rootUrl.indexOf("file:") === -1 && _this._fileName) ? _this._rootUrl : "" + _this._rootUrl + Date.now() + "/";
                    _this._loadExtensions();
                    _this._checkExtensions();
                    var loadingToReadyCounterName = BABYLON.GLTFLoaderState[BABYLON.GLTFLoaderState.LOADING] + " => " + BABYLON.GLTFLoaderState[BABYLON.GLTFLoaderState.READY];
                    var loadingToCompleteCounterName = BABYLON.GLTFLoaderState[BABYLON.GLTFLoaderState.LOADING] + " => " + BABYLON.GLTFLoaderState[BABYLON.GLTFLoaderState.COMPLETE];
                    _this._parent._startPerformanceCounter(loadingToReadyCounterName);
                    _this._parent._startPerformanceCounter(loadingToCompleteCounterName);
                    _this._setState(BABYLON.GLTFLoaderState.LOADING);
                    _this._extensionsOnLoading();
                    var promises = new Array();
                    if (nodes) {
                        promises.push(_this.loadSceneAsync("#/nodes", { nodes: nodes, index: -1 }));
                    }
                    else {
                        var scene = ArrayItem.Get("#/scene", _this.gltf.scenes, _this.gltf.scene || 0);
                        promises.push(_this.loadSceneAsync("#/scenes/" + scene.index, scene));
                    }
                    if (_this._parent.compileMaterials) {
                        promises.push(_this._compileMaterialsAsync());
                    }
                    if (_this._parent.compileShadowGenerators) {
                        promises.push(_this._compileShadowGeneratorsAsync());
                    }
                    var resultPromise = Promise.all(promises).then(function () {
                        _this._setState(BABYLON.GLTFLoaderState.READY);
                        _this._extensionsOnReady();
                        _this._startAnimations();
                        return resultFunc();
                    });
                    resultPromise.then(function () {
                        _this._parent._endPerformanceCounter(loadingToReadyCounterName);
                        BABYLON.Tools.SetImmediate(function () {
                            if (!_this._disposed) {
                                Promise.all(_this._completePromises).then(function () {
                                    _this._parent._endPerformanceCounter(loadingToCompleteCounterName);
                                    _this._setState(BABYLON.GLTFLoaderState.COMPLETE);
                                    _this._parent.onCompleteObservable.notifyObservers(undefined);
                                    _this._parent.onCompleteObservable.clear();
                                    _this.dispose();
                                }, function (error) {
                                    _this._parent.onErrorObservable.notifyObservers(error);
                                    _this._parent.onErrorObservable.clear();
                                    _this.dispose();
                                });
                            }
                        });
                    });
                    return resultPromise;
                }, function (error) {
                    if (!_this._disposed) {
                        _this._parent.onErrorObservable.notifyObservers(error);
                        _this._parent.onErrorObservable.clear();
                        _this.dispose();
                    }
                    throw error;
                });
            };
            GLTFLoader.prototype._loadData = function (data) {
                this.gltf = data.json;
                this._setupData();
                if (data.bin) {
                    var buffers = this.gltf.buffers;
                    if (buffers && buffers[0] && !buffers[0].uri) {
                        var binaryBuffer = buffers[0];
                        if (binaryBuffer.byteLength < data.bin.byteLength - 3 || binaryBuffer.byteLength > data.bin.byteLength) {
                            BABYLON.Tools.Warn("Binary buffer length (" + binaryBuffer.byteLength + ") from JSON does not match chunk length (" + data.bin.byteLength + ")");
                        }
                        binaryBuffer._data = Promise.resolve(data.bin);
                    }
                    else {
                        BABYLON.Tools.Warn("Unexpected BIN chunk");
                    }
                }
            };
            GLTFLoader.prototype._setupData = function () {
                ArrayItem.Assign(this.gltf.accessors);
                ArrayItem.Assign(this.gltf.animations);
                ArrayItem.Assign(this.gltf.buffers);
                ArrayItem.Assign(this.gltf.bufferViews);
                ArrayItem.Assign(this.gltf.cameras);
                ArrayItem.Assign(this.gltf.images);
                ArrayItem.Assign(this.gltf.materials);
                ArrayItem.Assign(this.gltf.meshes);
                ArrayItem.Assign(this.gltf.nodes);
                ArrayItem.Assign(this.gltf.samplers);
                ArrayItem.Assign(this.gltf.scenes);
                ArrayItem.Assign(this.gltf.skins);
                ArrayItem.Assign(this.gltf.textures);
                if (this.gltf.nodes) {
                    var nodeParents = {};
                    for (var _i = 0, _a = this.gltf.nodes; _i < _a.length; _i++) {
                        var node = _a[_i];
                        if (node.children) {
                            for (var _b = 0, _c = node.children; _b < _c.length; _b++) {
                                var index = _c[_b];
                                nodeParents[index] = node.index;
                            }
                        }
                    }
                    var rootNode = this._createRootNode();
                    for (var _d = 0, _e = this.gltf.nodes; _d < _e.length; _d++) {
                        var node = _e[_d];
                        var parentIndex = nodeParents[node.index];
                        node.parent = parentIndex === undefined ? rootNode : this.gltf.nodes[parentIndex];
                    }
                }
            };
            GLTFLoader.prototype._loadExtensions = function () {
                for (var _i = 0, _a = GLTFLoader._ExtensionNames; _i < _a.length; _i++) {
                    var name_2 = _a[_i];
                    var extension = GLTFLoader._ExtensionFactories[name_2](this);
                    this._extensions[name_2] = extension;
                    this._parent.onExtensionLoadedObservable.notifyObservers(extension);
                }
                this._parent.onExtensionLoadedObservable.clear();
            };
            GLTFLoader.prototype._checkExtensions = function () {
                if (this.gltf.extensionsRequired) {
                    for (var _i = 0, _a = this.gltf.extensionsRequired; _i < _a.length; _i++) {
                        var name_3 = _a[_i];
                        var extension = this._extensions[name_3];
                        if (!extension || !extension.enabled) {
                            throw new Error("Require extension " + name_3 + " is not available");
                        }
                    }
                }
            };
            GLTFLoader.prototype._setState = function (state) {
                this._state = state;
                this.log(BABYLON.GLTFLoaderState[this._state]);
            };
            GLTFLoader.prototype._createRootNode = function () {
                this._rootBabylonMesh = new BABYLON.Mesh("__root__", this.babylonScene);
                var rootNode = {
                    _babylonMesh: this._rootBabylonMesh,
                    index: -1
                };
                switch (this._parent.coordinateSystemMode) {
                    case BABYLON.GLTFLoaderCoordinateSystemMode.AUTO: {
                        if (!this.babylonScene.useRightHandedSystem) {
                            rootNode.rotation = [0, 1, 0, 0];
                            rootNode.scale = [1, 1, -1];
                            GLTFLoader._LoadTransform(rootNode, this._rootBabylonMesh);
                        }
                        break;
                    }
                    case BABYLON.GLTFLoaderCoordinateSystemMode.FORCE_RIGHT_HANDED: {
                        this.babylonScene.useRightHandedSystem = true;
                        break;
                    }
                    default: {
                        throw new Error("Invalid coordinate system mode (" + this._parent.coordinateSystemMode + ")");
                    }
                }
                this._parent.onMeshLoadedObservable.notifyObservers(this._rootBabylonMesh);
                return rootNode;
            };
            /**
             * Loads a glTF scene.
             * @param context The context when loading the asset
             * @param scene The glTF scene property
             * @returns A promise that resolves when the load is complete
             */
            GLTFLoader.prototype.loadSceneAsync = function (context, scene) {
                var _this = this;
                var extensionPromise = this._extensionsLoadSceneAsync(context, scene);
                if (extensionPromise) {
                    return extensionPromise;
                }
                var promises = new Array();
                this.logOpen(context + " " + (scene.name || ""));
                if (scene.nodes) {
                    for (var _i = 0, _a = scene.nodes; _i < _a.length; _i++) {
                        var index = _a[_i];
                        var node = ArrayItem.Get(context + "/nodes/" + index, this.gltf.nodes, index);
                        promises.push(this.loadNodeAsync("#/nodes/" + node.index, node, function (babylonMesh) {
                            babylonMesh.parent = _this._rootBabylonMesh;
                        }));
                    }
                }
                promises.push(this._loadAnimationsAsync());
                this.logClose();
                return Promise.all(promises).then(function () { });
            };
            GLTFLoader.prototype._forEachPrimitive = function (node, callback) {
                if (node._primitiveBabylonMeshes) {
                    for (var _i = 0, _a = node._primitiveBabylonMeshes; _i < _a.length; _i++) {
                        var babylonMesh = _a[_i];
                        callback(babylonMesh);
                    }
                }
                else {
                    callback(node._babylonMesh);
                }
            };
            GLTFLoader.prototype._getMeshes = function () {
                var meshes = new Array();
                // Root mesh is always first.
                meshes.push(this._rootBabylonMesh);
                var nodes = this.gltf.nodes;
                if (nodes) {
                    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                        var node = nodes_1[_i];
                        if (node._babylonMesh) {
                            meshes.push(node._babylonMesh);
                        }
                        if (node._primitiveBabylonMeshes) {
                            for (var _a = 0, _b = node._primitiveBabylonMeshes; _a < _b.length; _a++) {
                                var babylonMesh = _b[_a];
                                meshes.push(babylonMesh);
                            }
                        }
                    }
                }
                return meshes;
            };
            GLTFLoader.prototype._getSkeletons = function () {
                var skeletons = new Array();
                var skins = this.gltf.skins;
                if (skins) {
                    for (var _i = 0, skins_1 = skins; _i < skins_1.length; _i++) {
                        var skin = skins_1[_i];
                        if (skin._babylonSkeleton) {
                            skeletons.push(skin._babylonSkeleton);
                        }
                    }
                }
                return skeletons;
            };
            GLTFLoader.prototype._getAnimationGroups = function () {
                var animationGroups = new Array();
                var animations = this.gltf.animations;
                if (animations) {
                    for (var _i = 0, animations_1 = animations; _i < animations_1.length; _i++) {
                        var animation = animations_1[_i];
                        if (animation._babylonAnimationGroup) {
                            animationGroups.push(animation._babylonAnimationGroup);
                        }
                    }
                }
                return animationGroups;
            };
            GLTFLoader.prototype._startAnimations = function () {
                switch (this._parent.animationStartMode) {
                    case BABYLON.GLTFLoaderAnimationStartMode.NONE: {
                        // do nothing
                        break;
                    }
                    case BABYLON.GLTFLoaderAnimationStartMode.FIRST: {
                        var babylonAnimationGroups = this._getAnimationGroups();
                        if (babylonAnimationGroups.length !== 0) {
                            babylonAnimationGroups[0].start(true);
                        }
                        break;
                    }
                    case BABYLON.GLTFLoaderAnimationStartMode.ALL: {
                        var babylonAnimationGroups = this._getAnimationGroups();
                        for (var _i = 0, babylonAnimationGroups_1 = babylonAnimationGroups; _i < babylonAnimationGroups_1.length; _i++) {
                            var babylonAnimationGroup = babylonAnimationGroups_1[_i];
                            babylonAnimationGroup.start(true);
                        }
                        break;
                    }
                    default: {
                        BABYLON.Tools.Error("Invalid animation start mode (" + this._parent.animationStartMode + ")");
                        return;
                    }
                }
            };
            /**
             * Loads a glTF node.
             * @param context The context when loading the asset
             * @param node The glTF node property
             * @param assign A function called synchronously after parsing the glTF properties
             * @returns A promise that resolves with the loaded Babylon mesh when the load is complete
             */
            GLTFLoader.prototype.loadNodeAsync = function (context, node, assign) {
                var _this = this;
                if (assign === void 0) { assign = function () { }; }
                var extensionPromise = this._extensionsLoadNodeAsync(context, node, assign);
                if (extensionPromise) {
                    return extensionPromise;
                }
                if (node._babylonMesh) {
                    throw new Error(context + ": Invalid recursive node hierarchy");
                }
                var promises = new Array();
                this.logOpen(context + " " + (node.name || ""));
                var babylonMesh = new BABYLON.Mesh(node.name || "node" + node.index, this.babylonScene);
                node._babylonMesh = babylonMesh;
                babylonMesh.setEnabled(false);
                GLTFLoader._LoadTransform(node, babylonMesh);
                if (node.mesh != undefined) {
                    var mesh = ArrayItem.Get(context + "/mesh", this.gltf.meshes, node.mesh);
                    promises.push(this._loadMeshAsync("#/meshes/" + mesh.index, node, mesh, babylonMesh));
                }
                if (node.camera != undefined) {
                    var camera = ArrayItem.Get(context + "/camera", this.gltf.cameras, node.camera);
                    promises.push(this.loadCameraAsync("#/cameras/" + camera.index, camera, function (babylonCamera) {
                        babylonCamera.parent = babylonMesh;
                    }));
                }
                if (node.children) {
                    var _loop_1 = function (index) {
                        var childNode = ArrayItem.Get(context + "/children/" + index, this_1.gltf.nodes, index);
                        promises.push(this_1.loadNodeAsync("#/nodes/" + node.index, childNode, function (childBabylonMesh) {
                            // See https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins (second implementation note)
                            if (childNode.skin != undefined) {
                                childBabylonMesh.parent = _this._rootBabylonMesh;
                                return;
                            }
                            childBabylonMesh.parent = babylonMesh;
                        }));
                    };
                    var this_1 = this;
                    for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
                        var index = _a[_i];
                        _loop_1(index);
                    }
                }
                assign(babylonMesh);
                this._parent.onMeshLoadedObservable.notifyObservers(babylonMesh);
                this.logClose();
                return Promise.all(promises).then(function () {
                    babylonMesh.setEnabled(true);
                    return babylonMesh;
                });
            };
            GLTFLoader.prototype._loadMeshAsync = function (context, node, mesh, babylonMesh) {
                var _this = this;
                var promises = new Array();
                this.logOpen(context + " " + (mesh.name || ""));
                var primitives = mesh.primitives;
                if (!primitives || primitives.length === 0) {
                    throw new Error(context + ": Primitives are missing");
                }
                ArrayItem.Assign(primitives);
                if (primitives.length === 1) {
                    var primitive = primitives[0];
                    promises.push(this._loadMeshPrimitiveAsync(context + "/primitives/" + primitive.index, node, mesh, primitive, babylonMesh));
                }
                else {
                    node._primitiveBabylonMeshes = [];
                    for (var _i = 0, primitives_1 = primitives; _i < primitives_1.length; _i++) {
                        var primitive = primitives_1[_i];
                        var primitiveBabylonMesh = new BABYLON.Mesh((mesh.name || babylonMesh.name) + "_" + primitive.index, this.babylonScene, babylonMesh);
                        node._primitiveBabylonMeshes.push(primitiveBabylonMesh);
                        promises.push(this._loadMeshPrimitiveAsync(context + "/primitives/" + primitive.index, node, mesh, primitive, primitiveBabylonMesh));
                        this._parent.onMeshLoadedObservable.notifyObservers(babylonMesh);
                    }
                }
                if (node.skin != undefined) {
                    var skin = ArrayItem.Get(context + "/skin", this.gltf.skins, node.skin);
                    promises.push(this._loadSkinAsync("#/skins/" + skin.index, node, skin));
                }
                this.logClose();
                return Promise.all(promises).then(function () {
                    _this._forEachPrimitive(node, function (babylonMesh) {
                        babylonMesh._refreshBoundingInfo(true);
                    });
                });
            };
            GLTFLoader.prototype._loadMeshPrimitiveAsync = function (context, node, mesh, primitive, babylonMesh) {
                var _this = this;
                var promises = new Array();
                this.logOpen("" + context);
                this._createMorphTargets(context, node, mesh, primitive, babylonMesh);
                promises.push(this._loadVertexDataAsync(context, primitive, babylonMesh).then(function (babylonGeometry) {
                    return _this._loadMorphTargetsAsync(context, primitive, babylonMesh, babylonGeometry).then(function () {
                        babylonGeometry.applyToMesh(babylonMesh);
                    });
                }));
                var babylonDrawMode = GLTFLoader._GetDrawMode(context, primitive.mode);
                if (primitive.material == undefined) {
                    var babylonMaterial = this._defaultBabylonMaterialData[babylonDrawMode];
                    if (!babylonMaterial) {
                        babylonMaterial = this._createDefaultMaterial("__gltf_default", babylonDrawMode);
                        this._parent.onMaterialLoadedObservable.notifyObservers(babylonMaterial);
                        this._defaultBabylonMaterialData[babylonDrawMode] = babylonMaterial;
                    }
                    babylonMesh.material = babylonMaterial;
                }
                else {
                    var material = ArrayItem.Get(context + "/material", this.gltf.materials, primitive.material);
                    promises.push(this._loadMaterialAsync("#/materials/" + material.index, material, babylonMesh, babylonDrawMode, function (babylonMaterial) {
                        babylonMesh.material = babylonMaterial;
                    }));
                }
                this.logClose();
                return Promise.all(promises).then(function () { });
            };
            GLTFLoader.prototype._loadVertexDataAsync = function (context, primitive, babylonMesh) {
                var _this = this;
                var extensionPromise = this._extensionsLoadVertexDataAsync(context, primitive, babylonMesh);
                if (extensionPromise) {
                    return extensionPromise;
                }
                var attributes = primitive.attributes;
                if (!attributes) {
                    throw new Error(context + ": Attributes are missing");
                }
                var promises = new Array();
                var babylonGeometry = new BABYLON.Geometry(babylonMesh.name, this.babylonScene);
                if (primitive.indices == undefined) {
                    babylonMesh.isUnIndexed = true;
                }
                else {
                    var accessor = ArrayItem.Get(context + "/indices", this.gltf.accessors, primitive.indices);
                    promises.push(this._loadIndicesAccessorAsync("#/accessors/" + accessor.index, accessor).then(function (data) {
                        babylonGeometry.setIndices(data);
                    }));
                }
                var loadAttribute = function (attribute, kind, callback) {
                    if (attributes[attribute] == undefined) {
                        return;
                    }
                    babylonMesh._delayInfo = babylonMesh._delayInfo || [];
                    if (babylonMesh._delayInfo.indexOf(kind) === -1) {
                        babylonMesh._delayInfo.push(kind);
                    }
                    var accessor = ArrayItem.Get(context + "/attributes/" + attribute, _this.gltf.accessors, attributes[attribute]);
                    promises.push(_this._loadVertexAccessorAsync("#/accessors/" + accessor.index, accessor, kind).then(function (babylonVertexBuffer) {
                        babylonGeometry.setVerticesBuffer(babylonVertexBuffer, accessor.count);
                    }));
                    if (callback) {
                        callback(accessor);
                    }
                };
                loadAttribute("POSITION", BABYLON.VertexBuffer.PositionKind);
                loadAttribute("NORMAL", BABYLON.VertexBuffer.NormalKind);
                loadAttribute("TANGENT", BABYLON.VertexBuffer.TangentKind);
                loadAttribute("TEXCOORD_0", BABYLON.VertexBuffer.UVKind);
                loadAttribute("TEXCOORD_1", BABYLON.VertexBuffer.UV2Kind);
                loadAttribute("JOINTS_0", BABYLON.VertexBuffer.MatricesIndicesKind);
                loadAttribute("WEIGHTS_0", BABYLON.VertexBuffer.MatricesWeightsKind);
                loadAttribute("COLOR_0", BABYLON.VertexBuffer.ColorKind, function (accessor) {
                    if (accessor.type === "VEC4" /* VEC4 */) {
                        babylonMesh.hasVertexAlpha = true;
                    }
                });
                return Promise.all(promises).then(function () {
                    return babylonGeometry;
                });
            };
            GLTFLoader.prototype._createMorphTargets = function (context, node, mesh, primitive, babylonMesh) {
                if (!primitive.targets) {
                    return;
                }
                if (node._numMorphTargets == undefined) {
                    node._numMorphTargets = primitive.targets.length;
                }
                else if (primitive.targets.length !== node._numMorphTargets) {
                    throw new Error(context + ": Primitives do not have the same number of targets");
                }
                babylonMesh.morphTargetManager = new BABYLON.MorphTargetManager();
                for (var index = 0; index < primitive.targets.length; index++) {
                    var weight = node.weights ? node.weights[index] : mesh.weights ? mesh.weights[index] : 0;
                    babylonMesh.morphTargetManager.addTarget(new BABYLON.MorphTarget("morphTarget" + index, weight));
                    // TODO: tell the target whether it has positions, normals, tangents
                }
            };
            GLTFLoader.prototype._loadMorphTargetsAsync = function (context, primitive, babylonMesh, babylonGeometry) {
                if (!primitive.targets) {
                    return Promise.resolve();
                }
                var promises = new Array();
                var morphTargetManager = babylonMesh.morphTargetManager;
                for (var index = 0; index < morphTargetManager.numTargets; index++) {
                    var babylonMorphTarget = morphTargetManager.getTarget(index);
                    promises.push(this._loadMorphTargetVertexDataAsync(context + "/targets/" + index, babylonGeometry, primitive.targets[index], babylonMorphTarget));
                }
                return Promise.all(promises).then(function () { });
            };
            GLTFLoader.prototype._loadMorphTargetVertexDataAsync = function (context, babylonGeometry, attributes, babylonMorphTarget) {
                var _this = this;
                var promises = new Array();
                var loadAttribute = function (attribute, kind, setData) {
                    if (attributes[attribute] == undefined) {
                        return;
                    }
                    var babylonVertexBuffer = babylonGeometry.getVertexBuffer(kind);
                    if (!babylonVertexBuffer) {
                        return;
                    }
                    var accessor = ArrayItem.Get(context + "/" + attribute, _this.gltf.accessors, attributes[attribute]);
                    promises.push(_this._loadFloatAccessorAsync("#/accessors/" + accessor.index, accessor).then(function (data) {
                        setData(babylonVertexBuffer, data);
                    }));
                };
                loadAttribute("POSITION", BABYLON.VertexBuffer.PositionKind, function (babylonVertexBuffer, data) {
                    babylonVertexBuffer.forEach(data.length, function (value, index) {
                        data[index] += value;
                    });
                    babylonMorphTarget.setPositions(data);
                });
                loadAttribute("NORMAL", BABYLON.VertexBuffer.NormalKind, function (babylonVertexBuffer, data) {
                    babylonVertexBuffer.forEach(data.length, function (value, index) {
                        data[index] += value;
                    });
                    babylonMorphTarget.setNormals(data);
                });
                loadAttribute("TANGENT", BABYLON.VertexBuffer.TangentKind, function (babylonVertexBuffer, data) {
                    var dataIndex = 0;
                    babylonVertexBuffer.forEach(data.length / 3 * 4, function (value, index) {
                        // Tangent data for morph targets is stored as xyz delta.
                        // The vertexData.tangent is stored as xyzw.
                        // So we need to skip every fourth vertexData.tangent.
                        if (((index + 1) % 4) !== 0) {
                            data[dataIndex++] += value;
                        }
                    });
                    babylonMorphTarget.setTangents(data);
                });
                return Promise.all(promises).then(function () { });
            };
            GLTFLoader._LoadTransform = function (node, babylonNode) {
                var position = BABYLON.Vector3.Zero();
                var rotation = BABYLON.Quaternion.Identity();
                var scaling = BABYLON.Vector3.One();
                if (node.matrix) {
                    var matrix = BABYLON.Matrix.FromArray(node.matrix);
                    matrix.decompose(scaling, rotation, position);
                }
                else {
                    if (node.translation) {
                        position = BABYLON.Vector3.FromArray(node.translation);
                    }
                    if (node.rotation) {
                        rotation = BABYLON.Quaternion.FromArray(node.rotation);
                    }
                    if (node.scale) {
                        scaling = BABYLON.Vector3.FromArray(node.scale);
                    }
                }
                babylonNode.position = position;
                babylonNode.rotationQuaternion = rotation;
                babylonNode.scaling = scaling;
            };
            GLTFLoader.prototype._loadSkinAsync = function (context, node, skin) {
                var _this = this;
                var assignSkeleton = function (skeleton) {
                    _this._forEachPrimitive(node, function (babylonMesh) {
                        babylonMesh.skeleton = skeleton;
                    });
                    // Ignore the TRS of skinned nodes.
                    // See https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins (second implementation note)
                    node._babylonMesh.position = BABYLON.Vector3.Zero();
                    node._babylonMesh.rotationQuaternion = BABYLON.Quaternion.Identity();
                    node._babylonMesh.scaling = BABYLON.Vector3.One();
                };
                if (skin._promise) {
                    return skin._promise.then(function () {
                        assignSkeleton(skin._babylonSkeleton);
                    });
                }
                var skeletonId = "skeleton" + skin.index;
                var babylonSkeleton = new BABYLON.Skeleton(skin.name || skeletonId, skeletonId, this.babylonScene);
                skin._babylonSkeleton = babylonSkeleton;
                this._loadBones(context, skin);
                assignSkeleton(babylonSkeleton);
                return (skin._promise = this._loadSkinInverseBindMatricesDataAsync(context, skin).then(function (inverseBindMatricesData) {
                    _this._updateBoneMatrices(babylonSkeleton, inverseBindMatricesData);
                }));
            };
            GLTFLoader.prototype._loadBones = function (context, skin) {
                var babylonBones = {};
                for (var _i = 0, _a = skin.joints; _i < _a.length; _i++) {
                    var index = _a[_i];
                    var node = ArrayItem.Get(context + "/joints/" + index, this.gltf.nodes, index);
                    this._loadBone(node, skin, babylonBones);
                }
            };
            GLTFLoader.prototype._loadBone = function (node, skin, babylonBones) {
                var babylonBone = babylonBones[node.index];
                if (babylonBone) {
                    return babylonBone;
                }
                var babylonParentBone = null;
                if (node.parent && node.parent._babylonMesh !== this._rootBabylonMesh) {
                    babylonParentBone = this._loadBone(node.parent, skin, babylonBones);
                }
                var boneIndex = skin.joints.indexOf(node.index);
                babylonBone = new BABYLON.Bone(node.name || "joint" + node.index, skin._babylonSkeleton, babylonParentBone, this._getNodeMatrix(node), null, null, boneIndex);
                babylonBones[node.index] = babylonBone;
                node._babylonBones = node._babylonBones || [];
                node._babylonBones.push(babylonBone);
                return babylonBone;
            };
            GLTFLoader.prototype._loadSkinInverseBindMatricesDataAsync = function (context, skin) {
                if (skin.inverseBindMatrices == undefined) {
                    return Promise.resolve(null);
                }
                var accessor = ArrayItem.Get(context + "/inverseBindMatrices", this.gltf.accessors, skin.inverseBindMatrices);
                return this._loadFloatAccessorAsync("#/accessors/" + accessor.index, accessor);
            };
            GLTFLoader.prototype._updateBoneMatrices = function (babylonSkeleton, inverseBindMatricesData) {
                for (var _i = 0, _a = babylonSkeleton.bones; _i < _a.length; _i++) {
                    var babylonBone = _a[_i];
                    var baseMatrix = BABYLON.Matrix.Identity();
                    var boneIndex = babylonBone._index;
                    if (inverseBindMatricesData && boneIndex !== -1) {
                        BABYLON.Matrix.FromArrayToRef(inverseBindMatricesData, boneIndex * 16, baseMatrix);
                        baseMatrix.invertToRef(baseMatrix);
                    }
                    var babylonParentBone = babylonBone.getParent();
                    if (babylonParentBone) {
                        baseMatrix.multiplyToRef(babylonParentBone.getInvertedAbsoluteTransform(), baseMatrix);
                    }
                    babylonBone.updateMatrix(baseMatrix, false, false);
                    babylonBone._updateDifferenceMatrix(undefined, false);
                }
            };
            GLTFLoader.prototype._getNodeMatrix = function (node) {
                return node.matrix ?
                    BABYLON.Matrix.FromArray(node.matrix) :
                    BABYLON.Matrix.Compose(node.scale ? BABYLON.Vector3.FromArray(node.scale) : BABYLON.Vector3.One(), node.rotation ? BABYLON.Quaternion.FromArray(node.rotation) : BABYLON.Quaternion.Identity(), node.translation ? BABYLON.Vector3.FromArray(node.translation) : BABYLON.Vector3.Zero());
            };
            /**
             * Loads a glTF camera.
             * @param context The context when loading the asset
             * @param camera The glTF camera property
             * @param assign A function called synchronously after parsing the glTF properties
             * @returns A promise that resolves with the loaded Babylon camera when the load is complete
             */
            GLTFLoader.prototype.loadCameraAsync = function (context, camera, assign) {
                if (assign === void 0) { assign = function () { }; }
                var extensionPromise = this._extensionsLoadCameraAsync(context, camera, assign);
                if (extensionPromise) {
                    return extensionPromise;
                }
                var promises = new Array();
                this.logOpen(context + " " + (camera.name || ""));
                var babylonCamera = new BABYLON.FreeCamera(camera.name || "camera" + camera.index, BABYLON.Vector3.Zero(), this.babylonScene, false);
                babylonCamera.rotation = new BABYLON.Vector3(0, Math.PI, 0);
                switch (camera.type) {
                    case "perspective" /* PERSPECTIVE */: {
                        var perspective = camera.perspective;
                        if (!perspective) {
                            throw new Error(context + ": Camera perspective properties are missing");
                        }
                        babylonCamera.fov = perspective.yfov;
                        babylonCamera.minZ = perspective.znear;
                        babylonCamera.maxZ = perspective.zfar || Number.MAX_VALUE;
                        break;
                    }
                    case "orthographic" /* ORTHOGRAPHIC */: {
                        if (!camera.orthographic) {
                            throw new Error(context + ": Camera orthographic properties are missing");
                        }
                        babylonCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
                        babylonCamera.orthoLeft = -camera.orthographic.xmag;
                        babylonCamera.orthoRight = camera.orthographic.xmag;
                        babylonCamera.orthoBottom = -camera.orthographic.ymag;
                        babylonCamera.orthoTop = camera.orthographic.ymag;
                        babylonCamera.minZ = camera.orthographic.znear;
                        babylonCamera.maxZ = camera.orthographic.zfar;
                        break;
                    }
                    default: {
                        throw new Error(context + ": Invalid camera type (" + camera.type + ")");
                    }
                }
                assign(babylonCamera);
                this._parent.onCameraLoadedObservable.notifyObservers(babylonCamera);
                return Promise.all(promises).then(function () {
                    return babylonCamera;
                });
            };
            GLTFLoader.prototype._loadAnimationsAsync = function () {
                var animations = this.gltf.animations;
                if (!animations) {
                    return Promise.resolve();
                }
                var promises = new Array();
                for (var index = 0; index < animations.length; index++) {
                    var animation = animations[index];
                    promises.push(this.loadAnimationAsync("#/animations/" + animation.index, animation));
                }
                return Promise.all(promises).then(function () { });
            };
            /**
             * Loads a glTF animation.
             * @param context The context when loading the asset
             * @param animation The glTF animation property
             * @returns A promise that resolves with the loaded Babylon animation group when the load is complete
             */
            GLTFLoader.prototype.loadAnimationAsync = function (context, animation) {
                var promise = this._extensionsLoadAnimationAsync(context, animation);
                if (promise) {
                    return promise;
                }
                var babylonAnimationGroup = new BABYLON.AnimationGroup(animation.name || "animation" + animation.index, this.babylonScene);
                animation._babylonAnimationGroup = babylonAnimationGroup;
                var promises = new Array();
                ArrayItem.Assign(animation.channels);
                ArrayItem.Assign(animation.samplers);
                for (var _i = 0, _a = animation.channels; _i < _a.length; _i++) {
                    var channel = _a[_i];
                    promises.push(this._loadAnimationChannelAsync(context + "/channels/" + channel.index, context, animation, channel, babylonAnimationGroup));
                }
                return Promise.all(promises).then(function () {
                    babylonAnimationGroup.normalize(0);
                    return babylonAnimationGroup;
                });
            };
            GLTFLoader.prototype._loadAnimationChannelAsync = function (context, animationContext, animation, channel, babylonAnimationGroup) {
                var _this = this;
                var targetNode = ArrayItem.Get(context + "/target/node", this.gltf.nodes, channel.target.node);
                // Ignore animations that have no animation targets.
                if ((channel.target.path === "weights" /* WEIGHTS */ && !targetNode._numMorphTargets) ||
                    (channel.target.path !== "weights" /* WEIGHTS */ && !targetNode._babylonMesh)) {
                    return Promise.resolve();
                }
                // Ignore animations targeting TRS of skinned nodes.
                // See https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins (second implementation note)
                if (targetNode.skin != undefined && channel.target.path !== "weights" /* WEIGHTS */) {
                    return Promise.resolve();
                }
                var sampler = ArrayItem.Get(context + "/sampler", animation.samplers, channel.sampler);
                return this._loadAnimationSamplerAsync(animationContext + "/samplers/" + channel.sampler, sampler).then(function (data) {
                    var targetPath;
                    var animationType;
                    switch (channel.target.path) {
                        case "translation" /* TRANSLATION */: {
                            targetPath = "position";
                            animationType = BABYLON.Animation.ANIMATIONTYPE_VECTOR3;
                            break;
                        }
                        case "rotation" /* ROTATION */: {
                            targetPath = "rotationQuaternion";
                            animationType = BABYLON.Animation.ANIMATIONTYPE_QUATERNION;
                            break;
                        }
                        case "scale" /* SCALE */: {
                            targetPath = "scaling";
                            animationType = BABYLON.Animation.ANIMATIONTYPE_VECTOR3;
                            break;
                        }
                        case "weights" /* WEIGHTS */: {
                            targetPath = "influence";
                            animationType = BABYLON.Animation.ANIMATIONTYPE_FLOAT;
                            break;
                        }
                        default: {
                            throw new Error(context + "/target/path: Invalid value (" + channel.target.path + ")");
                        }
                    }
                    var outputBufferOffset = 0;
                    var getNextOutputValue;
                    switch (targetPath) {
                        case "position": {
                            getNextOutputValue = function () {
                                var value = BABYLON.Vector3.FromArray(data.output, outputBufferOffset);
                                outputBufferOffset += 3;
                                return value;
                            };
                            break;
                        }
                        case "rotationQuaternion": {
                            getNextOutputValue = function () {
                                var value = BABYLON.Quaternion.FromArray(data.output, outputBufferOffset);
                                outputBufferOffset += 4;
                                return value;
                            };
                            break;
                        }
                        case "scaling": {
                            getNextOutputValue = function () {
                                var value = BABYLON.Vector3.FromArray(data.output, outputBufferOffset);
                                outputBufferOffset += 3;
                                return value;
                            };
                            break;
                        }
                        case "influence": {
                            getNextOutputValue = function () {
                                var value = new Array(targetNode._numMorphTargets);
                                for (var i = 0; i < targetNode._numMorphTargets; i++) {
                                    value[i] = data.output[outputBufferOffset++];
                                }
                                return value;
                            };
                            break;
                        }
                    }
                    var getNextKey;
                    switch (data.interpolation) {
                        case "STEP" /* STEP */: {
                            getNextKey = function (frameIndex) { return ({
                                frame: data.input[frameIndex],
                                value: getNextOutputValue(),
                                interpolation: BABYLON.AnimationKeyInterpolation.STEP
                            }); };
                            break;
                        }
                        case "LINEAR" /* LINEAR */: {
                            getNextKey = function (frameIndex) { return ({
                                frame: data.input[frameIndex],
                                value: getNextOutputValue()
                            }); };
                            break;
                        }
                        case "CUBICSPLINE" /* CUBICSPLINE */: {
                            getNextKey = function (frameIndex) { return ({
                                frame: data.input[frameIndex],
                                inTangent: getNextOutputValue(),
                                value: getNextOutputValue(),
                                outTangent: getNextOutputValue()
                            }); };
                            break;
                        }
                    }
                    var keys = new Array(data.input.length);
                    for (var frameIndex = 0; frameIndex < data.input.length; frameIndex++) {
                        keys[frameIndex] = getNextKey(frameIndex);
                    }
                    if (targetPath === "influence") {
                        var _loop_2 = function (targetIndex) {
                            var animationName = babylonAnimationGroup.name + "_channel" + babylonAnimationGroup.targetedAnimations.length;
                            var babylonAnimation = new BABYLON.Animation(animationName, targetPath, 1, animationType);
                            babylonAnimation.setKeys(keys.map(function (key) { return ({
                                frame: key.frame,
                                inTangent: key.inTangent ? key.inTangent[targetIndex] : undefined,
                                value: key.value[targetIndex],
                                outTangent: key.outTangent ? key.outTangent[targetIndex] : undefined
                            }); }));
                            _this._forEachPrimitive(targetNode, function (babylonMesh) {
                                var morphTarget = babylonMesh.morphTargetManager.getTarget(targetIndex);
                                var babylonAnimationClone = babylonAnimation.clone();
                                morphTarget.animations.push(babylonAnimationClone);
                                babylonAnimationGroup.addTargetedAnimation(babylonAnimationClone, morphTarget);
                            });
                        };
                        for (var targetIndex = 0; targetIndex < targetNode._numMorphTargets; targetIndex++) {
                            _loop_2(targetIndex);
                        }
                    }
                    else {
                        var animationName = babylonAnimationGroup.name + "_channel" + babylonAnimationGroup.targetedAnimations.length;
                        var babylonAnimation = new BABYLON.Animation(animationName, targetPath, 1, animationType);
                        babylonAnimation.setKeys(keys);
                        if (targetNode._babylonBones) {
                            var babylonAnimationTargets = [targetNode._babylonMesh].concat(targetNode._babylonBones);
                            for (var _i = 0, babylonAnimationTargets_1 = babylonAnimationTargets; _i < babylonAnimationTargets_1.length; _i++) {
                                var babylonAnimationTarget = babylonAnimationTargets_1[_i];
                                babylonAnimationTarget.animations.push(babylonAnimation);
                            }
                            babylonAnimationGroup.addTargetedAnimation(babylonAnimation, babylonAnimationTargets);
                        }
                        else {
                            targetNode._babylonMesh.animations.push(babylonAnimation);
                            babylonAnimationGroup.addTargetedAnimation(babylonAnimation, targetNode._babylonMesh);
                        }
                    }
                });
            };
            GLTFLoader.prototype._loadAnimationSamplerAsync = function (context, sampler) {
                if (sampler._data) {
                    return sampler._data;
                }
                var interpolation = sampler.interpolation || "LINEAR" /* LINEAR */;
                switch (interpolation) {
                    case "STEP" /* STEP */:
                    case "LINEAR" /* LINEAR */:
                    case "CUBICSPLINE" /* CUBICSPLINE */: {
                        break;
                    }
                    default: {
                        throw new Error(context + "/interpolation: Invalid value (" + sampler.interpolation + ")");
                    }
                }
                var inputAccessor = ArrayItem.Get(context + "/input", this.gltf.accessors, sampler.input);
                var outputAccessor = ArrayItem.Get(context + "/output", this.gltf.accessors, sampler.output);
                sampler._data = Promise.all([
                    this._loadFloatAccessorAsync("#/accessors/" + inputAccessor.index, inputAccessor),
                    this._loadFloatAccessorAsync("#/accessors/" + outputAccessor.index, outputAccessor)
                ]).then(function (_a) {
                    var inputData = _a[0], outputData = _a[1];
                    return {
                        input: inputData,
                        interpolation: interpolation,
                        output: outputData,
                    };
                });
                return sampler._data;
            };
            GLTFLoader.prototype._loadBufferAsync = function (context, buffer) {
                if (buffer._data) {
                    return buffer._data;
                }
                if (!buffer.uri) {
                    throw new Error(context + "/uri: Value is missing");
                }
                buffer._data = this.loadUriAsync(context + "/uri", buffer.uri);
                return buffer._data;
            };
            /**
             * Loads a glTF buffer view.
             * @param context The context when loading the asset
             * @param bufferView The glTF buffer view property
             * @returns A promise that resolves with the loaded data when the load is complete
             */
            GLTFLoader.prototype.loadBufferViewAsync = function (context, bufferView) {
                if (bufferView._data) {
                    return bufferView._data;
                }
                var buffer = ArrayItem.Get(context + "/buffer", this.gltf.buffers, bufferView.buffer);
                bufferView._data = this._loadBufferAsync("#/buffers/" + buffer.index, buffer).then(function (data) {
                    try {
                        return new Uint8Array(data.buffer, data.byteOffset + (bufferView.byteOffset || 0), bufferView.byteLength);
                    }
                    catch (e) {
                        throw new Error(context + ": " + e.message);
                    }
                });
                return bufferView._data;
            };
            GLTFLoader.prototype._loadIndicesAccessorAsync = function (context, accessor) {
                if (accessor.type !== "SCALAR" /* SCALAR */) {
                    throw new Error(context + "/type: Invalid value " + accessor.type);
                }
                if (accessor.componentType !== 5121 /* UNSIGNED_BYTE */ &&
                    accessor.componentType !== 5123 /* UNSIGNED_SHORT */ &&
                    accessor.componentType !== 5125 /* UNSIGNED_INT */) {
                    throw new Error(context + "/componentType: Invalid value " + accessor.componentType);
                }
                if (accessor._data) {
                    return accessor._data;
                }
                var bufferView = ArrayItem.Get(context + "/bufferView", this.gltf.bufferViews, accessor.bufferView);
                accessor._data = this.loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView).then(function (data) {
                    return GLTFLoader._GetTypedArray(context, accessor.componentType, data, accessor.byteOffset, accessor.count);
                });
                return accessor._data;
            };
            GLTFLoader.prototype._loadFloatAccessorAsync = function (context, accessor) {
                // TODO: support normalized and stride
                var _this = this;
                if (accessor.componentType !== 5126 /* FLOAT */) {
                    throw new Error("Invalid component type " + accessor.componentType);
                }
                if (accessor._data) {
                    return accessor._data;
                }
                var numComponents = GLTFLoader._GetNumComponents(context, accessor.type);
                var length = numComponents * accessor.count;
                if (accessor.bufferView == undefined) {
                    accessor._data = Promise.resolve(new Float32Array(length));
                }
                else {
                    var bufferView = ArrayItem.Get(context + "/bufferView", this.gltf.bufferViews, accessor.bufferView);
                    accessor._data = this.loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView).then(function (data) {
                        return GLTFLoader._GetTypedArray(context, accessor.componentType, data, accessor.byteOffset, length);
                    });
                }
                if (accessor.sparse) {
                    var sparse_1 = accessor.sparse;
                    accessor._data = accessor._data.then(function (data) {
                        var indicesBufferView = ArrayItem.Get(context + "/sparse/indices/bufferView", _this.gltf.bufferViews, sparse_1.indices.bufferView);
                        var valuesBufferView = ArrayItem.Get(context + "/sparse/values/bufferView", _this.gltf.bufferViews, sparse_1.values.bufferView);
                        return Promise.all([
                            _this.loadBufferViewAsync("#/bufferViews/" + indicesBufferView.index, indicesBufferView),
                            _this.loadBufferViewAsync("#/bufferViews/" + valuesBufferView.index, valuesBufferView)
                        ]).then(function (_a) {
                            var indicesData = _a[0], valuesData = _a[1];
                            var indices = GLTFLoader._GetTypedArray(context + "/sparse/indices", sparse_1.indices.componentType, indicesData, sparse_1.indices.byteOffset, sparse_1.count);
                            var values = GLTFLoader._GetTypedArray(context + "/sparse/values", accessor.componentType, valuesData, sparse_1.values.byteOffset, numComponents * sparse_1.count);
                            var valuesIndex = 0;
                            for (var indicesIndex = 0; indicesIndex < indices.length; indicesIndex++) {
                                var dataIndex = indices[indicesIndex] * numComponents;
                                for (var componentIndex = 0; componentIndex < numComponents; componentIndex++) {
                                    data[dataIndex++] = values[valuesIndex++];
                                }
                            }
                            return data;
                        });
                    });
                }
                return accessor._data;
            };
            GLTFLoader.prototype._loadVertexBufferViewAsync = function (bufferView, kind) {
                var _this = this;
                if (bufferView._babylonBuffer) {
                    return bufferView._babylonBuffer;
                }
                bufferView._babylonBuffer = this.loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView).then(function (data) {
                    return new BABYLON.Buffer(_this.babylonScene.getEngine(), data, false);
                });
                return bufferView._babylonBuffer;
            };
            GLTFLoader.prototype._loadVertexAccessorAsync = function (context, accessor, kind) {
                var _this = this;
                if (accessor._babylonVertexBuffer) {
                    return accessor._babylonVertexBuffer;
                }
                if (accessor.sparse) {
                    accessor._babylonVertexBuffer = this._loadFloatAccessorAsync("#/accessors/" + accessor.index, accessor).then(function (data) {
                        return new BABYLON.VertexBuffer(_this.babylonScene.getEngine(), data, kind, false);
                    });
                }
                // HACK: If byte offset is not a multiple of component type byte length then load as a float array instead of using Babylon buffers.
                else if (accessor.byteOffset && accessor.byteOffset % BABYLON.VertexBuffer.GetTypeByteLength(accessor.componentType) !== 0) {
                    BABYLON.Tools.Warn("Accessor byte offset is not a multiple of component type byte length");
                    accessor._babylonVertexBuffer = this._loadFloatAccessorAsync("#/accessors/" + accessor.index, accessor).then(function (data) {
                        return new BABYLON.VertexBuffer(_this.babylonScene.getEngine(), data, kind, false);
                    });
                }
                else {
                    var bufferView_1 = ArrayItem.Get(context + "/bufferView", this.gltf.bufferViews, accessor.bufferView);
                    accessor._babylonVertexBuffer = this._loadVertexBufferViewAsync(bufferView_1, kind).then(function (babylonBuffer) {
                        var size = GLTFLoader._GetNumComponents(context, accessor.type);
                        return new BABYLON.VertexBuffer(_this.babylonScene.getEngine(), babylonBuffer, kind, false, false, bufferView_1.byteStride, false, accessor.byteOffset, size, accessor.componentType, accessor.normalized, true);
                    });
                }
                return accessor._babylonVertexBuffer;
            };
            GLTFLoader.prototype._loadMaterialMetallicRoughnessPropertiesAsync = function (context, properties, babylonMaterial) {
                if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                    throw new Error(context + ": Material type not supported");
                }
                var promises = new Array();
                if (properties) {
                    if (properties.baseColorFactor) {
                        babylonMaterial.albedoColor = BABYLON.Color3.FromArray(properties.baseColorFactor);
                        babylonMaterial.alpha = properties.baseColorFactor[3];
                    }
                    else {
                        babylonMaterial.albedoColor = BABYLON.Color3.White();
                    }
                    babylonMaterial.metallic = properties.metallicFactor == undefined ? 1 : properties.metallicFactor;
                    babylonMaterial.roughness = properties.roughnessFactor == undefined ? 1 : properties.roughnessFactor;
                    if (properties.baseColorTexture) {
                        promises.push(this.loadTextureInfoAsync(context + "/baseColorTexture", properties.baseColorTexture, function (texture) {
                            babylonMaterial.albedoTexture = texture;
                        }));
                    }
                    if (properties.metallicRoughnessTexture) {
                        promises.push(this.loadTextureInfoAsync(context + "/metallicRoughnessTexture", properties.metallicRoughnessTexture, function (texture) {
                            babylonMaterial.metallicTexture = texture;
                        }));
                        babylonMaterial.useMetallnessFromMetallicTextureBlue = true;
                        babylonMaterial.useRoughnessFromMetallicTextureGreen = true;
                        babylonMaterial.useRoughnessFromMetallicTextureAlpha = false;
                    }
                }
                return Promise.all(promises).then(function () { });
            };
            /** @hidden */
            GLTFLoader.prototype._loadMaterialAsync = function (context, material, babylonMesh, babylonDrawMode, assign) {
                if (assign === void 0) { assign = function () { }; }
                var extensionPromise = this._extensionsLoadMaterialAsync(context, material, babylonMesh, babylonDrawMode, assign);
                if (extensionPromise) {
                    return extensionPromise;
                }
                material._babylonData = material._babylonData || {};
                var babylonData = material._babylonData[babylonDrawMode];
                if (!babylonData) {
                    this.logOpen(context + " " + (material.name || ""));
                    var babylonMaterial = this.createMaterial(context, material, babylonDrawMode);
                    babylonData = {
                        material: babylonMaterial,
                        meshes: [],
                        promise: this.loadMaterialPropertiesAsync(context, material, babylonMaterial)
                    };
                    material._babylonData[babylonDrawMode] = babylonData;
                    this._parent.onMaterialLoadedObservable.notifyObservers(babylonMaterial);
                    this.logClose();
                }
                babylonData.meshes.push(babylonMesh);
                babylonMesh.onDisposeObservable.addOnce(function () {
                    var index = babylonData.meshes.indexOf(babylonMesh);
                    if (index !== -1) {
                        babylonData.meshes.splice(index, 1);
                    }
                });
                assign(babylonData.material);
                return babylonData.promise.then(function () {
                    return babylonData.material;
                });
            };
            GLTFLoader.prototype._createDefaultMaterial = function (name, babylonDrawMode) {
                var babylonMaterial = new BABYLON.PBRMaterial(name, this.babylonScene);
                babylonMaterial.sideOrientation = this.babylonScene.useRightHandedSystem ? BABYLON.Material.CounterClockWiseSideOrientation : BABYLON.Material.ClockWiseSideOrientation;
                babylonMaterial.fillMode = babylonDrawMode;
                babylonMaterial.enableSpecularAntiAliasing = true;
                babylonMaterial.useRadianceOverAlpha = !this._parent.transparencyAsCoverage;
                babylonMaterial.useSpecularOverAlpha = !this._parent.transparencyAsCoverage;
                babylonMaterial.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
                babylonMaterial.metallic = 1;
                babylonMaterial.roughness = 1;
                return babylonMaterial;
            };
            /**
             * Creates a Babylon material from a glTF material.
             * @param context The context when loading the asset
             * @param material The glTF material property
             * @param babylonDrawMode The draw mode for the Babylon material
             * @returns The Babylon material
             */
            GLTFLoader.prototype.createMaterial = function (context, material, babylonDrawMode) {
                var extensionPromise = this._extensionsCreateMaterial(context, material, babylonDrawMode);
                if (extensionPromise) {
                    return extensionPromise;
                }
                var name = material.name || "material" + material.index;
                return this._createDefaultMaterial(name, babylonDrawMode);
            };
            /**
             * Loads properties from a glTF material into a Babylon material.
             * @param context The context when loading the asset
             * @param material The glTF material property
             * @param babylonMaterial The Babylon material
             * @returns A promise that resolves when the load is complete
             */
            GLTFLoader.prototype.loadMaterialPropertiesAsync = function (context, material, babylonMaterial) {
                var extensionPromise = this._extensionsLoadMaterialPropertiesAsync(context, material, babylonMaterial);
                if (extensionPromise) {
                    return extensionPromise;
                }
                var promises = new Array();
                promises.push(this.loadMaterialBasePropertiesAsync(context, material, babylonMaterial));
                if (material.pbrMetallicRoughness) {
                    promises.push(this._loadMaterialMetallicRoughnessPropertiesAsync(context + "/pbrMetallicRoughness", material.pbrMetallicRoughness, babylonMaterial));
                }
                this.loadMaterialAlphaProperties(context, material, babylonMaterial);
                return Promise.all(promises).then(function () { });
            };
            /**
             * Loads the normal, occlusion, and emissive properties from a glTF material into a Babylon material.
             * @param context The context when loading the asset
             * @param material The glTF material property
             * @param babylonMaterial The Babylon material
             * @returns A promise that resolves when the load is complete
             */
            GLTFLoader.prototype.loadMaterialBasePropertiesAsync = function (context, material, babylonMaterial) {
                if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                    throw new Error(context + ": Material type not supported");
                }
                var promises = new Array();
                babylonMaterial.emissiveColor = material.emissiveFactor ? BABYLON.Color3.FromArray(material.emissiveFactor) : new BABYLON.Color3(0, 0, 0);
                if (material.doubleSided) {
                    babylonMaterial.backFaceCulling = false;
                    babylonMaterial.twoSidedLighting = true;
                }
                if (material.normalTexture) {
                    promises.push(this.loadTextureInfoAsync(context + "/normalTexture", material.normalTexture, function (texture) {
                        babylonMaterial.bumpTexture = texture;
                    }));
                    babylonMaterial.invertNormalMapX = !this.babylonScene.useRightHandedSystem;
                    babylonMaterial.invertNormalMapY = this.babylonScene.useRightHandedSystem;
                    if (material.normalTexture.scale != undefined) {
                        babylonMaterial.bumpTexture.level = material.normalTexture.scale;
                    }
                }
                if (material.occlusionTexture) {
                    promises.push(this.loadTextureInfoAsync(context + "/occlusionTexture", material.occlusionTexture, function (texture) {
                        babylonMaterial.ambientTexture = texture;
                    }));
                    babylonMaterial.useAmbientInGrayScale = true;
                    if (material.occlusionTexture.strength != undefined) {
                        babylonMaterial.ambientTextureStrength = material.occlusionTexture.strength;
                    }
                }
                if (material.emissiveTexture) {
                    promises.push(this.loadTextureInfoAsync(context + "/emissiveTexture", material.emissiveTexture, function (texture) {
                        babylonMaterial.emissiveTexture = texture;
                    }));
                }
                return Promise.all(promises).then(function () { });
            };
            /**
             * Loads the alpha properties from a glTF material into a Babylon material.
             * Must be called after the setting the albedo texture of the Babylon material when the material has an albedo texture.
             * @param context The context when loading the asset
             * @param material The glTF material property
             * @param babylonMaterial The Babylon material
             */
            GLTFLoader.prototype.loadMaterialAlphaProperties = function (context, material, babylonMaterial) {
                if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                    throw new Error(context + ": Material type not supported");
                }
                var alphaMode = material.alphaMode || "OPAQUE" /* OPAQUE */;
                switch (alphaMode) {
                    case "OPAQUE" /* OPAQUE */: {
                        babylonMaterial.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
                        break;
                    }
                    case "MASK" /* MASK */: {
                        babylonMaterial.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATEST;
                        babylonMaterial.alphaCutOff = (material.alphaCutoff == undefined ? 0.5 : material.alphaCutoff);
                        if (babylonMaterial.albedoTexture) {
                            babylonMaterial.albedoTexture.hasAlpha = true;
                        }
                        break;
                    }
                    case "BLEND" /* BLEND */: {
                        babylonMaterial.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
                        if (babylonMaterial.albedoTexture) {
                            babylonMaterial.albedoTexture.hasAlpha = true;
                            babylonMaterial.useAlphaFromAlbedoTexture = true;
                        }
                        break;
                    }
                    default: {
                        throw new Error(context + "/alphaMode: Invalid value (" + material.alphaMode + ")");
                    }
                }
            };
            /**
             * Loads a glTF texture info.
             * @param context The context when loading the asset
             * @param textureInfo The glTF texture info property
             * @param assign A function called synchronously after parsing the glTF properties
             * @returns A promise that resolves with the loaded Babylon texture when the load is complete
             */
            GLTFLoader.prototype.loadTextureInfoAsync = function (context, textureInfo, assign) {
                if (assign === void 0) { assign = function () { }; }
                var extensionPromise = this._extensionsLoadTextureInfoAsync(context, textureInfo, assign);
                if (extensionPromise) {
                    return extensionPromise;
                }
                this.logOpen("" + context);
                var texture = ArrayItem.Get(context + "/index", this.gltf.textures, textureInfo.index);
                var promise = this._loadTextureAsync("#/textures/" + textureInfo.index, texture, function (babylonTexture) {
                    babylonTexture.coordinatesIndex = textureInfo.texCoord || 0;
                    assign(babylonTexture);
                });
                this.logClose();
                return promise;
            };
            GLTFLoader.prototype._loadTextureAsync = function (context, texture, assign) {
                var _this = this;
                if (assign === void 0) { assign = function () { }; }
                var promises = new Array();
                this.logOpen(context + " " + (texture.name || ""));
                var sampler = (texture.sampler == undefined ? GLTFLoader._DefaultSampler : ArrayItem.Get(context + "/sampler", this.gltf.samplers, texture.sampler));
                var samplerData = this._loadSampler("#/samplers/" + sampler.index, sampler);
                var deferred = new BABYLON.Deferred();
                var babylonTexture = new BABYLON.Texture(null, this.babylonScene, samplerData.noMipMaps, false, samplerData.samplingMode, function () {
                    if (!_this._disposed) {
                        deferred.resolve();
                    }
                }, function (message, exception) {
                    if (!_this._disposed) {
                        deferred.reject(new Error(context + ": " + ((exception && exception.message) ? exception.message : message || "Failed to load texture")));
                    }
                });
                promises.push(deferred.promise);
                babylonTexture.name = texture.name || "texture" + texture.index;
                babylonTexture.wrapU = samplerData.wrapU;
                babylonTexture.wrapV = samplerData.wrapV;
                var image = ArrayItem.Get(context + "/source", this.gltf.images, texture.source);
                promises.push(this.loadImageAsync("#/images/" + image.index, image).then(function (data) {
                    var name = image.uri || _this._fileName + "#image" + image.index;
                    var dataUrl = "data:" + _this._uniqueRootUrl + name;
                    babylonTexture.updateURL(dataUrl, new Blob([data], { type: image.mimeType }));
                }));
                assign(babylonTexture);
                this._parent.onTextureLoadedObservable.notifyObservers(babylonTexture);
                this.logClose();
                return Promise.all(promises).then(function () {
                    return babylonTexture;
                });
            };
            GLTFLoader.prototype._loadSampler = function (context, sampler) {
                if (!sampler._data) {
                    sampler._data = {
                        noMipMaps: (sampler.minFilter === 9728 /* NEAREST */ || sampler.minFilter === 9729 /* LINEAR */),
                        samplingMode: GLTFLoader._GetTextureSamplingMode(context, sampler),
                        wrapU: GLTFLoader._GetTextureWrapMode(context + "/wrapS", sampler.wrapS),
                        wrapV: GLTFLoader._GetTextureWrapMode(context + "/wrapT", sampler.wrapT)
                    };
                }
                return sampler._data;
            };
            /**
             * Loads a glTF image.
             * @param context The context when loading the asset
             * @param image The glTF image property
             * @returns A promise that resolves with the loaded data when the load is complete
             */
            GLTFLoader.prototype.loadImageAsync = function (context, image) {
                if (!image._data) {
                    this.logOpen(context + " " + (image.name || ""));
                    if (image.uri) {
                        image._data = this.loadUriAsync(context + "/uri", image.uri);
                    }
                    else {
                        var bufferView = ArrayItem.Get(context + "/bufferView", this.gltf.bufferViews, image.bufferView);
                        image._data = this.loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView);
                    }
                    this.logClose();
                }
                return image._data;
            };
            /**
             * Loads a glTF uri.
             * @param context The context when loading the asset
             * @param uri The base64 or relative uri
             * @returns A promise that resolves with the loaded data when the load is complete
             */
            GLTFLoader.prototype.loadUriAsync = function (context, uri) {
                var _this = this;
                var extensionPromise = this._extensionsLoadUriAsync(context, uri);
                if (extensionPromise) {
                    return extensionPromise;
                }
                if (!GLTFLoader._ValidateUri(uri)) {
                    throw new Error(context + ": '" + uri + "' is invalid");
                }
                if (BABYLON.Tools.IsBase64(uri)) {
                    var data = new Uint8Array(BABYLON.Tools.DecodeBase64(uri));
                    this.log("Decoded " + uri.substr(0, 64) + "... (" + data.length + " bytes)");
                    return Promise.resolve(data);
                }
                this.log("Loading " + uri);
                return this._parent.preprocessUrlAsync(this._rootUrl + uri).then(function (url) {
                    return new Promise(function (resolve, reject) {
                        if (!_this._disposed) {
                            var request_1 = BABYLON.Tools.LoadFile(url, function (fileData) {
                                if (!_this._disposed) {
                                    var data = new Uint8Array(fileData);
                                    _this.log("Loaded " + uri + " (" + data.length + " bytes)");
                                    resolve(data);
                                }
                            }, function (event) {
                                if (!_this._disposed) {
                                    if (request_1) {
                                        request_1._lengthComputable = event.lengthComputable;
                                        request_1._loaded = event.loaded;
                                        request_1._total = event.total;
                                    }
                                    if (_this._state === BABYLON.GLTFLoaderState.LOADING) {
                                        try {
                                            _this._onProgress();
                                        }
                                        catch (e) {
                                            reject(e);
                                        }
                                    }
                                }
                            }, _this.babylonScene.database, true, function (request, exception) {
                                if (!_this._disposed) {
                                    reject(new BABYLON.LoadFileError(context + ": Failed to load '" + uri + "'" + (request ? ": " + request.status + " " + request.statusText : ""), request));
                                }
                            });
                            _this._requests.push(request_1);
                        }
                    });
                });
            };
            GLTFLoader.prototype._onProgress = function () {
                if (!this._progressCallback) {
                    return;
                }
                var lengthComputable = true;
                var loaded = 0;
                var total = 0;
                for (var _i = 0, _a = this._requests; _i < _a.length; _i++) {
                    var request = _a[_i];
                    if (request._lengthComputable === undefined || request._loaded === undefined || request._total === undefined) {
                        return;
                    }
                    lengthComputable = lengthComputable && request._lengthComputable;
                    loaded += request._loaded;
                    total += request._total;
                }
                this._progressCallback(new BABYLON.SceneLoaderProgressEvent(lengthComputable, loaded, lengthComputable ? total : 0));
            };
            GLTFLoader._GetTextureWrapMode = function (context, mode) {
                // Set defaults if undefined
                mode = mode == undefined ? 10497 /* REPEAT */ : mode;
                switch (mode) {
                    case 33071 /* CLAMP_TO_EDGE */: return BABYLON.Texture.CLAMP_ADDRESSMODE;
                    case 33648 /* MIRRORED_REPEAT */: return BABYLON.Texture.MIRROR_ADDRESSMODE;
                    case 10497 /* REPEAT */: return BABYLON.Texture.WRAP_ADDRESSMODE;
                    default:
                        BABYLON.Tools.Warn(context + ": Invalid value (" + mode + ")");
                        return BABYLON.Texture.WRAP_ADDRESSMODE;
                }
            };
            GLTFLoader._GetTextureSamplingMode = function (context, sampler) {
                // Set defaults if undefined
                var magFilter = sampler.magFilter == undefined ? 9729 /* LINEAR */ : sampler.magFilter;
                var minFilter = sampler.minFilter == undefined ? 9987 /* LINEAR_MIPMAP_LINEAR */ : sampler.minFilter;
                if (magFilter === 9729 /* LINEAR */) {
                    switch (minFilter) {
                        case 9728 /* NEAREST */: return BABYLON.Texture.LINEAR_NEAREST;
                        case 9729 /* LINEAR */: return BABYLON.Texture.LINEAR_LINEAR;
                        case 9984 /* NEAREST_MIPMAP_NEAREST */: return BABYLON.Texture.LINEAR_NEAREST_MIPNEAREST;
                        case 9985 /* LINEAR_MIPMAP_NEAREST */: return BABYLON.Texture.LINEAR_LINEAR_MIPNEAREST;
                        case 9986 /* NEAREST_MIPMAP_LINEAR */: return BABYLON.Texture.LINEAR_NEAREST_MIPLINEAR;
                        case 9987 /* LINEAR_MIPMAP_LINEAR */: return BABYLON.Texture.LINEAR_LINEAR_MIPLINEAR;
                        default:
                            BABYLON.Tools.Warn(context + "/minFilter: Invalid value (" + minFilter + ")");
                            return BABYLON.Texture.LINEAR_LINEAR_MIPLINEAR;
                    }
                }
                else {
                    if (magFilter !== 9728 /* NEAREST */) {
                        BABYLON.Tools.Warn(context + "/magFilter: Invalid value (" + magFilter + ")");
                    }
                    switch (minFilter) {
                        case 9728 /* NEAREST */: return BABYLON.Texture.NEAREST_NEAREST;
                        case 9729 /* LINEAR */: return BABYLON.Texture.NEAREST_LINEAR;
                        case 9984 /* NEAREST_MIPMAP_NEAREST */: return BABYLON.Texture.NEAREST_NEAREST_MIPNEAREST;
                        case 9985 /* LINEAR_MIPMAP_NEAREST */: return BABYLON.Texture.NEAREST_LINEAR_MIPNEAREST;
                        case 9986 /* NEAREST_MIPMAP_LINEAR */: return BABYLON.Texture.NEAREST_NEAREST_MIPLINEAR;
                        case 9987 /* LINEAR_MIPMAP_LINEAR */: return BABYLON.Texture.NEAREST_LINEAR_MIPLINEAR;
                        default:
                            BABYLON.Tools.Warn(context + "/minFilter: Invalid value (" + minFilter + ")");
                            return BABYLON.Texture.NEAREST_NEAREST_MIPNEAREST;
                    }
                }
            };
            GLTFLoader._GetTypedArray = function (context, componentType, bufferView, byteOffset, length) {
                var buffer = bufferView.buffer;
                byteOffset = bufferView.byteOffset + (byteOffset || 0);
                try {
                    switch (componentType) {
                        case 5120 /* BYTE */: return new Int8Array(buffer, byteOffset, length);
                        case 5121 /* UNSIGNED_BYTE */: return new Uint8Array(buffer, byteOffset, length);
                        case 5122 /* SHORT */: return new Int16Array(buffer, byteOffset, length);
                        case 5123 /* UNSIGNED_SHORT */: return new Uint16Array(buffer, byteOffset, length);
                        case 5125 /* UNSIGNED_INT */: return new Uint32Array(buffer, byteOffset, length);
                        case 5126 /* FLOAT */: return new Float32Array(buffer, byteOffset, length);
                        default: throw new Error("Invalid component type " + componentType);
                    }
                }
                catch (e) {
                    throw new Error(context + ": " + e);
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
                throw new Error(context + ": Invalid type (" + type + ")");
            };
            GLTFLoader._ValidateUri = function (uri) {
                return (BABYLON.Tools.IsBase64(uri) || uri.indexOf("..") === -1);
            };
            GLTFLoader._GetDrawMode = function (context, mode) {
                if (mode == undefined) {
                    mode = 4 /* TRIANGLES */;
                }
                switch (mode) {
                    case 0 /* POINTS */: return BABYLON.Material.PointListDrawMode;
                    case 1 /* LINES */: return BABYLON.Material.LineListDrawMode;
                    case 2 /* LINE_LOOP */: return BABYLON.Material.LineLoopDrawMode;
                    case 3 /* LINE_STRIP */: return BABYLON.Material.LineStripDrawMode;
                    case 4 /* TRIANGLES */: return BABYLON.Material.TriangleFillMode;
                    case 5 /* TRIANGLE_STRIP */: return BABYLON.Material.TriangleStripDrawMode;
                    case 6 /* TRIANGLE_FAN */: return BABYLON.Material.TriangleFanDrawMode;
                }
                throw new Error(context + ": Invalid mesh primitive mode (" + mode + ")");
            };
            GLTFLoader.prototype._compileMaterialsAsync = function () {
                var _this = this;
                this._parent._startPerformanceCounter("Compile materials");
                var promises = new Array();
                if (this.gltf.materials) {
                    for (var _i = 0, _a = this.gltf.materials; _i < _a.length; _i++) {
                        var material = _a[_i];
                        if (material._babylonData) {
                            for (var babylonDrawMode in material._babylonData) {
                                var babylonData = material._babylonData[babylonDrawMode];
                                for (var _b = 0, _c = babylonData.meshes; _b < _c.length; _b++) {
                                    var babylonMesh = _c[_b];
                                    // Ensure nonUniformScaling is set if necessary.
                                    babylonMesh.computeWorldMatrix(true);
                                    var babylonMaterial = babylonData.material;
                                    promises.push(babylonMaterial.forceCompilationAsync(babylonMesh));
                                    if (this._parent.useClipPlane) {
                                        promises.push(babylonMaterial.forceCompilationAsync(babylonMesh, { clipPlane: true }));
                                    }
                                }
                            }
                        }
                    }
                }
                return Promise.all(promises).then(function () {
                    _this._parent._endPerformanceCounter("Compile materials");
                });
            };
            GLTFLoader.prototype._compileShadowGeneratorsAsync = function () {
                var _this = this;
                this._parent._startPerformanceCounter("Compile shadow generators");
                var promises = new Array();
                var lights = this.babylonScene.lights;
                for (var _i = 0, lights_1 = lights; _i < lights_1.length; _i++) {
                    var light = lights_1[_i];
                    var generator = light.getShadowGenerator();
                    if (generator) {
                        promises.push(generator.forceCompilationAsync());
                    }
                }
                return Promise.all(promises).then(function () {
                    _this._parent._endPerformanceCounter("Compile shadow generators");
                });
            };
            GLTFLoader.prototype._forEachExtensions = function (action) {
                for (var _i = 0, _a = GLTFLoader._ExtensionNames; _i < _a.length; _i++) {
                    var name_4 = _a[_i];
                    var extension = this._extensions[name_4];
                    if (extension.enabled) {
                        action(extension);
                    }
                }
            };
            GLTFLoader.prototype._applyExtensions = function (property, actionAsync) {
                for (var _i = 0, _a = GLTFLoader._ExtensionNames; _i < _a.length; _i++) {
                    var name_5 = _a[_i];
                    var extension = this._extensions[name_5];
                    if (extension.enabled) {
                        var loaderProperty = property;
                        loaderProperty._activeLoaderExtensions = loaderProperty._activeLoaderExtensions || {};
                        var activeLoaderExtensions = loaderProperty._activeLoaderExtensions;
                        if (!activeLoaderExtensions[name_5]) {
                            activeLoaderExtensions[name_5] = true;
                            try {
                                var result = actionAsync(extension);
                                if (result) {
                                    return result;
                                }
                            }
                            finally {
                                delete activeLoaderExtensions[name_5];
                            }
                        }
                    }
                }
                return null;
            };
            GLTFLoader.prototype._extensionsOnLoading = function () {
                this._forEachExtensions(function (extension) { return extension.onLoading && extension.onLoading(); });
            };
            GLTFLoader.prototype._extensionsOnReady = function () {
                this._forEachExtensions(function (extension) { return extension.onReady && extension.onReady(); });
            };
            GLTFLoader.prototype._extensionsLoadSceneAsync = function (context, scene) {
                return this._applyExtensions(scene, function (extension) { return extension.loadSceneAsync && extension.loadSceneAsync(context, scene); });
            };
            GLTFLoader.prototype._extensionsLoadNodeAsync = function (context, node, assign) {
                return this._applyExtensions(node, function (extension) { return extension.loadNodeAsync && extension.loadNodeAsync(context, node, assign); });
            };
            GLTFLoader.prototype._extensionsLoadCameraAsync = function (context, camera, assign) {
                return this._applyExtensions(camera, function (extension) { return extension.loadCameraAsync && extension.loadCameraAsync(context, camera, assign); });
            };
            GLTFLoader.prototype._extensionsLoadVertexDataAsync = function (context, primitive, babylonMesh) {
                return this._applyExtensions(primitive, function (extension) { return extension._loadVertexDataAsync && extension._loadVertexDataAsync(context, primitive, babylonMesh); });
            };
            GLTFLoader.prototype._extensionsLoadMaterialAsync = function (context, material, babylonMesh, babylonDrawMode, assign) {
                return this._applyExtensions(material, function (extension) { return extension._loadMaterialAsync && extension._loadMaterialAsync(context, material, babylonMesh, babylonDrawMode, assign); });
            };
            GLTFLoader.prototype._extensionsCreateMaterial = function (context, material, babylonDrawMode) {
                return this._applyExtensions({}, function (extension) { return extension.createMaterial && extension.createMaterial(context, material, babylonDrawMode); });
            };
            GLTFLoader.prototype._extensionsLoadMaterialPropertiesAsync = function (context, material, babylonMaterial) {
                return this._applyExtensions(material, function (extension) { return extension.loadMaterialPropertiesAsync && extension.loadMaterialPropertiesAsync(context, material, babylonMaterial); });
            };
            GLTFLoader.prototype._extensionsLoadTextureInfoAsync = function (context, textureInfo, assign) {
                return this._applyExtensions(textureInfo, function (extension) { return extension.loadTextureInfoAsync && extension.loadTextureInfoAsync(context, textureInfo, assign); });
            };
            GLTFLoader.prototype._extensionsLoadAnimationAsync = function (context, animation) {
                return this._applyExtensions(animation, function (extension) { return extension.loadAnimationAsync && extension.loadAnimationAsync(context, animation); });
            };
            GLTFLoader.prototype._extensionsLoadUriAsync = function (context, uri) {
                return this._applyExtensions({}, function (extension) { return extension._loadUriAsync && extension._loadUriAsync(context, uri); });
            };
            /**
             * Helper method called by a loader extension to load an glTF extension.
             * @param context The context when loading the asset
             * @param property The glTF property to load the extension from
             * @param extensionName The name of the extension to load
             * @param actionAsync The action to run
             * @returns The promise returned by actionAsync or null if the extension does not exist
             */
            GLTFLoader.LoadExtensionAsync = function (context, property, extensionName, actionAsync) {
                if (!property.extensions) {
                    return null;
                }
                var extensions = property.extensions;
                var extension = extensions[extensionName];
                if (!extension) {
                    return null;
                }
                return actionAsync(context + "/extensions/" + extensionName, extension);
            };
            /**
             * Helper method called by a loader extension to load a glTF extra.
             * @param context The context when loading the asset
             * @param property The glTF property to load the extra from
             * @param extensionName The name of the extension to load
             * @param actionAsync The action to run
             * @returns The promise returned by actionAsync or null if the extra does not exist
             */
            GLTFLoader.LoadExtraAsync = function (context, property, extensionName, actionAsync) {
                if (!property.extras) {
                    return null;
                }
                var extras = property.extras;
                var extra = extras[extensionName];
                if (!extra) {
                    return null;
                }
                return actionAsync(context + "/extras/" + extensionName, extra);
            };
            /**
             * Increments the indentation level and logs a message.
             * @param message The message to log
             */
            GLTFLoader.prototype.logOpen = function (message) {
                this._parent._logOpen(message);
            };
            /**
             * Decrements the indentation level.
             */
            GLTFLoader.prototype.logClose = function () {
                this._parent._logClose();
            };
            /**
             * Logs a message
             * @param message The message to log
             */
            GLTFLoader.prototype.log = function (message) {
                this._parent._log(message);
            };
            /**
             * Starts a performance counter.
             * @param counterName The name of the performance counter
             */
            GLTFLoader.prototype.startPerformanceCounter = function (counterName) {
                this._parent._startPerformanceCounter(counterName);
            };
            /**
             * Ends a performance counter.
             * @param counterName The name of the performance counter
             */
            GLTFLoader.prototype.endPerformanceCounter = function (counterName) {
                this._parent._endPerformanceCounter(counterName);
            };
            GLTFLoader._DefaultSampler = { index: -1 };
            GLTFLoader._ExtensionNames = new Array();
            GLTFLoader._ExtensionFactories = {};
            return GLTFLoader;
        }());
        GLTF2.GLTFLoader = GLTFLoader;
        BABYLON.GLTFFileLoader._CreateGLTFLoaderV2 = function (parent) { return new GLTFLoader(parent); };
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.glTFLoader.js.map

/// <reference path="../../../../dist/preview release/babylon.d.ts"/>

//# sourceMappingURL=babylon.glTFLoaderExtension.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "MSFT_lod";
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/MSFT_lod)
                 */
                var MSFT_lod = /** @class */ (function () {
                    /** @hidden */
                    function MSFT_lod(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        /**
                         * Maximum number of LODs to load, starting from the lowest LOD.
                         */
                        this.maxLODsToLoad = Number.MAX_VALUE;
                        /**
                         * Observable raised when all node LODs of one level are loaded.
                         * The event data is the index of the loaded LOD starting from zero.
                         * Dispose the loader to cancel the loading of the next level of LODs.
                         */
                        this.onNodeLODsLoadedObservable = new BABYLON.Observable();
                        /**
                         * Observable raised when all material LODs of one level are loaded.
                         * The event data is the index of the loaded LOD starting from zero.
                         * Dispose the loader to cancel the loading of the next level of LODs.
                         */
                        this.onMaterialLODsLoadedObservable = new BABYLON.Observable();
                        this._nodeIndexLOD = null;
                        this._nodeSignalLODs = new Array();
                        this._nodePromiseLODs = new Array();
                        this._materialIndexLOD = null;
                        this._materialSignalLODs = new Array();
                        this._materialPromiseLODs = new Array();
                        this._loader = loader;
                    }
                    /** @hidden */
                    MSFT_lod.prototype.dispose = function () {
                        delete this._loader;
                        this._nodeIndexLOD = null;
                        this._nodeSignalLODs.length = 0;
                        this._nodePromiseLODs.length = 0;
                        this._materialIndexLOD = null;
                        this._materialSignalLODs.length = 0;
                        this._materialPromiseLODs.length = 0;
                        this.onMaterialLODsLoadedObservable.clear();
                        this.onNodeLODsLoadedObservable.clear();
                    };
                    /** @hidden */
                    MSFT_lod.prototype.onReady = function () {
                        var _this = this;
                        var _loop_1 = function (indexLOD) {
                            var promise = Promise.all(this_1._nodePromiseLODs[indexLOD]).then(function () {
                                if (indexLOD !== 0) {
                                    _this._loader.endPerformanceCounter("Node LOD " + indexLOD);
                                }
                                _this._loader.log("Loaded node LOD " + indexLOD);
                                _this.onNodeLODsLoadedObservable.notifyObservers(indexLOD);
                                if (indexLOD !== _this._nodePromiseLODs.length - 1) {
                                    _this._loader.startPerformanceCounter("Node LOD " + (indexLOD + 1));
                                    if (_this._nodeSignalLODs[indexLOD]) {
                                        _this._nodeSignalLODs[indexLOD].resolve();
                                    }
                                }
                            });
                            this_1._loader._completePromises.push(promise);
                        };
                        var this_1 = this;
                        for (var indexLOD = 0; indexLOD < this._nodePromiseLODs.length; indexLOD++) {
                            _loop_1(indexLOD);
                        }
                        var _loop_2 = function (indexLOD) {
                            var promise = Promise.all(this_2._materialPromiseLODs[indexLOD]).then(function () {
                                if (indexLOD !== 0) {
                                    _this._loader.endPerformanceCounter("Material LOD " + indexLOD);
                                }
                                _this._loader.log("Loaded material LOD " + indexLOD);
                                _this.onMaterialLODsLoadedObservable.notifyObservers(indexLOD);
                                if (indexLOD !== _this._materialPromiseLODs.length - 1) {
                                    _this._loader.startPerformanceCounter("Material LOD " + (indexLOD + 1));
                                    if (_this._materialSignalLODs[indexLOD]) {
                                        _this._materialSignalLODs[indexLOD].resolve();
                                    }
                                }
                            });
                            this_2._loader._completePromises.push(promise);
                        };
                        var this_2 = this;
                        for (var indexLOD = 0; indexLOD < this._materialPromiseLODs.length; indexLOD++) {
                            _loop_2(indexLOD);
                        }
                    };
                    /** @hidden */
                    MSFT_lod.prototype.loadNodeAsync = function (context, node, assign) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, node, this.name, function (extensionContext, extension) {
                            var firstPromise;
                            var nodeLODs = _this._getLODs(extensionContext, node, _this._loader.gltf.nodes, extension.ids);
                            _this._loader.logOpen("" + extensionContext);
                            var _loop_3 = function (indexLOD) {
                                var nodeLOD = nodeLODs[indexLOD];
                                if (indexLOD !== 0) {
                                    _this._nodeIndexLOD = indexLOD;
                                    _this._nodeSignalLODs[indexLOD] = _this._nodeSignalLODs[indexLOD] || new BABYLON.Deferred();
                                }
                                var promise = _this._loader.loadNodeAsync("#/nodes/" + nodeLOD.index, nodeLOD).then(function (babylonMesh) {
                                    if (indexLOD !== 0) {
                                        // TODO: should not rely on _babylonMesh
                                        var previousNodeLOD = nodeLODs[indexLOD - 1];
                                        if (previousNodeLOD._babylonMesh) {
                                            previousNodeLOD._babylonMesh.dispose();
                                            delete previousNodeLOD._babylonMesh;
                                            _this._disposeUnusedMaterials();
                                        }
                                    }
                                    return babylonMesh;
                                });
                                if (indexLOD === 0) {
                                    firstPromise = promise;
                                }
                                else {
                                    _this._nodeIndexLOD = null;
                                }
                                _this._nodePromiseLODs[indexLOD] = _this._nodePromiseLODs[indexLOD] || [];
                                _this._nodePromiseLODs[indexLOD].push(promise);
                            };
                            for (var indexLOD = 0; indexLOD < nodeLODs.length; indexLOD++) {
                                _loop_3(indexLOD);
                            }
                            _this._loader.logClose();
                            return firstPromise;
                        });
                    };
                    /** @hidden */
                    MSFT_lod.prototype._loadMaterialAsync = function (context, material, babylonMesh, babylonDrawMode, assign) {
                        var _this = this;
                        // Don't load material LODs if already loading a node LOD.
                        if (this._nodeIndexLOD) {
                            return null;
                        }
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, material, this.name, function (extensionContext, extension) {
                            var firstPromise;
                            var materialLODs = _this._getLODs(extensionContext, material, _this._loader.gltf.materials, extension.ids);
                            _this._loader.logOpen("" + extensionContext);
                            var _loop_4 = function (indexLOD) {
                                var materialLOD = materialLODs[indexLOD];
                                if (indexLOD !== 0) {
                                    _this._materialIndexLOD = indexLOD;
                                }
                                var promise = _this._loader._loadMaterialAsync("#/materials/" + materialLOD.index, materialLOD, babylonMesh, babylonDrawMode, function (babylonMaterial) {
                                    if (indexLOD === 0) {
                                        assign(babylonMaterial);
                                    }
                                }).then(function (babylonMaterial) {
                                    if (indexLOD !== 0) {
                                        assign(babylonMaterial);
                                        // TODO: should not rely on _babylonData
                                        var previousBabylonDataLOD = materialLODs[indexLOD - 1]._babylonData;
                                        if (previousBabylonDataLOD[babylonDrawMode]) {
                                            previousBabylonDataLOD[babylonDrawMode].material.dispose();
                                            delete previousBabylonDataLOD[babylonDrawMode];
                                        }
                                    }
                                    return babylonMaterial;
                                });
                                if (indexLOD === 0) {
                                    firstPromise = promise;
                                }
                                else {
                                    _this._materialIndexLOD = null;
                                }
                                _this._materialPromiseLODs[indexLOD] = _this._materialPromiseLODs[indexLOD] || [];
                                _this._materialPromiseLODs[indexLOD].push(promise);
                            };
                            for (var indexLOD = 0; indexLOD < materialLODs.length; indexLOD++) {
                                _loop_4(indexLOD);
                            }
                            _this._loader.logClose();
                            return firstPromise;
                        });
                    };
                    /** @hidden */
                    MSFT_lod.prototype._loadUriAsync = function (context, uri) {
                        var _this = this;
                        // Defer the loading of uris if loading a material or node LOD.
                        if (this._materialIndexLOD !== null) {
                            this._loader.log("deferred");
                            var previousIndexLOD = this._materialIndexLOD - 1;
                            this._materialSignalLODs[previousIndexLOD] = this._materialSignalLODs[previousIndexLOD] || new BABYLON.Deferred();
                            return this._materialSignalLODs[previousIndexLOD].promise.then(function () {
                                return _this._loader.loadUriAsync(context, uri);
                            });
                        }
                        else if (this._nodeIndexLOD !== null) {
                            this._loader.log("deferred");
                            var previousIndexLOD = this._nodeIndexLOD - 1;
                            this._nodeSignalLODs[previousIndexLOD] = this._nodeSignalLODs[previousIndexLOD] || new BABYLON.Deferred();
                            return this._nodeSignalLODs[this._nodeIndexLOD - 1].promise.then(function () {
                                return _this._loader.loadUriAsync(context, uri);
                            });
                        }
                        return null;
                    };
                    /**
                     * Gets an array of LOD properties from lowest to highest.
                     */
                    MSFT_lod.prototype._getLODs = function (context, property, array, ids) {
                        if (this.maxLODsToLoad <= 0) {
                            throw new Error("maxLODsToLoad must be greater than zero");
                        }
                        var properties = new Array();
                        for (var i = ids.length - 1; i >= 0; i--) {
                            properties.push(GLTF2.ArrayItem.Get(context + "/ids/" + ids[i], array, ids[i]));
                            if (properties.length === this.maxLODsToLoad) {
                                return properties;
                            }
                        }
                        properties.push(property);
                        return properties;
                    };
                    MSFT_lod.prototype._disposeUnusedMaterials = function () {
                        // TODO: should not rely on _babylonData
                        var materials = this._loader.gltf.materials;
                        if (materials) {
                            for (var _i = 0, materials_1 = materials; _i < materials_1.length; _i++) {
                                var material = materials_1[_i];
                                if (material._babylonData) {
                                    for (var drawMode in material._babylonData) {
                                        var babylonData = material._babylonData[drawMode];
                                        if (babylonData.meshes.length === 0) {
                                            babylonData.material.dispose(false, true);
                                            delete material._babylonData[drawMode];
                                        }
                                    }
                                }
                            }
                        }
                    };
                    return MSFT_lod;
                }());
                Extensions.MSFT_lod = MSFT_lod;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new MSFT_lod(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=MSFT_lod.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "MSFT_minecraftMesh";
                /** @hidden */
                var MSFT_minecraftMesh = /** @class */ (function () {
                    function MSFT_minecraftMesh(loader) {
                        this.name = NAME;
                        this.enabled = true;
                        this._loader = loader;
                    }
                    MSFT_minecraftMesh.prototype.dispose = function () {
                        delete this._loader;
                    };
                    MSFT_minecraftMesh.prototype.loadMaterialPropertiesAsync = function (context, material, babylonMaterial) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtraAsync(context, material, this.name, function (extraContext, extra) {
                            if (extra) {
                                if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                                    throw new Error(extraContext + ": Material type not supported");
                                }
                                var promise = _this._loader.loadMaterialPropertiesAsync(context, material, babylonMaterial);
                                if (babylonMaterial.needAlphaBlending()) {
                                    babylonMaterial.forceDepthWrite = true;
                                    babylonMaterial.separateCullingPass = true;
                                }
                                babylonMaterial.backFaceCulling = babylonMaterial.forceDepthWrite;
                                babylonMaterial.twoSidedLighting = true;
                                return promise;
                            }
                            return null;
                        });
                    };
                    return MSFT_minecraftMesh;
                }());
                Extensions.MSFT_minecraftMesh = MSFT_minecraftMesh;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new MSFT_minecraftMesh(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=MSFT_minecraftMesh.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "MSFT_sRGBFactors";
                /** @hidden */
                var MSFT_sRGBFactors = /** @class */ (function () {
                    function MSFT_sRGBFactors(loader) {
                        this.name = NAME;
                        this.enabled = true;
                        this._loader = loader;
                    }
                    MSFT_sRGBFactors.prototype.dispose = function () {
                        delete this._loader;
                    };
                    MSFT_sRGBFactors.prototype.loadMaterialPropertiesAsync = function (context, material, babylonMaterial) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtraAsync(context, material, this.name, function (extraContext, extra) {
                            if (extra) {
                                if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                                    throw new Error(extraContext + ": Material type not supported");
                                }
                                var promise = _this._loader.loadMaterialPropertiesAsync(context, material, babylonMaterial);
                                if (!babylonMaterial.albedoTexture) {
                                    babylonMaterial.albedoColor.toLinearSpaceToRef(babylonMaterial.albedoColor);
                                }
                                if (!babylonMaterial.reflectivityTexture) {
                                    babylonMaterial.reflectivityColor.toLinearSpaceToRef(babylonMaterial.reflectivityColor);
                                }
                                return promise;
                            }
                            return null;
                        });
                    };
                    return MSFT_sRGBFactors;
                }());
                Extensions.MSFT_sRGBFactors = MSFT_sRGBFactors;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new MSFT_sRGBFactors(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=MSFT_sRGBFactors.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "MSFT_audio_emitter";
                /**
                 * [Specification](https://github.com/najadojo/glTF/tree/MSFT_audio_emitter/extensions/2.0/Vendor/MSFT_audio_emitter)
                 */
                var MSFT_audio_emitter = /** @class */ (function () {
                    /** @hidden */
                    function MSFT_audio_emitter(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        this._loader = loader;
                    }
                    /** @hidden */
                    MSFT_audio_emitter.prototype.dispose = function () {
                        delete this._loader;
                        delete this._clips;
                        delete this._emitters;
                    };
                    /** @hidden */
                    MSFT_audio_emitter.prototype.onLoading = function () {
                        var extensions = this._loader.gltf.extensions;
                        if (extensions && extensions[this.name]) {
                            var extension = extensions[this.name];
                            this._clips = extension.clips;
                            this._emitters = extension.emitters;
                            GLTF2.ArrayItem.Assign(this._clips);
                            GLTF2.ArrayItem.Assign(this._emitters);
                        }
                    };
                    /** @hidden */
                    MSFT_audio_emitter.prototype.loadSceneAsync = function (context, scene) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, scene, this.name, function (extensionContext, extension) {
                            var promises = new Array();
                            promises.push(_this._loader.loadSceneAsync(context, scene));
                            for (var _i = 0, _a = extension.emitters; _i < _a.length; _i++) {
                                var emitterIndex = _a[_i];
                                var emitter = GLTF2.ArrayItem.Get(extensionContext + "/emitters", _this._emitters, emitterIndex);
                                if (emitter.refDistance != undefined || emitter.maxDistance != undefined || emitter.rolloffFactor != undefined ||
                                    emitter.distanceModel != undefined || emitter.innerAngle != undefined || emitter.outerAngle != undefined) {
                                    throw new Error(extensionContext + ": Direction or Distance properties are not allowed on emitters attached to a scene");
                                }
                                promises.push(_this._loadEmitterAsync(extensionContext + "/emitters/" + emitter.index, emitter));
                            }
                            return Promise.all(promises).then(function () { });
                        });
                    };
                    /** @hidden */
                    MSFT_audio_emitter.prototype.loadNodeAsync = function (context, node, assign) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, node, this.name, function (extensionContext, extension) {
                            var promises = new Array();
                            return _this._loader.loadNodeAsync(extensionContext, node, function (babylonMesh) {
                                var _loop_1 = function (emitterIndex) {
                                    var emitter = GLTF2.ArrayItem.Get(extensionContext + "/emitters", _this._emitters, emitterIndex);
                                    promises.push(_this._loadEmitterAsync(extensionContext + "/emitters/" + emitter.index, emitter).then(function () {
                                        for (var _i = 0, _a = emitter._babylonSounds; _i < _a.length; _i++) {
                                            var sound = _a[_i];
                                            sound.attachToMesh(babylonMesh);
                                            if (emitter.innerAngle != undefined || emitter.outerAngle != undefined) {
                                                sound.setLocalDirectionToMesh(BABYLON.Vector3.Forward());
                                                sound.setDirectionalCone(2 * BABYLON.Tools.ToDegrees(emitter.innerAngle == undefined ? Math.PI : emitter.innerAngle), 2 * BABYLON.Tools.ToDegrees(emitter.outerAngle == undefined ? Math.PI : emitter.outerAngle), 0);
                                            }
                                        }
                                    }));
                                };
                                for (var _i = 0, _a = extension.emitters; _i < _a.length; _i++) {
                                    var emitterIndex = _a[_i];
                                    _loop_1(emitterIndex);
                                }
                                assign(babylonMesh);
                            }).then(function (babylonMesh) {
                                return Promise.all(promises).then(function () {
                                    return babylonMesh;
                                });
                            });
                        });
                    };
                    /** @hidden */
                    MSFT_audio_emitter.prototype.loadAnimationAsync = function (context, animation) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, animation, this.name, function (extensionContext, extension) {
                            return _this._loader.loadAnimationAsync(context, animation).then(function (babylonAnimationGroup) {
                                var promises = new Array();
                                GLTF2.ArrayItem.Assign(extension.events);
                                for (var _i = 0, _a = extension.events; _i < _a.length; _i++) {
                                    var event_1 = _a[_i];
                                    promises.push(_this._loadAnimationEventAsync(extensionContext + "/events/" + event_1.index, context, animation, event_1, babylonAnimationGroup));
                                }
                                return Promise.all(promises).then(function () {
                                    return babylonAnimationGroup;
                                });
                            });
                        });
                    };
                    MSFT_audio_emitter.prototype._loadClipAsync = function (context, clip) {
                        if (clip._objectURL) {
                            return clip._objectURL;
                        }
                        var promise;
                        if (clip.uri) {
                            promise = this._loader.loadUriAsync(context, clip.uri);
                        }
                        else {
                            var bufferView = GLTF2.ArrayItem.Get(context + "/bufferView", this._loader.gltf.bufferViews, clip.bufferView);
                            promise = this._loader.loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView);
                        }
                        clip._objectURL = promise.then(function (data) {
                            return URL.createObjectURL(new Blob([data], { type: clip.mimeType }));
                        });
                        return clip._objectURL;
                    };
                    MSFT_audio_emitter.prototype._loadEmitterAsync = function (context, emitter) {
                        var _this = this;
                        emitter._babylonSounds = emitter._babylonSounds || [];
                        if (!emitter._babylonData) {
                            var clipPromises = new Array();
                            var name_1 = emitter.name || "emitter" + emitter.index;
                            var options_1 = {
                                loop: false,
                                autoplay: false,
                                volume: emitter.volume == undefined ? 1 : emitter.volume,
                            };
                            var _loop_2 = function (i) {
                                var clipContext = "#/extensions/" + this_1.name + "/clips";
                                var clip = GLTF2.ArrayItem.Get(clipContext, this_1._clips, emitter.clips[i].clip);
                                clipPromises.push(this_1._loadClipAsync(clipContext + "/" + emitter.clips[i].clip, clip).then(function (objectURL) {
                                    var sound = emitter._babylonSounds[i] = new BABYLON.Sound(name_1, objectURL, _this._loader.babylonScene, null, options_1);
                                    sound.refDistance = emitter.refDistance || 1;
                                    sound.maxDistance = emitter.maxDistance || 256;
                                    sound.rolloffFactor = emitter.rolloffFactor || 1;
                                    sound.distanceModel = emitter.distanceModel || 'exponential';
                                    sound._positionInEmitterSpace = true;
                                }));
                            };
                            var this_1 = this;
                            for (var i = 0; i < emitter.clips.length; i++) {
                                _loop_2(i);
                            }
                            var promise = Promise.all(clipPromises).then(function () {
                                var weights = emitter.clips.map(function (clip) { return clip.weight || 1; });
                                var weightedSound = new BABYLON.WeightedSound(emitter.loop || false, emitter._babylonSounds, weights);
                                if (emitter.innerAngle) {
                                    weightedSound.directionalConeInnerAngle = 2 * BABYLON.Tools.ToDegrees(emitter.innerAngle);
                                }
                                if (emitter.outerAngle) {
                                    weightedSound.directionalConeOuterAngle = 2 * BABYLON.Tools.ToDegrees(emitter.outerAngle);
                                }
                                if (emitter.volume) {
                                    weightedSound.volume = emitter.volume;
                                }
                                emitter._babylonData.sound = weightedSound;
                            });
                            emitter._babylonData = {
                                loaded: promise
                            };
                        }
                        return emitter._babylonData.loaded;
                    };
                    MSFT_audio_emitter.prototype._getEventAction = function (context, sound, action, time, startOffset) {
                        switch (action) {
                            case "play" /* play */: {
                                return function (currentFrame) {
                                    var frameOffset = (startOffset || 0) + (currentFrame - time);
                                    sound.play(frameOffset);
                                };
                            }
                            case "stop" /* stop */: {
                                return function (currentFrame) {
                                    sound.stop();
                                };
                            }
                            case "pause" /* pause */: {
                                return function (currentFrame) {
                                    sound.pause();
                                };
                            }
                            default: {
                                throw new Error(context + ": Unsupported action " + action);
                            }
                        }
                    };
                    MSFT_audio_emitter.prototype._loadAnimationEventAsync = function (context, animationContext, animation, event, babylonAnimationGroup) {
                        var _this = this;
                        if (babylonAnimationGroup.targetedAnimations.length == 0) {
                            return Promise.resolve();
                        }
                        var babylonAnimation = babylonAnimationGroup.targetedAnimations[0];
                        var emitterIndex = event.emitter;
                        var emitter = GLTF2.ArrayItem.Get("#/extensions/" + this.name + "/emitters", this._emitters, emitterIndex);
                        return this._loadEmitterAsync(context, emitter).then(function () {
                            var sound = emitter._babylonData.sound;
                            if (sound) {
                                var babylonAnimationEvent = new BABYLON.AnimationEvent(event.time, _this._getEventAction(context, sound, event.action, event.time, event.startOffset));
                                babylonAnimation.animation.addEvent(babylonAnimationEvent);
                                // Make sure all started audio stops when this animation is terminated.
                                babylonAnimationGroup.onAnimationGroupEndObservable.add(function () {
                                    sound.stop();
                                });
                                babylonAnimationGroup.onAnimationGroupPauseObservable.add(function () {
                                    sound.pause();
                                });
                            }
                        });
                    };
                    return MSFT_audio_emitter;
                }());
                Extensions.MSFT_audio_emitter = MSFT_audio_emitter;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new MSFT_audio_emitter(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=MSFT_audio_emitter.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "KHR_draco_mesh_compression";
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_draco_mesh_compression)
                 */
                var KHR_draco_mesh_compression = /** @class */ (function () {
                    /** @hidden */
                    function KHR_draco_mesh_compression(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = BABYLON.DracoCompression.DecoderAvailable;
                        this._loader = loader;
                    }
                    /** @hidden */
                    KHR_draco_mesh_compression.prototype.dispose = function () {
                        if (this._dracoCompression) {
                            this._dracoCompression.dispose();
                            delete this._dracoCompression;
                        }
                        delete this._loader;
                    };
                    /** @hidden */
                    KHR_draco_mesh_compression.prototype._loadVertexDataAsync = function (context, primitive, babylonMesh) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, primitive, this.name, function (extensionContext, extension) {
                            if (primitive.mode != undefined) {
                                if (primitive.mode !== 5 /* TRIANGLE_STRIP */ &&
                                    primitive.mode !== 4 /* TRIANGLES */) {
                                    throw new Error(context + ": Unsupported mode " + primitive.mode);
                                }
                                // TODO: handle triangle strips
                                if (primitive.mode === 5 /* TRIANGLE_STRIP */) {
                                    throw new Error(context + ": Mode " + primitive.mode + " is not currently supported");
                                }
                            }
                            var attributes = {};
                            var loadAttribute = function (name, kind) {
                                var uniqueId = extension.attributes[name];
                                if (uniqueId == undefined) {
                                    return;
                                }
                                babylonMesh._delayInfo = babylonMesh._delayInfo || [];
                                if (babylonMesh._delayInfo.indexOf(kind) === -1) {
                                    babylonMesh._delayInfo.push(kind);
                                }
                                attributes[kind] = uniqueId;
                            };
                            loadAttribute("POSITION", BABYLON.VertexBuffer.PositionKind);
                            loadAttribute("NORMAL", BABYLON.VertexBuffer.NormalKind);
                            loadAttribute("TANGENT", BABYLON.VertexBuffer.TangentKind);
                            loadAttribute("TEXCOORD_0", BABYLON.VertexBuffer.UVKind);
                            loadAttribute("TEXCOORD_1", BABYLON.VertexBuffer.UV2Kind);
                            loadAttribute("JOINTS_0", BABYLON.VertexBuffer.MatricesIndicesKind);
                            loadAttribute("WEIGHTS_0", BABYLON.VertexBuffer.MatricesWeightsKind);
                            loadAttribute("COLOR_0", BABYLON.VertexBuffer.ColorKind);
                            var bufferView = GLTF2.ArrayItem.Get(extensionContext, _this._loader.gltf.bufferViews, extension.bufferView);
                            if (!bufferView._dracoBabylonGeometry) {
                                bufferView._dracoBabylonGeometry = _this._loader.loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView).then(function (data) {
                                    if (!_this._dracoCompression) {
                                        _this._dracoCompression = new BABYLON.DracoCompression();
                                    }
                                    return _this._dracoCompression.decodeMeshAsync(data, attributes).then(function (babylonVertexData) {
                                        var babylonGeometry = new BABYLON.Geometry(babylonMesh.name, _this._loader.babylonScene);
                                        babylonVertexData.applyToGeometry(babylonGeometry);
                                        return babylonGeometry;
                                    }).catch(function (error) {
                                        throw new Error(context + ": " + error.message);
                                    });
                                });
                            }
                            return bufferView._dracoBabylonGeometry;
                        });
                    };
                    return KHR_draco_mesh_compression;
                }());
                Extensions.KHR_draco_mesh_compression = KHR_draco_mesh_compression;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new KHR_draco_mesh_compression(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=KHR_draco_mesh_compression.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "KHR_materials_pbrSpecularGlossiness";
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness)
                 */
                var KHR_materials_pbrSpecularGlossiness = /** @class */ (function () {
                    /** @hidden */
                    function KHR_materials_pbrSpecularGlossiness(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        this._loader = loader;
                    }
                    /** @hidden */
                    KHR_materials_pbrSpecularGlossiness.prototype.dispose = function () {
                        delete this._loader;
                    };
                    /** @hidden */
                    KHR_materials_pbrSpecularGlossiness.prototype.loadMaterialPropertiesAsync = function (context, material, babylonMaterial) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, material, this.name, function (extensionContext, extension) {
                            var promises = new Array();
                            promises.push(_this._loader.loadMaterialBasePropertiesAsync(context, material, babylonMaterial));
                            promises.push(_this._loadSpecularGlossinessPropertiesAsync(extensionContext, material, extension, babylonMaterial));
                            _this._loader.loadMaterialAlphaProperties(context, material, babylonMaterial);
                            return Promise.all(promises).then(function () { });
                        });
                    };
                    KHR_materials_pbrSpecularGlossiness.prototype._loadSpecularGlossinessPropertiesAsync = function (context, material, properties, babylonMaterial) {
                        if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                            throw new Error(context + ": Material type not supported");
                        }
                        var promises = new Array();
                        babylonMaterial.metallic = null;
                        babylonMaterial.roughness = null;
                        if (properties.diffuseFactor) {
                            babylonMaterial.albedoColor = BABYLON.Color3.FromArray(properties.diffuseFactor);
                            babylonMaterial.alpha = properties.diffuseFactor[3];
                        }
                        else {
                            babylonMaterial.albedoColor = BABYLON.Color3.White();
                        }
                        babylonMaterial.reflectivityColor = properties.specularFactor ? BABYLON.Color3.FromArray(properties.specularFactor) : BABYLON.Color3.White();
                        babylonMaterial.microSurface = properties.glossinessFactor == undefined ? 1 : properties.glossinessFactor;
                        if (properties.diffuseTexture) {
                            promises.push(this._loader.loadTextureInfoAsync(context + "/diffuseTexture", properties.diffuseTexture, function (texture) {
                                babylonMaterial.albedoTexture = texture;
                                return Promise.resolve();
                            }));
                        }
                        if (properties.specularGlossinessTexture) {
                            promises.push(this._loader.loadTextureInfoAsync(context + "/specularGlossinessTexture", properties.specularGlossinessTexture, function (texture) {
                                babylonMaterial.reflectivityTexture = texture;
                                return Promise.resolve();
                            }));
                            babylonMaterial.reflectivityTexture.hasAlpha = true;
                            babylonMaterial.useMicroSurfaceFromReflectivityMapAlpha = true;
                        }
                        return Promise.all(promises).then(function () { });
                    };
                    return KHR_materials_pbrSpecularGlossiness;
                }());
                Extensions.KHR_materials_pbrSpecularGlossiness = KHR_materials_pbrSpecularGlossiness;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new KHR_materials_pbrSpecularGlossiness(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=KHR_materials_pbrSpecularGlossiness.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "KHR_materials_unlit";
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit)
                 */
                var KHR_materials_unlit = /** @class */ (function () {
                    /** @hidden */
                    function KHR_materials_unlit(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        this._loader = loader;
                    }
                    /** @hidden */
                    KHR_materials_unlit.prototype.dispose = function () {
                        delete this._loader;
                    };
                    /** @hidden */
                    KHR_materials_unlit.prototype.loadMaterialPropertiesAsync = function (context, material, babylonMaterial) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, material, this.name, function () {
                            return _this._loadUnlitPropertiesAsync(context, material, babylonMaterial);
                        });
                    };
                    KHR_materials_unlit.prototype._loadUnlitPropertiesAsync = function (context, material, babylonMaterial) {
                        if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                            throw new Error(context + ": Material type not supported");
                        }
                        var promises = new Array();
                        babylonMaterial.unlit = true;
                        var properties = material.pbrMetallicRoughness;
                        if (properties) {
                            if (properties.baseColorFactor) {
                                babylonMaterial.albedoColor = BABYLON.Color3.FromArray(properties.baseColorFactor);
                                babylonMaterial.alpha = properties.baseColorFactor[3];
                            }
                            else {
                                babylonMaterial.albedoColor = BABYLON.Color3.White();
                            }
                            if (properties.baseColorTexture) {
                                promises.push(this._loader.loadTextureInfoAsync(context + "/baseColorTexture", properties.baseColorTexture, function (texture) {
                                    babylonMaterial.albedoTexture = texture;
                                    return Promise.resolve();
                                }));
                            }
                        }
                        if (material.doubleSided) {
                            babylonMaterial.backFaceCulling = false;
                            babylonMaterial.twoSidedLighting = true;
                        }
                        this._loader.loadMaterialAlphaProperties(context, material, babylonMaterial);
                        return Promise.all(promises).then(function () { });
                    };
                    return KHR_materials_unlit;
                }());
                Extensions.KHR_materials_unlit = KHR_materials_unlit;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new KHR_materials_unlit(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=KHR_materials_unlit.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "KHR_lights_punctual";
                var LightType;
                (function (LightType) {
                    LightType["DIRECTIONAL"] = "directional";
                    LightType["POINT"] = "point";
                    LightType["SPOT"] = "spot";
                })(LightType || (LightType = {}));
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/blob/1048d162a44dbcb05aefc1874bfd423cf60135a6/extensions/2.0/Khronos/KHR_lights_punctual/README.md) (Experimental)
                 */
                var KHR_lights = /** @class */ (function () {
                    /** @hidden */
                    function KHR_lights(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        this._loader = loader;
                    }
                    /** @hidden */
                    KHR_lights.prototype.dispose = function () {
                        delete this._loader;
                        delete this._lights;
                    };
                    /** @hidden */
                    KHR_lights.prototype.onLoading = function () {
                        var extensions = this._loader.gltf.extensions;
                        if (extensions && extensions[this.name]) {
                            var extension = extensions[this.name];
                            this._lights = extension.lights;
                        }
                    };
                    /** @hidden */
                    KHR_lights.prototype.loadNodeAsync = function (context, node, assign) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, node, this.name, function (extensionContext, extension) {
                            return _this._loader.loadNodeAsync(context, node, function (babylonMesh) {
                                var babylonLight;
                                var light = GLTF2.ArrayItem.Get(extensionContext, _this._lights, extension.light);
                                var name = light.name || babylonMesh.name;
                                switch (light.type) {
                                    case LightType.DIRECTIONAL: {
                                        babylonLight = new BABYLON.DirectionalLight(name, BABYLON.Vector3.Backward(), _this._loader.babylonScene);
                                        break;
                                    }
                                    case LightType.POINT: {
                                        babylonLight = new BABYLON.PointLight(name, BABYLON.Vector3.Zero(), _this._loader.babylonScene);
                                        break;
                                    }
                                    case LightType.SPOT: {
                                        var babylonSpotLight = new BABYLON.SpotLight(name, BABYLON.Vector3.Zero(), BABYLON.Vector3.Backward(), 0, 1, _this._loader.babylonScene);
                                        babylonSpotLight.angle = ((light.spot && light.spot.outerConeAngle) || Math.PI / 4) * 2;
                                        babylonSpotLight.innerAngle = ((light.spot && light.spot.innerConeAngle) || 0) * 2;
                                        babylonLight = babylonSpotLight;
                                        break;
                                    }
                                    default: {
                                        throw new Error(extensionContext + ": Invalid light type (" + light.type + ")");
                                    }
                                }
                                babylonLight.falloffType = BABYLON.Light.FALLOFF_GLTF;
                                babylonLight.diffuse = light.color ? BABYLON.Color3.FromArray(light.color) : BABYLON.Color3.White();
                                babylonLight.intensity = light.intensity == undefined ? 1 : light.intensity;
                                babylonLight.range = light.range == undefined ? Number.MAX_VALUE : light.range;
                                babylonLight.parent = babylonMesh;
                                assign(babylonMesh);
                            });
                        });
                    };
                    return KHR_lights;
                }());
                Extensions.KHR_lights = KHR_lights;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new KHR_lights(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=KHR_lights_punctual.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "KHR_texture_transform";
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_texture_transform/README.md)
                 */
                var KHR_texture_transform = /** @class */ (function () {
                    /** @hidden */
                    function KHR_texture_transform(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        this._loader = loader;
                    }
                    /** @hidden */
                    KHR_texture_transform.prototype.dispose = function () {
                        delete this._loader;
                    };
                    /** @hidden */
                    KHR_texture_transform.prototype.loadTextureInfoAsync = function (context, textureInfo, assign) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, textureInfo, this.name, function (extensionContext, extension) {
                            return _this._loader.loadTextureInfoAsync(context, textureInfo, function (babylonTexture) {
                                if (!(babylonTexture instanceof BABYLON.Texture)) {
                                    throw new Error(extensionContext + ": Texture type not supported");
                                }
                                if (extension.offset) {
                                    babylonTexture.uOffset = extension.offset[0];
                                    babylonTexture.vOffset = extension.offset[1];
                                }
                                // Always rotate around the origin.
                                babylonTexture.uRotationCenter = 0;
                                babylonTexture.vRotationCenter = 0;
                                if (extension.rotation) {
                                    babylonTexture.wAng = -extension.rotation;
                                }
                                if (extension.scale) {
                                    babylonTexture.uScale = extension.scale[0];
                                    babylonTexture.vScale = extension.scale[1];
                                }
                                if (extension.texCoord != undefined) {
                                    babylonTexture.coordinatesIndex = extension.texCoord;
                                }
                                assign(babylonTexture);
                            });
                        });
                    };
                    return KHR_texture_transform;
                }());
                Extensions.KHR_texture_transform = KHR_texture_transform;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new KHR_texture_transform(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=KHR_texture_transform.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "EXT_lights_image_based";
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/blob/eb3e32332042e04691a5f35103f8c261e50d8f1e/extensions/2.0/Khronos/EXT_lights_image_based/README.md) (Experimental)
                 */
                var EXT_lights_image_based = /** @class */ (function () {
                    /** @hidden */
                    function EXT_lights_image_based(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        this._loader = loader;
                    }
                    /** @hidden */
                    EXT_lights_image_based.prototype.dispose = function () {
                        delete this._loader;
                        delete this._lights;
                    };
                    /** @hidden */
                    EXT_lights_image_based.prototype.onLoading = function () {
                        var extensions = this._loader.gltf.extensions;
                        if (extensions && extensions[this.name]) {
                            var extension = extensions[this.name];
                            this._lights = extension.lights;
                        }
                    };
                    /** @hidden */
                    EXT_lights_image_based.prototype.loadSceneAsync = function (context, scene) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, scene, this.name, function (extensionContext, extension) {
                            var promises = new Array();
                            promises.push(_this._loader.loadSceneAsync(context, scene));
                            _this._loader.logOpen("" + extensionContext);
                            var light = GLTF2.ArrayItem.Get(extensionContext + "/light", _this._lights, extension.light);
                            promises.push(_this._loadLightAsync("#/extensions/" + _this.name + "/lights/" + extension.light, light).then(function (texture) {
                                _this._loader.babylonScene.environmentTexture = texture;
                            }));
                            _this._loader.logClose();
                            return Promise.all(promises).then(function () { });
                        });
                    };
                    EXT_lights_image_based.prototype._loadLightAsync = function (context, light) {
                        var _this = this;
                        if (!light._loaded) {
                            var promises = new Array();
                            this._loader.logOpen("" + context);
                            var imageData_1 = new Array(light.specularImages.length);
                            var _loop_1 = function (mipmap) {
                                var faces = light.specularImages[mipmap];
                                imageData_1[mipmap] = new Array(faces.length);
                                var _loop_2 = function (face) {
                                    var specularImageContext = context + "/specularImages/" + mipmap + "/" + face;
                                    this_1._loader.logOpen("" + specularImageContext);
                                    var index = faces[face];
                                    var image = GLTF2.ArrayItem.Get(specularImageContext, this_1._loader.gltf.images, index);
                                    promises.push(this_1._loader.loadImageAsync("#/images/" + index, image).then(function (data) {
                                        imageData_1[mipmap][face] = data;
                                    }));
                                    this_1._loader.logClose();
                                };
                                for (var face = 0; face < faces.length; face++) {
                                    _loop_2(face);
                                }
                            };
                            var this_1 = this;
                            for (var mipmap = 0; mipmap < light.specularImages.length; mipmap++) {
                                _loop_1(mipmap);
                            }
                            this._loader.logClose();
                            light._loaded = Promise.all(promises).then(function () {
                                var babylonTexture = new BABYLON.RawCubeTexture(_this._loader.babylonScene, null, light.specularImageSize);
                                light._babylonTexture = babylonTexture;
                                if (light.intensity != undefined) {
                                    babylonTexture.level = light.intensity;
                                }
                                if (light.rotation) {
                                    var rotation = BABYLON.Quaternion.FromArray(light.rotation);
                                    // Invert the rotation so that positive rotation is counter-clockwise.
                                    if (!_this._loader.babylonScene.useRightHandedSystem) {
                                        rotation = BABYLON.Quaternion.Inverse(rotation);
                                    }
                                    BABYLON.Matrix.FromQuaternionToRef(rotation, babylonTexture.getReflectionTextureMatrix());
                                }
                                var sphericalHarmonics = BABYLON.SphericalHarmonics.FromArray(light.irradianceCoefficients);
                                sphericalHarmonics.scale(light.intensity);
                                sphericalHarmonics.convertIrradianceToLambertianRadiance();
                                var sphericalPolynomial = BABYLON.SphericalPolynomial.FromHarmonics(sphericalHarmonics);
                                // Compute the lod generation scale to fit exactly to the number of levels available.
                                var lodGenerationScale = (imageData_1.length - 1) / BABYLON.Scalar.Log2(light.specularImageSize);
                                return babylonTexture.updateRGBDAsync(imageData_1, sphericalPolynomial, lodGenerationScale);
                            });
                        }
                        return light._loaded.then(function () {
                            return light._babylonTexture;
                        });
                    };
                    return EXT_lights_image_based;
                }());
                Extensions.EXT_lights_image_based = EXT_lights_image_based;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new EXT_lights_image_based(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=EXT_lights_image_based.js.map
