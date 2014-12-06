﻿var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var BABYLON;
(function (BABYLON) {
    var WoodProceduralTexture = (function (_super) {
        __extends(WoodProceduralTexture, _super);
        function WoodProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            _super.call(this, name, size, "wood", scene, fallbackTexture, generateMipMaps);
            this._ampScale = 100.0;
            this._woodColor = new BABYLON.Color3(0.32, 0.17, 0.09);
            this.updateShaderUniforms();
            this.refreshRate = 0;
        }
        WoodProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setFloat("ampScale", this._ampScale);
            this.setColor3("woodColor", this._woodColor);
        };

        Object.defineProperty(WoodProceduralTexture.prototype, "ampScale", {
            get: function () {
                return this._ampScale;
            },
            set: function (value) {
                this._ampScale = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(WoodProceduralTexture.prototype, "woodColor", {
            get: function () {
                return this._woodColor;
            },
            set: function (value) {
                this._woodColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });

        return WoodProceduralTexture;
    })(BABYLON.ProceduralTexture);
    BABYLON.WoodProceduralTexture = WoodProceduralTexture;

    var FireProceduralTexture = (function (_super) {
        __extends(FireProceduralTexture, _super);
        function FireProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            _super.call(this, name, size, "fire", scene, fallbackTexture, generateMipMaps);
            this._time = 0.0;
            this._speed = new BABYLON.Vector2(0.5, 0.3);
            this._shift = 1.6;
            this._alpha = 0.0;
            this._autoGenerateTime = true;
            this._fireColors = FireProceduralTexture.RedFireColors;
            this.updateShaderUniforms();
            this.refreshRate = 1;
        }
        FireProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setFloat("iGlobalTime", this._time);
            this.setVector2("speed", this._speed);
            this.setFloat("shift", this._shift);
            this.setFloat("alpha", this._alpha);
            this.setColor3("c1", this._fireColors[0]);
            this.setColor3("c2", this._fireColors[1]);
            this.setColor3("c3", this._fireColors[2]);
            this.setColor3("c4", this._fireColors[3]);
            this.setColor3("c5", this._fireColors[4]);
            this.setColor3("c6", this._fireColors[5]);
        };

        FireProceduralTexture.prototype.render = function (useCameraPostProcess) {
            if (this._autoGenerateTime) {
                this._time += this.getScene().getAnimationRatio() * 0.03;
                this.updateShaderUniforms();
            }
            _super.prototype.render.call(this, useCameraPostProcess);
        };

        Object.defineProperty(FireProceduralTexture, "PurpleFireColors", {
            get: function () {
                return [
                    new BABYLON.Color3(0.5, 0.0, 1.0),
                    new BABYLON.Color3(0.9, 0.0, 1.0),
                    new BABYLON.Color3(0.2, 0.0, 1.0),
                    new BABYLON.Color3(1.0, 0.9, 1.0),
                    new BABYLON.Color3(0.1, 0.1, 1.0),
                    new BABYLON.Color3(0.9, 0.9, 1.0)
                ];
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(FireProceduralTexture, "GreenFireColors", {
            get: function () {
                return [
                    new BABYLON.Color3(0.5, 1.0, 0.0),
                    new BABYLON.Color3(0.5, 1.0, 0.0),
                    new BABYLON.Color3(0.3, 0.4, 0.0),
                    new BABYLON.Color3(0.5, 1.0, 0.0),
                    new BABYLON.Color3(0.2, 0.0, 0.0),
                    new BABYLON.Color3(0.5, 1.0, 0.0)
                ];
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(FireProceduralTexture, "RedFireColors", {
            get: function () {
                return [
                    new BABYLON.Color3(0.5, 0.0, 0.1),
                    new BABYLON.Color3(0.9, 0.0, 0.0),
                    new BABYLON.Color3(0.2, 0.0, 0.0),
                    new BABYLON.Color3(1.0, 0.9, 0.0),
                    new BABYLON.Color3(0.1, 0.1, 0.1),
                    new BABYLON.Color3(0.9, 0.9, 0.9)
                ];
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(FireProceduralTexture, "BlueFireColors", {
            get: function () {
                return [
                    new BABYLON.Color3(0.1, 0.0, 0.5),
                    new BABYLON.Color3(0.0, 0.0, 0.5),
                    new BABYLON.Color3(0.1, 0.0, 0.2),
                    new BABYLON.Color3(0.0, 0.0, 1.0),
                    new BABYLON.Color3(0.1, 0.2, 0.3),
                    new BABYLON.Color3(0.0, 0.2, 0.9)
                ];
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(FireProceduralTexture.prototype, "fireColors", {
            get: function () {
                return this._fireColors;
            },
            set: function (value) {
                this._fireColors = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(FireProceduralTexture.prototype, "time", {
            get: function () {
                return this._time;
            },
            set: function (value) {
                this._time = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(FireProceduralTexture.prototype, "speed", {
            get: function () {
                return this._speed;
            },
            set: function (value) {
                this._speed = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(FireProceduralTexture.prototype, "shift", {
            get: function () {
                return this._shift;
            },
            set: function (value) {
                this._shift = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(FireProceduralTexture.prototype, "alpha", {
            get: function () {
                return this._alpha;
            },
            set: function (value) {
                this._alpha = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });

        return FireProceduralTexture;
    })(BABYLON.ProceduralTexture);
    BABYLON.FireProceduralTexture = FireProceduralTexture;

    var CloudProceduralTexture = (function (_super) {
        __extends(CloudProceduralTexture, _super);
        function CloudProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            _super.call(this, name, size, "cloud", scene, fallbackTexture, generateMipMaps);
            this._skyColor = new BABYLON.Color3(0.15, 0.68, 1.0);
            this._cloudColor = new BABYLON.Color3(1, 1, 1);
            this.updateShaderUniforms();
            this.refreshRate = 0;
        }
        CloudProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setColor3("skyColor", this._skyColor);
            this.setColor3("cloudColor", this._cloudColor);
        };

        Object.defineProperty(CloudProceduralTexture.prototype, "skyColor", {
            get: function () {
                return this._skyColor;
            },
            set: function (value) {
                this._skyColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(CloudProceduralTexture.prototype, "cloudColor", {
            get: function () {
                return this._cloudColor;
            },
            set: function (value) {
                this._cloudColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });

        return CloudProceduralTexture;
    })(BABYLON.ProceduralTexture);
    BABYLON.CloudProceduralTexture = CloudProceduralTexture;

    var GrassProceduralTexture = (function (_super) {
        __extends(GrassProceduralTexture, _super);
        function GrassProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            _super.call(this, name, size, "grass", scene, fallbackTexture, generateMipMaps);
            this._herb1 = new BABYLON.Color3(0.29, 0.38, 0.02);
            this._herb2 = new BABYLON.Color3(0.36, 0.49, 0.09);
            this._herb3 = new BABYLON.Color3(0.51, 0.6, 0.28);
            this._dirt = new BABYLON.Color3(0.6, 0.46, 0.13);
            this._ground = new BABYLON.Color3(1, 1, 1);
            this.updateShaderUniforms();
            this.refreshRate = 0;
        }
        GrassProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setColor3("herb1", this._herb1);
            this.setColor3("herb2", this._herb2);
            this.setColor3("herb3", this._herb2);
            this.setColor3("dirt", this._dirt);
            this.setColor3("ground", this._ground);
        };

        Object.defineProperty(GrassProceduralTexture.prototype, "herb1", {
            get: function () {
                return this._herb1;
            },
            set: function (value) {
                this._herb1 = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(GrassProceduralTexture.prototype, "herb2", {
            get: function () {
                return this._herb2;
            },
            set: function (value) {
                this._herb2 = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(GrassProceduralTexture.prototype, "herb3", {
            get: function () {
                return this._herb3;
            },
            set: function (value) {
                this._herb3 = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(GrassProceduralTexture.prototype, "dirt", {
            get: function () {
                return this._dirt;
            },
            set: function (value) {
                this._dirt = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(GrassProceduralTexture.prototype, "ground", {
            get: function () {
                return this._ground;
            },
            set: function (value) {
                this._ground = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });

        return GrassProceduralTexture;
    })(BABYLON.ProceduralTexture);
    BABYLON.GrassProceduralTexture = GrassProceduralTexture;

    var RoadProceduralTexture = (function (_super) {
        __extends(RoadProceduralTexture, _super);
        function RoadProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            _super.call(this, name, size, "road", scene, fallbackTexture, generateMipMaps);
            this._macadamColor = new BABYLON.Color3(0.53, 0.53, 0.53);
            this.updateShaderUniforms();
            this.refreshRate = 0;
        }
        RoadProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setColor3("macadamColor", this._macadamColor);
        };

        Object.defineProperty(RoadProceduralTexture.prototype, "macadamColor", {
            get: function () {
                return this._macadamColor;
            },
            set: function (value) {
                this._macadamColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });

        return RoadProceduralTexture;
    })(BABYLON.ProceduralTexture);
    BABYLON.RoadProceduralTexture = RoadProceduralTexture;

    var BrickProceduralTexture = (function (_super) {
        __extends(BrickProceduralTexture, _super);
        function BrickProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            _super.call(this, name, size, "brick", scene, fallbackTexture, generateMipMaps);
            this._numberOfBricksHeight = 15;
            this._numberOfBricksWidth = 5;
            this._jointColor = new BABYLON.Color3(0.72, 0.72, 0.72);
            this._brickColor = new BABYLON.Color3(0.77, 0.47, 0.40);
            this.updateShaderUniforms();
            this.refreshRate = 0;
        }
        BrickProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setFloat("numberOfBricksHeight", this._numberOfBricksHeight);
            this.setFloat("numberOfBricksWidth", this._numberOfBricksWidth);
            this.setColor3("brick", this._brickColor);
            this.setColor3("joint", this._jointColor);
        };

        Object.defineProperty(BrickProceduralTexture.prototype, "numberOfBricksHeight", {
            get: function () {
                return this._numberOfBricksHeight;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(BrickProceduralTexture.prototype, "cloudColor", {
            set: function (value) {
                this._numberOfBricksHeight = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(BrickProceduralTexture.prototype, "numberOfBricksWidth", {
            get: function () {
                return this._numberOfBricksWidth;
            },
            set: function (value) {
                this._numberOfBricksHeight = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(BrickProceduralTexture.prototype, "jointColor", {
            get: function () {
                return this._jointColor;
            },
            set: function (value) {
                this._jointColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(BrickProceduralTexture.prototype, "brickColor", {
            get: function () {
                return this._brickColor;
            },
            set: function (value) {
                this._brickColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });

        return BrickProceduralTexture;
    })(BABYLON.ProceduralTexture);
    BABYLON.BrickProceduralTexture = BrickProceduralTexture;

    var MarbleProceduralTexture = (function (_super) {
        __extends(MarbleProceduralTexture, _super);
        function MarbleProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            _super.call(this, name, size, "marble", scene, fallbackTexture, generateMipMaps);
            this._numberOfTilesHeight = 3;
            this._numberOfTilesWidth = 3;
            this._amplitude = 9.0;
            this._marbleColor = new BABYLON.Color3(0.77, 0.47, 0.40);
            this._jointColor = new BABYLON.Color3(0.72, 0.72, 0.72);
            this.updateShaderUniforms();
            this.refreshRate = 0;
        }
        MarbleProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setFloat("numberOfBricksHeight", this._numberOfTilesHeight);
            this.setFloat("numberOfBricksWidth", this._numberOfTilesWidth);
            this.setFloat("amplitude", this._amplitude);
            this.setColor3("brick", this._marbleColor);
            this.setColor3("joint", this._jointColor);
        };

        Object.defineProperty(MarbleProceduralTexture.prototype, "numberOfTilesHeight", {
            get: function () {
                return this._numberOfTilesHeight;
            },
            set: function (value) {
                this._numberOfTilesHeight = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(MarbleProceduralTexture.prototype, "numberOfTilesWidth", {
            get: function () {
                return this._numberOfTilesWidth;
            },
            set: function (value) {
                this._numberOfTilesWidth = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(MarbleProceduralTexture.prototype, "jointColor", {
            get: function () {
                return this._jointColor;
            },
            set: function (value) {
                this._jointColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });


        Object.defineProperty(MarbleProceduralTexture.prototype, "marbleColor", {
            get: function () {
                return this._marbleColor;
            },
            set: function (value) {
                this._marbleColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });

        return MarbleProceduralTexture;
    })(BABYLON.ProceduralTexture);
    BABYLON.MarbleProceduralTexture = MarbleProceduralTexture;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.standardProceduralTexture.js.map
