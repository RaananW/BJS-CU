import { AbstractViewer } from "../viewer/viewer";
import { ISceneLoaderPlugin, ISceneLoaderPluginAsync, Tools, SceneLoader, Tags, GLTFLoaderAnimationStartMode } from "babylonjs";
import { GLTFFileLoader } from "babylonjs-loaders";
import { IModelConfiguration } from "../configuration/configuration";
import { ViewerModel, ModelState } from "../model/viewerModel";
import { ILoaderPlugin } from './plugins/loaderPlugin';
import { TelemetryLoaderPlugin } from './plugins/telemetryLoaderPlugin';
import { getLoaderPluginByName } from './plugins/';

/**
 * An instance of the class is in charge of loading the model correctly.
 * This class will continously be expended with tasks required from the specific loaders Babylon has.
 * 
 * A Model loader is unique per (Abstract)Viewer. It is being generated by the viewer
 */
export class ModelLoader {

    private _loadId: number;
    private _disposed = false;

    private _loaders: Array<ISceneLoaderPlugin | ISceneLoaderPluginAsync>;

    private _plugins: Array<ILoaderPlugin>;

    /**
     * Create a new Model loader
     * @param _viewer the viewer using this model loader
     */
    constructor(private _viewer: AbstractViewer) {
        this._loaders = [];
        this._loadId = 0;
        this._plugins = [];
    }

    public addPlugin(plugin: ILoaderPlugin | string) {
        let actualPlugin: ILoaderPlugin = {};
        if (typeof plugin === 'string') {
            let loadedPlugin = getLoaderPluginByName(plugin);
            if (loadedPlugin) {
                actualPlugin = loadedPlugin;
            }
        } else {
            actualPlugin = plugin;
        }
        if (actualPlugin && this._plugins.indexOf(actualPlugin) === -1) {
            this._plugins.push(actualPlugin);
        }
    }

    /**
     * Load a model using predefined configuration
     * @param modelConfiguration the modelConfiguration to use to load the model
     */
    public load(modelConfiguration: IModelConfiguration): ViewerModel {

        const model = new ViewerModel(this._viewer, modelConfiguration);

        model.loadId = this._loadId++;

        if (!modelConfiguration.url) {
            model.state = ModelState.ERROR;
            Tools.Error("No URL provided");
            return model;
        }

        let filename = Tools.GetFilename(modelConfiguration.url) || modelConfiguration.url;
        let base = modelConfiguration.root || Tools.GetFolderPath(modelConfiguration.url);
        let plugin = modelConfiguration.loader;

        model.loader = SceneLoader.ImportMesh(undefined, base, filename, this._viewer.sceneManager.scene, (meshes, particleSystems, skeletons, animationGroups) => {
            meshes.forEach(mesh => {
                Tags.AddTagsTo(mesh, "viewerMesh");
                model.addMesh(mesh);
            });
            model.particleSystems = particleSystems;
            model.skeletons = skeletons;

            for (const animationGroup of animationGroups) {
                model.addAnimationGroup(animationGroup);
            }

            this._checkAndRun("onLoaded", model);
            model.onLoadedObservable.notifyObserversWithPromise(model);
        }, (progressEvent) => {
            this._checkAndRun("onProgress", progressEvent);
            model.onLoadProgressObservable.notifyObserversWithPromise(progressEvent);
        }, (scene, m, exception) => {
            model.state = ModelState.ERROR;
            Tools.Error("Load Error: There was an error loading the model. " + m);
            this._checkAndRun("onError", m, exception);
            model.onLoadErrorObservable.notifyObserversWithPromise({ message: m, exception: exception });
        }, plugin)!;

        if (model.loader.name === "gltf") {
            let gltfLoader = (<GLTFFileLoader>model.loader);
            gltfLoader.animationStartMode = GLTFLoaderAnimationStartMode.NONE;
            gltfLoader.compileMaterials = true;
            // if ground is set to "mirror":
            if (this._viewer.configuration.ground && typeof this._viewer.configuration.ground === 'object' && this._viewer.configuration.ground.mirror) {
                gltfLoader.useClipPlane = true;
            }
            Object.keys(gltfLoader).filter(name => name.indexOf('on') === 0 && name.indexOf('Observable') !== -1).forEach(functionName => {
                gltfLoader[functionName].add((payload) => {
                    this._checkAndRun(functionName.replace("Observable", ''), payload);
                });
            });

            gltfLoader.onParsedObservable.add((data) => {
                if (data && data.json && data.json['asset']) {
                    model.loadInfo = data.json['asset'];
                }
            })
        }

        this._checkAndRun("onInit", model.loader, model);

        this._loaders.push(model.loader);

        return model;
    }

    public cancelLoad(model: ViewerModel) {
        const loader = model.loader || this._loaders[model.loadId];
        // ATM only available in the GLTF Loader
        if (loader && loader.name === "gltf") {
            let gltfLoader = (<GLTFFileLoader>loader);
            gltfLoader.dispose();
            model.state = ModelState.CANCELED;
        } else {
            Tools.Warn("This type of loader cannot cancel the request");
        }
    }

    /**
     * dispose the model loader.
     * If loaders are registered and are in the middle of loading, they will be disposed and the request(s) will be cancelled.
     */
    public dispose() {
        this._loaders.forEach(loader => {
            if (loader.name === "gltf") {
                (<GLTFFileLoader>loader).dispose();
            }
        });
        this._loaders.length = 0;
        this._disposed = true;
    }

    private _checkAndRun(functionName: string, ...payload: Array<any>) {
        if (this._disposed) return;
        this._plugins.filter(p => p[functionName]).forEach(plugin => {
            try {
                plugin[functionName].apply(this, payload);
            } catch (e) { }
        })
    }
}