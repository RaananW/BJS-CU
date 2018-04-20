import { Scene, ArcRotateCamera, Engine, Light, ShadowLight, Vector3, ShadowGenerator, Tags, CubeTexture, Quaternion, SceneOptimizer, EnvironmentHelper, SceneOptimizerOptions, Color3, IEnvironmentHelperOptions, AbstractMesh, FramingBehavior, Behavior, Observable, Color4, IGlowLayerOptions, PostProcessRenderPipeline, DefaultRenderingPipeline, StandardRenderingPipeline, SSAORenderingPipeline, SSAO2RenderingPipeline, LensRenderingPipeline, RenderTargetTexture, AnimationPropertiesOverride, Animation, Scalar, StandardMaterial, PBRMaterial } from 'babylonjs';
import { AbstractViewer } from './viewer';
import { ILightConfiguration, ISceneConfiguration, ISceneOptimizerConfiguration, ICameraConfiguration, ISkyboxConfiguration, ViewerConfiguration, IGroundConfiguration, IModelConfiguration } from '../configuration/configuration';
import { ViewerModel } from '../model/viewerModel';
import { extendClassWithConfig } from '../helper';
import { CameraBehavior } from '../interfaces';
import { ViewerLabs } from '../labs/viewerLabs';

/**
 * This interface describes the structure of the variable sent with the configuration observables of the scene manager.
 * O - the type of object we are dealing with (Light, ArcRotateCamera, Scene, etc')
 * T - the configuration type
 */
export interface IPostConfigurationCallback<OBJ, CONF> {
    newConfiguration: CONF;
    sceneManager: SceneManager;
    object: OBJ;
    model?: ViewerModel;
}

export class SceneManager {

    //Observers
    /**
     * Will notify when the scene was initialized
     */
    onSceneInitObservable: Observable<Scene>;
    /**
     * Will notify after the scene was configured. Can be used to further configure the scene
     */
    onSceneConfiguredObservable: Observable<IPostConfigurationCallback<Scene, ISceneConfiguration>>;
    /**
     * Will notify after the scene optimized was configured. Can be used to further configure the scene optimizer
     */
    onSceneOptimizerConfiguredObservable: Observable<IPostConfigurationCallback<SceneOptimizer, ISceneOptimizerConfiguration | boolean>>;
    /**
     * Will notify after the camera was configured. Can be used to further configure the camera
     */
    onCameraConfiguredObservable: Observable<IPostConfigurationCallback<ArcRotateCamera, ICameraConfiguration>>;
    /**
     * Will notify after the lights were configured. Can be used to further configure lights
     */
    onLightsConfiguredObservable: Observable<IPostConfigurationCallback<Array<Light>, { [name: string]: ILightConfiguration | boolean }>>;
    /**
     * Will notify after the model(s) were configured. Can be used to further configure models
     */
    onModelsConfiguredObservable: Observable<IPostConfigurationCallback<Array<ViewerModel>, IModelConfiguration>>;
    /**
     * Will notify after the envirnoment was configured. Can be used to further configure the environment
     */
    onEnvironmentConfiguredObservable: Observable<IPostConfigurationCallback<EnvironmentHelper, { skybox?: ISkyboxConfiguration | boolean, ground?: IGroundConfiguration | boolean }>>;

    /**
     * The Babylon Scene of this viewer
     */
    public scene: Scene;
    /**
     * The camera used in this viewer
     */
    public camera: ArcRotateCamera;
    /**
     * Babylon's scene optimizer
     */
    public sceneOptimizer: SceneOptimizer;
    /**
     * Models displayed in this viewer.
     */
    public models: Array<ViewerModel>;
    /**
     * Babylon's environment helper of this viewer
     */
    public environmentHelper: EnvironmentHelper;


    //The following are configuration objects, default values.
    protected _defaultHighpTextureType: number;
    protected _shadowGeneratorBias: number;
    protected _defaultPipelineTextureType: number;

    /**
     * The maximum number of shadows supported by the curent viewer
     */
    protected _maxShadows: number;
    /**
     * is HDR supported?
     */
    private _hdrSupport: boolean;

    private _mainColor: Color3 = Color3.White();
    private readonly _white = Color3.White();

    /**
     * The labs variable consists of objects that will have their API change.
     * Please be careful when using labs in production.
     */
    public labs: ViewerLabs;

    private _piplines: { [key: string]: PostProcessRenderPipeline } = {};

    constructor(private _viewer: AbstractViewer) {
        this.models = [];

        this.onCameraConfiguredObservable = new Observable();
        this.onLightsConfiguredObservable = new Observable();
        this.onModelsConfiguredObservable = new Observable();
        this.onSceneConfiguredObservable = new Observable();
        this.onSceneInitObservable = new Observable();
        this.onSceneOptimizerConfiguredObservable = new Observable();
        this.onEnvironmentConfiguredObservable = new Observable();

        this._viewer.onEngineInitObservable.add(() => {
            this._handleHardwareLimitations();
        });

        this.labs = new ViewerLabs(this);
    }

    /**
     * Returns a boolean representing HDR support
     */
    public get isHdrSupported() {
        return this._hdrSupport;
    }

    /**
     * Return the main color defined in the configuration.
     */
    public get mainColor(): Color3 {
        return this._mainColor;
    }

    private _processShadows: boolean = true;

