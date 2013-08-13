﻿var BABYLON = BABYLON || {};

(function () {
    BABYLON.TouchCamera = function (name, position, scene) {
        this.name = name;
        this.id = name;

        this._scene = scene;
        this.position = position;
        scene.cameras.push(this);
        this.cameraDirection = new BABYLON.Vector3(0, 0, 0);
        this.cameraRotation = new BABYLON.Vector2(0, 0);
        this.rotation = new BABYLON.Vector3(0, 0, 0);
        this.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
        this.angularSensibility = 200000.0;
        this.moveSensibility = 500.0;

        if (!scene.activeCamera) {
            scene.activeCamera = this;
        }
        // Collisions
        this._collider = new BABYLON.Collider();
        this._needMoveForGravity = true;
        
        // Offset
        this._offsetX = null;
        this._offsetY = null;
        this._pointerCount = 0;
        this._pointerPressed = [];
        
        // Animations
        this.animations = [];
        
        // Internals
        this._cameraRotationMatrix = new BABYLON.Matrix();
    };

    BABYLON.TouchCamera.prototype = Object.create(BABYLON.FreeCamera.prototype);

    // Controls
    BABYLON.TouchCamera.prototype.attachControl = function (canvas) {
        var previousPosition;
        var that = this;

        this._onPointerDown = function (evt) {
            evt.preventDefault();

            that._pointerPressed.push(evt.pointerId);
            
            if (that._pointerPressed.length !== 1) {
                return;
            }

            previousPosition = {
                x: evt.clientX,
                y: evt.clientY
            };
        };

        this._onPointerUp = function (evt) {
            evt.preventDefault();
            
            var index = that._pointerPressed.indexOf(evt.pointerId);

            if (index === -1) {
                return;
            }
            that._pointerPressed.splice(index, 1);
            
            if (index != 0) {
                return;
            }
            previousPosition = null;
            that._offsetX = null;
            that._offsetY = null;
        };

        this._onPointerMove = function (evt) {
            evt.preventDefault();
            
            if (!previousPosition) {
                return;
            }
            
            var index = that._pointerPressed.indexOf(evt.pointerId);
            
            if (index != 0) {
                return;
            }

            that._offsetX = evt.clientX - previousPosition.x;
            that._offsetY = -(evt.clientY - previousPosition.y);
        };
        
        this._onLostFocus = function () {
            that._offsetX = null;
            that._offsetY = null;
        };
        
        canvas.addEventListener("pointerdown", this._onPointerDown, true);
        canvas.addEventListener("pointerup", this._onPointerUp, true);
        canvas.addEventListener("pointerout", this._onPointerUp, true);
        canvas.addEventListener("pointermove", this._onPointerMove, true);
        window.addEventListener("blur", this._onLostFocus, true);
    };

    BABYLON.TouchCamera.prototype.detachControl = function (canvas) {
        canvas.removeEventListener("pointerdown", this._onPointerDown);
        canvas.removeEventListener("pointerup", this._onPointerUp);
        canvas.removeEventListener("pointerout", this._onPointerUp);
        canvas.removeEventListener("pointermove", this._onPointerMove);
        window.removeEventListener("blur", this._onLostFocus);
    };
    
    BABYLON.TouchCamera.prototype._checkInputs = function () {
        if (!this._offsetX) {
            return;
        }
        this.cameraRotation.y += this._offsetX / this.angularSensibility;

        if (this._pointerPressed.length > 1) {
            this.cameraRotation.x += -this._offsetY / this.angularSensibility;
        } else {
            var speed = this._computeLocalCameraSpeed();
            var direction = new BABYLON.Vector3(0, 0, speed * this._offsetY / this.moveSensibility);

            BABYLON.Matrix.RotationYawPitchRollToRef(this.rotation.y, this.rotation.x, 0, this._cameraRotationMatrix);
            this.cameraDirection.addInPlace(BABYLON.Vector3.TransformCoordinates(direction, this._cameraRotationMatrix));
        }
    };
})();