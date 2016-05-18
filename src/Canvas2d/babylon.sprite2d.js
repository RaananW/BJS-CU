var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var Sprite2DRenderCache = (function (_super) {
        __extends(Sprite2DRenderCache, _super);
        function Sprite2DRenderCache() {
            _super.apply(this, arguments);
        }
        Sprite2DRenderCache.prototype.render = function (instanceInfo, context) {
            // Do nothing if the shader is still loading/preparing
            if (!this.effect.isReady() || !this.texture.isReady()) {
                return false;
            }
            // Compute the offset locations of the attributes in the vertex shader that will be mapped to the instance buffer data
            var engine = instanceInfo._owner.owner.engine;
            engine.enableEffect(this.effect);
            this.effect.setTexture("diffuseSampler", this.texture);
            engine.bindBuffers(this.vb, this.ib, [1], 4, this.effect);
            var cur = engine.getAlphaMode();
            engine.setAlphaMode(BABYLON.Engine.ALPHA_COMBINE);
            var count = instanceInfo._instancesPartsData[0].usedElementCount;
            if (instanceInfo._owner.owner.supportInstancedArray) {
                if (!this.instancingAttributes) {
                    this.instancingAttributes = this.loadInstancingAttributes(Sprite2D.SPRITE2D_MAINPARTID, this.effect);
                }
                engine.updateAndBindInstancesBuffer(instanceInfo._instancesPartsBuffer[0], null, this.instancingAttributes);
                engine.draw(true, 0, 6, count);
                engine.unBindInstancesBuffer(instanceInfo._instancesPartsBuffer[0], this.instancingAttributes);
            }
            else {
                for (var i = 0; i < count; i++) {
                    this.setupUniforms(this.effect, 0, instanceInfo._instancesPartsData[0], i);
                    engine.draw(true, 0, 6);
                }
            }
            engine.setAlphaMode(cur);
            return true;
        };
        Sprite2DRenderCache.prototype.dispose = function () {
            if (!_super.prototype.dispose.call(this)) {
                return false;
            }
            if (this.vb) {
                this._engine._releaseBuffer(this.vb);
                this.vb = null;
            }
            if (this.ib) {
                this._engine._releaseBuffer(this.ib);
                this.ib = null;
            }
            if (this.texture) {
                this.texture.dispose();
                this.texture = null;
            }
            if (this.effect) {
                this._engine._releaseEffect(this.effect);
                this.effect = null;
            }
            return true;
        };
        return Sprite2DRenderCache;
    })(BABYLON.ModelRenderCache);
    BABYLON.Sprite2DRenderCache = Sprite2DRenderCache;
    var Sprite2DInstanceData = (function (_super) {
        __extends(Sprite2DInstanceData, _super);
        function Sprite2DInstanceData(partId) {
            _super.call(this, partId, 1);
        }
        Object.defineProperty(Sprite2DInstanceData.prototype, "topLeftUV", {
            get: function () {
                return null;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite2DInstanceData.prototype, "sizeUV", {
            get: function () {
                return null;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite2DInstanceData.prototype, "textureSize", {
            get: function () {
                return null;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite2DInstanceData.prototype, "frame", {
            get: function () {
                return null;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite2DInstanceData.prototype, "invertY", {
            get: function () {
                return null;
            },
            enumerable: true,
            configurable: true
        });
        __decorate([
            BABYLON.instanceData()
        ], Sprite2DInstanceData.prototype, "topLeftUV", null);
        __decorate([
            BABYLON.instanceData()
        ], Sprite2DInstanceData.prototype, "sizeUV", null);
        __decorate([
            BABYLON.instanceData()
        ], Sprite2DInstanceData.prototype, "textureSize", null);
        __decorate([
            BABYLON.instanceData()
        ], Sprite2DInstanceData.prototype, "frame", null);
        __decorate([
            BABYLON.instanceData()
        ], Sprite2DInstanceData.prototype, "invertY", null);
        return Sprite2DInstanceData;
    })(BABYLON.InstanceDataBase);
    BABYLON.Sprite2DInstanceData = Sprite2DInstanceData;
    var Sprite2D = (function (_super) {
        __extends(Sprite2D, _super);
        function Sprite2D() {
            _super.apply(this, arguments);
        }
        Object.defineProperty(Sprite2D.prototype, "texture", {
            get: function () {
                return this._texture;
            },
            set: function (value) {
                this._texture = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite2D.prototype, "actualSize", {
            get: function () {
                return this.spriteSize;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite2D.prototype, "spriteSize", {
            get: function () {
                return this._size;
            },
            set: function (value) {
                this._size = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite2D.prototype, "spriteLocation", {
            get: function () {
                return this._location;
            },
            set: function (value) {
                this._location = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite2D.prototype, "spriteFrame", {
            get: function () {
                return this._spriteFrame;
            },
            set: function (value) {
                this._spriteFrame = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite2D.prototype, "invertY", {
            get: function () {
                return this._invertY;
            },
            set: function (value) {
                this._invertY = value;
            },
            enumerable: true,
            configurable: true
        });
        Sprite2D.prototype.updateLevelBoundingInfo = function () {
            BABYLON.BoundingInfo2D.CreateFromSizeToRef(this.spriteSize, this._levelBoundingInfo, this.origin);
        };
        Sprite2D.prototype.setupSprite2D = function (owner, parent, id, position, texture, spriteSize, spriteLocation, invertY) {
            this.setupRenderablePrim2D(owner, parent, id, position, true);
            this.texture = texture;
            this.texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
            this.texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
            this.spriteSize = spriteSize;
            this.spriteLocation = spriteLocation;
            this.spriteFrame = 0;
            this.invertY = invertY;
            this._isTransparent = true;
        };
        Sprite2D.Create = function (parent, id, x, y, texture, spriteSize, spriteLocation, invertY) {
            if (invertY === void 0) { invertY = false; }
            BABYLON.Prim2DBase.CheckParent(parent);
            var sprite = new Sprite2D();
            sprite.setupSprite2D(parent.owner, parent, id, new BABYLON.Vector2(x, y), texture, spriteSize, spriteLocation, invertY);
            return sprite;
        };
        Sprite2D._createCachedCanvasSprite = function (owner, texture, size, pos) {
            var sprite = new Sprite2D();
            sprite.setupSprite2D(owner, null, "__cachedCanvasSprite__", new BABYLON.Vector2(0, 0), texture, size, pos, false);
            return sprite;
        };
        Sprite2D.prototype.createModelRenderCache = function (modelKey, isTransparent) {
            var renderCache = new Sprite2DRenderCache(this.owner.engine, modelKey, isTransparent);
            return renderCache;
        };
        Sprite2D.prototype.setupModelRenderCache = function (modelRenderCache) {
            var renderCache = modelRenderCache;
            var engine = this.owner.engine;
            var vb = new Float32Array(4);
            for (var i = 0; i < 4; i++) {
                vb[i] = i;
            }
            renderCache.vb = engine.createVertexBuffer(vb);
            var ib = new Float32Array(6);
            ib[0] = 0;
            ib[1] = 2;
            ib[2] = 1;
            ib[3] = 0;
            ib[4] = 3;
            ib[5] = 2;
            renderCache.ib = engine.createIndexBuffer(ib);
            renderCache.texture = this.texture;
            var ei = this.getDataPartEffectInfo(Sprite2D.SPRITE2D_MAINPARTID, ["index"]);
            renderCache.effect = engine.createEffect({ vertex: "sprite2d", fragment: "sprite2d" }, ei.attributes, ei.uniforms, ["diffuseSampler"], ei.defines, null, function (e) {
                //                renderCache.setupUniformsLocation(e, ei.uniforms, Sprite2D.SPRITE2D_MAINPARTID);
            });
            return renderCache;
        };
        Sprite2D.prototype.createInstanceDataParts = function () {
            return [new Sprite2DInstanceData(Sprite2D.SPRITE2D_MAINPARTID)];
        };
        Sprite2D.prototype.refreshInstanceDataPart = function (part) {
            if (!_super.prototype.refreshInstanceDataPart.call(this, part)) {
                return false;
            }
            if (part.id === Sprite2D.SPRITE2D_MAINPARTID) {
                var d = this._instanceDataParts[0];
                var ts = this.texture.getSize();
                var sl = this.spriteLocation;
                var ss = this.spriteSize;
                d.topLeftUV = new BABYLON.Vector2(sl.x / ts.width, sl.y / ts.height);
                var suv = new BABYLON.Vector2(ss.width / ts.width, ss.height / ts.height);
                d.sizeUV = suv;
                d.frame = this.spriteFrame;
                d.textureSize = new BABYLON.Vector2(ts.width, ts.height);
                d.invertY = this.invertY ? 1 : 0;
            }
            return true;
        };
        Sprite2D.SPRITE2D_MAINPARTID = 1;
        __decorate([
            BABYLON.modelLevelProperty(BABYLON.RenderablePrim2D.RENDERABLEPRIM2D_PROPCOUNT + 1, function (pi) { return Sprite2D.textureProperty = pi; })
        ], Sprite2D.prototype, "texture", null);
        __decorate([
            BABYLON.instanceLevelProperty(BABYLON.RenderablePrim2D.RENDERABLEPRIM2D_PROPCOUNT + 2, function (pi) { return Sprite2D.spriteSizeProperty = pi; }, false, true)
        ], Sprite2D.prototype, "spriteSize", null);
        __decorate([
            BABYLON.instanceLevelProperty(BABYLON.RenderablePrim2D.RENDERABLEPRIM2D_PROPCOUNT + 3, function (pi) { return Sprite2D.spriteLocationProperty = pi; })
        ], Sprite2D.prototype, "spriteLocation", null);
        __decorate([
            BABYLON.instanceLevelProperty(BABYLON.RenderablePrim2D.RENDERABLEPRIM2D_PROPCOUNT + 4, function (pi) { return Sprite2D.spriteFrameProperty = pi; })
        ], Sprite2D.prototype, "spriteFrame", null);
        __decorate([
            BABYLON.instanceLevelProperty(BABYLON.RenderablePrim2D.RENDERABLEPRIM2D_PROPCOUNT + 5, function (pi) { return Sprite2D.invertYProperty = pi; })
        ], Sprite2D.prototype, "invertY", null);
        Sprite2D = __decorate([
            BABYLON.className("Sprite2D")
        ], Sprite2D);
        return Sprite2D;
    })(BABYLON.RenderablePrim2D);
    BABYLON.Sprite2D = Sprite2D;
})(BABYLON || (BABYLON = {}));