    /**
     * The flag defining whether shadows are rendered constantly or once.
     */
    public get processShadows() {
        return this._processShadows;
    }

    /**
     * Should shadows be rendered every frame, or only once and stop.
     * This can be used to optimize a scene.
     * 
     * Not that the shadows will NOT disapear but will remain in place.
     * @param process if true shadows will be updated once every frame. if false they will stop being updated.
     */
    public set processShadows(process: boolean) {

        let refreshType = process ? RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME : RenderTargetTexture.REFRESHRATE_RENDER_ONCE;

        for (let light of this.scene.lights) {
            let generator = light.getShadowGenerator();

            if (generator) {
                let shadowMap = generator.getShadowMap();
                if (shadowMap) {
                    shadowMap.refreshRate = refreshType;
                }
            }
        }

        this._processShadows = process;
    }

    /**
     * Sets the engine flags to unlock all babylon features.
     * Can also be configured using the scene.flags configuration object
     */
    public unlockBabylonFeatures() {
        this.scene.shadowsEnabled = true;
        this.scene.particlesEnabled = true;
        this.scene.postProcessesEnabled = true;
        this.scene.collisionsEnabled = true;
        this.scene.lightsEnabled = true;
        this.scene.texturesEnabled = true;
        this.scene.lensFlaresEnabled = true;
        this.scene.proceduralTexturesEnabled = true;
        this.scene.renderTargetsEnabled = true;
        this.scene.spritesEnabled = true;
        this.scene.skeletonsEnabled = true;
        this.scene.audioEnabled = true;
    }

    /**
     * initialize the environment for a specific model.
     * Per default it will use the viewer's configuration.
     * @param model the model to use to configure the environment.
     * @returns a Promise that will resolve when the configuration is done.
     */
    protected _initEnvironment(model?: ViewerModel): Promise<Scene> {
        this._configureEnvironment(this._viewer.configuration.skybox, this._viewer.configuration.ground, model);

        return Promise.resolve(this.scene);
    }

    /**
     * initialize the scene. Calling this function again will dispose the old scene, if exists.
     */
    public initScene(sceneConfiguration: ISceneConfiguration = {}, optimizerConfiguration?: boolean | ISceneOptimizerConfiguration): Promise<Scene> {

        // if the scen exists, dispose it.
        if (this.scene) {
            this.scene.dispose();
        }

        // create a new scene
        this.scene = new Scene(this._viewer.engine);

        // TODO - is this needed, now that Babylon is integrated? 
        // set a default PBR material
        if (!sceneConfiguration.defaultMaterial) {
            var defaultMaterial = new BABYLON.PBRMaterial('defaultMaterial', this.scene);
            defaultMaterial.reflectivityColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            defaultMaterial.microSurface = 0.6;

            if (this.scene.defaultMaterial) {
                this.scene.defaultMaterial.dispose();
            }

            this.scene.defaultMaterial = defaultMaterial;
        }

        this.scene.animationPropertiesOverride = new AnimationPropertiesOverride();
        this.scene.animationPropertiesOverride.enableBlending = true;

        Animation.AllowMatricesInterpolation = true;

        this._mainColor = Color3.White();

        if (sceneConfiguration.glow) {
            let options: Partial<IGlowLayerOptions> = {
                mainTextureFixedSize: 512
            };
            if (typeof sceneConfiguration.glow === 'object') {
                options = sceneConfiguration.glow
            }
            var gl = new BABYLON.GlowLayer("glow", this.scene, options);
        }

        return this.onSceneInitObservable.notifyObserversWithPromise(this.scene);
    }

    public clearScene(clearModels: boolean = true, clearLights: boolean = false) {
        if (clearModels) {
            this.models.forEach(m => m.dispose());
            this.models.length = 0;
        }
        if (clearLights) {
            this.scene.lights.forEach(l => l.dispose());
        }
    }

