﻿/// <reference path="../../../dist/preview release/babylon.d.ts"/>

module BABYLON {
    /**
    * Coordinate system mode that will be used when loading from the gltf file
    */
    export enum GLTFLoaderCoordinateSystemMode {
        /**
         * Automatically convert the glTF right-handed data to the appropriate system based on the current coordinate system mode of the scene.
         */
        AUTO,

        /**
         * Sets the useRightHandedSystem flag on the scene.
         */
        FORCE_RIGHT_HANDED,
    }

    /**
    * Animation mode that determines which animations should be started when a file is loaded
    */
    export enum GLTFLoaderAnimationStartMode {
        /**
         * No animation will start.
         */
        NONE,

        /**
         * The first animation will start.
         */
        FIRST,

        /**
         * All animations will start.
         */
        ALL,
    }

    /**
    * Loaded gltf data
    */
    export interface IGLTFLoaderData {
        /**
        * Loaded json string converted to an object
        */
        json: Object;
        /**
        * Loaded ArrayBufferView
        */
        bin: Nullable<ArrayBufferView>;
    }

    /**
    * Gltf extension interface
    */
    export interface IGLTFLoaderExtension {
        /**
         * The name of this extension.
         */
        readonly name: string;

        /**
         * Whether this extension is enabled.
         */
        enabled: boolean;
    }

    /**
    * Loading state
    */
    export enum GLTFLoaderState {
        /**
         * The asset is loading.
         */
        LOADING,

        /**
         * The asset is ready for rendering.
         */
        READY,

        /**
         * The asset is completely loaded.
         */
        COMPLETE
    }

    /**
    * GLTF loader interface
    */
    export interface IGLTFLoader extends IDisposable {
        /**
        * Coordinate system that will be used when loading from the gltf file
        */
        coordinateSystemMode: GLTFLoaderCoordinateSystemMode;
        /**
        * Animation mode that determines which animations should be started when a file is loaded
        */
        animationStartMode: GLTFLoaderAnimationStartMode;
        /**
        * If the materials in the file should automatically be compiled
        */
        compileMaterials: boolean;
        /**
        * If a clip plane should be usede when loading meshes in the file
        */
        useClipPlane: boolean;
        /**
        * If shadow generators should automatically be compiled
        */
        compileShadowGenerators: boolean;

        /**
        * Observable that fires each time a mesh is loaded
        */
        onMeshLoadedObservable: Observable<AbstractMesh>;
        /**
        * Observable that fires each time a texture is loaded
        */
        onTextureLoadedObservable: Observable<BaseTexture>;
         /**
        * Observable that fires each time a material is loaded
        */
        onMaterialLoadedObservable: Observable<Material>;
        /**
        * Observable that fires when the load has completed
        */
        onCompleteObservable: Observable<IGLTFLoader>;
        /**
        * Observable that fires when the loader is disposed
        */
        onDisposeObservable: Observable<IGLTFLoader>;
        /**
        * Observable that fire when an extension is loaded
        */
        onExtensionLoadedObservable: Observable<IGLTFLoaderExtension>;

        /**
        * Loader state
        */
        state: Nullable<GLTFLoaderState>;

        /**
        * Imports one or more meshes from a loaded gltf file and adds them to the scene
        */
        importMeshAsync: (meshesNames: any, scene: Scene, data: IGLTFLoaderData, rootUrl: string, onProgress?: (event: SceneLoaderProgressEvent) => void) => Promise<{ meshes: AbstractMesh[], particleSystems: ParticleSystem[], skeletons: Skeleton[], animationGroups: AnimationGroup[] }>;
        /**
        * Imports all objects from a loaded gltf file and adds them to the scene
        */
        loadAsync: (scene: Scene, data: IGLTFLoaderData, rootUrl: string, onProgress?: (event: SceneLoaderProgressEvent) => void) => Promise<void>;
    }
    /** File loader to load gltf files into a babylon scene */
    export class GLTFFileLoader implements IDisposable, ISceneLoaderPluginAsync, ISceneLoaderPluginFactory {
        /** Creates a gltf 1.0 file loader */
        public static CreateGLTFLoaderV1: () => IGLTFLoader;
        /** Creates a gltf 2.0 file loader */
        public static CreateGLTFLoaderV2: () => IGLTFLoader;

        // #region Common options

        /**
         * Raised when the asset has been parsed.
         * The data.json property stores the glTF JSON.
         * The data.bin property stores the BIN chunk from a glTF binary or null if the input is not a glTF binary.
         */
        public onParsedObservable = new Observable<IGLTFLoaderData>();

