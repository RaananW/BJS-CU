﻿var BABYLON = BABYLON || {};

(function () {
    BABYLON.ShadowGenerator = function (mapSize, light) {
        this._light = light;
        this._scene = light.getScene();

        light._shadowGenerator = this;

        // Render target
        this._shadowMap = new BABYLON.RenderTargetTexture(light.name + "_shadowMap", mapSize, this._scene, false);
        this._shadowMap.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        this._shadowMap.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        
        // Effect
        this._effect = this._scene.getEngine().createEffect("shadowMap",
                    ["position"],
                    ["worldViewProjection"],
                    [], "");
        
        this._effectVSM = this._scene.getEngine().createEffect("shadowMap",
                    ["position"],
                    ["worldViewProjection"],
                    [], "#define VSM");
        
        // Custom render function
        var that = this;

        var renderSubMesh = function (subMesh, effect) {
            var mesh = subMesh.getMesh();
            var world = mesh.getWorldMatrix();
            
            effect.setMatrix("worldViewProjection", world.multiply(that.getTransformMatrix()));
            
            // Bind and draw
            mesh.bindAndDraw(subMesh, effect, false);
        };

        this._shadowMap.customRenderFunction = function (opaqueSubMeshes, alphaTestSubMeshes, transparentSubMeshes, activeMeshes) {
            var engine = that._scene.getEngine();
            var index;
            var effect = that.useVarianceShadowMap ? that._effectVSM : that._effect;

            engine.enableEffect(effect);
            
            for (index = 0; index < opaqueSubMeshes.length; index++) {
                renderSubMesh(opaqueSubMeshes[index], effect);
            }
            
            for (index = 0; index < alphaTestSubMeshes.length; index++) {
                renderSubMesh(alphaTestSubMeshes[index], effect);
            }
        };
    };
    
    // Members
    BABYLON.ShadowGenerator.prototype.useVarianceShadowMap = true;
    
    // Properties
    BABYLON.ShadowGenerator.prototype.isReady = function () {
        return this._effect.isReady() && this._effectVSM.isReady();
    };
    
    BABYLON.ShadowGenerator.prototype.getShadowMap = function () {
        return this._shadowMap;
    };
    
    BABYLON.ShadowGenerator.prototype.getLight = function () {
        return this._light;
    };
    
    // Methods
    BABYLON.ShadowGenerator.prototype.getTransformMatrix = function () {
        if (!this._cachedPosition || !this._cachedDirection || !this._light.position.equals(this._cachedPosition) || !this._light.direction.equals(this._cachedDirection)) {

            this._cachedPosition = this._light.position.clone();
            this._cachedDirection = this._light.direction.clone();

            var activeCamera = this._scene.activeCamera;

            var view = new BABYLON.Matrix.LookAtLH(this._light.position, this._light.position.add(this._light.direction), BABYLON.Vector3.Up());
            var projection = new BABYLON.Matrix.PerspectiveFovLH(Math.PI / 2.0, 1.0, activeCamera.minZ, activeCamera.maxZ);

            this._transformMatrix = view.multiply(projection);
        }

        return this._transformMatrix;
    };

    BABYLON.ShadowGenerator.prototype.dispose = function() {
        this._shadowMap.dispose();
    };
})();