module BABYLON {

    export enum AssetTaskState {
        INIT,
        RUNNING,
        DONE,
        ERROR
    }

    /**
     * Define an abstract asset task used with a {BABYLON.AssetsManager} class to load assets into a scene
     */
    export abstract class AbstractAssetTask {
        /**
         * Callback called when the task is successful
         * @param task contains the successful task
         */
        public onSuccess: (task: any) => void;

        /**
         * Callback called when the task is successful
         * @param task contains the successful task
         */
        public onError: (task: any, message?: string, exception?: any) => void;

        constructor(public name: string) {
            this.taskState = AssetTaskState.INIT;
        }

        isCompleted: boolean = false;
        taskState: AssetTaskState;
        errorObject: { message?: string; exception?: any; };

        run(scene: Scene, onSuccess: () => void, onError: (message?: string, exception?: any) => void) {
            this.taskState = AssetTaskState.RUNNING;
            this.runTask(scene, () => {
                this.onDoneCallback(onSuccess, onError);
            }, (msg, exception) => {
                this.onErrorCallback(onError, msg, exception);
            });
        }

        /**
         * Execute the current task
         * @param scene defines the scene where you want your assets to be loaded
         * @param onSuccess is a callback called when the task is successfully executed
         * @param onError is a callback called if an error occurs
         */
        public runTask(scene: Scene, onSuccess: () => void, onError: (message?: string, exception?: any) => void) {
            throw new Error("runTask is not implemented");
        }

        private onErrorCallback(onError: (message?: string, exception?: any) => void, message?: string, exception?: any) {
            this.taskState = AssetTaskState.ERROR;

            this.errorObject = {
                message: message,
                exception: exception
            }

            if (this.onError) {
                this.onError(this, message, exception);
            }

            onError();
        }

        private onDoneCallback(onSuccess: () => void, onError: (message?: string, exception?: any) => void) {
            try {
                this.taskState = AssetTaskState.DONE;
                this.isCompleted = true;

                if (this.onSuccess) {
                    this.onSuccess(this);
                }

                onSuccess();
            } catch (e) {
                this.onErrorCallback(onError, "Task is done, error executing success callback(s)", e);
            }
        }

    }

    /**
     * Define the interface used by progress events raised during assets loading
     */
    export interface IAssetsProgressEvent {
        remainingCount: number;
        totalCount: number;
        task: AbstractAssetTask;
    }

    /**
     * Classed used to share progress information about assets loading
     */
    export class AssetsProgressEvent implements IAssetsProgressEvent {
        remainingCount: number;
        totalCount: number;
        task: AbstractAssetTask;

        constructor(remainingCount: number, totalCount: number, task: AbstractAssetTask) {
            this.remainingCount = remainingCount;
            this.totalCount = totalCount;
            this.task = task;
        }
    }

    /**
     * Define a task used by {BABYLON.AssetsManager} to load meshes
     */
    export class MeshAssetTask extends AbstractAssetTask {
        public loadedMeshes: Array<AbstractMesh>;
        public loadedParticleSystems: Array<ParticleSystem>;
        public loadedSkeletons: Array<Skeleton>;

        public onSuccess: (task: MeshAssetTask) => void;
        public onError: (task: MeshAssetTask, message?: string, exception?: any) => void;

        constructor(public name: string, public meshesNames: any, public rootUrl: string, public sceneFilename: string) {
            super(name);
        }

        public runTask(scene: Scene, onSuccess: () => void, onError: (message?: string, exception?: any) => void) {
            SceneLoader.ImportMesh(this.meshesNames, this.rootUrl, this.sceneFilename, scene,
                (meshes: AbstractMesh[], particleSystems: ParticleSystem[], skeletons: Skeleton[]) => {
                    this.loadedMeshes = meshes;
                    this.loadedParticleSystems = particleSystems;
                    this.loadedSkeletons = skeletons;
                    onSuccess();
                }, null, (scene, message, exception) => {
                    onError(message, exception);
                }
            );
        }
    }

    /**
     * Define a task used by {BABYLON.AssetsManager} to load text content
     */
    export class TextFileAssetTask extends AbstractAssetTask {
        public text: string;

        public onSuccess: (task: TextFileAssetTask) => void;
        public onError: (task: TextFileAssetTask, message?: string, exception?: any) => void;

        constructor(public name: string, public url: string) {
            super(name);
        }

        public runTask(scene: Scene, onSuccess: () => void, onError: (message?: string, exception?: any) => void) {
            scene._loadFile(this.url, (data) => {
                this.text = data as string;
                onSuccess();
            }, undefined, false, true, (request, exception) => {
                if (request) {
                    onError(request.status + " " + request.statusText, exception);
                }
            });
        }
    }

    /**
     * Define a task used by {BABYLON.AssetsManager} to load binary data
     */
    export class BinaryFileAssetTask extends AbstractAssetTask {
        public data: ArrayBuffer;