        private _onParsedObserver: Nullable<Observer<IGLTFLoaderData>>;
        /** Raised when the asset has been parsed. */
        public set onParsed(callback: (loaderData: IGLTFLoaderData) => void) {
            if (this._onParsedObserver) {
                this.onParsedObservable.remove(this._onParsedObserver);
            }
            this._onParsedObserver = this.onParsedObservable.add(callback);
        }

        // #endregion

        // #region V1 options
        /**
         * Set this property to false to disable incremental loading which delays the loader from calling the success callback until after loading the meshes and shaders. Textures always loads asynchronously. For example, the success callback can compute the bounding information of the loaded meshes when incremental loading is disabled. Defaults to true.
         */
        public static IncrementalLoading = true;

        /**
         * Set this property to true in order to work with homogeneous coordinates, available with some converters and exporters. Defaults to false. See https://en.wikipedia.org/wiki/Homogeneous_coordinates
         */
        public static HomogeneousCoordinates = false;

        // #endregion

        // #region V2 options

        /**
         * The coordinate system mode (AUTO, FORCE_RIGHT_HANDED). Defaults to AUTO.
         * - AUTO - Automatically convert the glTF right-handed data to the appropriate system based on the current coordinate system mode of the scene.
         * - FORCE_RIGHT_HANDED - Sets the useRightHandedSystem flag on the scene.
         */
        public coordinateSystemMode = GLTFLoaderCoordinateSystemMode.AUTO;

        /**
        * The animation start mode (NONE, FIRST, ALL). Defaults to FIRST.
        * - NONE - No animation will start.
        * - FIRST - The first animation will start.
        * - ALL - All animations will start.
        */
        public animationStartMode = GLTFLoaderAnimationStartMode.FIRST;

        /**
         * Set to true to compile materials before raising the success callback. Defaults to false.
         */
        public compileMaterials = false;

        /**
         * Set to true to also compile materials with clip planes. Defaults to false.
         */
        public useClipPlane = false;

        /**
         * Set to true to compile shadow generators before raising the success callback. Defaults to false.
         */
        public compileShadowGenerators = false;

        /**
         * Raised when the loader creates a mesh after parsing the glTF properties of the mesh.
         */
        public readonly onMeshLoadedObservable = new Observable<AbstractMesh>();

        private _onMeshLoadedObserver: Nullable<Observer<AbstractMesh>>;
        /**
         * Raised when the loader creates a mesh after parsing the glTF properties of the mesh. (onMeshLoadedObservable is likely desired instead.)
         */
        public set onMeshLoaded(callback: (mesh: AbstractMesh) => void) {
            if (this._onMeshLoadedObserver) {
                this.onMeshLoadedObservable.remove(this._onMeshLoadedObserver);
            }
            this._onMeshLoadedObserver = this.onMeshLoadedObservable.add(callback);
        }

        /**
         * Raised when the loader creates a texture after parsing the glTF properties of the texture.
         */
        public readonly onTextureLoadedObservable = new Observable<BaseTexture>();

        private _onTextureLoadedObserver: Nullable<Observer<BaseTexture>>;
        /**
         * Method called when a texture has been loaded (onTextureLoadedObservable is likely desired instead.)
         */
        public set onTextureLoaded(callback: (texture: BaseTexture) => void) {
            if (this._onTextureLoadedObserver) {
                this.onTextureLoadedObservable.remove(this._onTextureLoadedObserver);
            }
            this._onTextureLoadedObserver = this.onTextureLoadedObservable.add(callback);
        }

        /**
         * Raised when the loader creates a material after parsing the glTF properties of the material.
         */
        public readonly onMaterialLoadedObservable = new Observable<Material>();

        private _onMaterialLoadedObserver: Nullable<Observer<Material>>;
        /**
         * Method when the loader creates a material after parsing the glTF properties of the material. (onMaterialLoadedObservable is likely desired instead.)
         */
        public set onMaterialLoaded(callback: (material: Material) => void) {
            if (this._onMaterialLoadedObserver) {
                this.onMaterialLoadedObservable.remove(this._onMaterialLoadedObserver);
            }
            this._onMaterialLoadedObserver = this.onMaterialLoadedObservable.add(callback);
        }

        /**
         * Raised when the asset is completely loaded, immediately before the loader is disposed.
         * For assets with LODs, raised when all of the LODs are complete.
         * For assets without LODs, raised when the model is complete, immediately after the loader resolves the returned promise.
         */
        public readonly onCompleteObservable = new Observable<GLTFFileLoader>();

