var BABYLON;
(function (BABYLON) {
    var _DepthCullingState = (function () {
        function _DepthCullingState() {
            this._isDepthTestDirty = false;
            this._isDepthMaskDirty = false;
            this._isDepthFuncDirty = false;
            this._isCullFaceDirty = false;
            this._isCullDirty = false;
            this._isZOffsetDirty = false;
        }
        Object.defineProperty(_DepthCullingState.prototype, "isDirty", {
            get: function () {
                return this._isDepthFuncDirty || this._isDepthTestDirty || this._isDepthMaskDirty || this._isCullFaceDirty || this._isCullDirty || this._isZOffsetDirty;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(_DepthCullingState.prototype, "zOffset", {
            get: function () {
                return this._zOffset;
            },
            set: function (value) {
                if (this._zOffset === value) {
                    return;
                }
                this._zOffset = value;
                this._isZOffsetDirty = true;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(_DepthCullingState.prototype, "cullFace", {
            get: function () {
                return this._cullFace;
            },
            set: function (value) {
                if (this._cullFace === value) {
                    return;
                }
                this._cullFace = value;
                this._isCullFaceDirty = true;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(_DepthCullingState.prototype, "cull", {
            get: function () {
                return this._cull;
            },
            set: function (value) {
                if (this._cull === value) {
                    return;
                }
                this._cull = value;
                this._isCullDirty = true;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(_DepthCullingState.prototype, "depthFunc", {
            get: function () {
                return this._depthFunc;
            },
            set: function (value) {
                if (this._depthFunc === value) {
                    return;
                }
                this._depthFunc = value;
                this._isDepthFuncDirty = true;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(_DepthCullingState.prototype, "depthMask", {
            get: function () {
                return this._depthMask;
            },
            set: function (value) {
                if (this._depthMask === value) {
                    return;
                }
                this._depthMask = value;
                this._isDepthMaskDirty = true;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(_DepthCullingState.prototype, "depthTest", {
            get: function () {
                return this._depthTest;
            },
            set: function (value) {
                if (this._depthTest === value) {
                    return;
                }
                this._depthTest = value;
                this._isDepthTestDirty = true;
            },
            enumerable: true,
            configurable: true
        });
        _DepthCullingState.prototype.reset = function () {
            this._depthMask = true;
            this._depthTest = true;
            this._depthFunc = null;
            this._cull = null;
            this._cullFace = null;
            this._zOffset = 0;
            this._isDepthTestDirty = true;
            this._isDepthMaskDirty = true;
            this._isDepthFuncDirty = false;
            this._isCullFaceDirty = false;
            this._isCullDirty = false;
            this._isZOffsetDirty = false;
        };
        _DepthCullingState.prototype.apply = function (gl) {
            if (!this.isDirty) {
                return;
            }
            // Cull
            if (this._isCullDirty) {
                if (this.cull) {
                    gl.enable(gl.CULL_FACE);
                }
                else {
                    gl.disable(gl.CULL_FACE);
                }
                this._isCullDirty = false;
            }
            // Cull face
            if (this._isCullFaceDirty) {
                gl.cullFace(this.cullFace);
                this._isCullFaceDirty = false;
            }
            // Depth mask
            if (this._isDepthMaskDirty) {
                gl.depthMask(this.depthMask);
                this._isDepthMaskDirty = false;
            }
            // Depth test
            if (this._isDepthTestDirty) {
                if (this.depthTest) {
                    gl.enable(gl.DEPTH_TEST);
                }
                else {
                    gl.disable(gl.DEPTH_TEST);
                }
                this._isDepthTestDirty = false;
            }
            // Depth func
            if (this._isDepthFuncDirty) {
                gl.depthFunc(this.depthFunc);
                this._isDepthFuncDirty = false;
            }
            // zOffset
            if (this._isZOffsetDirty) {
                if (this.zOffset) {
                    gl.enable(gl.POLYGON_OFFSET_FILL);
                    gl.polygonOffset(this.zOffset, 0);
                }
                else {
                    gl.disable(gl.POLYGON_OFFSET_FILL);
                }
                this._isZOffsetDirty = false;
            }
        };
        return _DepthCullingState;
    })();
    BABYLON._DepthCullingState = _DepthCullingState;
    var _AlphaState = (function () {
        function _AlphaState() {
            this._isAlphaBlendDirty = false;
            this._isBlendFunctionParametersDirty = false;
            this._alphaBlend = false;
            this._blendFunctionParameters = new Array(4);
        }
        Object.defineProperty(_AlphaState.prototype, "isDirty", {
            get: function () {
                return this._isAlphaBlendDirty || this._isBlendFunctionParametersDirty;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(_AlphaState.prototype, "alphaBlend", {
            get: function () {
                return this._alphaBlend;
            },
            set: function (value) {
                if (this._alphaBlend === value) {
                    return;
                }
                this._alphaBlend = value;
                this._isAlphaBlendDirty = true;
            },
            enumerable: true,
            configurable: true
        });
        _AlphaState.prototype.setAlphaBlendFunctionParameters = function (value0, value1, value2, value3) {
            if (this._blendFunctionParameters[0] === value0 && this._blendFunctionParameters[1] === value1 && this._blendFunctionParameters[2] === value2 && this._blendFunctionParameters[3] === value3) {
                return;
            }
            this._blendFunctionParameters[0] = value0;
            this._blendFunctionParameters[1] = value1;
            this._blendFunctionParameters[2] = value2;
            this._blendFunctionParameters[3] = value3;
            this._isBlendFunctionParametersDirty = true;
        };
        _AlphaState.prototype.reset = function () {
            this._alphaBlend = false;
            this._blendFunctionParameters[0] = null;
            this._blendFunctionParameters[1] = null;
            this._blendFunctionParameters[2] = null;
            this._blendFunctionParameters[3] = null;
            this._isAlphaBlendDirty = true;
            this._isBlendFunctionParametersDirty = false;
        };
        _AlphaState.prototype.apply = function (gl) {
            if (!this.isDirty) {
                return;
            }
            // Alpha blend
            if (this._isAlphaBlendDirty) {
                if (this._alphaBlend) {
                    gl.enable(gl.BLEND);
                }
                else {
                    gl.disable(gl.BLEND);
                }
                this._isAlphaBlendDirty = false;
            }
            // Alpha function
            if (this._isBlendFunctionParametersDirty) {
                gl.blendFuncSeparate(this._blendFunctionParameters[0], this._blendFunctionParameters[1], this._blendFunctionParameters[2], this._blendFunctionParameters[3]);
                this._isBlendFunctionParametersDirty = false;
            }
        };
        return _AlphaState;
    })();
    BABYLON._AlphaState = _AlphaState;
    var compileShader = function (gl, source, type, defines) {
        var shader = gl.createShader(type === "vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
        gl.shaderSource(shader, (defines ? defines + "\n" : "") + source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }
        return shader;
    };
    var getWebGLTextureType = function (gl, type) {
        var textureType = gl.UNSIGNED_BYTE;
        if (type === Engine.TEXTURETYPE_FLOAT)
            textureType = gl.FLOAT;
        return textureType;
    };
    var getSamplingParameters = function (samplingMode, generateMipMaps, gl) {
        var magFilter = gl.NEAREST;
        var minFilter = gl.NEAREST;
        if (samplingMode === BABYLON.Texture.BILINEAR_SAMPLINGMODE) {
            magFilter = gl.LINEAR;
            if (generateMipMaps) {
                minFilter = gl.LINEAR_MIPMAP_NEAREST;
            }
            else {
                minFilter = gl.LINEAR;
            }
        }
        else if (samplingMode === BABYLON.Texture.TRILINEAR_SAMPLINGMODE) {
            magFilter = gl.LINEAR;
            if (generateMipMaps) {
                minFilter = gl.LINEAR_MIPMAP_LINEAR;
            }
            else {
                minFilter = gl.LINEAR;
            }
        }
        else if (samplingMode === BABYLON.Texture.NEAREST_SAMPLINGMODE) {
            magFilter = gl.NEAREST;
            if (generateMipMaps) {
                minFilter = gl.NEAREST_MIPMAP_LINEAR;
            }
            else {
                minFilter = gl.NEAREST;
            }
        }
        return {
            min: minFilter,
            mag: magFilter
        };
    };
    var prepareWebGLTexture = function (texture, gl, scene, width, height, invertY, noMipmap, isCompressed, processFunction, samplingMode) {
        if (samplingMode === void 0) { samplingMode = BABYLON.Texture.TRILINEAR_SAMPLINGMODE; }
        var engine = scene.getEngine();
        var potWidth = BABYLON.Tools.GetExponantOfTwo(width, engine.getCaps().maxTextureSize);
        var potHeight = BABYLON.Tools.GetExponantOfTwo(height, engine.getCaps().maxTextureSize);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, invertY === undefined ? 1 : (invertY ? 1 : 0));
        texture._baseWidth = width;
        texture._baseHeight = height;
        texture._width = potWidth;
        texture._height = potHeight;
        texture.isReady = true;
        processFunction(potWidth, potHeight);
        var filters = getSamplingParameters(samplingMode, !noMipmap, gl);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filters.mag);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filters.min);
        if (!noMipmap && !isCompressed) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
        engine._activeTexturesCache = [];
        scene._removePendingData(texture);
    };
    var partialLoad = function (url, index, loadedImages, scene, onfinish) {
        var onload = function () {
            loadedImages[index] = img;
            loadedImages._internalCount++;
            scene._removePendingData(img);
            if (loadedImages._internalCount === 6) {
                onfinish(loadedImages);
            }
        };
        var onerror = function () {
            scene._removePendingData(img);
        };
        var img = BABYLON.Tools.LoadImage(url, onload, onerror, scene.database);
        scene._addPendingData(img);
    };
    var cascadeLoad = function (rootUrl, scene, onfinish, extensions) {
        var loadedImages = [];
        loadedImages._internalCount = 0;
        for (var index = 0; index < 6; index++) {
            partialLoad(rootUrl + extensions[index], index, loadedImages, scene, onfinish);
        }
    };
    var EngineCapabilities = (function () {
        function EngineCapabilities() {
        }
        return EngineCapabilities;
    })();
    BABYLON.EngineCapabilities = EngineCapabilities;
    /**
     * The engine class is responsible for interfacing with all lower-level APIs such as WebGL and Audio.
     */
    var Engine = (function () {
        /**
         * @constructor
         * @param {HTMLCanvasElement} canvas - the canvas to be used for rendering
         * @param {boolean} [antialias] - enable antialias
         * @param options - further options to be sent to the getContext function
         */
        function Engine(canvas, antialias, options) {
            var _this = this;
            // Public members
            this.isFullscreen = false;
            this.isPointerLock = false;
            this.cullBackFaces = true;
            this.renderEvenInBackground = true;
            this.scenes = new Array();
            this._windowIsBackground = false;
            this._loadingDivBackgroundColor = "black";
            this._drawCalls = 0;
            this._renderingQueueLaunched = false;
            this._activeRenderLoops = [];
            // FPS
            this.fpsRange = 60;
            this.previousFramesDuration = [];
            this.fps = 60;
            this.deltaTime = 0;
            // States
            this._depthCullingState = new _DepthCullingState();
            this._alphaState = new _AlphaState();
            this._alphaMode = Engine.ALPHA_DISABLE;
            // Cache
            this._loadedTexturesCache = new Array();
            this._activeTexturesCache = new Array();
            this._compiledEffects = {};
            this._uintIndicesCurrentlySet = false;
            this._renderingCanvas = canvas;
            this._canvasClientRect = this._renderingCanvas.getBoundingClientRect();
            options = options || {};
            options.antialias = antialias;
            try {
                this._gl = canvas.getContext("webgl", options) || canvas.getContext("experimental-webgl", options);
            }
            catch (e) {
                throw new Error("WebGL not supported");
            }
            if (!this._gl) {
                throw new Error("WebGL not supported");
            }
            this._onBlur = function () {
                _this._windowIsBackground = true;
            };
            this._onFocus = function () {
                _this._windowIsBackground = false;
            };
            window.addEventListener("blur", this._onBlur);
            window.addEventListener("focus", this._onFocus);
            // Viewport
            this._hardwareScalingLevel = 1.0 / (window.devicePixelRatio || 1.0);
            this.resize();
            // Caps
            this._caps = new EngineCapabilities();
            this._caps.maxTexturesImageUnits = this._gl.getParameter(this._gl.MAX_TEXTURE_IMAGE_UNITS);
            this._caps.maxTextureSize = this._gl.getParameter(this._gl.MAX_TEXTURE_SIZE);
            this._caps.maxCubemapTextureSize = this._gl.getParameter(this._gl.MAX_CUBE_MAP_TEXTURE_SIZE);
            this._caps.maxRenderTextureSize = this._gl.getParameter(this._gl.MAX_RENDERBUFFER_SIZE);
            // Infos
            this._glVersion = this._gl.getParameter(this._gl.VERSION);
            var rendererInfo = this._gl.getExtension("WEBGL_debug_renderer_info");
            if (rendererInfo != null) {
                this._glRenderer = this._gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL);
                this._glVendor = this._gl.getParameter(rendererInfo.UNMASKED_VENDOR_WEBGL);
            }
            if (!this._glVendor) {
                this._glVendor = "Unknown vendor";
            }
            if (!this._glRenderer) {
                this._glRenderer = "Unknown renderer";
            }
            // Extensions
            this._caps.standardDerivatives = (this._gl.getExtension('OES_standard_derivatives') !== null);
            this._caps.s3tc = this._gl.getExtension('WEBGL_compressed_texture_s3tc');
            this._caps.textureFloat = (this._gl.getExtension('OES_texture_float') !== null);
            this._caps.textureAnisotropicFilterExtension = this._gl.getExtension('EXT_texture_filter_anisotropic') || this._gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') || this._gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
            this._caps.maxAnisotropy = this._caps.textureAnisotropicFilterExtension ? this._gl.getParameter(this._caps.textureAnisotropicFilterExtension.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0;
            this._caps.instancedArrays = this._gl.getExtension('ANGLE_instanced_arrays');
            this._caps.uintIndices = this._gl.getExtension('OES_element_index_uint') !== null;
            this._caps.highPrecisionShaderSupported = true;
            if (this._gl.getShaderPrecisionFormat) {
                var highp = this._gl.getShaderPrecisionFormat(this._gl.FRAGMENT_SHADER, this._gl.HIGH_FLOAT);
                this._caps.highPrecisionShaderSupported = highp.precision != 0;
            }
            // Depth buffer
            this.setDepthBuffer(true);
            this.setDepthFunctionToLessOrEqual();
            this.setDepthWrite(true);
            // Fullscreen
            this._onFullscreenChange = function () {
                if (document.fullscreen !== undefined) {
                    _this.isFullscreen = document.fullscreen;
                }
                else if (document.mozFullScreen !== undefined) {
                    _this.isFullscreen = document.mozFullScreen;
                }
                else if (document.webkitIsFullScreen !== undefined) {
                    _this.isFullscreen = document.webkitIsFullScreen;
                }
                else if (document.msIsFullScreen !== undefined) {
                    _this.isFullscreen = document.msIsFullScreen;
                }
                // Pointer lock
                if (_this.isFullscreen && _this._pointerLockRequested) {
                    canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
                    if (canvas.requestPointerLock) {
                        canvas.requestPointerLock();
                    }
                }
            };
            document.addEventListener("fullscreenchange", this._onFullscreenChange, false);
            document.addEventListener("mozfullscreenchange", this._onFullscreenChange, false);
            document.addEventListener("webkitfullscreenchange", this._onFullscreenChange, false);
            document.addEventListener("msfullscreenchange", this._onFullscreenChange, false);
            // Pointer lock
            this._onPointerLockChange = function () {
                _this.isPointerLock = (document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas || document.msPointerLockElement === canvas || document.pointerLockElement === canvas);
            };
            document.addEventListener("pointerlockchange", this._onPointerLockChange, false);
            document.addEventListener("mspointerlockchange", this._onPointerLockChange, false);
            document.addEventListener("mozpointerlockchange", this._onPointerLockChange, false);
            document.addEventListener("webkitpointerlockchange", this._onPointerLockChange, false);
            if (!Engine.audioEngine) {
                Engine.audioEngine = new BABYLON.AudioEngine();
            }
            BABYLON.Tools.Log("Babylon.js engine (v" + Engine.Version + ") launched");
        }
        Object.defineProperty(Engine, "ALPHA_DISABLE", {
            get: function () {
                return Engine._ALPHA_DISABLE;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "ALPHA_ADD", {
            get: function () {
                return Engine._ALPHA_ADD;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "ALPHA_COMBINE", {
            get: function () {
                return Engine._ALPHA_COMBINE;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "DELAYLOADSTATE_NONE", {
            get: function () {
                return Engine._DELAYLOADSTATE_NONE;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "DELAYLOADSTATE_LOADED", {
            get: function () {
                return Engine._DELAYLOADSTATE_LOADED;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "DELAYLOADSTATE_LOADING", {
            get: function () {
                return Engine._DELAYLOADSTATE_LOADING;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "DELAYLOADSTATE_NOTLOADED", {
            get: function () {
                return Engine._DELAYLOADSTATE_NOTLOADED;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "TEXTUREFORMAT_ALPHA", {
            get: function () {
                return Engine._TEXTUREFORMAT_ALPHA;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "TEXTUREFORMAT_LUMINANCE", {
            get: function () {
                return Engine._TEXTUREFORMAT_LUMINANCE;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "TEXTUREFORMAT_LUMINANCE_ALPHA", {
            get: function () {
                return Engine._TEXTUREFORMAT_LUMINANCE_ALPHA;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "TEXTUREFORMAT_RGB", {
            get: function () {
                return Engine._TEXTUREFORMAT_RGB;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "TEXTUREFORMAT_RGBA", {
            get: function () {
                return Engine._TEXTUREFORMAT_RGBA;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "TEXTURETYPE_UNSIGNED_INT", {
            get: function () {
                return Engine._TEXTURETYPE_UNSIGNED_INT;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "TEXTURETYPE_FLOAT", {
            get: function () {
                return Engine._TEXTURETYPE_FLOAT;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine, "Version", {
            get: function () {
                return "2.1.0 beta";
            },
            enumerable: true,
            configurable: true
        });
        Engine.prototype._prepareWorkingCanvas = function () {
            if (this._workingCanvas) {
                return;
            }
            this._workingCanvas = document.createElement("canvas");
            this._workingContext = this._workingCanvas.getContext("2d");
        };
        Engine.prototype.getGlInfo = function () {
            return {
                vendor: this._glVendor,
                renderer: this._glRenderer,
                version: this._glVersion
            };
        };
        Engine.prototype.getAspectRatio = function (camera) {
            var viewport = camera.viewport;
            return (this.getRenderWidth() * viewport.width) / (this.getRenderHeight() * viewport.height);
        };
        Engine.prototype.getRenderWidth = function () {
            if (this._currentRenderTarget) {
                return this._currentRenderTarget._width;
            }
            return this._renderingCanvas.width;
        };
        Engine.prototype.getRenderHeight = function () {
            if (this._currentRenderTarget) {
                return this._currentRenderTarget._height;
            }
            return this._renderingCanvas.height;
        };
        Engine.prototype.getRenderingCanvas = function () {
            return this._renderingCanvas;
        };
        Engine.prototype.getRenderingCanvasClientRect = function () {
            return this._renderingCanvas.getBoundingClientRect();
        };
        Engine.prototype.setHardwareScalingLevel = function (level) {
            this._hardwareScalingLevel = level;
            this.resize();
        };
        Engine.prototype.getHardwareScalingLevel = function () {
            return this._hardwareScalingLevel;
        };
        Engine.prototype.getLoadedTexturesCache = function () {
            return this._loadedTexturesCache;
        };
        Engine.prototype.getCaps = function () {
            return this._caps;
        };
        Object.defineProperty(Engine.prototype, "drawCalls", {
            get: function () {
                return this._drawCalls;
            },
            enumerable: true,
            configurable: true
        });
        // Methods
        Engine.prototype.resetDrawCalls = function () {
            this._drawCalls = 0;
        };
        Engine.prototype.setDepthFunctionToGreater = function () {
            this._depthCullingState.depthFunc = this._gl.GREATER;
        };
        Engine.prototype.setDepthFunctionToGreaterOrEqual = function () {
            this._depthCullingState.depthFunc = this._gl.GEQUAL;
        };
        Engine.prototype.setDepthFunctionToLess = function () {
            this._depthCullingState.depthFunc = this._gl.LESS;
        };
        Engine.prototype.setDepthFunctionToLessOrEqual = function () {
            this._depthCullingState.depthFunc = this._gl.LEQUAL;
        };
        /**
         * stop executing a render loop function and remove it from the execution array
         * @param {Function} [renderFunction] the function to be removed. If not provided all functions will be removed.
         */
        Engine.prototype.stopRenderLoop = function (renderFunction) {
            if (!renderFunction) {
                this._activeRenderLoops = [];
                return;
            }
            var index = this._activeRenderLoops.indexOf(renderFunction);
            if (index >= 0) {
                this._activeRenderLoops.splice(index, 1);
            }
        };
        Engine.prototype._renderLoop = function () {
            var _this = this;
            var shouldRender = true;
            if (!this.renderEvenInBackground && this._windowIsBackground) {
                shouldRender = false;
            }
            if (shouldRender) {
                // Start new frame
                this.beginFrame();
                for (var index = 0; index < this._activeRenderLoops.length; index++) {
                    var renderFunction = this._activeRenderLoops[index];
                    renderFunction();
                }
                // Present
                this.endFrame();
            }
            if (this._activeRenderLoops.length > 0) {
                // Register new frame
                BABYLON.Tools.QueueNewFrame(function () {
                    _this._renderLoop();
                });
            }
            else {
                this._renderingQueueLaunched = false;
            }
        };
        /**
         * Register and execute a render loop. The engine can have more than one render function.
         * @param {Function} renderFunction - the function to continuesly execute starting the next render loop.
         * @example
         * engine.runRenderLoop(function () {
         *      scene.render()
         * })
         */
        Engine.prototype.runRenderLoop = function (renderFunction) {
            var _this = this;
            if (this._activeRenderLoops.indexOf(renderFunction) !== -1) {
                return;
            }
            this._activeRenderLoops.push(renderFunction);
            if (!this._renderingQueueLaunched) {
                this._renderingQueueLaunched = true;
                BABYLON.Tools.QueueNewFrame(function () {
                    _this._renderLoop();
                });
            }
        };
        /**
         * Toggle full screen mode.
         * @param {boolean} requestPointerLock - should a pointer lock be requested from the user
         */
        Engine.prototype.switchFullscreen = function (requestPointerLock) {
            if (this.isFullscreen) {
                BABYLON.Tools.ExitFullscreen();
            }
            else {
                this._pointerLockRequested = requestPointerLock;
                BABYLON.Tools.RequestFullscreen(this._renderingCanvas);
            }
        };
        Engine.prototype.clear = function (color, backBuffer, depthStencil) {
            this.applyStates();
            this._gl.clearColor(color.r, color.g, color.b, color.a !== undefined ? color.a : 1.0);
            if (this._depthCullingState.depthMask) {
                this._gl.clearDepth(1.0);
            }
            var mode = 0;
            if (backBuffer)
                mode |= this._gl.COLOR_BUFFER_BIT;
            if (depthStencil && this._depthCullingState.depthMask)
                mode |= this._gl.DEPTH_BUFFER_BIT;
            this._gl.clear(mode);
        };
        /**
         * Set the WebGL's viewport
         * @param {BABYLON.Viewport} viewport - the viewport element to be used.
         * @param {number} [requiredWidth] - the width required for rendering. If not provided the rendering canvas' width is used.
         * @param {number} [requiredHeight] - the height required for rendering. If not provided the rendering canvas' height is used.
         */
        Engine.prototype.setViewport = function (viewport, requiredWidth, requiredHeight) {
            var width = requiredWidth || (navigator.isCocoonJS ? window.innerWidth : this._renderingCanvas.width);
            var height = requiredHeight || (navigator.isCocoonJS ? window.innerHeight : this._renderingCanvas.height);
            var x = viewport.x || 0;
            var y = viewport.y || 0;
            this._cachedViewport = viewport;
            this._gl.viewport(x * width, y * height, width * viewport.width, height * viewport.height);
        };
        Engine.prototype.setDirectViewport = function (x, y, width, height) {
            this._cachedViewport = null;
            this._gl.viewport(x, y, width, height);
        };
        Engine.prototype.beginFrame = function () {
            this._measureFps();
        };
        Engine.prototype.endFrame = function () {
            //this.flushFramebuffer();
        };
        /**
         * resize the view according to the canvas' size.
         * @example
         *   window.addEventListener("resize", function () {
         *      engine.resize();
         *   });
         */
        Engine.prototype.resize = function () {
            var width = navigator.isCocoonJS ? window.innerWidth : this._renderingCanvas.clientWidth;
            var height = navigator.isCocoonJS ? window.innerHeight : this._renderingCanvas.clientHeight;
            this.setSize(width / this._hardwareScalingLevel, height / this._hardwareScalingLevel);
        };
        /**
         * force a specific size of the canvas
         * @param {number} width - the new canvas' width
         * @param {number} height - the new canvas' height
         */
        Engine.prototype.setSize = function (width, height) {
            this._renderingCanvas.width = width;
            this._renderingCanvas.height = height;
            this._canvasClientRect = this._renderingCanvas.getBoundingClientRect();
            for (var index = 0; index < this.scenes.length; index++) {
                var scene = this.scenes[index];
                for (var camIndex = 0; camIndex < scene.cameras.length; camIndex++) {
                    var cam = scene.cameras[camIndex];
                    cam._currentRenderId = 0;
                }
            }
        };
        Engine.prototype.bindFramebuffer = function (texture) {
            this._currentRenderTarget = texture;
            var gl = this._gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, texture._framebuffer);
            this._gl.viewport(0, 0, texture._width, texture._height);
            this.wipeCaches();
        };
        Engine.prototype.unBindFramebuffer = function (texture) {
            this._currentRenderTarget = null;
            if (texture.generateMipMaps) {
                var gl = this._gl;
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.generateMipmap(gl.TEXTURE_2D);
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
            this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
        };
        Engine.prototype.flushFramebuffer = function () {
            this._gl.flush();
        };
        Engine.prototype.restoreDefaultFramebuffer = function () {
            this._currentRenderTarget = null;
            this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
            this.setViewport(this._cachedViewport);
            this.wipeCaches();
        };
        // VBOs
        Engine.prototype._resetVertexBufferBinding = function () {
            this._gl.bindBuffer(this._gl.ARRAY_BUFFER, null);
            this._cachedVertexBuffers = null;
        };
        Engine.prototype.createVertexBuffer = function (vertices) {
            var vbo = this._gl.createBuffer();
            this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vbo);
            this._gl.bufferData(this._gl.ARRAY_BUFFER, new Float32Array(vertices), this._gl.STATIC_DRAW);
            this._resetVertexBufferBinding();
            vbo.references = 1;
            return vbo;
        };
        Engine.prototype.createDynamicVertexBuffer = function (capacity) {
            var vbo = this._gl.createBuffer();
            this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vbo);
            this._gl.bufferData(this._gl.ARRAY_BUFFER, capacity, this._gl.DYNAMIC_DRAW);
            this._resetVertexBufferBinding();
            vbo.references = 1;
            return vbo;
        };
        Engine.prototype.updateDynamicVertexBuffer = function (vertexBuffer, vertices, offset) {
            this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vertexBuffer);
            if (offset === undefined) {
                offset = 0;
            }
            if (vertices instanceof Float32Array) {
                this._gl.bufferSubData(this._gl.ARRAY_BUFFER, offset, vertices);
            }
            else {
                this._gl.bufferSubData(this._gl.ARRAY_BUFFER, offset, new Float32Array(vertices));
            }
            this._resetVertexBufferBinding();
        };
        Engine.prototype._resetIndexBufferBinding = function () {
            this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, null);
            this._cachedIndexBuffer = null;
        };
        Engine.prototype.createIndexBuffer = function (indices) {
            var vbo = this._gl.createBuffer();
            this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, vbo);
            // Check for 32 bits indices
            var arrayBuffer;
            var need32Bits = false;
            if (this._caps.uintIndices) {
                for (var index = 0; index < indices.length; index++) {
                    if (indices[index] > 65535) {
                        need32Bits = true;
                        break;
                    }
                }
                arrayBuffer = need32Bits ? new Uint32Array(indices) : new Uint16Array(indices);
            }
            else {
                arrayBuffer = new Uint16Array(indices);
            }
            this._gl.bufferData(this._gl.ELEMENT_ARRAY_BUFFER, arrayBuffer, this._gl.STATIC_DRAW);
            this._resetIndexBufferBinding();
            vbo.references = 1;
            vbo.is32Bits = need32Bits;
            return vbo;
        };
        Engine.prototype.bindBuffers = function (vertexBuffer, indexBuffer, vertexDeclaration, vertexStrideSize, effect) {
            if (this._cachedVertexBuffers !== vertexBuffer || this._cachedEffectForVertexBuffers !== effect) {
                this._cachedVertexBuffers = vertexBuffer;
                this._cachedEffectForVertexBuffers = effect;
                this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vertexBuffer);
                var offset = 0;
                for (var index = 0; index < vertexDeclaration.length; index++) {
                    var order = effect.getAttributeLocation(index);
                    if (order >= 0) {
                        this._gl.vertexAttribPointer(order, vertexDeclaration[index], this._gl.FLOAT, false, vertexStrideSize, offset);
                    }
                    offset += vertexDeclaration[index] * 4;
                }
            }
            if (this._cachedIndexBuffer !== indexBuffer) {
                this._cachedIndexBuffer = indexBuffer;
                this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                this._uintIndicesCurrentlySet = indexBuffer.is32Bits;
            }
        };
        Engine.prototype.bindMultiBuffers = function (vertexBuffers, indexBuffer, effect) {
            if (this._cachedVertexBuffers !== vertexBuffers || this._cachedEffectForVertexBuffers !== effect) {
                this._cachedVertexBuffers = vertexBuffers;
                this._cachedEffectForVertexBuffers = effect;
                var attributes = effect.getAttributesNames();
                for (var index = 0; index < attributes.length; index++) {
                    var order = effect.getAttributeLocation(index);
                    if (order >= 0) {
                        var vertexBuffer = vertexBuffers[attributes[index]];
                        if (!vertexBuffer) {
                            continue;
                        }
                        var stride = vertexBuffer.getStrideSize();
                        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vertexBuffer.getBuffer());
                        this._gl.vertexAttribPointer(order, stride, this._gl.FLOAT, false, stride * 4, 0);
                    }
                }
            }
            if (indexBuffer != null && this._cachedIndexBuffer !== indexBuffer) {
                this._cachedIndexBuffer = indexBuffer;
                this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                this._uintIndicesCurrentlySet = indexBuffer.is32Bits;
            }
        };
        Engine.prototype._releaseBuffer = function (buffer) {
            buffer.references--;
            if (buffer.references === 0) {
                this._gl.deleteBuffer(buffer);
                return true;
            }
            return false;
        };
        Engine.prototype.createInstancesBuffer = function (capacity) {
            var buffer = this._gl.createBuffer();
            buffer.capacity = capacity;
            this._gl.bindBuffer(this._gl.ARRAY_BUFFER, buffer);
            this._gl.bufferData(this._gl.ARRAY_BUFFER, capacity, this._gl.DYNAMIC_DRAW);
            return buffer;
        };
        Engine.prototype.deleteInstancesBuffer = function (buffer) {
            this._gl.deleteBuffer(buffer);
        };
        Engine.prototype.updateAndBindInstancesBuffer = function (instancesBuffer, data, offsetLocations) {
            this._gl.bindBuffer(this._gl.ARRAY_BUFFER, instancesBuffer);
            this._gl.bufferSubData(this._gl.ARRAY_BUFFER, 0, data);
            for (var index = 0; index < 4; index++) {
                var offsetLocation = offsetLocations[index];
                this._gl.enableVertexAttribArray(offsetLocation);
                this._gl.vertexAttribPointer(offsetLocation, 4, this._gl.FLOAT, false, 64, index * 16);
                this._caps.instancedArrays.vertexAttribDivisorANGLE(offsetLocation, 1);
            }
        };
        Engine.prototype.unBindInstancesBuffer = function (instancesBuffer, offsetLocations) {
            this._gl.bindBuffer(this._gl.ARRAY_BUFFER, instancesBuffer);
            for (var index = 0; index < 4; index++) {
                var offsetLocation = offsetLocations[index];
                this._gl.disableVertexAttribArray(offsetLocation);
                this._caps.instancedArrays.vertexAttribDivisorANGLE(offsetLocation, 0);
            }
        };
        Engine.prototype.applyStates = function () {
            this._depthCullingState.apply(this._gl);
            this._alphaState.apply(this._gl);
        };
        Engine.prototype.draw = function (useTriangles, indexStart, indexCount, instancesCount) {
            // Apply states
            this.applyStates();
            this._drawCalls++;
            // Render
            var indexFormat = this._uintIndicesCurrentlySet ? this._gl.UNSIGNED_INT : this._gl.UNSIGNED_SHORT;
            var mult = this._uintIndicesCurrentlySet ? 4 : 2;
            if (instancesCount) {
                this._caps.instancedArrays.drawElementsInstancedANGLE(useTriangles ? this._gl.TRIANGLES : this._gl.LINES, indexCount, indexFormat, indexStart * mult, instancesCount);
                return;
            }
            this._gl.drawElements(useTriangles ? this._gl.TRIANGLES : this._gl.LINES, indexCount, indexFormat, indexStart * mult);
        };
        Engine.prototype.drawPointClouds = function (verticesStart, verticesCount, instancesCount) {
            // Apply states
            this.applyStates();
            this._drawCalls++;
            if (instancesCount) {
                this._caps.instancedArrays.drawArraysInstancedANGLE(this._gl.POINTS, verticesStart, verticesCount, instancesCount);
                return;
            }
            this._gl.drawArrays(this._gl.POINTS, verticesStart, verticesCount);
        };
        // Shaders
        Engine.prototype._releaseEffect = function (effect) {
            if (this._compiledEffects[effect._key]) {
                delete this._compiledEffects[effect._key];
                if (effect.getProgram()) {
                    this._gl.deleteProgram(effect.getProgram());
                }
            }
        };
        Engine.prototype.createEffect = function (baseName, attributesNames, uniformsNames, samplers, defines, fallbacks, onCompiled, onError) {
            var vertex = baseName.vertexElement || baseName.vertex || baseName;
            var fragment = baseName.fragmentElement || baseName.fragment || baseName;
            var name = vertex + "+" + fragment + "@" + defines;
            if (this._compiledEffects[name]) {
                return this._compiledEffects[name];
            }
            var effect = new BABYLON.Effect(baseName, attributesNames, uniformsNames, samplers, this, defines, fallbacks, onCompiled, onError);
            effect._key = name;
            this._compiledEffects[name] = effect;
            return effect;
        };
        Engine.prototype.createEffectForParticles = function (fragmentName, uniformsNames, samplers, defines, fallbacks, onCompiled, onError) {
            if (uniformsNames === void 0) { uniformsNames = []; }
            if (samplers === void 0) { samplers = []; }
            if (defines === void 0) { defines = ""; }
            return this.createEffect({
                vertex: "particles",
                fragmentElement: fragmentName
            }, ["position", "color", "options"], ["view", "projection"].concat(uniformsNames), ["diffuseSampler"].concat(samplers), defines, fallbacks, onCompiled, onError);
        };
        Engine.prototype.createShaderProgram = function (vertexCode, fragmentCode, defines) {
            var vertexShader = compileShader(this._gl, vertexCode, "vertex", defines);
            var fragmentShader = compileShader(this._gl, fragmentCode, "fragment", defines);
            var shaderProgram = this._gl.createProgram();
            this._gl.attachShader(shaderProgram, vertexShader);
            this._gl.attachShader(shaderProgram, fragmentShader);
            this._gl.linkProgram(shaderProgram);
            var linked = this._gl.getProgramParameter(shaderProgram, this._gl.LINK_STATUS);
            if (!linked) {
                var error = this._gl.getProgramInfoLog(shaderProgram);
                if (error) {
                    throw new Error(error);
                }
            }
            this._gl.deleteShader(vertexShader);
            this._gl.deleteShader(fragmentShader);
            return shaderProgram;
        };
        Engine.prototype.getUniforms = function (shaderProgram, uniformsNames) {
            var results = [];
            for (var index = 0; index < uniformsNames.length; index++) {
                results.push(this._gl.getUniformLocation(shaderProgram, uniformsNames[index]));
            }
            return results;
        };
        Engine.prototype.getAttributes = function (shaderProgram, attributesNames) {
            var results = [];
            for (var index = 0; index < attributesNames.length; index++) {
                try {
                    results.push(this._gl.getAttribLocation(shaderProgram, attributesNames[index]));
                }
                catch (e) {
                    results.push(-1);
                }
            }
            return results;
        };
        Engine.prototype.enableEffect = function (effect) {
            if (!effect || !effect.getAttributesCount() || this._currentEffect === effect) {
                if (effect && effect.onBind) {
                    effect.onBind(effect);
                }
                return;
            }
            this._vertexAttribArrays = this._vertexAttribArrays || [];
            // Use program
            this._gl.useProgram(effect.getProgram());
            for (var i in this._vertexAttribArrays) {
                if (i > this._gl.VERTEX_ATTRIB_ARRAY_ENABLED || !this._vertexAttribArrays[i]) {
                    continue;
                }
                this._vertexAttribArrays[i] = false;
                this._gl.disableVertexAttribArray(i);
            }
            var attributesCount = effect.getAttributesCount();
            for (var index = 0; index < attributesCount; index++) {
                // Attributes
                var order = effect.getAttributeLocation(index);
                if (order >= 0) {
                    this._vertexAttribArrays[order] = true;
                    this._gl.enableVertexAttribArray(order);
                }
            }
            this._currentEffect = effect;
            if (effect.onBind) {
                effect.onBind(effect);
            }
        };
        Engine.prototype.setArray = function (uniform, array) {
            if (!uniform)
                return;
            this._gl.uniform1fv(uniform, array);
        };
        Engine.prototype.setArray2 = function (uniform, array) {
            if (!uniform || array.length % 2 !== 0)
                return;
            this._gl.uniform2fv(uniform, array);
        };
        Engine.prototype.setArray3 = function (uniform, array) {
            if (!uniform || array.length % 3 !== 0)
                return;
            this._gl.uniform3fv(uniform, array);
        };
        Engine.prototype.setArray4 = function (uniform, array) {
            if (!uniform || array.length % 4 !== 0)
                return;
            this._gl.uniform4fv(uniform, array);
        };
        Engine.prototype.setMatrices = function (uniform, matrices) {
            if (!uniform)
                return;
            this._gl.uniformMatrix4fv(uniform, false, matrices);
        };
        Engine.prototype.setMatrix = function (uniform, matrix) {
            if (!uniform)
                return;
            this._gl.uniformMatrix4fv(uniform, false, matrix.toArray());
        };
        Engine.prototype.setFloat = function (uniform, value) {
            if (!uniform)
                return;
            this._gl.uniform1f(uniform, value);
        };
        Engine.prototype.setFloat2 = function (uniform, x, y) {
            if (!uniform)
                return;
            this._gl.uniform2f(uniform, x, y);
        };
        Engine.prototype.setFloat3 = function (uniform, x, y, z) {
            if (!uniform)
                return;
            this._gl.uniform3f(uniform, x, y, z);
        };
        Engine.prototype.setBool = function (uniform, bool) {
            if (!uniform)
                return;
            this._gl.uniform1i(uniform, bool);
        };
        Engine.prototype.setFloat4 = function (uniform, x, y, z, w) {
            if (!uniform)
                return;
            this._gl.uniform4f(uniform, x, y, z, w);
        };
        Engine.prototype.setColor3 = function (uniform, color3) {
            if (!uniform)
                return;
            this._gl.uniform3f(uniform, color3.r, color3.g, color3.b);
        };
        Engine.prototype.setColor4 = function (uniform, color3, alpha) {
            if (!uniform)
                return;
            this._gl.uniform4f(uniform, color3.r, color3.g, color3.b, alpha);
        };
        // States
        Engine.prototype.setState = function (culling, zOffset, force) {
            if (zOffset === void 0) { zOffset = 0; }
            // Culling        
            if (this._depthCullingState.cull !== culling || force) {
                if (culling) {
                    this._depthCullingState.cullFace = this.cullBackFaces ? this._gl.BACK : this._gl.FRONT;
                    this._depthCullingState.cull = true;
                }
                else {
                    this._depthCullingState.cull = false;
                }
            }
            // Z offset
            this._depthCullingState.zOffset = zOffset;
        };
        Engine.prototype.setDepthBuffer = function (enable) {
            this._depthCullingState.depthTest = enable;
        };
        Engine.prototype.getDepthWrite = function () {
            return this._depthCullingState.depthMask;
        };
        Engine.prototype.setDepthWrite = function (enable) {
            this._depthCullingState.depthMask = enable;
        };
        Engine.prototype.setColorWrite = function (enable) {
            this._gl.colorMask(enable, enable, enable, enable);
        };
        Engine.prototype.setAlphaMode = function (mode) {
            switch (mode) {
                case Engine.ALPHA_DISABLE:
                    this.setDepthWrite(true);
                    this._alphaState.alphaBlend = false;
                    break;
                case Engine.ALPHA_COMBINE:
                    this.setDepthWrite(false);
                    this._alphaState.setAlphaBlendFunctionParameters(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE);
                    this._alphaState.alphaBlend = true;
                    break;
                case Engine.ALPHA_ADD:
                    this.setDepthWrite(false);
                    this._alphaState.setAlphaBlendFunctionParameters(this._gl.ONE, this._gl.ONE, this._gl.ZERO, this._gl.ONE);
                    this._alphaState.alphaBlend = true;
                    break;
            }
            this._alphaMode = mode;
        };
        Engine.prototype.getAlphaMode = function () {
            return this._alphaMode;
        };
        Engine.prototype.setAlphaTesting = function (enable) {
            this._alphaTest = enable;
        };
        Engine.prototype.getAlphaTesting = function () {
            return this._alphaTest;
        };
        // Textures
        Engine.prototype.wipeCaches = function () {
            this._activeTexturesCache = [];
            this._currentEffect = null;
            this._depthCullingState.reset();
            this._alphaState.reset();
            this._cachedVertexBuffers = null;
            this._cachedIndexBuffer = null;
            this._cachedEffectForVertexBuffers = null;
        };
        Engine.prototype.setSamplingMode = function (texture, samplingMode) {
            var gl = this._gl;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            var magFilter = gl.NEAREST;
            var minFilter = gl.NEAREST;
            if (samplingMode === BABYLON.Texture.BILINEAR_SAMPLINGMODE) {
                magFilter = gl.LINEAR;
                minFilter = gl.LINEAR;
            }
            else if (samplingMode === BABYLON.Texture.TRILINEAR_SAMPLINGMODE) {
                magFilter = gl.LINEAR;
                minFilter = gl.LINEAR_MIPMAP_LINEAR;
            }
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
            gl.bindTexture(gl.TEXTURE_2D, null);
            texture.samplingMode = samplingMode;
        };
        Engine.prototype.createTexture = function (url, noMipmap, invertY, scene, samplingMode, onLoad, onError, buffer) {
            var _this = this;
            if (samplingMode === void 0) { samplingMode = BABYLON.Texture.TRILINEAR_SAMPLINGMODE; }
            if (onLoad === void 0) { onLoad = null; }
            if (onError === void 0) { onError = null; }
            if (buffer === void 0) { buffer = null; }
            var texture = this._gl.createTexture();
            var extension;
            var fromData = false;
            if (url.substr(0, 5) === "data:") {
                fromData = true;
            }
            if (!fromData)
                extension = url.substr(url.length - 4, 4).toLowerCase();
            else {
                var oldUrl = url;
                fromData = oldUrl.split(':');
                url = oldUrl;
                extension = fromData[1].substr(fromData[1].length - 4, 4).toLowerCase();
            }
            var isDDS = this.getCaps().s3tc && (extension === ".dds");
            var isTGA = (extension === ".tga");
            scene._addPendingData(texture);
            texture.url = url;
            texture.noMipmap = noMipmap;
            texture.references = 1;
            texture.samplingMode = samplingMode;
            this._loadedTexturesCache.push(texture);
            var onerror = function () {
                scene._removePendingData(texture);
                if (onError) {
                    onError();
                }
            };
            if (isTGA) {
                var callback = function (arrayBuffer) {
                    var data = new Uint8Array(arrayBuffer);
                    var header = BABYLON.Internals.TGATools.GetTGAHeader(data);
                    prepareWebGLTexture(texture, _this._gl, scene, header.width, header.height, invertY, noMipmap, false, function () {
                        BABYLON.Internals.TGATools.UploadContent(_this._gl, data);
                        if (onLoad) {
                            onLoad();
                        }
                    }, samplingMode);
                };
                if (!(fromData instanceof Array))
                    BABYLON.Tools.LoadFile(url, function (arrayBuffer) {
                        callback(arrayBuffer);
                    }, onerror, scene.database, true);
                else
                    callback(buffer);
            }
            else if (isDDS) {
                callback = function (data) {
                    var info = BABYLON.Internals.DDSTools.GetDDSInfo(data);
                    var loadMipmap = (info.isRGB || info.isLuminance || info.mipmapCount > 1) && !noMipmap && ((info.width >> (info.mipmapCount - 1)) === 1);
                    prepareWebGLTexture(texture, _this._gl, scene, info.width, info.height, invertY, !loadMipmap, info.isFourCC, function () {
                        BABYLON.Internals.DDSTools.UploadDDSLevels(_this._gl, _this.getCaps().s3tc, data, info, loadMipmap, 1);
                        if (onLoad) {
                            onLoad();
                        }
                    }, samplingMode);
                };
                if (!(fromData instanceof Array))
                    BABYLON.Tools.LoadFile(url, function (data) {
                        callback(data);
                    }, onerror, scene.database, true);
                else
                    callback(buffer);
            }
            else {
                var onload = function (img) {
                    prepareWebGLTexture(texture, _this._gl, scene, img.width, img.height, invertY, noMipmap, false, function (potWidth, potHeight) {
                        var isPot = (img.width === potWidth && img.height === potHeight);
                        if (!isPot) {
                            _this._prepareWorkingCanvas();
                            _this._workingCanvas.width = potWidth;
                            _this._workingCanvas.height = potHeight;
                            if (samplingMode === BABYLON.Texture.NEAREST_SAMPLINGMODE) {
                                _this._workingContext.imageSmoothingEnabled = false;
                                _this._workingContext.mozImageSmoothingEnabled = false;
                                _this._workingContext.oImageSmoothingEnabled = false;
                                _this._workingContext.webkitImageSmoothingEnabled = false;
                                _this._workingContext.msImageSmoothingEnabled = false;
                            }
                            _this._workingContext.drawImage(img, 0, 0, img.width, img.height, 0, 0, potWidth, potHeight);
                            if (samplingMode === BABYLON.Texture.NEAREST_SAMPLINGMODE) {
                                _this._workingContext.imageSmoothingEnabled = true;
                                _this._workingContext.mozImageSmoothingEnabled = true;
                                _this._workingContext.oImageSmoothingEnabled = true;
                                _this._workingContext.webkitImageSmoothingEnabled = true;
                                _this._workingContext.msImageSmoothingEnabled = true;
                            }
                        }
                        _this._gl.texImage2D(_this._gl.TEXTURE_2D, 0, _this._gl.RGBA, _this._gl.RGBA, _this._gl.UNSIGNED_BYTE, isPot ? img : _this._workingCanvas);
                        if (onLoad) {
                            onLoad();
                        }
                    }, samplingMode);
                };
                if (!(fromData instanceof Array))
                    BABYLON.Tools.LoadImage(url, onload, onerror, scene.database);
                else
                    BABYLON.Tools.LoadImage(buffer, onload, onerror, scene.database);
            }
            return texture;
        };
        Engine.prototype.createRawTexture = function (data, width, height, format, generateMipMaps, invertY, samplingMode) {
            var texture = this._gl.createTexture();
            this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
            this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, invertY === undefined ? 1 : (invertY ? 1 : 0));
            // Format
            var internalFormat = this._gl.RGBA;
            switch (format) {
                case Engine.TEXTUREFORMAT_ALPHA:
                    internalFormat = this._gl.ALPHA;
                    break;
                case Engine.TEXTUREFORMAT_LUMINANCE:
                    internalFormat = this._gl.LUMINANCE;
                    break;
                case Engine.TEXTUREFORMAT_LUMINANCE_ALPHA:
                    internalFormat = this._gl.LUMINANCE_ALPHA;
                    break;
                case Engine.TEXTUREFORMAT_RGB:
                    internalFormat = this._gl.RGB;
                    break;
                case Engine.TEXTUREFORMAT_RGBA:
                    internalFormat = this._gl.RGBA;
                    break;
            }
            this._gl.texImage2D(this._gl.TEXTURE_2D, 0, internalFormat, width, height, 0, internalFormat, this._gl.UNSIGNED_BYTE, data);
            if (generateMipMaps) {
                this._gl.generateMipmap(this._gl.TEXTURE_2D);
            }
            // Filters
            var filters = getSamplingParameters(samplingMode, generateMipMaps, this._gl);
            this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, filters.mag);
            this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, filters.min);
            this._gl.bindTexture(this._gl.TEXTURE_2D, null);
            this._activeTexturesCache = [];
            texture._baseWidth = width;
            texture._baseHeight = height;
            texture._width = width;
            texture._height = height;
            texture.isReady = true;
            texture.references = 1;
            texture.samplingMode = samplingMode;
            this._loadedTexturesCache.push(texture);
            return texture;
        };
        Engine.prototype.createDynamicTexture = function (width, height, generateMipMaps, samplingMode) {
            var texture = this._gl.createTexture();
            width = BABYLON.Tools.GetExponantOfTwo(width, this._caps.maxTextureSize);
            height = BABYLON.Tools.GetExponantOfTwo(height, this._caps.maxTextureSize);
            this._activeTexturesCache = [];
            texture._baseWidth = width;
            texture._baseHeight = height;
            texture._width = width;
            texture._height = height;
            texture.isReady = false;
            texture.generateMipMaps = generateMipMaps;
            texture.references = 1;
            texture.samplingMode = samplingMode;
            this.updateTextureSamplingMode(samplingMode, texture);
            this._loadedTexturesCache.push(texture);
            return texture;
        };
        Engine.prototype.updateTextureSamplingMode = function (samplingMode, texture) {
            var filters = getSamplingParameters(samplingMode, texture.generateMipMaps, this._gl);
            this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
            this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, filters.mag);
            this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, filters.min);
            this._gl.bindTexture(this._gl.TEXTURE_2D, null);
        };
        Engine.prototype.updateDynamicTexture = function (texture, canvas, invertY) {
            this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
            this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, invertY ? 1 : 0);
            this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, this._gl.RGBA, this._gl.UNSIGNED_BYTE, canvas);
            if (texture.generateMipMaps) {
                this._gl.generateMipmap(this._gl.TEXTURE_2D);
            }
            this._gl.bindTexture(this._gl.TEXTURE_2D, null);
            this._activeTexturesCache = [];
            texture.isReady = true;
        };
        Engine.prototype.updateVideoTexture = function (texture, video, invertY) {
            this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
            this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, invertY ? 0 : 1); // Video are upside down by default
            // Scale the video if it is a NPOT using the current working canvas
            if (video.videoWidth !== texture._width || video.videoHeight !== texture._height) {
                if (!texture._workingCanvas) {
                    texture._workingCanvas = document.createElement("canvas");
                    texture._workingContext = texture._workingCanvas.getContext("2d");
                    texture._workingCanvas.width = texture._width;
                    texture._workingCanvas.height = texture._height;
                }
                texture._workingContext.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, texture._width, texture._height);
                this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, this._gl.RGBA, this._gl.UNSIGNED_BYTE, texture._workingCanvas);
            }
            else {
                this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, this._gl.RGBA, this._gl.UNSIGNED_BYTE, video);
            }
            if (texture.generateMipMaps) {
                this._gl.generateMipmap(this._gl.TEXTURE_2D);
            }
            this._gl.bindTexture(this._gl.TEXTURE_2D, null);
            this._activeTexturesCache = [];
            texture.isReady = true;
        };
        Engine.prototype.createRenderTargetTexture = function (size, options) {
            // old version had a "generateMipMaps" arg instead of options.
            // if options.generateMipMaps is undefined, consider that options itself if the generateMipmaps value
            // in the same way, generateDepthBuffer is defaulted to true
            var generateMipMaps = false;
            var generateDepthBuffer = true;
            var type = Engine.TEXTURETYPE_UNSIGNED_INT;
            var samplingMode = BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
            if (options !== undefined) {
                generateMipMaps = options.generateMipMaps === undefined ? options : options.generateMipmaps;
                generateDepthBuffer = options.generateDepthBuffer === undefined ? true : options.generateDepthBuffer;
                type = options.type === undefined ? type : options.type;
                if (options.samplingMode !== undefined) {
                    samplingMode = options.samplingMode;
                }
                if (type === Engine.TEXTURETYPE_FLOAT) {
                    // if floating point (gl.FLOAT) then force to NEAREST_SAMPLINGMODE
                    samplingMode = BABYLON.Texture.NEAREST_SAMPLINGMODE;
                }
            }
            var gl = this._gl;
            var texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            var width = size.width || size;
            var height = size.height || size;
            var filters = getSamplingParameters(samplingMode, generateMipMaps, gl);
            if (type === Engine.TEXTURETYPE_FLOAT && !this._caps.textureFloat) {
                type = Engine.TEXTURETYPE_UNSIGNED_INT;
                BABYLON.Tools.Warn("Float textures are not supported. Render target forced to TEXTURETYPE_UNSIGNED_BYTE type");
            }
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filters.mag);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filters.min);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, getWebGLTextureType(gl, type), null);
            var depthBuffer;
            // Create the depth buffer
            if (generateDepthBuffer) {
                depthBuffer = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
                gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
            }
            // Create the framebuffer
            var framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            if (generateDepthBuffer) {
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
            }
            // Unbind
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            texture._framebuffer = framebuffer;
            if (generateDepthBuffer) {
                texture._depthBuffer = depthBuffer;
            }
            texture._width = width;
            texture._height = height;
            texture.isReady = true;
            texture.generateMipMaps = generateMipMaps;
            texture.references = 1;
            texture.samplingMode = samplingMode;
            this._activeTexturesCache = [];
            this._loadedTexturesCache.push(texture);
            return texture;
        };
        Engine.prototype.createCubeTexture = function (rootUrl, scene, extensions, noMipmap) {
            var _this = this;
            var gl = this._gl;
            var texture = gl.createTexture();
            texture.isCube = true;
            texture.url = rootUrl;
            texture.references = 1;
            this._loadedTexturesCache.push(texture);
            var extension = rootUrl.substr(rootUrl.length - 4, 4).toLowerCase();
            var isDDS = this.getCaps().s3tc && (extension === ".dds");
            if (isDDS) {
                BABYLON.Tools.LoadFile(rootUrl, function (data) {
                    var info = BABYLON.Internals.DDSTools.GetDDSInfo(data);
                    var loadMipmap = (info.isRGB || info.isLuminance || info.mipmapCount > 1) && !noMipmap;
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
                    BABYLON.Internals.DDSTools.UploadDDSLevels(_this._gl, _this.getCaps().s3tc, data, info, loadMipmap, 6);
                    if (!noMipmap && !info.isFourCC && info.mipmapCount === 1) {
                        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                    }
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, loadMipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
                    _this._activeTexturesCache = [];
                    texture._width = info.width;
                    texture._height = info.height;
                    texture.isReady = true;
                }, null, null, true);
            }
            else {
                cascadeLoad(rootUrl, scene, function (imgs) {
                    var width = BABYLON.Tools.GetExponantOfTwo(imgs[0].width, _this._caps.maxCubemapTextureSize);
                    var height = width;
                    _this._prepareWorkingCanvas();
                    _this._workingCanvas.width = width;
                    _this._workingCanvas.height = height;
                    var faces = [
                        gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                        gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                        gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                        gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                        gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                        gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
                    ];
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
                    for (var index = 0; index < faces.length; index++) {
                        _this._workingContext.drawImage(imgs[index], 0, 0, imgs[index].width, imgs[index].height, 0, 0, width, height);
                        gl.texImage2D(faces[index], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _this._workingCanvas);
                    }
                    if (!noMipmap) {
                        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                    }
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, noMipmap ? gl.LINEAR : gl.LINEAR_MIPMAP_LINEAR);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
                    _this._activeTexturesCache = [];
                    texture._width = width;
                    texture._height = height;
                    texture.isReady = true;
                }, extensions);
            }
            return texture;
        };
        Engine.prototype._releaseTexture = function (texture) {
            var gl = this._gl;
            if (texture._framebuffer) {
                gl.deleteFramebuffer(texture._framebuffer);
            }
            if (texture._depthBuffer) {
                gl.deleteRenderbuffer(texture._depthBuffer);
            }
            gl.deleteTexture(texture);
            for (var channel = 0; channel < this._caps.maxTexturesImageUnits; channel++) {
                this._gl.activeTexture(this._gl["TEXTURE" + channel]);
                this._gl.bindTexture(this._gl.TEXTURE_2D, null);
                this._gl.bindTexture(this._gl.TEXTURE_CUBE_MAP, null);
                this._activeTexturesCache[channel] = null;
            }
            var index = this._loadedTexturesCache.indexOf(texture);
            if (index !== -1) {
                this._loadedTexturesCache.splice(index, 1);
            }
        };
        Engine.prototype.bindSamplers = function (effect) {
            this._gl.useProgram(effect.getProgram());
            var samplers = effect.getSamplers();
            for (var index = 0; index < samplers.length; index++) {
                var uniform = effect.getUniform(samplers[index]);
                this._gl.uniform1i(uniform, index);
            }
            this._currentEffect = null;
        };
        Engine.prototype._bindTexture = function (channel, texture) {
            this._gl.activeTexture(this._gl["TEXTURE" + channel]);
            this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
            this._activeTexturesCache[channel] = null;
        };
        Engine.prototype.setTextureFromPostProcess = function (channel, postProcess) {
            this._bindTexture(channel, postProcess._textures.data[postProcess._currentRenderTextureInd]);
        };
        Engine.prototype.setTexture = function (channel, texture) {
            if (channel < 0) {
                return;
            }
            // Not ready?
            if (!texture || !texture.isReady()) {
                if (this._activeTexturesCache[channel] != null) {
                    this._gl.activeTexture(this._gl["TEXTURE" + channel]);
                    this._gl.bindTexture(this._gl.TEXTURE_2D, null);
                    this._gl.bindTexture(this._gl.TEXTURE_CUBE_MAP, null);
                    this._activeTexturesCache[channel] = null;
                }
                return;
            }
            // Video
            if (texture instanceof BABYLON.VideoTexture) {
                if (texture.update()) {
                    this._activeTexturesCache[channel] = null;
                }
            }
            else if (texture.delayLoadState === Engine.DELAYLOADSTATE_NOTLOADED) {
                texture.delayLoad();
                return;
            }
            if (this._activeTexturesCache[channel] === texture) {
                return;
            }
            this._activeTexturesCache[channel] = texture;
            var internalTexture = texture.getInternalTexture();
            this._gl.activeTexture(this._gl["TEXTURE" + channel]);
            if (internalTexture.isCube) {
                this._gl.bindTexture(this._gl.TEXTURE_CUBE_MAP, internalTexture);
                if (internalTexture._cachedCoordinatesMode !== texture.coordinatesMode) {
                    internalTexture._cachedCoordinatesMode = texture.coordinatesMode;
                    // CUBIC_MODE and SKYBOX_MODE both require CLAMP_TO_EDGE.  All other modes use REPEAT.
                    var textureWrapMode = (texture.coordinatesMode !== BABYLON.Texture.CUBIC_MODE && texture.coordinatesMode !== BABYLON.Texture.SKYBOX_MODE) ? this._gl.REPEAT : this._gl.CLAMP_TO_EDGE;
                    this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_WRAP_S, textureWrapMode);
                    this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_WRAP_T, textureWrapMode);
                }
                this._setAnisotropicLevel(this._gl.TEXTURE_CUBE_MAP, texture);
            }
            else {
                this._gl.bindTexture(this._gl.TEXTURE_2D, internalTexture);
                if (internalTexture._cachedWrapU !== texture.wrapU) {
                    internalTexture._cachedWrapU = texture.wrapU;
                    switch (texture.wrapU) {
                        case BABYLON.Texture.WRAP_ADDRESSMODE:
                            this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, this._gl.REPEAT);
                            break;
                        case BABYLON.Texture.CLAMP_ADDRESSMODE:
                            this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, this._gl.CLAMP_TO_EDGE);
                            break;
                        case BABYLON.Texture.MIRROR_ADDRESSMODE:
                            this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, this._gl.MIRRORED_REPEAT);
                            break;
                    }
                }
                if (internalTexture._cachedWrapV !== texture.wrapV) {
                    internalTexture._cachedWrapV = texture.wrapV;
                    switch (texture.wrapV) {
                        case BABYLON.Texture.WRAP_ADDRESSMODE:
                            this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, this._gl.REPEAT);
                            break;
                        case BABYLON.Texture.CLAMP_ADDRESSMODE:
                            this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, this._gl.CLAMP_TO_EDGE);
                            break;
                        case BABYLON.Texture.MIRROR_ADDRESSMODE:
                            this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, this._gl.MIRRORED_REPEAT);
                            break;
                    }
                }
                this._setAnisotropicLevel(this._gl.TEXTURE_2D, texture);
            }
        };
        Engine.prototype._setAnisotropicLevel = function (key, texture) {
            var anisotropicFilterExtension = this._caps.textureAnisotropicFilterExtension;
            var value = texture.anisotropicFilteringLevel;
            if (texture.getInternalTexture().samplingMode === BABYLON.Texture.NEAREST_SAMPLINGMODE) {
                value = 1;
            }
            if (anisotropicFilterExtension && texture._cachedAnisotropicFilteringLevel !== value) {
                this._gl.texParameterf(key, anisotropicFilterExtension.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(value, this._caps.maxAnisotropy));
                texture._cachedAnisotropicFilteringLevel = value;
            }
        };
        Engine.prototype.readPixels = function (x, y, width, height) {
            var data = new Uint8Array(height * width * 4);
            this._gl.readPixels(0, 0, width, height, this._gl.RGBA, this._gl.UNSIGNED_BYTE, data);
            return data;
        };
        // Dispose
        Engine.prototype.dispose = function () {
            this.hideLoadingUI();
            this.stopRenderLoop();
            while (this.scenes.length) {
                this.scenes[0].dispose();
            }
            // Release audio engine
            Engine.audioEngine.dispose();
            for (var name in this._compiledEffects) {
                this._gl.deleteProgram(this._compiledEffects[name]._program);
            }
            for (var i in this._vertexAttribArrays) {
                if (i > this._gl.VERTEX_ATTRIB_ARRAY_ENABLED || !this._vertexAttribArrays[i]) {
                    continue;
                }
                this._gl.disableVertexAttribArray(i);
            }
            // Events
            window.removeEventListener("blur", this._onBlur);
            window.removeEventListener("focus", this._onFocus);
            document.removeEventListener("fullscreenchange", this._onFullscreenChange);
            document.removeEventListener("mozfullscreenchange", this._onFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", this._onFullscreenChange);
            document.removeEventListener("msfullscreenchange", this._onFullscreenChange);
            document.removeEventListener("pointerlockchange", this._onPointerLockChange);
            document.removeEventListener("mspointerlockchange", this._onPointerLockChange);
            document.removeEventListener("mozpointerlockchange", this._onPointerLockChange);
            document.removeEventListener("webkitpointerlockchange", this._onPointerLockChange);
        };
        // Loading screen
        Engine.prototype.displayLoadingUI = function () {
            var _this = this;
            this._loadingDiv = document.createElement("div");
            this._loadingDiv.style.opacity = "0";
            this._loadingDiv.style.transition = "opacity 1.5s ease";
            // Loading text
            this._loadingTextDiv = document.createElement("div");
            this._loadingTextDiv.style.position = "absolute";
            this._loadingTextDiv.style.left = "0";
            this._loadingTextDiv.style.top = "50%";
            this._loadingTextDiv.style.marginTop = "80px";
            this._loadingTextDiv.style.width = "100%";
            this._loadingTextDiv.style.height = "20px";
            this._loadingTextDiv.style.fontFamily = "Arial";
            this._loadingTextDiv.style.fontSize = "14px";
            this._loadingTextDiv.style.color = "white";
            this._loadingTextDiv.style.textAlign = "center";
            this._loadingTextDiv.innerHTML = "Loading";
            this._loadingDiv.appendChild(this._loadingTextDiv);
            // Loading img
            var imgBack = new Image();
            imgBack.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuM4zml1AAAARbSURBVHhe7Z09aFNRFMc716kuLrq4FdyLq4Wi4CAoRQcR0UJBUBdRiuLSIYMo6CA4FF2sgw6CFAdFUOpSQYcWO4hD26UQCfXrIQrx/JJzw1OSWq3NPeL/B4Fy+0jg/HO+7j3vpUcI8b/Q39+/49ihfWdPHT94Yf/e3Se3bd263f8lus218TPn6vV6Ya8Wi/MzNRNmj18iusX9W1evmP1/EKNEIVG6CMbG6E3bt+fT++pHha8NoHdT72bLE8NDg7tGU64gLLndV4Wc4m8j/pS+vr4tGB/DT16v3Fyr8dvBe/jbit8BL0AES9LX1iPAz+BR/hFiLVCynj95dPzNy6fv3IZ/k4L3948Sq7FzYGBg4vLFGxitabuOFCbWNKGrMnbiUuo18KaV6tIHv6YtvL9/nOgE31jCktmrY7k6+/zhE4yP4Vf7hiNqh/BWWEl8mzDol4p22Lf7cIdvdUMEvv0Y2S9fE5S1hLzpqTsPkiep//gFGPnR3Yl7GL5p/xYFBrTwM+iXio3GqpwDGL5p/xYNIX7XG8Q6IJRgdIzf1KBBgafII7oMidhyQtVFaMA2Bt7il4huQRhaXphbcR2g4RXqBzKAGHiCCwGFVUAj/m/RTRDj29cvn10I0PZ3LghH5f4CL1EFlQmqqXK3jDDKFxmhQ3Yt6oQseUZGKmMnTpsOqc8o1F9kBOMjQlOLeqEeIyOc6JV6jYLJD/+XyIFvnzdgl9aXRQ5I2qZDK1SpospMqaoqON/wZZGDciLnMMiXRS7IF4hhqMTNTdk7CFu+LHLhR7BQqBvPDJUUQqCGvCMATHUgBmhWNgApmdOda9YpM+VwRYfuyyIXDK8hBlilNerLIheMZCKGwlUAyru6GlwOgPUbRxADdJ9FAChxXY864viyyEXqPxhc0M2TAfAbatSdRyHtXymhByEdRnE3ky+JnHAIhSA0h74kckETmHoQbSgGwJrCIRMEPSRIBCRIMAhZaYhaggQhJXUJEoRU9mofKwh+F22dLRRfEjlJM7w6KQwCoQpBOKTyJZETjmwRxKqtGV8SOSkNOGjKPQppBEgDDkFgpxdBVGkFgaYQQXRIFQSObk0P5ZFIpAZRHXsQ0r0hCluBWKkuvVbYCkQaCdL5ehBScudJP4yY+rLISdps1NBDEJKXMMmoSfggWC4ZQRR17oFYXph7hSiquIKQ+hJGTX1J5MYSPD/GVdNzsgLBwZVCVyAQAkF0ohiI/c1fS6tNXq9UfEnkhudmIQolsS+J3Hh/UtNDzQLhj42VKJFInqLwFYiUU5ToA+HdfI0JevUpQUAIn+vSz2lHIuUV/dJOIHhOY/IWVWGBIHQtzs88s9zyWBuTgcBLzGOmeNnfF/QslSDgMeQW85i3DOQxuipxAkCyZ8SIm4Omp+7MMlCB59j6sKZcMoM4iIEoeI2J9AKxrFobZx0v4vYInuHFS4J1GQRCAGaLEYQXfyMML5XSQgghhBBCCCH+cXp6vgNhKpSKX/XdOAAAAABJRU5ErkJggg==";
            imgBack.style.position = "absolute";
            imgBack.style.left = "50%";
            imgBack.style.top = "50%";
            imgBack.style.marginLeft = "-50px";
            imgBack.style.marginTop = "-50px";
            imgBack.style.transition = "transform 1.0s ease";
            imgBack.style.webkitTransition = "-webkit-transform 1.0s ease";
            var deg = 360;
            var onTransitionEnd = function () {
                deg += 360;
                imgBack.style.transform = "rotateZ(" + deg + "deg)";
                imgBack.style.webkitTransform = "rotateZ(" + deg + "deg)";
            };
            imgBack.addEventListener("transitionend", onTransitionEnd);
            imgBack.addEventListener("webkitTransitionEnd", onTransitionEnd);
            this._loadingDiv.appendChild(imgBack);
            // front image
            var imgFront = new Image();
            imgFront.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuM4zml1AAAAYJSURBVHhe7Zy/qx1FFMff/2Av2Nvbi4WFiiAEY/OQ2IgQsbCJQoqkCAgpFLXyoZURLfwBIiIpgqZJoYQYlWelNsIrNOxDJcrzfHe+G97dnTl75u7euzv7zgcWHrlnZmfOmXPmzI/NjuM4juM4juM4juM4juM4juM4juM4juM45fPic08/uHf5/CvffH7lnT8PfrtxdHS0n3p+/fHGl5+89/prr5599iEWd8bg0rkXHoFyqehKnlxQpjYSDHTm9JMPsGrHylOPPXofvICKXMcIGtXdf/76AYbm6xyNW9e/eAtKC7rbKLXnvHHx5Sf4auc4Ek7OQkFU1Dap/vv37k/wSjblZANFiFIGzw98hhizwqBgs04mCBdQRNCHidoAEtY+lLIvtSdoGFeyql2ZH57HBH4sE7O+o/r9l+8/ZXUni68+2jsHBQQ9qNRGeP/tSxdSYQX/roUcpL4/f3vtM9TD+jTq92n1LQ7jxF1hhGPtwWL3gGccy8JuS1r8sVWBGXNVdSKMYjBGPUJjCzooiGuSpnwlnnOGP2dhHRSLNgpHp2oMKIriK8TmG4Qh/rwW8D6pps9b9im+LDDipXOqMVJrAngBfg9i98gevWKA+/nnCod3Dr5GfaHaDgidVym6HKRjGIkpqthcAVKGxNqBImbEo66kjCih8AOpNmkUmbMuUrR8kEqiU6FvHZLGAPJ71JCYSyhiBqmwFE2GoD6jLGIfDHtG6EzoU4dK21PCqIRMEF0FGRjFzGDtIkXVAdATvsqfT9CJ0JcOFdYiFIsiMlqYy1YOFpQo2OddqBtyEaq9y+efoVh5oPHoROjLKn0j3JIE5Ka8UqZRtGrMnneX6yVofOhDh94MSbznTcpqmDOt1vyQzOgaJAF4F3JBfIXesrNEGWWmjIX7UBZ6jRJbBMLg/DmJiKUGVHleIpnVNTa+jakzkAviJqLhi4MC9XQGBrZeKJZESSrKy7ik0VGFWhQBRDTHIACKQ5l9nAjy75gya4a2w+Jhs0FJdc0xX/GwUbAqFBkZi7QpJ2w16WUbjFyK9MJF3KaoEM74KhVtLrQOrsmRxkbdHEqmSC/c+EuGnIFkjW7Ih2Kr4CCMIvNG2hrrgLpCjiFloooYCjyYrzCRyvhyBthkIPuQtsZGdnbMTezyDiU71KTC5zr7aVsHbsz2tllrEkS5UHwU1tq1HbtPW4UbeB0O7xx8R5EsMJql+BheUmHjkNVmIRP7LutoM3+D4O4tG7vCkNO9ESZ4lL3J6rKRMPx4qKbD/A0icf8CG7tC7kTahnMTwleuYSrsS7GatRAvfZh1tTm5BmmQCdZ8a0Sefe28xUrRBkmFLKy8KTIKUDRX0Y1xagPgwbaIdeFnQULmKak3xvwNMkVGgok/N5XNoehJvejRlCDl9escI28dJU0tZ++nBTJE9mEF647x5Ehbo4s5hDOKFIU0PdofeA5F5k1q63zIWmQqNI/P3ZubjFTqKxQ3jyjHAOX0RdlgVO9hzRFpczRcjZ3Gbxxpc7Qj6+5pTYF2OFXawNI+yDGf1k2NcvOlzBQeDQ/t7zD7DsEDpJ2xATXaNtDWUS4IzP4DS2ljajAVu57SUkYw245ptxZxA5JiZaJ0DswudGn3kYUy54426EjoT4dZfYbccxC2nI92cDkZHQr96jD4AGkMDKeSy/COBsRe6VTSKFN6irLeaCh3IteQjt1E5+oudsG/b/2DfZ5AqsYo8vMDK9LB1HzSsLWvlGThdxXvC6+NsqyPPWP0pMINtbdsajfVeC6f/GZ+cdAofQoB1d+Hf9waY98I7+RXWab3Lt4zYkjHtTnlOLXHYMsCh1zWeQYehu1zfNPOOiys/d91LAKEBSgh6MJMbSA82AaHofDgAIwbgvVvlLNS11nModMm4UZergLHZBZrodmBuA3lBB1thdorSjkOmATMDwg/UBQVtglqQyx6fbEJ+H3IWIapjYAjAfeIgeCMHldueJvFaqDaAHhwf8qNsEEQ1iQbOoUUGIbCLRc8+Bvfp4jyd2FEijuO4ziO4ziO4ziO4ziO4ziO4ziO4ziOUzw7O/8D0P7rcZ/GEboAAAAASUVORK5CYII=";
            imgFront.style.position = "absolute";
            imgFront.style.left = "50%";
            imgFront.style.top = "50%";
            imgFront.style.marginLeft = "-50px";
            imgFront.style.marginTop = "-50px";
            this._loadingDiv.appendChild(imgFront);
            // Resize
            this._resizeLoadingUI = function () {
                var canvasRect = _this.getRenderingCanvasClientRect();
                _this._loadingDiv.style.position = "absolute";
                _this._loadingDiv.style.left = canvasRect.left + "px";
                _this._loadingDiv.style.top = canvasRect.top + "px";
                _this._loadingDiv.style.width = canvasRect.width + "px";
                _this._loadingDiv.style.height = canvasRect.height + "px";
            };
            this._resizeLoadingUI();
            window.addEventListener("resize", this._resizeLoadingUI);
            this._loadingDiv.style.backgroundColor = this._loadingDivBackgroundColor;
            document.body.appendChild(this._loadingDiv);
            setTimeout(function () {
                _this._loadingDiv.style.opacity = "1";
                imgBack.style.transform = "rotateZ(360deg)";
                imgBack.style.webkitTransform = "rotateZ(360deg)";
            }, 0);
        };
        Object.defineProperty(Engine.prototype, "loadingUIText", {
            set: function (text) {
                if (!this._loadingDiv) {
                    return;
                }
                this._loadingTextDiv.innerHTML = text;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Engine.prototype, "loadingUIBackgroundColor", {
            get: function () {
                return this._loadingDivBackgroundColor;
            },
            set: function (color) {
                this._loadingDivBackgroundColor = color;
                if (!this._loadingDiv) {
                    return;
                }
                this._loadingDiv.style.backgroundColor = this._loadingDivBackgroundColor;
            },
            enumerable: true,
            configurable: true
        });
        Engine.prototype.hideLoadingUI = function () {
            var _this = this;
            if (!this._loadingDiv) {
                return;
            }
            var onTransitionEnd = function () {
                if (!_this._loadingDiv) {
                    return;
                }
                document.body.removeChild(_this._loadingDiv);
                window.removeEventListener("resize", _this._resizeLoadingUI);
                _this._loadingDiv = null;
            };
            this._loadingDiv.style.opacity = "0";
            this._loadingDiv.addEventListener("transitionend", onTransitionEnd);
        };
        // FPS
        Engine.prototype.getFps = function () {
            return this.fps;
        };
        Engine.prototype.getDeltaTime = function () {
            return this.deltaTime;
        };
        Engine.prototype._measureFps = function () {
            this.previousFramesDuration.push(BABYLON.Tools.Now);
            var length = this.previousFramesDuration.length;
            if (length >= 2) {
                this.deltaTime = this.previousFramesDuration[length - 1] - this.previousFramesDuration[length - 2];
            }
            if (length >= this.fpsRange) {
                if (length > this.fpsRange) {
                    this.previousFramesDuration.splice(0, 1);
                    length = this.previousFramesDuration.length;
                }
                var sum = 0;
                for (var id = 0; id < length - 1; id++) {
                    sum += this.previousFramesDuration[id + 1] - this.previousFramesDuration[id];
                }
                this.fps = 1000.0 / (sum / (length - 1));
            }
        };
        // Statics
        Engine.isSupported = function () {
            try {
                // Avoid creating an unsized context for CocoonJS, since size determined on first creation.  Is not resizable
                if (navigator.isCocoonJS) {
                    return true;
                }
                var tempcanvas = document.createElement("canvas");
                var gl = tempcanvas.getContext("webgl") || tempcanvas.getContext("experimental-webgl");
                return gl != null && !!window.WebGLRenderingContext;
            }
            catch (e) {
                return false;
            }
        };
        // Const statics
        Engine._ALPHA_DISABLE = 0;
        Engine._ALPHA_ADD = 1;
        Engine._ALPHA_COMBINE = 2;
        Engine._DELAYLOADSTATE_NONE = 0;
        Engine._DELAYLOADSTATE_LOADED = 1;
        Engine._DELAYLOADSTATE_LOADING = 2;
        Engine._DELAYLOADSTATE_NOTLOADED = 4;
        Engine._TEXTUREFORMAT_ALPHA = 0;
        Engine._TEXTUREFORMAT_LUMINANCE = 1;
        Engine._TEXTUREFORMAT_LUMINANCE_ALPHA = 2;
        Engine._TEXTUREFORMAT_RGB = 4;
        Engine._TEXTUREFORMAT_RGBA = 4;
        Engine._TEXTURETYPE_UNSIGNED_INT = 0;
        Engine._TEXTURETYPE_FLOAT = 1;
        // Updatable statics so stick with vars here
        Engine.Epsilon = 0.001;
        Engine.CollisionsEpsilon = 0.001;
        Engine.CodeRepository = "Babylon/";
        Engine.ShadersRepository = "Babylon/Shaders/";
        return Engine;
    })();
    BABYLON.Engine = Engine;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.engine.js.map