    /**
     * This will update the scene's configuration, including camera, lights, environment.
     * @param newConfiguration the delta that should be configured. This includes only the changes
     * @param globalConfiguration The global configuration object, after the new configuration was merged into it
     */
    public updateConfiguration(newConfiguration: Partial<ViewerConfiguration>, globalConfiguration: ViewerConfiguration, model?: ViewerModel) {

        // update scene configuration
        if (newConfiguration.scene) {
            this._configureScene(newConfiguration.scene);
        }

        // optimizer
        if (newConfiguration.optimizer) {
            this._configureOptimizer(newConfiguration.optimizer);
        }

        // configure model
        if (newConfiguration.model && typeof newConfiguration.model === 'object') {
            this._configureModel(newConfiguration.model);
        }

        // lights
        this._configureLights(newConfiguration.lights, model);

        // environment
        if (newConfiguration.skybox !== undefined || newConfiguration.ground !== undefined) {
            this._configureEnvironment(newConfiguration.skybox, newConfiguration.ground, model);
        }

        // camera
        this._configureCamera(newConfiguration.camera, model);

        if (newConfiguration.lab) {
            if (newConfiguration.lab.environmentAssetsRootURL) {
                this.labs.environmentAssetsRootURL = newConfiguration.lab.environmentAssetsRootURL;
            }

            if (newConfiguration.lab.environmentMap) {
                let rot = newConfiguration.lab.environmentMap.rotationY;
                this.labs.loadEnvironment(newConfiguration.lab.environmentMap.texture, () => {
                    this.labs.applyEnvironmentMapConfiguration(rot);
                });

                if (!newConfiguration.lab.environmentMap.texture && newConfiguration.lab.environmentMap.rotationY) {
                    this.labs.applyEnvironmentMapConfiguration(newConfiguration.lab.environmentMap.rotationY);
                }
            }

            // rendering piplines
            if (newConfiguration.lab.renderingPipelines) {
                Object.keys(newConfiguration.lab.renderingPipelines).forEach((name => {
                    // disabled
                    if (!newConfiguration.lab!.renderingPipelines![name]) {
                        if (this._piplines[name]) {
                            this._piplines[name].dispose();
                            delete this._piplines[name];
                        }
                    } else {
                        if (!this._piplines[name]) {
                            const cameras = [this.camera];
                            const ratio = newConfiguration.lab!.renderingPipelines![name].ratio || 0.5;
                            switch (name) {
                                case 'default':
                                    this._piplines[name] = new DefaultRenderingPipeline('defaultPipeline', this._hdrSupport, this.scene, cameras);
                                    break;
                                case 'standard':
                                    this._piplines[name] = new StandardRenderingPipeline('standardPipline', this.scene, ratio, undefined, cameras);
                                    break;
                                case 'ssao':
                                    this._piplines[name] = new SSAORenderingPipeline('ssao', this.scene, ratio, cameras);
                                    break;
                                case 'ssao2':
                                    this._piplines[name] = new SSAO2RenderingPipeline('ssao', this.scene, ratio, cameras);
                                    break;
                            }
                        }
                        // make sure it was generated
                        if (this._piplines[name] && typeof newConfiguration.lab!.renderingPipelines![name] !== 'boolean') {
                            extendClassWithConfig(this._piplines[name], newConfiguration.lab!.renderingPipelines![name]);
                        }
                    }
                }));
            }
        }
    }



    /**
     * internally configure the scene using the provided configuration.
     * The scene will not be recreated, but just updated.
     * @param sceneConfig the (new) scene configuration
     */
    protected _configureScene(sceneConfig: ISceneConfiguration) {
        // sanity check!
        if (!this.scene) {
            return;
        }

        let cc = sceneConfig.clearColor || { r: 0.9, g: 0.9, b: 0.9, a: 1.0 };
        let oldcc = this.scene.clearColor;
        if (cc.r !== undefined) {
            oldcc.r = cc.r;
        }
        if (cc.g !== undefined) {
            oldcc.g = cc.g
        }
        if (cc.b !== undefined) {
            oldcc.b = cc.b
        }
        if (cc.a !== undefined) {
            oldcc.a = cc.a
        }

        // image processing configuration - optional.
        if (sceneConfig.imageProcessingConfiguration) {
            extendClassWithConfig(this.scene.imageProcessingConfiguration, sceneConfig.imageProcessingConfiguration);
        }
        //animation properties override
        if (sceneConfig.animationPropertiesOverride) {
            extendClassWithConfig(this.scene.animationPropertiesOverride, sceneConfig.animationPropertiesOverride);
        }
        if (sceneConfig.environmentTexture) {
            if (!(this.scene.environmentTexture && (<CubeTexture>this.scene.environmentTexture).url === sceneConfig.environmentTexture)) {
                if (this.scene.environmentTexture && this.scene.environmentTexture.dispose) {
                    this.scene.environmentTexture.dispose();
                }
                const environmentTexture = CubeTexture.CreateFromPrefilteredData(sceneConfig.environmentTexture, this.scene);
                this.scene.environmentTexture = environmentTexture;
            }
        }

        if (sceneConfig.debug) {
            this.scene.debugLayer.show();
        } else {
            if (this.scene.debugLayer.isVisible()) {
                this.scene.debugLayer.hide();
            }
        }

        if (sceneConfig.disableHdr) {
            this._handleHardwareLimitations(false);
        } else {
            this._handleHardwareLimitations(true);
        }

        this._viewer.renderInBackground = !!sceneConfig.renderInBackground;

        if (this.camera && sceneConfig.disableCameraControl) {
            this.camera.detachControl(this._viewer.canvas);
        } else if (this.camera && sceneConfig.disableCameraControl === false) {
            this.camera.attachControl(this._viewer.canvas);
        }

        // process mainColor changes:
        if (sceneConfig.mainColor) {
            this._mainColor = this._mainColor || Color3.White();
            let mc = sceneConfig.mainColor;
            if (mc.r !== undefined) {
                this._mainColor.r = mc.r;
            }
            if (mc.g !== undefined) {
                this._mainColor.g = mc.g
            }
            if (mc.b !== undefined) {
                this._mainColor.b = mc.b
            }

            /*this._mainColor.toLinearSpaceToRef(this._mainColor);
            let exposure = Math.pow(2.0, -((globalConfiguration.camera && globalConfiguration.camera.exposure) || 0.75)) * Math.PI;
            this._mainColor.scaleToRef(1 / exposure, this._mainColor);
            let environmentTint = (globalConfiguration.lab && globalConfiguration.lab.environmentMap && globalConfiguration.lab.environmentMap.tintLevel) || 0;
            this._mainColor = Color3.Lerp(this._white, this._mainColor, environmentTint);*/
        }

        if (sceneConfig.defaultMaterial) {
            let conf = sceneConfig.defaultMaterial;
            if ((conf.materialType === 'standard' && this.scene.defaultMaterial.getClassName() !== 'StandardMaterial') ||
                (conf.materialType === 'pbr' && this.scene.defaultMaterial.getClassName() !== 'PBRMaterial')) {
                this.scene.defaultMaterial.dispose();
                if (conf.materialType === 'standard') {
                    this.scene.defaultMaterial = new StandardMaterial("defaultMaterial", this.scene);
                } else {
                    this.scene.defaultMaterial = new PBRMaterial("defaultMaterial", this.scene);
                }
            }
            extendClassWithConfig(this.scene.defaultMaterial, conf);
        }

        if (sceneConfig.flags) {
            extendClassWithConfig(this.scene, sceneConfig.flags);
        }

        this.onSceneConfiguredObservable.notifyObservers({
            sceneManager: this,
            object: this.scene,
            newConfiguration: sceneConfig
        });
    }