        public onSuccess: (task: BinaryFileAssetTask) => void;
        public onError: (task: BinaryFileAssetTask, message?: string, exception?: any) => void;

        constructor(public name: string, public url: string) {
            super(name);
        }

        public runTask(scene: Scene, onSuccess: () => void, onError: (message?: string, exception?: any) => void) {
            scene._loadFile(this.url, (data) => {
                this.data = data as ArrayBuffer;
                onSuccess();
            }, undefined, true, true, (request, exception) => {
                if (request) {
                    onError(request.status + " " + request.statusText, exception);
                }
            });
        }
    }

    /**
     * Define a task used by {BABYLON.AssetsManager} to load images
     */
    export class ImageAssetTask extends AbstractAssetTask {
        public image: HTMLImageElement;

        public onSuccess: (task: ImageAssetTask) => void;
        public onError: (task: ImageAssetTask, message?: string, exception?: any) => void;

        constructor(public name: string, public url: string) {
            super(name);
        }

        public runTask(scene: Scene, onSuccess: () => void, onError: (message?: string, exception?: any) => void) {
            var img = new Image();

            Tools.SetCorsBehavior(this.url, img);

            img.onload = () => {
                this.image = img;
                onSuccess();
            };

            img.onerror = (err: ErrorEvent): any => {
                onError("Error loading image", err);
            };

            img.src = this.url;
        }
    }

    export interface ITextureAssetTask<TEX extends BaseTexture> {
        texture: TEX;
    }

    export class TextureAssetTask extends AbstractAssetTask implements ITextureAssetTask<Texture> {
        public texture: Texture;

        public onSuccess: (task: TextureAssetTask) => void;
        public onError: (task: TextureAssetTask, message?: string, exception?: any) => void;

        constructor(public name: string, public url: string, public noMipmap?: boolean, public invertY?: boolean, public samplingMode: number = Texture.TRILINEAR_SAMPLINGMODE) {
            super(name);
        }

        public runTask(scene: Scene, onSuccess: () => void, onError: (message?: string, exception?: any) => void) {

            var onload = () => {
                onSuccess();
            };

            var onerror = (message?: string, exception?: any) => {
                onError(message, exception);
            };

            this.texture = new Texture(this.url, scene, this.noMipmap, this.invertY, this.samplingMode, onload, onerror);
        }
    }

    export class CubeTextureAssetTask extends AbstractAssetTask implements ITextureAssetTask<CubeTexture> {
        public texture: CubeTexture;

        public onSuccess: (task: CubeTextureAssetTask) => void;
        public onError: (task: CubeTextureAssetTask, message?: string, exception?: any) => void;

        constructor(public name: string, public url: string, public extensions?: string[], public noMipmap?: boolean, public files?: string[]) {
            super(name);
        }

        public runTask(scene: Scene, onSuccess: () => void, onError: (message?: string, exception?: any) => void) {

            var onload = () => {
                onSuccess();
            };

            var onerror = (message?: string, exception?: any) => {
                onError(message, exception);
            };

            this.texture = new CubeTexture(this.url, scene, this.extensions, this.noMipmap, this.files, onload, onerror);
        }
    }

    export class HDRCubeTextureAssetTask extends AbstractAssetTask implements ITextureAssetTask<HDRCubeTexture> {
        public texture: HDRCubeTexture;

        public onSuccess: (task: HDRCubeTextureAssetTask) => void;
        public onError: (task: HDRCubeTextureAssetTask, message?: string, exception?: any) => void;

        constructor(public name: string, public url: string, public size?: number, public noMipmap = false, public generateHarmonics = true, public useInGammaSpace = false, public usePMREMGenerator = false) {
            super(name);
        }

        public run(scene: Scene, onSuccess: () => void, onError: (message?: string, exception?: any) => void) {

            var onload = () => {
                onSuccess();
            };

            var onerror = (message?: string, exception?: any) => {
                onError(message, exception);
            };

            this.texture = new HDRCubeTexture(this.url, scene, this.size, this.noMipmap, this.generateHarmonics, this.useInGammaSpace, this.usePMREMGenerator, onload, onerror);
        }
    }

    export class AssetsManager {
        private _scene: Scene;
        private _isLoading = false;

        protected tasks = new Array<AbstractAssetTask>();
        protected waitingTasksCount = 0;
        protected totalTasksCount = 0;

        public onFinish: (tasks: AbstractAssetTask[]) => void;
        public onTaskSuccess: (task: AbstractAssetTask) => void;
        public onTaskError: (task: AbstractAssetTask) => void;
        public onProgress: (remainingCount: number, totalCount: number, task: AbstractAssetTask) => void;

        //Observables

        public onTaskSuccessObservable = new Observable<AbstractAssetTask>();
        public onTaskErrorObservable = new Observable<AbstractAssetTask>();
        public onTasksDoneObservable = new Observable<AbstractAssetTask[]>();
        public onProgressObservable = new Observable<IAssetsProgressEvent>();