        private _onCompleteObserver: Nullable<Observer<GLTFFileLoader>>;
        /**
         * Raised when the asset is completely loaded, immediately before the loader is disposed. (onCompleteObservable is likely desired instead.)
         */
        public set onComplete(callback: () => void) {
            if (this._onCompleteObserver) {
                this.onCompleteObservable.remove(this._onCompleteObserver);
            }
            this._onCompleteObserver = this.onCompleteObservable.add(callback);
        }

        /**
        * Raised after the loader is disposed.
        */
        public readonly onDisposeObservable = new Observable<GLTFFileLoader>();

        private _onDisposeObserver: Nullable<Observer<GLTFFileLoader>>;
        /**
         * Raised after the loader is disposed. (onDisposeObservable is likely desired instead.)
         */
        public set onDispose(callback: () => void) {
            if (this._onDisposeObserver) {
                this.onDisposeObservable.remove(this._onDisposeObserver);
            }
            this._onDisposeObserver = this.onDisposeObservable.add(callback);
        }

        /**
         * Raised after a loader extension is created.
         * Set additional options for a loader extension in this event.
         */
        public readonly onExtensionLoadedObservable = new Observable<IGLTFLoaderExtension>();

        private _onExtensionLoadedObserver: Nullable<Observer<IGLTFLoaderExtension>>;
        /**
         * Raised after a loader extension is created. (onExtensionLoadedObservable is likely desired instead.)
         */
        public set onExtensionLoaded(callback: (extension: IGLTFLoaderExtension) => void) {
            if (this._onExtensionLoadedObserver) {
                this.onExtensionLoadedObservable.remove(this._onExtensionLoadedObserver);
            }
            this._onExtensionLoadedObserver = this.onExtensionLoadedObservable.add(callback);
        }

        /**
         * Returns a promise that resolves when the asset is completely loaded.
         * @returns A promise that resolves when the asset is completely loaded.
         */
        public whenCompleteAsync(): Promise<void> {
            return new Promise(resolve => {
                this.onCompleteObservable.add(() => {
                    resolve();
                }, undefined, undefined, undefined, true);
            });
        }

        /**
         * The loader state (LOADING, READY, COMPLETE) or null if the loader is not active.
         */
        public get loaderState(): Nullable<GLTFLoaderState> {
            return this._loader ? this._loader.state : null;
        }

        // #endregion

        private _loader: Nullable<IGLTFLoader> = null;

        /**
         * Name of the loader ("gltf")
         */
        public name = "gltf";

        /**
         * Supported file extensions of the loader (.gltf, .glb)
         */
        public extensions: ISceneLoaderPluginExtensions = {
            ".gltf": { isBinary: false },
            ".glb": { isBinary: true }
        };

        /**
         * Disposes the loader, releases resources during load, and cancels any outstanding requests.
         */
        public dispose(): void {
            if (this._loader) {
                this._loader.dispose();
                this._loader = null;
            }

            this.onMeshLoadedObservable.clear();
            this.onTextureLoadedObservable.clear();
            this.onMaterialLoadedObservable.clear();

            this.onDisposeObservable.notifyObservers(this);
            this.onDisposeObservable.clear();
        }

        /**
        * Imports one or more meshes from a loaded gltf file and adds them to the scene
        * @param meshesNames a string or array of strings of the mesh names that should be loaded from the file
        * @param scene the scene the meshes should be added to
        * @param data gltf data containing information of the meshes in a loaded file
        * @param rootUrl root url to load from
        * @param onProgress event that fires when loading progress has occured
        * @returns a promise containg the loaded meshes, particles, skeletons and animations
        */
        public importMeshAsync(meshesNames: any, scene: Scene, data: any, rootUrl: string, onProgress?: (event: SceneLoaderProgressEvent) => void): Promise<{ meshes: AbstractMesh[], particleSystems: ParticleSystem[], skeletons: Skeleton[], animationGroups: AnimationGroup[] }> {
            return Promise.resolve().then(() => {
                const loaderData = this._parse(data);
                this._loader = this._getLoader(loaderData);
                return this._loader.importMeshAsync(meshesNames, scene, loaderData, rootUrl, onProgress);
            });
        }

        /**
        * Imports all objects from a loaded gltf file and adds them to the scene
        * @param scene the scene the objects should be added to
        * @param data gltf data containing information of the meshes in a loaded file
        * @param rootUrl root url to load from
        * @param onProgress event that fires when loading progress has occured
        * @returns a promise which completes when objects have been loaded to the scene
        */
        public loadAsync(scene: Scene, data: string | ArrayBuffer, rootUrl: string, onProgress?: (event: SceneLoaderProgressEvent) => void): Promise<void> {
            return Promise.resolve().then(() => {
                const loaderData = this._parse(data);
                this._loader = this._getLoader(loaderData);
                return this._loader.loadAsync(scene, loaderData, rootUrl, onProgress);
            });
        }