    /**
     * Configure the scene optimizer.
     * The existing scene optimizer will be disposed and a new one will be created.
     * @param optimizerConfig the (new) optimizer configuration
     */
    protected _configureOptimizer(optimizerConfig: ISceneOptimizerConfiguration | boolean) {
        if (typeof optimizerConfig === 'boolean') {
            if (this.sceneOptimizer) {
                this.sceneOptimizer.stop();
                this.sceneOptimizer.dispose();
                delete this.sceneOptimizer;
            }
            if (optimizerConfig) {
                this.sceneOptimizer = new SceneOptimizer(this.scene);
                this.sceneOptimizer.start();
            }
        } else {
            let optimizerOptions: SceneOptimizerOptions = new SceneOptimizerOptions(optimizerConfig.targetFrameRate, optimizerConfig.trackerDuration);
            // check for degradation
            if (optimizerConfig.degradation) {
                switch (optimizerConfig.degradation) {
                    case "low":
                        optimizerOptions = SceneOptimizerOptions.LowDegradationAllowed(optimizerConfig.targetFrameRate);
                        break;
                    case "moderate":
                        optimizerOptions = SceneOptimizerOptions.ModerateDegradationAllowed(optimizerConfig.targetFrameRate);
                        break;
                    case "hight":
                        optimizerOptions = SceneOptimizerOptions.HighDegradationAllowed(optimizerConfig.targetFrameRate);
                        break;
                }
            }
            if (this.sceneOptimizer) {
                this.sceneOptimizer.stop();
                this.sceneOptimizer.dispose()
            }
            this.sceneOptimizer = new SceneOptimizer(this.scene, optimizerOptions, optimizerConfig.autoGeneratePriorities, optimizerConfig.improvementMode);
            this.sceneOptimizer.start();
        }

        this.onSceneOptimizerConfiguredObservable.notifyObservers({
            sceneManager: this,
            object: this.sceneOptimizer,
            newConfiguration: optimizerConfig
        });
    }

    /**
     * configure all models using the configuration.
     * @param modelConfiguration the configuration to use to reconfigure the models
     */
    protected _configureModel(modelConfiguration: Partial<IModelConfiguration>) {
        this.models.forEach(model => {
            model.updateConfiguration(modelConfiguration);
        });

        this.onModelsConfiguredObservable.notifyObservers({
            sceneManager: this,
            object: this.models,
            newConfiguration: modelConfiguration
        });
    }

    /**
     * (Re) configure the camera. The camera will only be created once and from this point will only be reconfigured.
     * @param cameraConfig the new camera configuration
     * @param model optionally use the model to configure the camera.
     */
    protected _configureCamera(cameraConfig: ICameraConfiguration = {}, model?: ViewerModel) {
        let focusMeshes = model ? model.meshes : this.scene.meshes;

        if (!this.scene.activeCamera) {
            let attachControl = true;
            if (this._viewer.configuration.scene && this._viewer.configuration.scene.disableCameraControl) {
                attachControl = false;
            }
            this.scene.createDefaultCamera(true, true, attachControl);
            this.camera = <ArcRotateCamera>this.scene.activeCamera!;
            this.camera.setTarget(Vector3.Zero());
        }
        if (cameraConfig.position) {
            let newPosition = this.camera.position.clone();
            extendClassWithConfig(newPosition, cameraConfig.position);
            this.camera.setPosition(newPosition);
        }

        if (cameraConfig.target) {
            let newTarget = this.camera.target.clone();
            extendClassWithConfig(newTarget, cameraConfig.target);
            this.camera.setTarget(newTarget);
        } else if (model && !cameraConfig.disableAutoFocus) {
            const boundingInfo = model.rootMesh.getHierarchyBoundingVectors(true);
            const sizeVec = boundingInfo.max.subtract(boundingInfo.min);
            const halfSizeVec = sizeVec.scale(0.5);
            const center = boundingInfo.min.add(halfSizeVec);
            this.camera.setTarget(center);
        }

        if (cameraConfig.rotation) {
            this.camera.rotationQuaternion = new Quaternion(cameraConfig.rotation.x || 0, cameraConfig.rotation.y || 0, cameraConfig.rotation.z || 0, cameraConfig.rotation.w || 0)
        }

        if (cameraConfig.behaviors) {
            for (let name in cameraConfig.behaviors) {
                this._setCameraBehavior(cameraConfig.behaviors[name], focusMeshes);
            }
        };

        const sceneExtends = this.scene.getWorldExtends((mesh) => {
            return !this.environmentHelper || (mesh !== this.environmentHelper.ground && mesh !== this.environmentHelper.rootMesh && mesh !== this.environmentHelper.skybox);
        });
        const sceneDiagonal = sceneExtends.max.subtract(sceneExtends.min);
        const sceneDiagonalLenght = sceneDiagonal.length();
        if (isFinite(sceneDiagonalLenght))
            this.camera.upperRadiusLimit = sceneDiagonalLenght * 4;

        extendClassWithConfig(this.camera, cameraConfig);

        this.onCameraConfiguredObservable.notifyObservers({
            sceneManager: this,
            object: this.camera,
            newConfiguration: cameraConfig,
            model
        });
    }

