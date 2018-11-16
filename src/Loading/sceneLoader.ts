import { IFileRequest, Tools } from "Misc/tools";
import { Observable } from "Misc/observable";
import { FilesInput } from "Misc/filesInput";
import { Nullable } from "types";
import { Scene } from "scene";
import { Engine } from "Engines/engine";
import { AbstractMesh } from "Meshes/abstractMesh";
import { AnimationGroup } from "Animations/animationGroup";
import { _TimeToken } from "Instrumentation/timeToken";
import { IOfflineProvider } from "Offline/IOfflineProvider";
import { _DepthCullingState, _StencilState, _AlphaState } from "States";
import { AssetContainer } from "assetContainer";
import { IParticleSystem } from "Particles/IParticleSystem";
import { Skeleton } from "Bones/skeleton";
import { Logger } from "Misc/logger";
    /**
     * Class used to represent data loading progression
     */
    export class SceneLoaderProgressEvent {
        /**
         * Create a new progress event
         * @param lengthComputable defines if data length to load can be evaluated
         * @param loaded defines the loaded data length
         * @param total defines the data length to load
         */
        constructor(
            /** defines if data length to load can be evaluated */
            public readonly lengthComputable: boolean,
            /** defines the loaded data length */
            public readonly loaded: number,
            /** defines the data length to load */
            public readonly total: number) {
        }

        /**
         * Creates a new SceneLoaderProgressEvent from a ProgressEvent
         * @param event defines the source event
         * @returns a new SceneLoaderProgressEvent
         */
        public static FromProgressEvent(event: ProgressEvent): SceneLoaderProgressEvent {
            return new SceneLoaderProgressEvent(event.lengthComputable, event.loaded, event.total);
        }
    }

    /**
     * Interface used by SceneLoader plugins to define supported file extensions
     */
    export interface ISceneLoaderPluginExtensions {
        /**
         * Defines the list of supported extensions
         */
        [extension: string]: {
            isBinary: boolean;
        };
    }

    /**
     * Interface used by SceneLoader plugin factory
     */
    export interface ISceneLoaderPluginFactory {
        /**
         * Defines the name of the factory
         */
        name: string;
        /**
         * Function called to create a new plugin
         * @return the new plugin
         */
        createPlugin(): ISceneLoaderPlugin | ISceneLoaderPluginAsync;
        /**
         * Boolean indicating if the plugin can direct load specific data
         */
        canDirectLoad?: (data: string) => boolean;
    }

    /**
     * Interface used to define a SceneLoader plugin
     */
    export interface ISceneLoaderPlugin {
        /**
         * The friendly name of this plugin.
         */
        name: string;

        /**
         * The file extensions supported by this plugin.
         */
        extensions: string | ISceneLoaderPluginExtensions;

        /**
         * Import meshes into a scene.
         * @param meshesNames An array of mesh names, a single mesh name, or empty string for all meshes that filter what meshes are imported
         * @param scene The scene to import into
         * @param data The data to import
         * @param rootUrl The root url for scene and resources
         * @param meshes The meshes array to import into
         * @param particleSystems The particle systems array to import into
         * @param skeletons The skeletons array to import into
         * @param onError The callback when import fails
         * @returns True if successful or false otherwise
         */
        importMesh(meshesNames: any, scene: Scene, data: any, rootUrl: string, meshes: AbstractMesh[], particleSystems: IParticleSystem[], skeletons: Skeleton[], onError?: (message: string, exception?: any) => void): boolean;

        /**
         * Load into a scene.
         * @param scene The scene to load into
         * @param data The data to import
         * @param rootUrl The root url for scene and resources
         * @param onError The callback when import fails
         * @returns true if successful or false otherwise
         */
        load(scene: Scene, data: string, rootUrl: string, onError?: (message: string, exception?: any) => void): boolean;

        /**
         * The callback that returns true if the data can be directly loaded.
         */
        canDirectLoad?: (data: string) => boolean;

        /**
         * The callback that allows custom handling of the root url based on the response url.
         */
        rewriteRootURL?: (rootUrl: string, responseURL?: string) => string;

        /**
         * Load into an asset container.
         * @param scene The scene to load into
         * @param data The data to import
         * @param rootUrl The root url for scene and resources
         * @param onError The callback when import fails
         * @returns The loaded asset container
         */
        loadAssetContainer(scene: Scene, data: string, rootUrl: string, onError?: (message: string, exception?: any) => void): AssetContainer;
    }

    /**
     * Interface used to define an async SceneLoader plugin
     */
    export interface ISceneLoaderPluginAsync {
        /**
         * The friendly name of this plugin.
         */
        name: string;

        /**
         * The file extensions supported by this plugin.
         */
        extensions: string | ISceneLoaderPluginExtensions;

        /**
         * Import meshes into a scene.
         * @param meshesNames An array of mesh names, a single mesh name, or empty string for all meshes that filter what meshes are imported
         * @param scene The scene to import into
         * @param data The data to import
         * @param rootUrl The root url for scene and resources
         * @param onProgress The callback when the load progresses
         * @param fileName Defines the name of the file to load
         * @returns The loaded meshes, particle systems, skeletons, and animation groups
         */
        importMeshAsync(meshesNames: any, scene: Scene, data: any, rootUrl: string, onProgress?: (event: SceneLoaderProgressEvent) => void, fileName?: string): Promise<{ meshes: AbstractMesh[], particleSystems: IParticleSystem[], skeletons: Skeleton[], animationGroups: AnimationGroup[] }>;

        /**
         * Load into a scene.
         * @param scene The scene to load into
         * @param data The data to import
         * @param rootUrl The root url for scene and resources
         * @param onProgress The callback when the load progresses
         * @param fileName Defines the name of the file to load
         * @returns Nothing
         */
        loadAsync(scene: Scene, data: string, rootUrl: string, onProgress?: (event: SceneLoaderProgressEvent) => void, fileName?: string): Promise<void>;

        /**
         * The callback that returns true if the data can be directly loaded.
         */
        canDirectLoad?: (data: string) => boolean;

        /**
         * The callback that allows custom handling of the root url based on the response url.
         */
        rewriteRootURL?: (rootUrl: string, responseURL?: string) => string;

        /**
         * Load into an asset container.
         * @param scene The scene to load into
         * @param data The data to import
         * @param rootUrl The root url for scene and resources
         * @param onProgress The callback when the load progresses
         * @param fileName Defines the name of the file to load
         * @returns The loaded asset container
         */
        loadAssetContainerAsync(scene: Scene, data: string, rootUrl: string, onProgress?: (event: SceneLoaderProgressEvent) => void, fileName?: string): Promise<AssetContainer>;
    }

    /**
     * Defines a plugin registered by the SceneLoader
     */
    interface IRegisteredPlugin {
        /**
         * Defines the plugin to use
         */
        plugin: ISceneLoaderPlugin | ISceneLoaderPluginAsync | ISceneLoaderPluginFactory;
        /**
         * Defines if the plugin supports binary data
         */
        isBinary: boolean;
    }

    /**
     * Defines file information
     */
    interface IFileInfo {
        /**
         * Gets the file url
         */
        url: string;
        /**
         * Gets the root url
         */
        rootUrl: string;
        /**
         * Gets filename
         */
        name: string;
        /**
         * Gets the file
         */
        file: Nullable<File>;
    }

    /**
     * Class used to load scene from various file formats using registered plugins
     * @see http://doc.babylonjs.com/how_to/load_from_any_file_type
     */
    export class SceneLoader {
        // Flags
        private static _ForceFullSceneLoadingForIncremental = false;
        private static _ShowLoadingScreen = true;
        private static _CleanBoneMatrixWeights = false;

        /**
         * No logging while loading
         */
        public static readonly NO_LOGGING = 0;

        /**
         * Minimal logging while loading
         */
        public static readonly MINIMAL_LOGGING = 1;

        /**
         * Summary logging while loading
         */
        public static readonly SUMMARY_LOGGING = 2;

        /**
         * Detailled logging while loading
         */
        public static readonly DETAILED_LOGGING = 3;

        private static _loggingLevel = SceneLoader.NO_LOGGING;

        /**
         * Gets or sets a boolean indicating if entire scene must be loaded even if scene contains incremental data
         */
        public static get ForceFullSceneLoadingForIncremental() {
            return SceneLoader._ForceFullSceneLoadingForIncremental;
        }

        public static set ForceFullSceneLoadingForIncremental(value: boolean) {
            SceneLoader._ForceFullSceneLoadingForIncremental = value;
        }

        /**
         * Gets or sets a boolean indicating if loading screen must be displayed while loading a scene
         */
        public static get ShowLoadingScreen(): boolean {
            return SceneLoader._ShowLoadingScreen;
        }

        public static set ShowLoadingScreen(value: boolean) {
            SceneLoader._ShowLoadingScreen = value;
        }

        /**
         * Defines the current logging level (while loading the scene)
         * @ignorenaming
         */
        public static get loggingLevel(): number {
            return SceneLoader._loggingLevel;
        }

        public static set loggingLevel(value: number) {
            SceneLoader._loggingLevel = value;
        }

        /**
         * Gets or set a boolean indicating if matrix weights must be cleaned upon loading
         */
        public static get CleanBoneMatrixWeights(): boolean {
            return SceneLoader._CleanBoneMatrixWeights;
        }

        public static set CleanBoneMatrixWeights(value: boolean) {
            SceneLoader._CleanBoneMatrixWeights = value;
        }

        // Members

        /**
         * Event raised when a plugin is used to load a scene
         */
        public static OnPluginActivatedObservable = new Observable<ISceneLoaderPlugin | ISceneLoaderPluginAsync>();

        private static _registeredPlugins: { [extension: string]: IRegisteredPlugin } = {};

        private static _getDefaultPlugin(): IRegisteredPlugin {
            return SceneLoader._registeredPlugins[".babylon"];
        }

        private static _getPluginForExtension(extension: string): IRegisteredPlugin {
            var registeredPlugin = SceneLoader._registeredPlugins[extension];
            if (registeredPlugin) {
                return registeredPlugin;
            }
            Logger.Warn("Unable to find a plugin to load " + extension + " files. Trying to use .babylon default plugin. To load from a specific filetype (eg. gltf) see: http://doc.babylonjs.com/how_to/load_from_any_file_type");
            return SceneLoader._getDefaultPlugin();
        }

        private static _getPluginForDirectLoad(data: string): IRegisteredPlugin {
            for (var extension in SceneLoader._registeredPlugins) {
                var plugin = SceneLoader._registeredPlugins[extension].plugin;

                if (plugin.canDirectLoad && plugin.canDirectLoad(data)) {
                    return SceneLoader._registeredPlugins[extension];
                }
            }

            return SceneLoader._getDefaultPlugin();
        }

        private static _getPluginForFilename(sceneFilename: string): IRegisteredPlugin {
            var queryStringPosition = sceneFilename.indexOf("?");

            if (queryStringPosition !== -1) {
                sceneFilename = sceneFilename.substring(0, queryStringPosition);
            }

            var dotPosition = sceneFilename.lastIndexOf(".");

            var extension = sceneFilename.substring(dotPosition, sceneFilename.length).toLowerCase();
            return SceneLoader._getPluginForExtension(extension);
        }

        // use babylon file loader directly if sceneFilename is prefixed with "data:"
        private static _getDirectLoad(sceneFilename: string): Nullable<string> {
            if (sceneFilename.substr(0, 5) === "data:") {
                return sceneFilename.substr(5);
            }

            return null;
        }

        private static _loadData(fileInfo: IFileInfo, scene: Scene, onSuccess: (plugin: ISceneLoaderPlugin | ISceneLoaderPluginAsync, data: any, responseURL?: string) => void, onProgress: ((event: SceneLoaderProgressEvent) => void) | undefined, onError: (message: string, exception?: any) => void, onDispose: () => void, pluginExtension: Nullable<string>): ISceneLoaderPlugin | ISceneLoaderPluginAsync {
            let directLoad = SceneLoader._getDirectLoad(fileInfo.name);
            let registeredPlugin = pluginExtension ? SceneLoader._getPluginForExtension(pluginExtension) : (directLoad ? SceneLoader._getPluginForDirectLoad(fileInfo.name) : SceneLoader._getPluginForFilename(fileInfo.name));

            let plugin: ISceneLoaderPlugin | ISceneLoaderPluginAsync;
            if ((registeredPlugin.plugin as ISceneLoaderPluginFactory).createPlugin) {
                plugin = (registeredPlugin.plugin as ISceneLoaderPluginFactory).createPlugin();
            }
            else {
                plugin = <any>registeredPlugin.plugin;
            }

            let useArrayBuffer = registeredPlugin.isBinary;
            let offlineProvider: IOfflineProvider;

            SceneLoader.OnPluginActivatedObservable.notifyObservers(plugin);

            let dataCallback = (data: any, responseURL?: string) => {
                if (scene.isDisposed) {
                    onError("Scene has been disposed");
                    return;
                }

                scene.offlineProvider = offlineProvider;

                onSuccess(plugin, data, responseURL);
            };

            let request: Nullable<IFileRequest> = null;
            let pluginDisposed = false;
            let onDisposeObservable = (plugin as any).onDisposeObservable as Observable<ISceneLoaderPlugin | ISceneLoaderPluginAsync>;
            if (onDisposeObservable) {
                onDisposeObservable.add(() => {
                    pluginDisposed = true;

                    if (request) {
                        request.abort();
                        request = null;
                    }

                    onDispose();
                });
            }

            let manifestChecked = () => {
                if (pluginDisposed) {
                    return;
                }

                request = Tools.LoadFile(fileInfo.url, dataCallback, onProgress ? (event) => {
                    onProgress(SceneLoaderProgressEvent.FromProgressEvent(event));
                } : undefined, offlineProvider, useArrayBuffer, (request, exception) => {
                    onError("Failed to load scene." + (exception ? " " + exception.message : ""), exception);
                });
            };

            if (directLoad) {
                dataCallback(directLoad);
                return plugin;
            }

            const file = fileInfo.file || FilesInput.FilesToLoad[fileInfo.name.toLowerCase()];

            if (fileInfo.rootUrl.indexOf("file:") === -1 || (fileInfo.rootUrl.indexOf("file:") !== -1 && !file)) {
                let engine = scene.getEngine();
                let canUseOfflineSupport = engine.enableOfflineSupport;
                if (canUseOfflineSupport) {
                    // Also check for exceptions
                    let exceptionFound = false;
                    for (var regex of scene.disableOfflineSupportExceptionRules) {
                        if (regex.test(fileInfo.url)) {
                            exceptionFound = true;
                            break;
                        }
                    }

                    canUseOfflineSupport = !exceptionFound;
                }

                if (canUseOfflineSupport && Engine.OfflineProviderFactory) {
                    // Checking if a manifest file has been set for this scene and if offline mode has been requested
                    offlineProvider = Engine.OfflineProviderFactory(fileInfo.url, manifestChecked, engine.disableManifestCheck);
                }
                else {
                    manifestChecked();
                }
            }
            // Loading file from disk via input file or drag'n'drop
            else {
                if (file) {
                    request = Tools.ReadFile(file, dataCallback, onProgress, useArrayBuffer);
                } else {
                    onError("Unable to find file named " + fileInfo.name);
                }
            }
            return plugin;
        }

        private static _getFileInfo(rootUrl: string, sceneFilename: string | File): Nullable<IFileInfo> {
            let url: string;
            let name: string;
            let file: Nullable<File> = null;

            if (!sceneFilename) {
                url = rootUrl;
                name = Tools.GetFilename(rootUrl);
                rootUrl = Tools.GetFolderPath(rootUrl);
            }
            else if (sceneFilename instanceof File) {
                url = rootUrl + sceneFilename.name;
                name = sceneFilename.name;
                file = sceneFilename;
            }
            else {
                if (sceneFilename.substr(0, 1) === "/") {
                    Logger.Error("Wrong sceneFilename parameter");
                    return null;
                }

                url = rootUrl + sceneFilename;
                name = sceneFilename;
            }

            return {
                url: url,
                rootUrl: rootUrl,
                name: name,
                file: file
            };
        }

        // Public functions

        /**
         * Gets a plugin that can load the given extension
         * @param extension defines the extension to load
         * @returns a plugin or null if none works
         */
        public static GetPluginForExtension(extension: string): ISceneLoaderPlugin | ISceneLoaderPluginAsync | ISceneLoaderPluginFactory {
            return SceneLoader._getPluginForExtension(extension).plugin;
        }

        /**
         * Gets a boolean indicating that the given extension can be loaded
         * @param extension defines the extension to load
         * @returns true if the extension is supported
         */
        public static IsPluginForExtensionAvailable(extension: string): boolean {
            return !!SceneLoader._registeredPlugins[extension];
        }

        /**
         * Adds a new plugin to the list of registered plugins
         * @param plugin defines the plugin to add
         */
        public static RegisterPlugin(plugin: ISceneLoaderPlugin | ISceneLoaderPluginAsync): void {
            if (typeof plugin.extensions === "string") {
                var extension = <string>plugin.extensions;
                SceneLoader._registeredPlugins[extension.toLowerCase()] = {
                    plugin: plugin,
                    isBinary: false
                };
            }
            else {
                var extensions = <ISceneLoaderPluginExtensions>plugin.extensions;
                Object.keys(extensions).forEach((extension) => {
                    SceneLoader._registeredPlugins[extension.toLowerCase()] = {
                        plugin: plugin,
                        isBinary: extensions[extension].isBinary
                    };
                });
            }
        }

        /**
         * Import meshes into a scene
         * @param meshNames an array of mesh names, a single mesh name, or empty string for all meshes that filter what meshes are imported
         * @param rootUrl a string that defines the root url for the scene and resources or the concatenation of rootURL and filename (e.g. http://example.com/test.glb)
         * @param sceneFilename a string that defines the name of the scene file or starts with "data:" following by the stringified version of the scene or a File object (default: empty string)
         * @param scene the instance of BABYLON.Scene to append to
         * @param onSuccess a callback with a list of imported meshes, particleSystems, and skeletons when import succeeds
         * @param onProgress a callback with a progress event for each file being loaded
         * @param onError a callback with the scene, a message, and possibly an exception when import fails
         * @param pluginExtension the extension used to determine the plugin
         * @returns The loaded plugin
         */
        public static ImportMesh(meshNames: any, rootUrl: string, sceneFilename: string | File = "", scene: Nullable<Scene> = Engine.LastCreatedScene, onSuccess: Nullable<(meshes: AbstractMesh[], particleSystems: IParticleSystem[], skeletons: Skeleton[], animationGroups: AnimationGroup[]) => void> = null, onProgress: Nullable<(event: SceneLoaderProgressEvent) => void> = null, onError: Nullable<(scene: Scene, message: string, exception?: any) => void> = null, pluginExtension: Nullable<string> = null): Nullable<ISceneLoaderPlugin | ISceneLoaderPluginAsync> {
            if (!scene) {
                Logger.Error("No scene available to import mesh to");
                return null;
            }

            const fileInfo = SceneLoader._getFileInfo(rootUrl, sceneFilename);
            if (!fileInfo) {
                return null;
            }

            var loadingToken = {};
            scene._addPendingData(loadingToken);

            var disposeHandler = () => {
                scene._removePendingData(loadingToken);
            };

            var errorHandler = (message: string, exception?: any) => {
                let errorMessage = "Unable to import meshes from " + fileInfo.url + ": " + message;

                if (onError) {
                    onError(scene, errorMessage, exception);
                } else {
                    Logger.Error(errorMessage);
                    // should the exception be thrown?
                }

                disposeHandler();
            };

            var progressHandler = onProgress ? (event: SceneLoaderProgressEvent) => {
                try {
                    onProgress(event);
                }
                catch (e) {
                    errorHandler("Error in onProgress callback", e);
                }
            } : undefined;

            var successHandler = (meshes: AbstractMesh[], particleSystems: IParticleSystem[], skeletons: Skeleton[], animationGroups: AnimationGroup[]) => {
                scene.importedMeshesFiles.push(fileInfo.url);

                if (onSuccess) {
                    try {
                        onSuccess(meshes, particleSystems, skeletons, animationGroups);
                    }
                    catch (e) {
                        errorHandler("Error in onSuccess callback", e);
                    }
                }

                scene._removePendingData(loadingToken);
            };

            return SceneLoader._loadData(fileInfo, scene, (plugin, data, responseURL) => {
                if (plugin.rewriteRootURL) {
                    fileInfo.rootUrl = plugin.rewriteRootURL(fileInfo.rootUrl, responseURL);
                }

                if ((<any>plugin).importMesh) {
                    var syncedPlugin = <ISceneLoaderPlugin>plugin;
                    var meshes = new Array<AbstractMesh>();
                    var particleSystems = new Array<IParticleSystem>();
                    var skeletons = new Array<Skeleton>();

                    if (!syncedPlugin.importMesh(meshNames, scene, data, fileInfo.rootUrl, meshes, particleSystems, skeletons, errorHandler)) {
                        return;
                    }

                    scene.loadingPluginName = plugin.name;
                    successHandler(meshes, particleSystems, skeletons, []);
                }
                else {
                    var asyncedPlugin = <ISceneLoaderPluginAsync>plugin;
                    asyncedPlugin.importMeshAsync(meshNames, scene, data, fileInfo.rootUrl, progressHandler, fileInfo.name).then((result) => {
                        scene.loadingPluginName = plugin.name;
                        successHandler(result.meshes, result.particleSystems, result.skeletons, result.animationGroups);
                    }).catch((error) => {
                        errorHandler(error.message, error);
                    });
                }
            }, progressHandler, errorHandler, disposeHandler, pluginExtension);
        }

        /**
         * Import meshes into a scene
         * @param meshNames an array of mesh names, a single mesh name, or empty string for all meshes that filter what meshes are imported
         * @param rootUrl a string that defines the root url for the scene and resources or the concatenation of rootURL and filename (e.g. http://example.com/test.glb)
         * @param sceneFilename a string that defines the name of the scene file or starts with "data:" following by the stringified version of the scene or a File object (default: empty string)
         * @param scene the instance of BABYLON.Scene to append to
         * @param onProgress a callback with a progress event for each file being loaded
         * @param pluginExtension the extension used to determine the plugin
         * @returns The loaded list of imported meshes, particle systems, skeletons, and animation groups
         */
        public static ImportMeshAsync(meshNames: any, rootUrl: string, sceneFilename: string | File = "", scene: Nullable<Scene> = Engine.LastCreatedScene, onProgress: Nullable<(event: SceneLoaderProgressEvent) => void> = null, pluginExtension: Nullable<string> = null): Promise<{ meshes: AbstractMesh[], particleSystems: IParticleSystem[], skeletons: Skeleton[], animationGroups: AnimationGroup[] }> {
            return new Promise((resolve, reject) => {
                SceneLoader.ImportMesh(meshNames, rootUrl, sceneFilename, scene, (meshes, particleSystems, skeletons, animationGroups) => {
                    resolve({
                        meshes: meshes,
                        particleSystems: particleSystems,
                        skeletons: skeletons,
                        animationGroups: animationGroups
                    });
                }, onProgress, (scene, message, exception) => {
                    reject(exception || new Error(message));
                },
                    pluginExtension);
            });
        }

        /**
         * Load a scene
         * @param rootUrl a string that defines the root url for the scene and resources or the concatenation of rootURL and filename (e.g. http://example.com/test.glb)
         * @param sceneFilename a string that defines the name of the scene file or starts with "data:" following by the stringified version of the scene or a File object (default: empty string)
         * @param engine is the instance of BABYLON.Engine to use to create the scene
         * @param onSuccess a callback with the scene when import succeeds
         * @param onProgress a callback with a progress event for each file being loaded
         * @param onError a callback with the scene, a message, and possibly an exception when import fails
         * @param pluginExtension the extension used to determine the plugin
         * @returns The loaded plugin
         */
        public static Load(rootUrl: string, sceneFilename: string | File = "", engine: Nullable<Engine> = Engine.LastCreatedEngine, onSuccess: Nullable<(scene: Scene) => void> = null, onProgress: Nullable<(event: SceneLoaderProgressEvent) => void> = null, onError: Nullable<(scene: Scene, message: string, exception?: any) => void> = null, pluginExtension: Nullable<string> = null): Nullable<ISceneLoaderPlugin | ISceneLoaderPluginAsync> {
            if (!engine) {
                Tools.Error("No engine available");
                return null;
            }

            return SceneLoader.Append(rootUrl, sceneFilename, new Scene(engine), onSuccess, onProgress, onError, pluginExtension);
        }

        /**
         * Load a scene
         * @param rootUrl a string that defines the root url for the scene and resources or the concatenation of rootURL and filename (e.g. http://example.com/test.glb)
         * @param sceneFilename a string that defines the name of the scene file or starts with "data:" following by the stringified version of the scene or a File object (default: empty string)
         * @param engine is the instance of BABYLON.Engine to use to create the scene
         * @param onProgress a callback with a progress event for each file being loaded
         * @param pluginExtension the extension used to determine the plugin
         * @returns The loaded scene
         */
        public static LoadAsync(rootUrl: string, sceneFilename: string | File = "", engine: Nullable<Engine> = Engine.LastCreatedEngine, onProgress: Nullable<(event: SceneLoaderProgressEvent) => void> = null, pluginExtension: Nullable<string> = null): Promise<Scene> {
            return new Promise((resolve, reject) => {
                SceneLoader.Load(rootUrl, sceneFilename, engine, (scene) => {
                    resolve(scene);
                }, onProgress, (scene, message, exception) => {
                    reject(exception || new Error(message));
                }, pluginExtension);
            });
        }

        /**
         * Append a scene
         * @param rootUrl a string that defines the root url for the scene and resources or the concatenation of rootURL and filename (e.g. http://example.com/test.glb)
         * @param sceneFilename a string that defines the name of the scene file or starts with "data:" following by the stringified version of the scene or a File object (default: empty string)
         * @param scene is the instance of BABYLON.Scene to append to
         * @param onSuccess a callback with the scene when import succeeds
         * @param onProgress a callback with a progress event for each file being loaded
         * @param onError a callback with the scene, a message, and possibly an exception when import fails
         * @param pluginExtension the extension used to determine the plugin
         * @returns The loaded plugin
         */
        public static Append(rootUrl: string, sceneFilename: string | File = "", scene: Nullable<Scene> = Engine.LastCreatedScene, onSuccess: Nullable<(scene: Scene) => void> = null, onProgress: Nullable<(event: SceneLoaderProgressEvent) => void> = null, onError: Nullable<(scene: Scene, message: string, exception?: any) => void> = null, pluginExtension: Nullable<string> = null): Nullable<ISceneLoaderPlugin | ISceneLoaderPluginAsync> {
            if (!scene) {
                Logger.Error("No scene available to append to");
                return null;
            }

            const fileInfo = SceneLoader._getFileInfo(rootUrl, sceneFilename);
            if (!fileInfo) {
                return null;
            }

            if (SceneLoader.ShowLoadingScreen) {
                scene.getEngine().displayLoadingUI();
            }

            var loadingToken = {};
            scene._addPendingData(loadingToken);

            var disposeHandler = () => {
                scene._removePendingData(loadingToken);
                scene.getEngine().hideLoadingUI();
            };

            var errorHandler = (message: Nullable<string>, exception?: any) => {
                let errorMessage = "Unable to load from " + fileInfo.url + (message ? ": " + message : "");
                if (onError) {
                    onError(scene, errorMessage, exception);
                } else {
                    Logger.Error(errorMessage);
                    // should the exception be thrown?
                }

                disposeHandler();
            };

            var progressHandler = onProgress ? (event: SceneLoaderProgressEvent) => {
                try {
                    onProgress(event);
                }
                catch (e) {
                    errorHandler("Error in onProgress callback", e);
                }
            } : undefined;

            var successHandler = () => {
                if (onSuccess) {
                    try {
                        onSuccess(scene);
                    }
                    catch (e) {
                        errorHandler("Error in onSuccess callback", e);
                    }
                }

                scene._removePendingData(loadingToken);
            };

            return SceneLoader._loadData(fileInfo, scene, (plugin, data) => {
                if ((<any>plugin).load) {
                    var syncedPlugin = <ISceneLoaderPlugin>plugin;
                    if (!syncedPlugin.load(scene, data, fileInfo.rootUrl, errorHandler)) {
                        return;
                    }

                    scene.loadingPluginName = plugin.name;
                    successHandler();
                } else {
                    var asyncedPlugin = <ISceneLoaderPluginAsync>plugin;
                    asyncedPlugin.loadAsync(scene, data, fileInfo.rootUrl, progressHandler, fileInfo.name).then(() => {
                        scene.loadingPluginName = plugin.name;
                        successHandler();
                    }).catch((error) => {
                        errorHandler(error.message, error);
                    });
                }

                if (SceneLoader.ShowLoadingScreen) {
                    scene.executeWhenReady(() => {
                        scene.getEngine().hideLoadingUI();
                    });
                }
            }, progressHandler, errorHandler, disposeHandler, pluginExtension);
        }

        /**
         * Append a scene
         * @param rootUrl a string that defines the root url for the scene and resources or the concatenation of rootURL and filename (e.g. http://example.com/test.glb)
         * @param sceneFilename a string that defines the name of the scene file or starts with "data:" following by the stringified version of the scene or a File object (default: empty string)
         * @param scene is the instance of BABYLON.Scene to append to
         * @param onProgress a callback with a progress event for each file being loaded
         * @param pluginExtension the extension used to determine the plugin
         * @returns The given scene
         */
        public static AppendAsync(rootUrl: string, sceneFilename: string | File = "", scene: Nullable<Scene> = Engine.LastCreatedScene, onProgress: Nullable<(event: SceneLoaderProgressEvent) => void> = null, pluginExtension: Nullable<string> = null): Promise<Scene> {
            return new Promise((resolve, reject) => {
                SceneLoader.Append(rootUrl, sceneFilename, scene, (scene) => {
                    resolve(scene);
                }, onProgress, (scene, message, exception) => {
                    reject(exception || new Error(message));
                }, pluginExtension);
            });
        }

        /**
         * Load a scene into an asset container
         * @param rootUrl a string that defines the root url for the scene and resources or the concatenation of rootURL and filename (e.g. http://example.com/test.glb)
         * @param sceneFilename a string that defines the name of the scene file or starts with "data:" following by the stringified version of the scene or a File object (default: empty string)
         * @param scene is the instance of BABYLON.Scene to append to (default: last created scene)
         * @param onSuccess a callback with the scene when import succeeds
         * @param onProgress a callback with a progress event for each file being loaded
         * @param onError a callback with the scene, a message, and possibly an exception when import fails
         * @param pluginExtension the extension used to determine the plugin
         * @returns The loaded plugin
         */
        public static LoadAssetContainer(
            rootUrl: string,
            sceneFilename: string | File = "",
            scene: Nullable<Scene> = Engine.LastCreatedScene,
            onSuccess: Nullable<(assets: AssetContainer) => void> = null,
            onProgress: Nullable<(event: SceneLoaderProgressEvent) => void> = null,
            onError: Nullable<(scene: Scene, message: string, exception?: any) => void> = null,
            pluginExtension: Nullable<string> = null
        ): Nullable<ISceneLoaderPlugin | ISceneLoaderPluginAsync> {
            if (!scene) {
                Logger.Error("No scene available to load asset container to");
                return null;
            }

            const fileInfo = SceneLoader._getFileInfo(rootUrl, sceneFilename);
            if (!fileInfo) {
                return null;
            }

            var loadingToken = {};
            scene._addPendingData(loadingToken);

            var disposeHandler = () => {
                scene._removePendingData(loadingToken);
            };

            var errorHandler = (message: Nullable<string>, exception?: any) => {
                let errorMessage = "Unable to load assets from " + fileInfo.url + (message ? ": " + message : "");
                if (onError) {
                    onError(scene, errorMessage, exception);
                } else {
                    Logger.Error(errorMessage);
                    // should the exception be thrown?
                }

                disposeHandler();
            };

            var progressHandler = onProgress ? (event: SceneLoaderProgressEvent) => {
                try {
                    onProgress(event);
                }
                catch (e) {
                    errorHandler("Error in onProgress callback", e);
                }
            } : undefined;

            var successHandler = (assets: AssetContainer) => {
                if (onSuccess) {
                    try {
                        onSuccess(assets);
                    }
                    catch (e) {
                        errorHandler("Error in onSuccess callback", e);
                    }
                }

                scene._removePendingData(loadingToken);
            };

            return SceneLoader._loadData(fileInfo, scene, (plugin, data) => {
                if ((<any>plugin).loadAssetContainer) {
                    var syncedPlugin = <ISceneLoaderPlugin>plugin;
                    var assetContainer = syncedPlugin.loadAssetContainer(scene, data, fileInfo.rootUrl, errorHandler);
                    if (!assetContainer) {
                        return;
                    }

                    scene.loadingPluginName = plugin.name;
                    successHandler(assetContainer);
                } else if ((<any>plugin).loadAssetContainerAsync) {
                    var asyncedPlugin = <ISceneLoaderPluginAsync>plugin;
                    asyncedPlugin.loadAssetContainerAsync(scene, data, fileInfo.rootUrl, progressHandler, fileInfo.name).then((assetContainer) => {
                        scene.loadingPluginName = plugin.name;
                        successHandler(assetContainer);
                    }).catch((error) => {
                        errorHandler(error.message, error);
                    });
                } else {
                    errorHandler("LoadAssetContainer is not supported by this plugin. Plugin did not provide a loadAssetContainer or loadAssetContainerAsync method.");
                }

                if (SceneLoader.ShowLoadingScreen) {
                    scene.executeWhenReady(() => {
                        scene.getEngine().hideLoadingUI();
                    });
                }
            }, progressHandler, errorHandler, disposeHandler, pluginExtension);
        }

        /**
         * Load a scene into an asset container
         * @param rootUrl a string that defines the root url for the scene and resources or the concatenation of rootURL and filename (e.g. http://example.com/test.glb)
         * @param sceneFilename a string that defines the name of the scene file or starts with "data:" following by the stringified version of the scene (default: empty string)
         * @param scene is the instance of Scene to append to
         * @param onProgress a callback with a progress event for each file being loaded
         * @param pluginExtension the extension used to determine the plugin
         * @returns The loaded asset container
         */
        public static LoadAssetContainerAsync(rootUrl: string, sceneFilename: string = "", scene: Nullable<Scene> = Engine.LastCreatedScene, onProgress: Nullable<(event: SceneLoaderProgressEvent) => void> = null, pluginExtension: Nullable<string> = null): Promise<AssetContainer> {
            return new Promise((resolve, reject) => {
                SceneLoader.LoadAssetContainer(rootUrl, sceneFilename, scene, (assetContainer) => {
                    resolve(assetContainer);
                }, onProgress, (scene, message, exception) => {
                    reject(exception || new Error(message));
                }, pluginExtension);
            });
        }
    }