        /**
         * Load into an asset container.
         * @param scene The scene to load into
         * @param data The data to import
         * @param rootUrl The root url for scene and resources
         * @param onProgress The callback when the load progresses
         * @returns The loaded asset container
         */
        public loadAssetContainerAsync(scene: Scene, data: string | ArrayBuffer, rootUrl: string, onProgress?: (event: SceneLoaderProgressEvent) => void): Promise<AssetContainer> {
            return Promise.resolve().then(() => {
                const loaderData = this._parse(data);
                this._loader = this._getLoader(loaderData);
                return this._loader.importMeshAsync(null, scene, loaderData, rootUrl, onProgress).then(result => {
                    const container = new AssetContainer(scene);
                    Array.prototype.push.apply(container.meshes, result.meshes);
                    Array.prototype.push.apply(container.particleSystems, result.particleSystems);
                    Array.prototype.push.apply(container.skeletons, result.skeletons);
                    Array.prototype.push.apply(container.animationGroups, result.animationGroups);
                    container.removeAllFromScene();
                    return container;
                });
            });
        }

        /**
         * If the data string can be loaded directly
         * @param data string contianing the file data
         * @returns if the data can be loaded directly
         */
        public canDirectLoad(data: string): boolean {
            return ((data.indexOf("scene") !== -1) && (data.indexOf("node") !== -1));
        }

        /**
         * Rewrites a url by combining a root url and response url
         */
        public rewriteRootURL: (rootUrl: string, responseURL?: string) => string;

        /**
         * Instantiates a gltf file loader plugin
         * @returns the created plugin
         */
        public createPlugin(): ISceneLoaderPlugin | ISceneLoaderPluginAsync {
            return new GLTFFileLoader();
        }

        private _parse(data: string | ArrayBuffer): IGLTFLoaderData {
            let parsedData: IGLTFLoaderData;
            if (data instanceof ArrayBuffer) {
                parsedData = GLTFFileLoader._parseBinary(data);
            }
            else {
                parsedData = {
                    json: JSON.parse(data),
                    bin: null
                };
            }

            this.onParsedObservable.notifyObservers(parsedData);
            this.onParsedObservable.clear();

            return parsedData;
        }

        private _getLoader(loaderData: IGLTFLoaderData): IGLTFLoader {
            const loaderVersion = { major: 2, minor: 0 };

            const asset = (<any>loaderData.json).asset || {};

            const version = GLTFFileLoader._parseVersion(asset.version);
            if (!version) {
                throw new Error("Invalid version: " + asset.version);
            }

            if (asset.minVersion !== undefined) {
                const minVersion = GLTFFileLoader._parseVersion(asset.minVersion);
                if (!minVersion) {
                    throw new Error("Invalid minimum version: " + asset.minVersion);
                }

                if (GLTFFileLoader._compareVersion(minVersion, loaderVersion) > 0) {
                    throw new Error("Incompatible minimum version: " + asset.minVersion);
                }
            }

            const createLoaders: { [key: number]: () => IGLTFLoader } = {
                1: GLTFFileLoader.CreateGLTFLoaderV1,
                2: GLTFFileLoader.CreateGLTFLoaderV2
            };

            const createLoader = createLoaders[version.major];
            if (!createLoader) {
                throw new Error("Unsupported version: " + asset.version);
            }

            const loader = createLoader();
            loader.coordinateSystemMode = this.coordinateSystemMode;
            loader.animationStartMode = this.animationStartMode;
            loader.compileMaterials = this.compileMaterials;
            loader.useClipPlane = this.useClipPlane;
            loader.compileShadowGenerators = this.compileShadowGenerators;
            loader.onMeshLoadedObservable.add(mesh => this.onMeshLoadedObservable.notifyObservers(mesh));
            loader.onTextureLoadedObservable.add(texture => this.onTextureLoadedObservable.notifyObservers(texture));
            loader.onMaterialLoadedObservable.add(material => this.onMaterialLoadedObservable.notifyObservers(material));
            loader.onExtensionLoadedObservable.add(extension => this.onExtensionLoadedObservable.notifyObservers(extension));

            loader.onCompleteObservable.add(() => {
                this.onMeshLoadedObservable.clear();
                this.onTextureLoadedObservable.clear();
                this.onMaterialLoadedObservable.clear();

                this.onCompleteObservable.notifyObservers(this);
                this.onCompleteObservable.clear();
            });

            return loader;
        }