    protected _configureEnvironment(skyboxConifguration?: ISkyboxConfiguration | boolean, groundConfiguration?: IGroundConfiguration | boolean, model?: ViewerModel) {
        if (!skyboxConifguration && !groundConfiguration) {
            if (this.environmentHelper) {
                this.environmentHelper.dispose();
                delete this.environmentHelper;
            };
            return Promise.resolve(this.scene);
        }


        const options: Partial<IEnvironmentHelperOptions> = {
            createGround: !!groundConfiguration,
            createSkybox: !!skyboxConifguration,
            setupImageProcessing: false, // will be done at the scene level!,
        };

        if (model) {
            const boundingInfo = model.rootMesh.getHierarchyBoundingVectors(true);
            const sizeVec = boundingInfo.max.subtract(boundingInfo.min);
            const halfSizeVec = sizeVec.scale(0.5);
            const center = boundingInfo.min.add(halfSizeVec);
            options.groundYBias = -center.y;
        }

        if (groundConfiguration) {
            let groundConfig = (typeof groundConfiguration === 'boolean') ? {} : groundConfiguration;

            let groundSize = groundConfig.size || (typeof skyboxConifguration === 'object' && skyboxConifguration.scale);
            if (groundSize) {
                options.groundSize = groundSize;
            }

            options.enableGroundShadow = groundConfig === true || groundConfig.receiveShadows;
            if (groundConfig.shadowLevel !== undefined) {
                options.groundShadowLevel = groundConfig.shadowLevel;
            }
            options.enableGroundMirror = !!groundConfig.mirror;
            if (groundConfig.texture) {
                options.groundTexture = groundConfig.texture;
            }
            if (groundConfig.color) {
                options.groundColor = new Color3(groundConfig.color.r, groundConfig.color.g, groundConfig.color.b)
            }

            if (groundConfig.opacity !== undefined) {
                options.groundOpacity = groundConfig.opacity;
            }

            if (groundConfig.mirror) {
                options.enableGroundMirror = true;
                // to prevent undefines
                if (typeof groundConfig.mirror === "object") {
                    if (groundConfig.mirror.amount !== undefined)
                        options.groundMirrorAmount = groundConfig.mirror.amount;
                    if (groundConfig.mirror.sizeRatio !== undefined)
                        options.groundMirrorSizeRatio = groundConfig.mirror.sizeRatio;
                    if (groundConfig.mirror.blurKernel !== undefined)
                        options.groundMirrorBlurKernel = groundConfig.mirror.blurKernel;
                    if (groundConfig.mirror.fresnelWeight !== undefined)
                        options.groundMirrorFresnelWeight = groundConfig.mirror.fresnelWeight;
                    if (groundConfig.mirror.fallOffDistance !== undefined)
                        options.groundMirrorFallOffDistance = groundConfig.mirror.fallOffDistance;
                    if (this._defaultPipelineTextureType !== undefined)
                        options.groundMirrorTextureType = this._defaultPipelineTextureType;
                }
            }
        }

        let postInitSkyboxMaterial = false;
        if (skyboxConifguration) {
            let conf = skyboxConifguration === true ? {} : skyboxConifguration;
            if (conf.material && conf.material.imageProcessingConfiguration) {
                options.setupImageProcessing = false; // will be configured later manually.
            }
            let skyboxSize = conf.scale;
            if (skyboxSize) {
                options.skyboxSize = skyboxSize;
            }
            options.sizeAuto = !options.skyboxSize;
            if (conf.color) {
                options.skyboxColor = new Color3(conf.color.r, conf.color.g, conf.color.b)
            }
            if (conf.cubeTexture && conf.cubeTexture.url) {
                if (typeof conf.cubeTexture.url === "string") {
                    options.skyboxTexture = conf.cubeTexture.url;
                } else {
                    // init later!
                    postInitSkyboxMaterial = true;
                }
            }

            if (conf.material && conf.material.imageProcessingConfiguration) {
                postInitSkyboxMaterial = true;
            }
        }

        options.setupImageProcessing = false; // TMP

        if (!this.environmentHelper) {
            this.environmentHelper = this.scene.createDefaultEnvironment(options)!;
        } else {
            // there might be a new scene! we need to dispose.

            // get the scene used by the envHelper
            let scene: Scene = this.environmentHelper.rootMesh.getScene();
            // is it a different scene? Oh no!
            if (scene !== this.scene) {
                this.environmentHelper.dispose();
                this.environmentHelper = this.scene.createDefaultEnvironment(options)!;
            } else {
                this.environmentHelper.updateOptions(options)!;
            }
        }

        this.environmentHelper.setMainColor(this._mainColor || Color3.White());

        if (this.environmentHelper.rootMesh && this._viewer.configuration.scene && this._viewer.configuration.scene.environmentRotationY !== undefined) {
            this.environmentHelper.rootMesh.rotation.y = this._viewer.configuration.scene.environmentRotationY;
        }

        let groundConfig = (typeof groundConfiguration === 'boolean') ? {} : groundConfiguration;
        if (this.environmentHelper.groundMaterial && groundConfig && groundConfig.material) {
            if (!this.environmentHelper.groundMaterial._perceptualColor) {
                this.environmentHelper.groundMaterial._perceptualColor = Color3.Black();
            }
            this.environmentHelper.groundMaterial._perceptualColor.copyFrom(this.mainColor);
            // to be configured using the configuration object

            /*this.environmentHelper.groundMaterial.primaryColorHighlightLevel = groundConfig.material.highlightLevel;
            this.environmentHelper.groundMaterial.primaryColorShadowLevel = groundConfig.material.shadowLevel;
            this.environmentHelper.groundMaterial.enableNoise = true;
            if (this.environmentHelper.groundMaterial.diffuseTexture) {
                this.environmentHelper.groundMaterial.diffuseTexture.gammaSpace = true;
            }
            this.environmentHelper.groundMaterial.useRGBColor = false;
            this.environmentHelper.groundMaterial.maxSimultaneousLights = 1;*/
            extendClassWithConfig(this.environmentHelper.groundMaterial, groundConfig.material);

            if (this.environmentHelper.groundMirror) {
                const mirrorClearColor = this.environmentHelper.groundMaterial._perceptualColor.toLinearSpace();
                //let exposure = Math.pow(2.0, -this.configuration.camera.exposure) * Math.PI;
                //mirrorClearColor.scaleToRef(1 / exposure, mirrorClearColor);

                // TODO use highlight if required
                this.environmentHelper.groundMirror.clearColor.r = Scalar.Clamp(mirrorClearColor.r);
                this.environmentHelper.groundMirror.clearColor.g = Scalar.Clamp(mirrorClearColor.g);
                this.environmentHelper.groundMirror.clearColor.b = Scalar.Clamp(mirrorClearColor.b);
                this.environmentHelper.groundMirror.clearColor.a = 1;

                /*if (this.Scene.DisableReflection) {
                    this.environmentHelper.groundMaterial.reflectionTexture = null;
                }*/
            }
        }

        if (postInitSkyboxMaterial) {
            let skyboxMaterial = this.environmentHelper.skyboxMaterial;
            if (skyboxMaterial) {
                if (typeof skyboxConifguration === 'object' && skyboxConifguration.material) {
                    extendClassWithConfig(skyboxMaterial, skyboxConifguration.material);
                }
            }
        }

        this.onEnvironmentConfiguredObservable.notifyObservers({
            sceneManager: this,
            object: this.environmentHelper,
            newConfiguration: {
                skybox: skyboxConifguration,
                ground: groundConfiguration
            },
            model
        });
    }

