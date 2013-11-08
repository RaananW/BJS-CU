﻿var BABYLON = BABYLON || {};

(function () {
    BABYLON.Light = function (name, scene) {
        this.name = name;
        this.id = name;
        this._childrenFlag = true;

        this._scene = scene;

        scene.lights.push(this);
        
        // Animations
        this.animations = [];
    };
    
    BABYLON.Light.prototype = Object.create(BABYLON.Node.prototype);
    
    // Members
    BABYLON.Light.prototype.intensity = 1.0;
    
    // Properties
    BABYLON.Light.prototype.getScene = function () {
        return this._scene;
    };

    BABYLON.Light.prototype.getShadowGenerator = function() {
        return this._shadowGenerator;
    };

    // Methods
    BABYLON.Light.prototype.transferToEffect = function() {
    };

    BABYLON.Light.prototype.getWorldMatrix = function() {
        var worldMatrix = this._getWorldMatrix();

        if (this.parent && this.parent.getWorldMatrix) {
            if (!this._parentedWorldMatrix) {
                this._parentedWorldMatrix = BABYLON.Matrix.Identity();
            }

            worldMatrix.multiplyToRef(this.parent.getWorldMatrix(), this._parentedWorldMatrix);

            return this._parentedWorldMatrix;
        }

        return worldMatrix;
    };

    BABYLON.Light.prototype.dispose = function () {
        if (this._shadowGenerator) {
            this._shadowGenerator.dispose();
            this._shadowGenerator = null;
        }
        
        // Remove from scene
        var index = this._scene.lights.indexOf(this);
        this._scene.lights.splice(index, 1);
    };

})();