        private static _parseBinary(data: ArrayBuffer): IGLTFLoaderData {
            const Binary = {
                Magic: 0x46546C67
            };

            const binaryReader = new BinaryReader(data);

            const magic = binaryReader.readUint32();
            if (magic !== Binary.Magic) {
                throw new Error("Unexpected magic: " + magic);
            }

            const version = binaryReader.readUint32();
            switch (version) {
                case 1: return GLTFFileLoader._parseV1(binaryReader);
                case 2: return GLTFFileLoader._parseV2(binaryReader);
            }

            throw new Error("Unsupported version: " + version);
        }

        private static _parseV1(binaryReader: BinaryReader): IGLTFLoaderData {
            const ContentFormat = {
                JSON: 0
            };

            const length = binaryReader.readUint32();
            if (length != binaryReader.getLength()) {
                throw new Error("Length in header does not match actual data length: " + length + " != " + binaryReader.getLength());
            }

            const contentLength = binaryReader.readUint32();
            const contentFormat = binaryReader.readUint32();

            let content: Object;
            switch (contentFormat) {
                case ContentFormat.JSON: {
                    content = JSON.parse(GLTFFileLoader._decodeBufferToText(binaryReader.readUint8Array(contentLength)));
                    break;
                }
                default: {
                    throw new Error("Unexpected content format: " + contentFormat);
                }
            }

            const bytesRemaining = binaryReader.getLength() - binaryReader.getPosition();
            const body = binaryReader.readUint8Array(bytesRemaining);

            return {
                json: content,
                bin: body
            };
        }

        private static _parseV2(binaryReader: BinaryReader): IGLTFLoaderData {
            const ChunkFormat = {
                JSON: 0x4E4F534A,
                BIN: 0x004E4942
            };

            const length = binaryReader.readUint32();
            if (length !== binaryReader.getLength()) {
                throw new Error("Length in header does not match actual data length: " + length + " != " + binaryReader.getLength());
            }

            // JSON chunk
            const chunkLength = binaryReader.readUint32();
            const chunkFormat = binaryReader.readUint32();
            if (chunkFormat !== ChunkFormat.JSON) {
                throw new Error("First chunk format is not JSON");
            }
            const json = JSON.parse(GLTFFileLoader._decodeBufferToText(binaryReader.readUint8Array(chunkLength)));

            // Look for BIN chunk
            let bin: Nullable<Uint8Array> = null;
            while (binaryReader.getPosition() < binaryReader.getLength()) {
                const chunkLength = binaryReader.readUint32();
                const chunkFormat = binaryReader.readUint32();
                switch (chunkFormat) {
                    case ChunkFormat.JSON: {
                        throw new Error("Unexpected JSON chunk");
                    }
                    case ChunkFormat.BIN: {
                        bin = binaryReader.readUint8Array(chunkLength);
                        break;
                    }
                    default: {
                        // ignore unrecognized chunkFormat
                        binaryReader.skipBytes(chunkLength);
                        break;
                    }
                }
            }

            return {
                json: json,
                bin: bin
            };
        }

        private static _parseVersion(version: string): Nullable<{ major: number, minor: number }> {
            if (version === "1.0" || version === "1.0.1") {
                return {
                    major: 1,
                    minor: 0
                };
            }

            const match = (version + "").match(/^(\d+)\.(\d+)/);
            if (!match) {
                return null;
            }

            return {
                major: parseInt(match[1]),
                minor: parseInt(match[2])
            };
        }

        private static _compareVersion(a: { major: number, minor: number }, b: { major: number, minor: number }) {
            if (a.major > b.major) return 1;
            if (a.major < b.major) return -1;
            if (a.minor > b.minor) return 1;
            if (a.minor < b.minor) return -1;
            return 0;
        }

        private static _decodeBufferToText(buffer: Uint8Array): string {
            let result = "";
            const length = buffer.byteLength;

            for (let i = 0; i < length; i++) {
                result += String.fromCharCode(buffer[i]);
            }

            return result;
        }
    }

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
            const value = this._dataView.getUint32(this._byteOffset, true);
            this._byteOffset += 4;
            return value;
        }

        public readUint8Array(length: number): Uint8Array {
            const value = new Uint8Array(this._arrayBuffer, this._byteOffset, length);
            this._byteOffset += length;
            return value;
        }

        public skipBytes(length: number): void {
            this._byteOffset += length;
        }
    }

    if (BABYLON.SceneLoader) {
        BABYLON.SceneLoader.RegisterPlugin(new GLTFFileLoader());
    }
}