    /**
     * configure the lights.
     * 
     * @param lightsConfiguration the (new) light(s) configuration
     * @param model optionally use the model to configure the camera.
     */
    protected _configureLights(lightsConfiguration: { [name: string]: ILightConfiguration | boolean } = {}, model?: ViewerModel) {

        // sanity check!
        if (!Object.keys(lightsConfiguration).length) {
            if (!this.scene.lights.length)
                this.scene.createDefaultLight(true);
            return;
        };

        let lightsAvailable: Array<string> = this.scene.lights.map(light => light.name);
        // compare to the global (!) configuration object and dispose unneeded:
        let lightsToConfigure = Object.keys(this._viewer.configuration.lights || []);
        if (Object.keys(lightsToConfigure).length !== lightsAvailable.length) {
            lightsAvailable.forEach(lName => {
                if (lightsToConfigure.indexOf(lName) === -1) {
                    this.scene.getLightByName(lName)!.dispose();
                }
            });
        }

        Object.keys(lightsConfiguration).forEach((name, idx) => {
            let lightConfig: ILightConfiguration = { type: 0 };
            if (typeof lightsConfiguration[name] === 'object') {
                lightConfig = <ILightConfiguration>lightsConfiguration[name];
            }

            lightConfig.name = name;

            let light: Light;
            // light is not already available
            if (lightsAvailable.indexOf(name) === -1) {
                let constructor = Light.GetConstructorFromName(lightConfig.type, lightConfig.name, this.scene);
                if (!constructor) return;
                light = constructor();
            } else {
                // available? get it from the scene
                light = <Light>this.scene.getLightByName(name);
                lightsAvailable = lightsAvailable.filter(ln => ln !== name);
                if (lightConfig.type !== undefined && light.getTypeID() !== lightConfig.type) {
                    light.dispose();
                    let constructor = Light.GetConstructorFromName(lightConfig.type, lightConfig.name, this.scene);
                    if (!constructor) return;
                    light = constructor();
                }
            }

            // if config set the light to false, dispose it.
            if (lightsConfiguration[name] === false) {
                light.dispose();
                return;
            }

            //enabled
            var enabled = lightConfig.enabled !== undefined ? lightConfig.enabled : !lightConfig.disabled;
            light.setEnabled(enabled);


            extendClassWithConfig(light, lightConfig);



            //position. Some lights don't support shadows
            if (light instanceof ShadowLight) {
                // set default values
                light.shadowMinZ = light.shadowMinZ || 0.1;
                light.shadowMaxZ = Math.min(20, light.shadowMaxZ || 20); //large far clips reduce shadow depth precision

                if (lightConfig.target) {
                    if (light.setDirectionToTarget) {
                        let target = Vector3.Zero().copyFrom(lightConfig.target as Vector3);
                        light.setDirectionToTarget(target);
                    }
                } else if (lightConfig.direction) {
                    let direction = Vector3.Zero().copyFrom(lightConfig.direction as Vector3);
                    light.direction = direction;
                }

                let isShadowEnabled = false;
                if (light.getTypeID() === BABYLON.Light.LIGHTTYPEID_DIRECTIONALLIGHT) {
                    (<BABYLON.DirectionalLight>light).shadowFrustumSize = lightConfig.shadowFrustumSize || 2;
                    isShadowEnabled = true;
                }
                else if (light.getTypeID() === BABYLON.Light.LIGHTTYPEID_SPOTLIGHT) {
                    let spotLight: BABYLON.SpotLight = <BABYLON.SpotLight>light;
                    if (lightConfig.spotAngle !== undefined) {
                        spotLight.angle = lightConfig.spotAngle * Math.PI / 180;
                    }
                    if (spotLight.angle && lightConfig.shadowFieldOfView) {
                        spotLight.shadowAngleScale = lightConfig.shadowFieldOfView / spotLight.angle;
                    }
                    isShadowEnabled = true;
                }
                else if (light.getTypeID() === BABYLON.Light.LIGHTTYPEID_POINTLIGHT) {
                    if (lightConfig.shadowFieldOfView) {
                        (<BABYLON.PointLight>light).shadowAngle = lightConfig.shadowFieldOfView * Math.PI / 180;
                    }
                    isShadowEnabled = true;
                }

                let shadowGenerator = <BABYLON.ShadowGenerator>light.getShadowGenerator();
                if (isShadowEnabled && lightConfig.shadowEnabled && this._maxShadows) {
                    let bufferSize = lightConfig.shadowBufferSize || 256;

                    if (!shadowGenerator) {
                        shadowGenerator = new ShadowGenerator(bufferSize, light);
                        // TODO blur kernel definition
                    }

                    // add the focues meshes to the shadow list
                    this._updateShadowRenderList(shadowGenerator, model);

                    var blurKernel = this.getBlurKernel(light, bufferSize);

                    //shadowGenerator.useBlurCloseExponentialShadowMap = true;
                    //shadowGenerator.useKernelBlur = true;
                    //shadowGenerator.blurScale = 1.0;
                    shadowGenerator.bias = this._shadowGeneratorBias;
                    shadowGenerator.blurKernel = blurKernel;
                    //shadowGenerator.depthScale = 50 * (light.shadowMaxZ - light.shadowMinZ);
                    //override defaults
                    extendClassWithConfig(shadowGenerator, lightConfig.shadowConfig || {});
                } else if (shadowGenerator) {
                    shadowGenerator.dispose();
                }
            }
        });

        // render priority
        let globalLightsConfiguration = this._viewer.configuration.lights || {};
        Object.keys(globalLightsConfiguration).sort().forEach((name, idx) => {
            let configuration = globalLightsConfiguration[name];
            let light = this.scene.getLightByName(name);
            // sanity check
            if (!light) return;
            light.renderPriority = -idx;
        });

        this.onLightsConfiguredObservable.notifyObservers({
            sceneManager: this,
            object: this.scene.lights,
            newConfiguration: lightsConfiguration,
            model
        });
    }

