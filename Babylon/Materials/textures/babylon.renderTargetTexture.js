﻿var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var BABYLON;
(function (BABYLON) {
    var RenderTargetTexture = (function (_super) {
        __extends(RenderTargetTexture, _super);
        function RenderTargetTexture(name, size, scene, generateMipMaps, doNotChangeAspectRatio) {
            if (typeof doNotChangeAspectRatio === "undefined") { doNotChangeAspectRatio = true; }
            _super.call(this, null, scene, !generateMipMaps);
            this.renderList = new Array();
            this.renderParticles = true;
            this.renderSprites = false;
            this.coordinatesMode = BABYLON.Texture.PROJECTION_MODE;
            this._currentRefreshId = -1;
            this._refreshRate = 1;

            this.name = name;
            this.isRenderTarget = true;
            this._size = size;
            this._generateMipMaps = generateMipMaps;
            this._doNotChangeAspectRatio = doNotChangeAspectRatio;

            this._texture = scene.getEngine().createRenderTargetTexture(size, generateMipMaps);

            // Rendering groups
            this._renderingManager = new BABYLON.RenderingManager(scene);
        }
        RenderTargetTexture.prototype.resetRefreshCounter = function () {
            this._currentRefreshId = -1;
        };

        Object.defineProperty(RenderTargetTexture.prototype, "refreshRate", {
            get: function () {
                return this._refreshRate;
            },
            // Use 0 to render just once, 1 to render on every frame, 2 to render every two frames and so on...
            set: function (value) {
                this._refreshRate = value;
                this.resetRefreshCounter();
            },
            enumerable: true,
            configurable: true
        });


        RenderTargetTexture.prototype._shouldRender = function () {
            if (this._currentRefreshId === -1) {
                this._currentRefreshId = 1;
                return true;
            }

            if (this.refreshRate == this._currentRefreshId) {
                this._currentRefreshId = 1;
                return true;
            }

            this._currentRefreshId++;
            return false;
        };

        RenderTargetTexture.prototype.getRenderSize = function () {
            return this._size;
        };

        RenderTargetTexture.prototype.resize = function (size, generateMipMaps) {
            this.releaseInternalTexture();
            this._texture = this.getScene().getEngine().createRenderTargetTexture(size, generateMipMaps);
        };

        RenderTargetTexture.prototype.render = function (useCameraPostProcess) {
            var scene = this.getScene();
            var engine = scene.getEngine();

            if (this._waitingRenderList) {
                this.renderList = [];
                for (var index = 0; index < this._waitingRenderList.length; index++) {
                    var id = this._waitingRenderList[index];
                    this.renderList.push(scene.getMeshByID(id));
                }

                delete this._waitingRenderList;
            }

            if (!this.renderList) {
                return;
            }

            // Bind
            if (!useCameraPostProcess || !scene.postProcessManager._prepareFrame(this._texture)) {
                engine.bindFramebuffer(this._texture);
            }

            // Clear
            engine.clear(scene.clearColor, true, true);

            this._renderingManager.reset();

            for (var meshIndex = 0; meshIndex < this.renderList.length; meshIndex++) {
                var mesh = this.renderList[meshIndex];

                if (mesh) {
                    if (!mesh.isReady() || (mesh.material && !mesh.material.isReady())) {
                        // Reset _currentRefreshId
                        this.resetRefreshCounter();
                        continue;
                    }

                    if (mesh.isEnabled() && mesh.isVisible && mesh.subMeshes && ((mesh.layerMask & scene.activeCamera.layerMask) != 0)) {
                        mesh._activate(scene.getRenderId());

                        for (var subIndex = 0; subIndex < mesh.subMeshes.length; subIndex++) {
                            var subMesh = mesh.subMeshes[subIndex];
                            scene._activeVertices += subMesh.verticesCount;
                            this._renderingManager.dispatch(subMesh);
                        }
                    }
                }
            }

            if (!this._doNotChangeAspectRatio) {
                scene.updateTransformMatrix(true);
            }

            if (this.onBeforeRender) {
                this.onBeforeRender();
            }

            // Render
            this._renderingManager.render(this.customRenderFunction, this.renderList, this.renderParticles, this.renderSprites);

            if (useCameraPostProcess) {
                scene.postProcessManager._finalizeFrame(false, this._texture);
            }

            if (this.onAfterRender) {
                this.onAfterRender();
            }

            // Unbind
            engine.unBindFramebuffer(this._texture);

            if (!this._doNotChangeAspectRatio) {
                scene.updateTransformMatrix(true);
            }
        };

        RenderTargetTexture.prototype.clone = function () {
            var textureSize = this.getSize();
            var newTexture = new BABYLON.RenderTargetTexture(this.name, textureSize.width, this.getScene(), this._generateMipMaps);

            // Base texture
            newTexture.hasAlpha = this.hasAlpha;
            newTexture.level = this.level;

            // RenderTarget Texture
            newTexture.coordinatesMode = this.coordinatesMode;
            newTexture.renderList = this.renderList.slice(0);

            return newTexture;
        };
        return RenderTargetTexture;
    })(BABYLON.Texture);
    BABYLON.RenderTargetTexture = RenderTargetTexture;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.renderTargetTexture.js.map
