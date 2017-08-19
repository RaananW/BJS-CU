﻿module BABYLON {
    export class FilesInput {
        private _engine: Engine;
        private _currentScene: Scene;
        private _canvas: HTMLCanvasElement;
        private _sceneLoadedCallback;
        private _progressCallback;
        private _additionnalRenderLoopLogicCallback;
        private _textureLoadingCallback;
        private _startingProcessingFilesCallback;
        private _onReloadCallback;
        private _elementToMonitor: HTMLElement;
        public static FilesToLoad: File[] = new Array();

        private _sceneFileToLoad: File;
        private _filesToLoad: File[];

        /// Register to core BabylonJS object: engine, scene, rendering canvas, callback function when the scene will be loaded,
        /// loading progress callback and optionnal addionnal logic to call in the rendering loop
        constructor(p_engine: Engine, p_scene: Scene, p_canvas: HTMLCanvasElement, p_sceneLoadedCallback, p_progressCallback,
            p_additionnalRenderLoopLogicCallback, p_textureLoadingCallback, p_startingProcessingFilesCallback, p_onReloadCallback) {
            this._engine = p_engine;
            this._canvas = p_canvas;
            this._currentScene = p_scene;
            this._sceneLoadedCallback = p_sceneLoadedCallback;
            this._progressCallback = p_progressCallback;
            this._additionnalRenderLoopLogicCallback = p_additionnalRenderLoopLogicCallback;
            this._textureLoadingCallback = p_textureLoadingCallback;
            this._startingProcessingFilesCallback = p_startingProcessingFilesCallback;
            this._onReloadCallback = p_onReloadCallback;
        }

        public monitorElementForDragNDrop(p_elementToMonitor: HTMLElement): void {
            if (p_elementToMonitor) {
                this._elementToMonitor = p_elementToMonitor;
                this._elementToMonitor.addEventListener("dragenter", (e) => { this.drag(e); }, false);
                this._elementToMonitor.addEventListener("dragover", (e) => { this.drag(e); }, false);
                this._elementToMonitor.addEventListener("drop", (e) => { this.drop(e); }, false);
            }
        }

        private renderFunction(): void {
            if (this._additionnalRenderLoopLogicCallback) {
                this._additionnalRenderLoopLogicCallback();
            }

            if (this._currentScene) {
                if (this._textureLoadingCallback) {
                    var remaining = this._currentScene.getWaitingItemsCount();

                    if (remaining > 0) {
                        this._textureLoadingCallback(remaining);
                    }
                }
                this._currentScene.render();
            }
        }

        private drag(e: DragEvent): void {
            e.stopPropagation();
            e.preventDefault();
        }

        private drop(eventDrop: DragEvent): void {
            eventDrop.stopPropagation();
            eventDrop.preventDefault();

            this.loadFiles(eventDrop);
        }

        private _handleFolderDrop(entry: any, files: Array<any>, callback: () => void): void {
            var reader = entry.createReader(),
 			relativePath = entry.fullPath.replace(/^\//, "").replace(/(.+?)\/?$/, "$1/");
 			reader.readEntries((fileEntries) => {
                var remaining = fileEntries.length;
                for (let fileEntry of fileEntries) {
                    if (fileEntry.isFile) { // We only support one level
                        fileEntry.file(function(file) {
                            file.correctName = relativePath + file.name;
                            files.push(file);
            
                            remaining--;

                            if (remaining === 0) {
                                callback();
                            }
                        });
                    } else {
                        remaining--;

                        if (remaining === 0) {
                            callback();
                        }
                    }
                }
            });
        }

        private _processFiles(files: Array<any>): void {
            for (var i = 0; i < files.length; i++) {
                var name = files[i].correctName.toLowerCase();
                var extension = name.split('.').pop();
                
                if ((extension === "babylon" || extension === "stl" || extension === "obj" || extension === "gltf" || extension === "glb") 
                    && name.indexOf(".binary.babylon") === -1 && name.indexOf(".incremental.babylon") === -1) {
                    this._sceneFileToLoad = files[i];
                }
                else {
                    FilesInput.FilesToLoad[name] = files[i];
                }
            }

            if (this._onReloadCallback) {
                this._onReloadCallback(this._sceneFileToLoad);
            }
            else {
                this.reload();
            }
        }

        public loadFiles(event): void {
            if (this._startingProcessingFilesCallback) this._startingProcessingFilesCallback();

            // Handling data transfer via drag'n'drop
            if (event && event.dataTransfer && event.dataTransfer.files) {
                this._filesToLoad = event.dataTransfer.files;
            }

            // Handling files from input files
            if (event && event.target && event.target.files) {
                this._filesToLoad = event.target.files;
            }

            if (this._filesToLoad && this._filesToLoad.length > 0) {
        
                let files = [];
                let folders = [];
                var items = event.dataTransfer ? event.dataTransfer.items : null;

                for (var i = 0; i < this._filesToLoad.length; i++) {
                    let fileToLoad:any =  this._filesToLoad[i];
                    let name = fileToLoad.name.toLowerCase();
                    let type = fileToLoad.type;
                    let entry;

                    fileToLoad.correctName = name;
                    
                    if (items) {
                        let item = items[i];
                        if (item.getAsEntry) {
                            entry = item.getAsEntry();
                        } else if (item.webkitGetAsEntry) {
                            entry = item.webkitGetAsEntry();
                        }                     
                    }

                    if (!entry) {    
                        files.push(fileToLoad);
                    } else {
                        if (entry.isDirectory) {
                            folders.push(entry);
                        } else {
                            files.push(fileToLoad);
                        }
                    }
                }

                if (folders.length === 0) {
                    this._processFiles(files);
                } else {
                    var remaining = folders.length;

                    // Extract folder content
                    for (var folder of folders) {
                        this._handleFolderDrop(folder, files, () => {
                            remaining--;

                            if (remaining === 0) {
                                this._processFiles(files);
                            }
                        });
                    }
                }
            }
        }

        public reload() {
            var that = this;
            // If a ".babylon" file has been provided
            if (this._sceneFileToLoad) {
                if (this._currentScene) {
                    if (Tools.errorsCount > 0) {
                        Tools.ClearLogCache();
                        Tools.Log("Babylon.js engine (v" + Engine.Version + ") launched");
                    }
                    this._engine.stopRenderLoop();
                    this._currentScene.dispose();
                }

                SceneLoader.Load("file:", this._sceneFileToLoad, this._engine, (newScene) => {
                    that._currentScene = newScene;

                    // Wait for textures and shaders to be ready
                    that._currentScene.executeWhenReady(() => {

                        if (that._sceneLoadedCallback) {
                            that._sceneLoadedCallback(this._sceneFileToLoad, that._currentScene);
                        }
                        that._engine.runRenderLoop(() => { that.renderFunction(); });
                    });
                }, progress => {
                        if (this._progressCallback) {
                            this._progressCallback(progress);
                        }
                    });
            }
            else {
                Tools.Error("Please provide a valid .babylon file.");
            }
        }
    }
}