    private _updateShadowRenderList(shadowGenerator: ShadowGenerator, model?: ViewerModel, resetList?: boolean) {
        let focusMeshes = model ? model.meshes : this.scene.meshes;
        // add the focues meshes to the shadow list
        let shadownMap = shadowGenerator.getShadowMap();
        if (!shadownMap) return;
        if (resetList && shadownMap.renderList) {
            shadownMap.renderList.length = 0;
        } else {
            shadownMap.renderList = []
        }
        for (var index = 0; index < focusMeshes.length; index++) {
            let mesh = focusMeshes[index];
            if (Tags.MatchesQuery(mesh, 'castShadow') && shadownMap.renderList.indexOf(mesh) === -1) {
                shadownMap.renderList.push(mesh);
            }
        }
    }

    private _updateGroundMirrorRenderList(model?: ViewerModel, resetList?: boolean) {
        if (this.environmentHelper.groundMirror && this.environmentHelper.groundMirror.renderList) {
            let focusMeshes = model ? model.meshes : this.scene.meshes;
            let renderList = this.environmentHelper.groundMirror.renderList;
            if (resetList) {
                renderList.length = 0;
            }
            for (var index = 0; index < focusMeshes.length; index++) {
                let mesh = focusMeshes[index];
                if (renderList.indexOf(mesh) === -1) {
                    renderList.push(mesh);
                }
            }
        }
    }