        public useDefaultLoadingScreen = true;

        constructor(scene: Scene) {
            this._scene = scene;
        }

        public addMeshTask(taskName: string, meshesNames: any, rootUrl: string, sceneFilename: string): MeshAssetTask {
            var task = new MeshAssetTask(taskName, meshesNames, rootUrl, sceneFilename);
            this.tasks.push(task);

            return task;
        }

        public addTextFileTask(taskName: string, url: string): TextFileAssetTask {
            var task = new TextFileAssetTask(taskName, url);
            this.tasks.push(task);

            return task;
        }

        public addBinaryFileTask(taskName: string, url: string): BinaryFileAssetTask {
            var task = new BinaryFileAssetTask(taskName, url);
            this.tasks.push(task);

            return task;
        }

        public addImageTask(taskName: string, url: string): ImageAssetTask {
            var task = new ImageAssetTask(taskName, url);
            this.tasks.push(task);

            return task;
        }

        public addTextureTask(taskName: string, url: string, noMipmap?: boolean, invertY?: boolean, samplingMode: number = Texture.TRILINEAR_SAMPLINGMODE): TextureAssetTask {
            var task = new TextureAssetTask(taskName, url, noMipmap, invertY, samplingMode);
            this.tasks.push(task);

            return task;
        }


        public addCubeTextureTask(name: string, url: string, extensions?: string[], noMipmap?: boolean, files?: string[]): CubeTextureAssetTask {
            var task = new CubeTextureAssetTask(name, url, extensions, noMipmap, files);
            this.tasks.push(task);

            return task;
        }

        public addHDRCubeTextureTask(name: string, url: string, size?: number, noMipmap = false, generateHarmonics = true, useInGammaSpace = false, usePMREMGenerator = false): HDRCubeTextureAssetTask {
            var task = new HDRCubeTextureAssetTask(name, url, size, noMipmap, generateHarmonics, useInGammaSpace, usePMREMGenerator);
            this.tasks.push(task);

            return task;
        }

        private _decreaseWaitingTasksCount(task: AbstractAssetTask): void {
            this.waitingTasksCount--;

            try {
                if (task.taskState === AssetTaskState.DONE) {
                    // Let's remove successfull tasks
                    Tools.SetImmediate(() => {
                        let index = this.tasks.indexOf(task);

                        if (index > -1) {
                            this.tasks.splice(index, 1);
                        }
                    });
                }

                if (this.onProgress) {
                    this.onProgress(
                        this.waitingTasksCount,
                        this.totalTasksCount,
                        task
                    );
                }

                this.onProgressObservable.notifyObservers(
                    new AssetsProgressEvent(
                        this.waitingTasksCount,
                        this.totalTasksCount,
                        task
                    )
                );
            } catch (e) {
                Tools.Error("Error running progress callbacks.");
                console.log(e);
            }

            if (this.waitingTasksCount === 0) {
                try {
                    if (this.onFinish) {
                        this.onFinish(this.tasks);
                    }

                    this.onTasksDoneObservable.notifyObservers(this.tasks);
                } catch (e) {
                    Tools.Error("Error running tasks-done callbacks.");
                    console.log(e);
                }
                this._isLoading = false;
                this._scene.getEngine().hideLoadingUI();
            }
        }

        private _runTask(task: AbstractAssetTask): void {

            let done = () => {
                try {
                    if (this.onTaskSuccess) {
                        this.onTaskSuccess(task);
                    }
                    this.onTaskSuccessObservable.notifyObservers(task);
                    this._decreaseWaitingTasksCount(task);
                } catch (e) {
                    error("Error executing task success callbacks", e);
                }

            }

            let error = (message?: string, exception?: any) => {
                task.errorObject = task.errorObject || {
                    message: message,
                    exception: exception
                }
                if (this.onTaskError) {
                    this.onTaskError(task);
                }
                this.onTaskErrorObservable.notifyObservers(task);
                this._decreaseWaitingTasksCount(task);
            }

            task.run(this._scene, done, error);
        }

        public reset(): AssetsManager {
            this._isLoading = false;
            this.tasks = new Array<AbstractAssetTask>();
            return this;
        }

        public load(): AssetsManager {
            if (this._isLoading) {
                return this;
            }
            this._isLoading = true;
            this.waitingTasksCount = this.tasks.length;
            this.totalTasksCount = this.tasks.length;

            if (this.waitingTasksCount === 0) {
                if (this.onFinish) {
                    this.onFinish(this.tasks);
                }
                this.onTasksDoneObservable.notifyObservers(this.tasks);
                return this;
            }

            if (this.useDefaultLoadingScreen) {
                this._scene.getEngine().displayLoadingUI();
            }

            for (var index = 0; index < this.tasks.length; index++) {
                var task = this.tasks[index];
                this._runTask(task);
            }

            return this;
        }
    }
}
