﻿var BABYLON;
(function (BABYLON) {
    var DebugLayer = (function () {
        function DebugLayer(scene) {
            var _this = this;
            this._enabled = false;
            this._labelsEnabled = false;
            this._displayStatistics = true;
            this._displayTree = false;
            this._displayLogs = false;
            this._identityMatrix = BABYLON.Matrix.Identity();
            this.axisRatio = 0.02;
            this._scene = scene;

            this._syncPositions = function () {
                var engine = _this._scene.getEngine();
                var canvasRect = engine.getRenderingCanvasClientRect();

                if (_this._showUI) {
                    _this._statsDiv.style.left = (canvasRect.width - 310) + "px";
                    _this._statsDiv.style.top = (canvasRect.height - 370) + "px";
                    _this._statsDiv.style.width = "300px";
                    _this._statsDiv.style.height = "360px";
                    _this._statsSubsetDiv.style.maxHeight = (canvasRect.height - 60) + "px";

                    _this._optionsDiv.style.left = "0px";
                    _this._optionsDiv.style.top = "10px";
                    _this._optionsDiv.style.width = "200px";
                    _this._optionsDiv.style.height = "auto";
                    _this._optionsSubsetDiv.style.maxHeight = (canvasRect.height - 225) + "px";

                    _this._logDiv.style.left = "0px";
                    _this._logDiv.style.top = (canvasRect.height - 170) + "px";
                    _this._logDiv.style.width = "600px";
                    _this._logDiv.style.height = "160px";

                    _this._treeDiv.style.left = (canvasRect.width - 310) + "px";
                    _this._treeDiv.style.top = "10px";
                    _this._treeDiv.style.width = "300px";
                    _this._treeDiv.style.height = "auto";
                    _this._treeSubsetDiv.style.maxHeight = (canvasRect.height - 420) + "px";
                }

                _this._globalDiv.style.left = canvasRect.left + "px";
                _this._globalDiv.style.top = canvasRect.top + "px";

                _this._drawingCanvas.style.left = "0px";
                _this._drawingCanvas.style.top = "0px";
                _this._drawingCanvas.style.width = engine.getRenderWidth() + "px";
                _this._drawingCanvas.style.height = engine.getRenderHeight() + "px";

                var devicePixelRatio = window.devicePixelRatio || 1;
                var context = _this._drawingContext;
                var backingStoreRatio = context.webkitBackingStorePixelRatio || context.mozBackingStorePixelRatio || context.msBackingStorePixelRatio || context.oBackingStorePixelRatio || context.backingStorePixelRatio || 1;

                _this._ratio = devicePixelRatio / backingStoreRatio;

                _this._drawingCanvas.width = engine.getRenderWidth() * _this._ratio;
                _this._drawingCanvas.height = engine.getRenderHeight() * _this._ratio;
            };

            this._onCanvasClick = function (evt) {
                _this._clickPosition = {
                    x: evt.clientX * _this._ratio,
                    y: evt.clientY * _this._ratio
                };
            };

            this._syncData = function () {
                if (_this._showUI) {
                    if (_this._displayStatistics) {
                        _this._displayStats();
                        _this._statsDiv.style.display = "";
                    } else {
                        _this._statsDiv.style.display = "none";
                    }

                    if (_this._displayLogs) {
                        _this._logDiv.style.display = "";
                    } else {
                        _this._logDiv.style.display = "none";
                    }

                    if (_this._displayTree) {
                        _this._treeDiv.style.display = "";

                        if (_this._needToRefreshMeshesTree) {
                            _this._needToRefreshMeshesTree = false;

                            _this._refreshMeshesTreeContent();
                        }
                    } else {
                        _this._treeDiv.style.display = "none";
                    }
                }

                if (_this._labelsEnabled || !_this._showUI) {
                    _this._drawingContext.clearRect(0, 0, _this._drawingCanvas.width, _this._drawingCanvas.height);

                    var engine = _this._scene.getEngine();
                    var viewport = _this._scene.activeCamera.viewport;
                    var globalViewport = viewport.toGlobal(engine);

                    // Meshes
                    var meshes = _this._scene.getActiveMeshes();
                    for (var index = 0; index < meshes.length; index++) {
                        var mesh = meshes.data[index];

                        var position = mesh.getBoundingInfo().boundingSphere.center;

                        var projectedPosition = BABYLON.Vector3.Project(position, mesh.getWorldMatrix(), _this._scene.getTransformMatrix(), globalViewport);

                        if (mesh.renderOverlay || _this.shouldDisplayAxis && _this.shouldDisplayAxis(mesh)) {
                            _this._renderAxis(projectedPosition, mesh, globalViewport);
                        }

                        if (!_this.shouldDisplayLabel || _this.shouldDisplayLabel(mesh)) {
                            _this._renderLabel(mesh.name, projectedPosition, 12, function () {
                                mesh.renderOverlay = !mesh.renderOverlay;
                            }, function () {
                                return mesh.renderOverlay ? 'red' : 'black';
                            });
                        }
                    }

                    // Cameras
                    var cameras = _this._scene.cameras;
                    for (index = 0; index < cameras.length; index++) {
                        var camera = cameras[index];

                        if (camera === _this._scene.activeCamera) {
                            continue;
                        }

                        projectedPosition = BABYLON.Vector3.Project(camera.position, _this._identityMatrix, _this._scene.getTransformMatrix(), globalViewport);

                        if (!_this.shouldDisplayLabel || _this.shouldDisplayLabel(camera)) {
                            _this._renderLabel(camera.name, projectedPosition, 12, function () {
                                _this._scene.activeCamera.detachControl(engine.getRenderingCanvas());
                                _this._scene.activeCamera = camera;
                                _this._scene.activeCamera.attachControl(engine.getRenderingCanvas());
                            }, function () {
                                return "purple";
                            });
                        }
                    }

                    // Lights
                    var lights = _this._scene.lights;
                    for (index = 0; index < lights.length; index++) {
                        var light = lights[index];

                        if (light.position) {
                            projectedPosition = BABYLON.Vector3.Project(light.position, _this._identityMatrix, _this._scene.getTransformMatrix(), globalViewport);

                            if (!_this.shouldDisplayLabel || _this.shouldDisplayLabel(light)) {
                                _this._renderLabel(light.name, projectedPosition, -20, function () {
                                    light.setEnabled(!light.isEnabled());
                                }, function () {
                                    return light.isEnabled() ? "orange" : "gray";
                                });
                            }
                        }
                    }
                }

                _this._clickPosition = undefined;
            };
        }
        DebugLayer.prototype._refreshMeshesTreeContent = function () {
            // Add meshes
            var sortedArray = this._scene.meshes.slice(0, this._scene.meshes.length);

            sortedArray.sort(function (a, b) {
                if (a.name === b.name) {
                    return 0;
                }

                return (a.name > b.name) ? 1 : -1;
            });

            for (var index = 0; index < sortedArray.length; index++) {
                var mesh = sortedArray[index];

                if (!mesh.isEnabled()) {
                    continue;
                }

                this._generateAdvancedCheckBox(this._treeSubsetDiv, mesh.name, mesh.getTotalVertices() + " verts", mesh.isVisible, function (element, mesh) {
                    mesh.isVisible = element.checked;
                }, mesh);
            }
        };

        DebugLayer.prototype._renderSingleAxis = function (zero, unit, unitText, label, color) {
            this._drawingContext.beginPath();
            this._drawingContext.moveTo(zero.x, zero.y);
            this._drawingContext.lineTo(unit.x, unit.y);

            this._drawingContext.strokeStyle = color;
            this._drawingContext.lineWidth = 4;
            this._drawingContext.stroke();

            this._drawingContext.font = "normal 14px Segoe UI";
            this._drawingContext.fillStyle = color;
            this._drawingContext.fillText(label, unitText.x, unitText.y);
        };

        DebugLayer.prototype._renderAxis = function (projectedPosition, mesh, globalViewport) {
            var position = mesh.getBoundingInfo().boundingSphere.center;
            var worldMatrix = mesh.getWorldMatrix();

            var unprojectedVector = BABYLON.Vector3.UnprojectFromTransform(projectedPosition.add(new BABYLON.Vector3(this._drawingCanvas.width * this.axisRatio, 0, 0)), globalViewport.width, globalViewport.height, worldMatrix, this._scene.getTransformMatrix());
            var unit = (unprojectedVector.subtract(position)).length();

            var xAxis = BABYLON.Vector3.Project(position.add(new BABYLON.Vector3(unit, 0, 0)), worldMatrix, this._scene.getTransformMatrix(), globalViewport);
            var xAxisText = BABYLON.Vector3.Project(position.add(new BABYLON.Vector3(unit * 1.5, 0, 0)), worldMatrix, this._scene.getTransformMatrix(), globalViewport);

            this._renderSingleAxis(projectedPosition, xAxis, xAxisText, "x", "#FF0000");

            var yAxis = BABYLON.Vector3.Project(position.add(new BABYLON.Vector3(0, unit, 0)), worldMatrix, this._scene.getTransformMatrix(), globalViewport);
            var yAxisText = BABYLON.Vector3.Project(position.add(new BABYLON.Vector3(0, unit * 1.5, 0)), worldMatrix, this._scene.getTransformMatrix(), globalViewport);

            this._renderSingleAxis(projectedPosition, yAxis, yAxisText, "y", "#00FF00");

            var zAxis = BABYLON.Vector3.Project(position.add(new BABYLON.Vector3(0, 0, unit)), worldMatrix, this._scene.getTransformMatrix(), globalViewport);
            var zAxisText = BABYLON.Vector3.Project(position.add(new BABYLON.Vector3(0, 0, unit * 1.5)), worldMatrix, this._scene.getTransformMatrix(), globalViewport);

            this._renderSingleAxis(projectedPosition, zAxis, zAxisText, "z", "#0000FF");
        };

        DebugLayer.prototype._renderLabel = function (text, projectedPosition, labelOffset, onClick, getFillStyle) {
            if (projectedPosition.z > 0 && projectedPosition.z < 1.0) {
                this._drawingContext.font = "normal 12px Segoe UI";
                var textMetrics = this._drawingContext.measureText(text);
                var centerX = projectedPosition.x - textMetrics.width / 2;
                var centerY = projectedPosition.y;

                if (this._isClickInsideRect(centerX - 5, centerY - labelOffset - 12, textMetrics.width + 10, 17)) {
                    onClick();
                }

                this._drawingContext.beginPath();
                this._drawingContext.rect(centerX - 5, centerY - labelOffset - 12, textMetrics.width + 10, 17);
                this._drawingContext.fillStyle = getFillStyle();
                this._drawingContext.globalAlpha = 0.5;
                this._drawingContext.fill();
                this._drawingContext.globalAlpha = 1.0;

                this._drawingContext.strokeStyle = '#FFFFFF';
                this._drawingContext.lineWidth = 1;
                this._drawingContext.stroke();

                this._drawingContext.fillStyle = "#FFFFFF";
                this._drawingContext.fillText(text, centerX, centerY - labelOffset);

                this._drawingContext.beginPath();
                this._drawingContext.arc(projectedPosition.x, centerY, 5, 0, 2 * Math.PI, false);
                this._drawingContext.fill();
            }
        };

        DebugLayer.prototype._isClickInsideRect = function (x, y, width, height) {
            if (!this._clickPosition) {
                return false;
            }

            if (this._clickPosition.x < x || this._clickPosition.x > x + width) {
                return false;
            }

            if (this._clickPosition.y < y || this._clickPosition.y > y + height) {
                return false;
            }

            return true;
        };

        DebugLayer.prototype.isVisible = function () {
            return this._enabled;
        };

        DebugLayer.prototype.hide = function () {
            if (!this._enabled) {
                return;
            }

            this._enabled = false;

            var engine = this._scene.getEngine();

            this._scene.unregisterAfterRender(this._syncData);
            document.body.removeChild(this._globalDiv);

            window.removeEventListener("resize", this._syncPositions);

            this._scene.forceShowBoundingBoxes = false;
            this._scene.forceWireframe = false;

            BABYLON.StandardMaterial.DiffuseTextureEnabled = true;
            BABYLON.StandardMaterial.AmbientTextureEnabled = true;
            BABYLON.StandardMaterial.SpecularTextureEnabled = true;
            BABYLON.StandardMaterial.EmissiveTextureEnabled = true;
            BABYLON.StandardMaterial.BumpTextureEnabled = true;
            BABYLON.StandardMaterial.OpacityTextureEnabled = true;
            BABYLON.StandardMaterial.ReflectionTextureEnabled = true;

            this._scene.shadowsEnabled = true;
            this._scene.particlesEnabled = true;
            this._scene.postProcessesEnabled = true;
            this._scene.collisionsEnabled = true;
            this._scene.lightsEnabled = true;
            this._scene.texturesEnabled = true;
            this._scene.lensFlaresEnabled = true;
            this._scene.proceduralTexturesEnabled = true;
            this._scene.renderTargetsEnabled = true;

            engine.getRenderingCanvas().removeEventListener("click", this._onCanvasClick);
        };

        DebugLayer.prototype.show = function (showUI) {
            if (typeof showUI === "undefined") { showUI = true; }
            if (this._enabled) {
                return;
            }

            this._enabled = true;
            this._showUI = showUI;

            var engine = this._scene.getEngine();

            this._scene.registerAfterRender(this._syncData);

            this._globalDiv = document.createElement("div");

            document.body.appendChild(this._globalDiv);

            this._generateDOMelements();

            window.addEventListener("resize", this._syncPositions);
            engine.getRenderingCanvas().addEventListener("click", this._onCanvasClick);

            this._syncPositions();
        };

        DebugLayer.prototype._clearLabels = function () {
            this._drawingContext.clearRect(0, 0, this._drawingCanvas.width, this._drawingCanvas.height);

            for (var index = 0; index < this._scene.meshes.length; index++) {
                var mesh = this._scene.meshes[index];
                mesh.renderOverlay = false;
            }
        };

        DebugLayer.prototype._generateheader = function (root, text) {
            var header = document.createElement("div");
            header.innerHTML = text + "&nbsp;";

            header.style.textAlign = "right";
            header.style.width = "100%";
            header.style.color = "white";
            header.style.backgroundColor = "Black";
            header.style.padding = "5px 5px 4px 0px";
            header.style.marginLeft = "-5px";

            root.appendChild(header);
        };

        DebugLayer.prototype._generateTexBox = function (root, title) {
            var label = document.createElement("label");
            label.innerHTML = title;

            root.appendChild(label);
            root.appendChild(document.createElement("br"));
        };

        DebugLayer.prototype._generateAdvancedCheckBox = function (root, leftTitle, rightTitle, initialState, task, tag) {
            if (typeof tag === "undefined") { tag = null; }
            var label = document.createElement("label");

            var boundingBoxesCheckbox = document.createElement("input");
            boundingBoxesCheckbox.type = "checkbox";
            boundingBoxesCheckbox.checked = initialState;

            boundingBoxesCheckbox.addEventListener("change", function (evt) {
                task(evt.target, tag);
            });

            label.appendChild(boundingBoxesCheckbox);
            var container = document.createElement("span");
            var leftPart = document.createElement("span");
            var rightPart = document.createElement("span");

            rightPart.style.cssFloat = "right";

            leftPart.innerHTML = leftTitle;
            rightPart.innerHTML = rightTitle;

            container.appendChild(leftPart);
            container.appendChild(rightPart);

            label.appendChild(container);
            root.appendChild(label);
            root.appendChild(document.createElement("br"));
        };

        DebugLayer.prototype._generateCheckBox = function (root, title, initialState, task, tag) {
            if (typeof tag === "undefined") { tag = null; }
            var label = document.createElement("label");

            var boundingBoxesCheckbox = document.createElement("input");
            boundingBoxesCheckbox.type = "checkbox";
            boundingBoxesCheckbox.checked = initialState;

            boundingBoxesCheckbox.addEventListener("change", function (evt) {
                task(evt.target, tag);
            });

            label.appendChild(boundingBoxesCheckbox);
            label.appendChild(document.createTextNode(title));
            root.appendChild(label);
            root.appendChild(document.createElement("br"));
        };

        DebugLayer.prototype._generateRadio = function (root, title, name, initialState, task, tag) {
            if (typeof tag === "undefined") { tag = null; }
            var label = document.createElement("label");

            var boundingBoxesRadio = document.createElement("input");
            boundingBoxesRadio.type = "radio";
            boundingBoxesRadio.name = name;
            boundingBoxesRadio.checked = initialState;

            boundingBoxesRadio.addEventListener("change", function (evt) {
                task(evt.target, tag);
            });

            label.appendChild(boundingBoxesRadio);
            label.appendChild(document.createTextNode(title));
            root.appendChild(label);
            root.appendChild(document.createElement("br"));
        };

        DebugLayer.prototype._generateDOMelements = function () {
            var _this = this;
            this._globalDiv.id = "DebugLayer";

            // Drawing canvas
            this._drawingCanvas = document.createElement("canvas");
            this._drawingCanvas.id = "DebugLayerDrawingCanvas";
            this._drawingCanvas.style.position = "absolute";
            this._drawingCanvas.style.pointerEvents = "none";
            this._drawingContext = this._drawingCanvas.getContext("2d");
            this._globalDiv.appendChild(this._drawingCanvas);

            if (this._showUI) {
                var background = "rgba(128, 128, 128, 0.4)";
                var border = "rgb(180, 180, 180) solid 1px";

                // Stats
                this._statsDiv = document.createElement("div");
                this._statsDiv.id = "DebugLayerStats";
                this._statsDiv.style.border = border;
                this._statsDiv.style.position = "absolute";
                this._statsDiv.style.background = background;
                this._statsDiv.style.padding = "0px 0px 0px 5px";
                this._statsDiv.style.pointerEvents = "none";
                this._statsDiv.style.overflowY = "auto";
                this._generateheader(this._statsDiv, "Statistics");
                this._statsSubsetDiv = document.createElement("div");
                this._statsSubsetDiv.style.paddingTop = "5px";
                this._statsSubsetDiv.style.paddingBottom = "5px";
                this._statsDiv.appendChild(this._statsSubsetDiv);

                // Tree
                this._treeDiv = document.createElement("div");
                this._treeDiv.id = "DebugLayerTree";
                this._treeDiv.style.border = border;
                this._treeDiv.style.position = "absolute";
                this._treeDiv.style.background = background;
                this._treeDiv.style.padding = "0px 0px 0px 5px";
                this._treeDiv.style.display = "none";
                this._generateheader(this._treeDiv, "Meshes tree");
                this._treeSubsetDiv = document.createElement("div");
                this._treeSubsetDiv.style.paddingTop = "5px";
                this._treeSubsetDiv.style.paddingRight = "5px";
                this._treeSubsetDiv.style.overflowY = "auto";
                this._treeSubsetDiv.style.maxHeight = "300px";
                this._treeDiv.appendChild(this._treeSubsetDiv);
                this._needToRefreshMeshesTree = true;

                // Logs
                this._logDiv = document.createElement("div");
                this._logDiv.style.border = border;
                this._logDiv.id = "DebugLayerLogs";
                this._logDiv.style.position = "absolute";
                this._logDiv.style.background = background;
                this._logDiv.style.padding = "0px 0px 0px 5px";
                this._logDiv.style.display = "none";
                this._generateheader(this._logDiv, "Logs");
                this._logSubsetDiv = document.createElement("div");
                this._logSubsetDiv.style.height = "127px";
                this._logSubsetDiv.style.paddingTop = "5px";
                this._logSubsetDiv.style.overflowY = "auto";
                this._logSubsetDiv.style.fontSize = "12px";
                this._logSubsetDiv.style.fontFamily = "consolas";
                this._logSubsetDiv.innerHTML = BABYLON.Tools.LogCache;
                this._logDiv.appendChild(this._logSubsetDiv);
                BABYLON.Tools.OnNewCacheEntry = function (entry) {
                    _this._logSubsetDiv.innerHTML = entry + _this._logSubsetDiv.innerHTML;
                };

                // Options
                this._optionsDiv = document.createElement("div");
                this._optionsDiv.id = "DebugLayerOptions";
                this._optionsDiv.style.border = border;
                this._optionsDiv.style.position = "absolute";
                this._optionsDiv.style.background = background;
                this._optionsDiv.style.padding = "0px 0px 0px 5px";
                this._optionsDiv.style.overflowY = "auto";
                this._generateheader(this._optionsDiv, "Options");
                this._optionsSubsetDiv = document.createElement("div");
                this._optionsSubsetDiv.style.paddingTop = "5px";
                this._optionsSubsetDiv.style.paddingBottom = "5px";
                this._optionsSubsetDiv.style.overflowY = "auto";
                this._optionsSubsetDiv.style.maxHeight = "200px";
                this._optionsDiv.appendChild(this._optionsSubsetDiv);

                this._generateTexBox(this._optionsSubsetDiv, "<b>General:</b>");
                this._generateCheckBox(this._optionsSubsetDiv, "Statistics", this._displayStatistics, function (element) {
                    _this._displayStatistics = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Logs", this._displayLogs, function (element) {
                    _this._displayLogs = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Meshes tree", this._displayTree, function (element) {
                    _this._displayTree = element.checked;
                    _this._needToRefreshMeshesTree = true;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Bounding boxes", this._scene.forceShowBoundingBoxes, function (element) {
                    _this._scene.forceShowBoundingBoxes = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Clickable labels", this._labelsEnabled, function (element) {
                    _this._labelsEnabled = element.checked;
                    if (!_this._labelsEnabled) {
                        _this._clearLabels();
                    }
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Generate user marks", BABYLON.Tools.PerformanceLogLevel === BABYLON.Tools.PerformanceUserMarkLogLevel, function (element) {
                    if (element.checked) {
                        BABYLON.Tools.PerformanceLogLevel = BABYLON.Tools.PerformanceUserMarkLogLevel;
                    } else {
                        BABYLON.Tools.PerformanceLogLevel = BABYLON.Tools.PerformanceNoneLogLevel;
                    }
                });
                ;
                this._optionsSubsetDiv.appendChild(document.createElement("br"));
                this._generateTexBox(this._optionsSubsetDiv, "<b>Rendering mode:</b>");
                this._generateRadio(this._optionsSubsetDiv, "Solid", "renderMode", !this._scene.forceWireframe && !this._scene.forcePointsCloud, function (element) {
                    if (element.checked) {
                        _this._scene.forceWireframe = false;
                        _this._scene.forcePointsCloud = false;
                    }
                });
                this._generateRadio(this._optionsSubsetDiv, "Wireframe", "renderMode", this._scene.forceWireframe, function (element) {
                    if (element.checked) {
                        _this._scene.forceWireframe = true;
                        _this._scene.forcePointsCloud = false;
                    }
                });
                this._generateRadio(this._optionsSubsetDiv, "Point", "renderMode", this._scene.forcePointsCloud, function (element) {
                    if (element.checked) {
                        _this._scene.forceWireframe = false;
                        _this._scene.forcePointsCloud = true;
                    }
                });
                this._optionsSubsetDiv.appendChild(document.createElement("br"));
                this._generateTexBox(this._optionsSubsetDiv, "<b>Texture channels:</b>");
                this._generateCheckBox(this._optionsSubsetDiv, "Diffuse", BABYLON.StandardMaterial.DiffuseTextureEnabled, function (element) {
                    BABYLON.StandardMaterial.DiffuseTextureEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Ambient", BABYLON.StandardMaterial.AmbientTextureEnabled, function (element) {
                    BABYLON.StandardMaterial.AmbientTextureEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Specular", BABYLON.StandardMaterial.SpecularTextureEnabled, function (element) {
                    BABYLON.StandardMaterial.SpecularTextureEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Emissive", BABYLON.StandardMaterial.EmissiveTextureEnabled, function (element) {
                    BABYLON.StandardMaterial.EmissiveTextureEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Bump", BABYLON.StandardMaterial.BumpTextureEnabled, function (element) {
                    BABYLON.StandardMaterial.BumpTextureEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Opacity", BABYLON.StandardMaterial.OpacityTextureEnabled, function (element) {
                    BABYLON.StandardMaterial.OpacityTextureEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Reflection", BABYLON.StandardMaterial.ReflectionTextureEnabled, function (element) {
                    BABYLON.StandardMaterial.ReflectionTextureEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Fresnel", BABYLON.StandardMaterial.FresnelEnabled, function (element) {
                    BABYLON.StandardMaterial.FresnelEnabled = element.checked;
                });
                this._optionsSubsetDiv.appendChild(document.createElement("br"));
                this._generateTexBox(this._optionsSubsetDiv, "<b>Options:</b>");
                this._generateCheckBox(this._optionsSubsetDiv, "Animations", this._scene.animationsEnabled, function (element) {
                    _this._scene.animationsEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Collisions", this._scene.collisionsEnabled, function (element) {
                    _this._scene.collisionsEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Fog", this._scene.fogEnabled, function (element) {
                    _this._scene.fogEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Lens flares", this._scene.lensFlaresEnabled, function (element) {
                    _this._scene.lensFlaresEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Lights", this._scene.lightsEnabled, function (element) {
                    _this._scene.lightsEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Particles", this._scene.particlesEnabled, function (element) {
                    _this._scene.particlesEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Post-processes", this._scene.postProcessesEnabled, function (element) {
                    _this._scene.postProcessesEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Procedural textures", this._scene.proceduralTexturesEnabled, function (element) {
                    _this._scene.proceduralTexturesEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Render targets", this._scene.renderTargetsEnabled, function (element) {
                    _this._scene.renderTargetsEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Shadows", this._scene.shadowsEnabled, function (element) {
                    _this._scene.shadowsEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Skeletons", this._scene.skeletonsEnabled, function (element) {
                    _this._scene.skeletonsEnabled = element.checked;
                });
                this._generateCheckBox(this._optionsSubsetDiv, "Textures", this._scene.texturesEnabled, function (element) {
                    _this._scene.texturesEnabled = element.checked;
                });

                // Global
                this._globalDiv.style.position = "absolute";
                this._globalDiv.appendChild(this._statsDiv);
                this._globalDiv.appendChild(this._logDiv);
                this._globalDiv.appendChild(this._optionsDiv);
                this._globalDiv.appendChild(this._treeDiv);

                this._globalDiv.style.fontFamily = "Segoe UI, Arial";
                this._globalDiv.style.fontSize = "14px";
                this._globalDiv.style.color = "white";
            }
        };

        DebugLayer.prototype._displayStats = function () {
            var scene = this._scene;
            var engine = scene.getEngine();

            this._statsSubsetDiv.innerHTML = "Babylon.js v" + BABYLON.Engine.Version + " - <b>" + BABYLON.Tools.Format(BABYLON.Tools.GetFps(), 0) + " fps</b><br><br>" + "Total meshes: " + scene.meshes.length + "<br>" + "Total vertices: " + scene.getTotalVertices() + "<br>" + "Active meshes: " + scene.getActiveMeshes().length + "<br>" + "Active vertices: " + scene.getActiveVertices() + "<br>" + "Active bones: " + scene.getActiveBones() + "<br>" + "Active particles: " + scene.getActiveParticles() + "<br><br>" + "Frame duration: " + BABYLON.Tools.Format(scene.getLastFrameDuration()) + " ms<br>" + "<b>Draw calls: " + engine.drawCalls + "</b><br><br>" + "<i>Evaluate Active Meshes duration:</i> " + BABYLON.Tools.Format(scene.getEvaluateActiveMeshesDuration()) + " ms<br>" + "<i>Render Targets duration:</i> " + BABYLON.Tools.Format(scene.getRenderTargetsDuration()) + " ms<br>" + "<i>Particles duration:</i> " + BABYLON.Tools.Format(scene.getParticlesDuration()) + " ms<br>" + "<i>Sprites duration:</i> " + BABYLON.Tools.Format(scene.getSpritesDuration()) + " ms<br>" + "<i>Render duration:</i> <b>" + BABYLON.Tools.Format(scene.getRenderDuration()) + " ms</b>";
        };
        return DebugLayer;
    })();
    BABYLON.DebugLayer = DebugLayer;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.debugLayer.js.map