    /**
     * Gets the shadow map blur kernel according to the light configuration.
     * @param light The light used to generate the shadows
     * @param bufferSize The size of the shadow map
     * @return the kernel blur size
     */
    public getBlurKernel(light: BABYLON.IShadowLight, bufferSize: number): number {
        var normalizedBlurKernel = 0.05; // TODO Should come from the config.
        if (light.getTypeID() === BABYLON.Light.LIGHTTYPEID_DIRECTIONALLIGHT) {
            normalizedBlurKernel = normalizedBlurKernel / (<BABYLON.DirectionalLight>light).shadowFrustumSize;
        }
        else if (light.getTypeID() === BABYLON.Light.LIGHTTYPEID_POINTLIGHT) {
            normalizedBlurKernel = normalizedBlurKernel / (<BABYLON.PointLight>light).shadowAngle;
        }
        else if (light.getTypeID() === BABYLON.Light.LIGHTTYPEID_SPOTLIGHT) {
            normalizedBlurKernel = normalizedBlurKernel / ((<BABYLON.SpotLight>light).angle * (<BABYLON.SpotLight>light).shadowAngleScale);
        }

        let minimumBlurKernel = 5 / (bufferSize / 256); //magic number that aims to keep away sawtooth shadows

        var blurKernel = Math.max(bufferSize * normalizedBlurKernel, minimumBlurKernel);
        return blurKernel;
    }

    /**
     * Alters render settings to reduce features based on hardware feature limitations
     * @param enableHDR Allows the viewer to run in HDR mode.
     */
    protected _handleHardwareLimitations(enableHDR = true) {
        //flip rendering settings switches based on hardware support
        let maxVaryingRows = this._viewer.engine.getCaps().maxVaryingVectors;
        let maxFragmentSamplers = this._viewer.engine.getCaps().maxTexturesImageUnits;

        //shadows are disabled if there's not enough varyings for a single shadow
        if ((maxVaryingRows < 8) || (maxFragmentSamplers < 8)) {
            this._maxShadows = 0;
        } else {
            this._maxShadows = 3;
        }

        //can we render to any >= 16-bit targets (required for HDR)
        let caps = this._viewer.engine.getCaps();
        let linearHalfFloatTargets = caps.textureHalfFloatRender && caps.textureHalfFloatLinearFiltering;
        let linearFloatTargets = caps.textureFloatRender && caps.textureFloatLinearFiltering;

        this._hdrSupport = enableHDR && !!(linearFloatTargets || linearHalfFloatTargets);

        if (linearHalfFloatTargets) {
            this._defaultHighpTextureType = Engine.TEXTURETYPE_HALF_FLOAT;
            this._shadowGeneratorBias = 0.002;
        } else if (linearFloatTargets) {
            this._defaultHighpTextureType = Engine.TEXTURETYPE_FLOAT;
            this._shadowGeneratorBias = 0.001;
        } else {
            this._defaultHighpTextureType = Engine.TEXTURETYPE_UNSIGNED_INT;
            this._shadowGeneratorBias = 0.001;
        }

        this._defaultPipelineTextureType = this._hdrSupport ? this._defaultHighpTextureType : Engine.TEXTURETYPE_UNSIGNED_INT;
    }

    /**
     * Dispoe the entire viewer including the scene and the engine
     */
    public dispose() {

        // this.onCameraConfiguredObservable.clear();
        this.onEnvironmentConfiguredObservable.clear();
        this.onLightsConfiguredObservable.clear();
        this.onModelsConfiguredObservable.clear();
        this.onSceneConfiguredObservable.clear();
        this.onSceneInitObservable.clear();
        this.onSceneOptimizerConfiguredObservable.clear();

        if (this.sceneOptimizer) {
            this.sceneOptimizer.stop();
            this.sceneOptimizer.dispose();
        }

        if (this.environmentHelper) {
            this.environmentHelper.dispose();
        }

        this.models.forEach(model => {
            model.dispose();
        });

        this.models.length = 0;

        this.scene.dispose();
    }

    private _setCameraBehavior(behaviorConfig: number | {
        type: number;
        [propName: string]: any;
    }, payload: any) {

        let behavior: Behavior<ArcRotateCamera> | null;
        let type = (typeof behaviorConfig !== "object") ? behaviorConfig : behaviorConfig.type;

        let config: { [propName: string]: any } = (typeof behaviorConfig === "object") ? behaviorConfig : {};

        // constructing behavior
        switch (type) {
            case CameraBehavior.AUTOROTATION:
                this.camera.useAutoRotationBehavior = true;
                behavior = this.camera.autoRotationBehavior;
                break;
            case CameraBehavior.BOUNCING:
                this.camera.useBouncingBehavior = true;
                behavior = this.camera.bouncingBehavior;
                break;
            case CameraBehavior.FRAMING:
                this.camera.useFramingBehavior = true;
                behavior = this.camera.framingBehavior;
                break;
            default:
                behavior = null;
                break;
        }

        if (behavior) {
            if (typeof behaviorConfig === "object") {
                extendClassWithConfig(behavior, behaviorConfig);
            }
        }

        // post attach configuration. Some functionalities require the attached camera.
        switch (type) {
            case CameraBehavior.AUTOROTATION:
                break;
            case CameraBehavior.BOUNCING:
                break;
            case CameraBehavior.FRAMING:
                if (config.zoomOnBoundingInfo) {
                    //payload is an array of meshes
                    let meshes = <Array<AbstractMesh>>payload;
                    let bounding = meshes[0].getHierarchyBoundingVectors();
                    (<FramingBehavior>behavior).zoomOnBoundingInfo(bounding.min, bounding.max);
                }
                break;
        }
    }
}