var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var Prim2DClassInfo = (function () {
        function Prim2DClassInfo() {
        }
        return Prim2DClassInfo;
    })();
    BABYLON.Prim2DClassInfo = Prim2DClassInfo;
    var Prim2DPropInfo = (function () {
        function Prim2DPropInfo() {
        }
        Prim2DPropInfo.PROPKIND_MODEL = 1;
        Prim2DPropInfo.PROPKIND_INSTANCE = 2;
        Prim2DPropInfo.PROPKIND_DYNAMIC = 3;
        return Prim2DPropInfo;
    })();
    BABYLON.Prim2DPropInfo = Prim2DPropInfo;
    var PropertyChangedInfo = (function () {
        function PropertyChangedInfo() {
        }
        return PropertyChangedInfo;
    })();
    BABYLON.PropertyChangedInfo = PropertyChangedInfo;
    var ClassTreeInfo = (function () {
        function ClassTreeInfo(baseClass, type, classContentFactory) {
            this._baseClass = baseClass;
            this._type = type;
            this._subClasses = new Array();
            this._levelContent = new BABYLON.StringDictionary();
            this._classContentFactory = classContentFactory;
        }
        Object.defineProperty(ClassTreeInfo.prototype, "classContent", {
            get: function () {
                if (!this._classContent) {
                    this._classContent = this._classContentFactory(this._baseClass ? this._baseClass.classContent : null);
                }
                return this._classContent;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ClassTreeInfo.prototype, "type", {
            get: function () {
                return this._type;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ClassTreeInfo.prototype, "levelContent", {
            get: function () {
                return this._levelContent;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ClassTreeInfo.prototype, "fullContent", {
            get: function () {
                if (!this._fullContent) {
                    var dic = new BABYLON.StringDictionary();
                    var curLevel = this;
                    while (curLevel) {
                        curLevel.levelContent.forEach(function (k, v) { return dic.add(k, v); });
                        curLevel = curLevel._baseClass;
                    }
                    this._fullContent = dic;
                }
                return this._fullContent;
            },
            enumerable: true,
            configurable: true
        });
        ClassTreeInfo.prototype.getLevelOf = function (type) {
            // Are we already there?
            if (type === this._type) {
                return this;
            }
            var baseProto = Object.getPrototypeOf(type);
            var curProtoContent = this.getOrAddType(Object.getPrototypeOf(baseProto), baseProto);
            if (!curProtoContent) {
                this.getLevelOf(baseProto);
            }
            return this.getOrAddType(baseProto, type);
        };
        ClassTreeInfo.prototype.getOrAddType = function (baseType, type) {
            // Are we at the level corresponding to the baseType?
            // If so, get or add the level we're looking for
            if (baseType === this._type) {
                for (var _i = 0, _a = this._subClasses; _i < _a.length; _i++) {
                    var subType = _a[_i];
                    if (subType.type === type) {
                        return subType.node;
                    }
                }
                var node = new ClassTreeInfo(this, type, this._classContentFactory);
                var info = { type: type, node: node };
                this._subClasses.push(info);
                return info.node;
            }
            // Recurse down to keep looking for the node corresponding to the baseTypeName
            for (var _b = 0, _c = this._subClasses; _b < _c.length; _b++) {
                var subType = _c[_b];
                var info = subType.node.getOrAddType(baseType, type);
                if (info) {
                    return info;
                }
            }
            return null;
        };
        ClassTreeInfo.get = function (type) {
            var dic = type["__classTreeInfo"];
            if (!dic) {
                return null;
            }
            return dic.getLevelOf(type);
        };
        ClassTreeInfo.getOrRegister = function (type, classContentFactory) {
            var dic = type["__classTreeInfo"];
            if (!dic) {
                dic = new ClassTreeInfo(null, type, classContentFactory);
                type["__classTreeInfo"] = dic;
            }
            return dic;
        };
        return ClassTreeInfo;
    })();
    BABYLON.ClassTreeInfo = ClassTreeInfo;
    var SmartPropertyPrim = (function () {
        function SmartPropertyPrim() {
        }
        SmartPropertyPrim.prototype.setupSmartPropertyPrim = function () {
            this._modelKey = null;
            this._modelDirty = false;
            this._levelBoundingInfoDirty = false;
            this._instanceDirtyFlags = 0;
            this._isDisposed = false;
            this._levelBoundingInfo = new BABYLON.BoundingInfo2D();
        };
        Object.defineProperty(SmartPropertyPrim.prototype, "isDisposed", {
            get: function () {
                return this._isDisposed;
            },
            enumerable: true,
            configurable: true
        });
        SmartPropertyPrim.prototype.dispose = function () {
            if (this.isDisposed) {
                return false;
            }
            this._isDisposed = true;
            return true;
        };
        Object.defineProperty(SmartPropertyPrim.prototype, "modelKey", {
            get: function () {
                var _this = this;
                // No need to compute it?
                if (!this._modelDirty && this._modelKey) {
                    return this._modelKey;
                }
                var modelKey = "Class:" + BABYLON.Tools.getClassName(this) + ";";
                var propDic = this.propDic;
                propDic.forEach(function (k, v) {
                    if (v.kind === Prim2DPropInfo.PROPKIND_MODEL) {
                        var propVal = _this[v.name];
                        modelKey += v.name + ":" + ((propVal != null) ? ((v.typeLevelCompare) ? BABYLON.Tools.getClassName(propVal) : propVal.toString()) : "[null]") + ";";
                    }
                });
                this._modelDirty = false;
                this._modelKey = modelKey;
                return modelKey;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SmartPropertyPrim.prototype, "isDirty", {
            get: function () {
                return (this._instanceDirtyFlags !== 0) || this._modelDirty;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SmartPropertyPrim.prototype, "propDic", {
            get: function () {
                if (!this._propInfo) {
                    var cti = ClassTreeInfo.get(Object.getPrototypeOf(this));
                    if (!cti) {
                        throw new Error("Can't access the propDic member in class definition, is this class SmartPropertyPrim based?");
                    }
                    this._propInfo = cti.fullContent;
                }
                return this._propInfo;
            },
            enumerable: true,
            configurable: true
        });
        SmartPropertyPrim._createPropInfo = function (target, propName, propId, dirtyBoundingInfo, typeLevelCompare, kind) {
            var dic = ClassTreeInfo.getOrRegister(target, function () { return new Prim2DClassInfo(); });
            var node = dic.getLevelOf(target);
            var propInfo = node.levelContent.get(propId.toString());
            if (propInfo) {
                throw new Error("The ID " + propId + " is already taken by another property declaration named: " + propInfo.name);
            }
            // Create, setup and add the PropInfo object to our prop dictionary
            propInfo = new Prim2DPropInfo();
            propInfo.id = propId;
            propInfo.flagId = Math.pow(2, propId);
            propInfo.kind = kind;
            propInfo.name = propName;
            propInfo.dirtyBoundingInfo = dirtyBoundingInfo;
            propInfo.typeLevelCompare = typeLevelCompare;
            node.levelContent.add(propId.toString(), propInfo);
            return propInfo;
        };
        SmartPropertyPrim._checkUnchanged = function (curValue, newValue) {
            // Nothing to nothing: nothing to do!
            if ((curValue === null && newValue === null) || (curValue === undefined && newValue === undefined)) {
                return true;
            }
            // Check value unchanged
            if ((curValue != null) && (newValue != null)) {
                if (typeof (curValue.equals) == "function") {
                    if (curValue.equals(newValue)) {
                        return true;
                    }
                }
                else {
                    if (curValue === newValue) {
                        return true;
                    }
                }
            }
            return false;
        };
        SmartPropertyPrim.prototype._handlePropChanged = function (curValue, newValue, propName, propInfo, typeLevelCompare) {
            // Trigger property changed
            var info = SmartPropertyPrim.propChangedInfo;
            info.oldValue = curValue;
            info.newValue = newValue;
            info.propertyName = propName;
            var propMask = propInfo.flagId;
            this.propertyChanged.notifyObservers(info, propMask);
            // If the property belong to a group, check if it's a cached one, and dirty its render sprite accordingly
            if (this instanceof BABYLON.Group2D) {
                this.handleGroupChanged(propInfo);
            }
            // Check if we need to dirty only if the type change and make the test
            var skipDirty = false;
            if (typeLevelCompare && curValue != null && newValue != null) {
                var cvProto = curValue.__proto__;
                var nvProto = newValue.__proto__;
                skipDirty = (cvProto === nvProto);
            }
            // Set the dirty flags
            if (!skipDirty) {
                if (propInfo.kind === Prim2DPropInfo.PROPKIND_MODEL) {
                    if (!this.isDirty) {
                        this.onPrimBecomesDirty();
                    }
                    this._modelDirty = true;
                }
                else if ((propInfo.kind === Prim2DPropInfo.PROPKIND_INSTANCE) || (propInfo.kind === Prim2DPropInfo.PROPKIND_DYNAMIC)) {
                    if (!this.isDirty) {
                        this.onPrimBecomesDirty();
                    }
                    this._instanceDirtyFlags |= propMask;
                }
            }
        };
        SmartPropertyPrim.prototype.handleGroupChanged = function (prop) {
        };
        SmartPropertyPrim.prototype.checkPropertiesDirty = function (flags) {
            return (this._instanceDirtyFlags & flags) !== 0;
        };
        SmartPropertyPrim.prototype.clearPropertiesDirty = function (flags) {
            this._instanceDirtyFlags &= ~flags;
            return this._instanceDirtyFlags;
        };
        Object.defineProperty(SmartPropertyPrim.prototype, "levelBoundingInfo", {
            get: function () {
                if (this._levelBoundingInfoDirty) {
                    this.updateLevelBoundingInfo();
                    this._levelBoundingInfoDirty = false;
                }
                return this._levelBoundingInfo;
            },
            enumerable: true,
            configurable: true
        });
        SmartPropertyPrim.prototype.updateLevelBoundingInfo = function () {
        };
        SmartPropertyPrim.prototype.onPrimBecomesDirty = function () {
        };
        SmartPropertyPrim._hookProperty = function (propId, piStore, typeLevelCompare, dirtyBoundingInfo, kind) {
            return function (target, propName, descriptor) {
                var propInfo = SmartPropertyPrim._createPropInfo(target, propName, propId, dirtyBoundingInfo, typeLevelCompare, kind);
                if (piStore) {
                    piStore(propInfo);
                }
                var getter = descriptor.get, setter = descriptor.set;
                // Overload the property setter implementation to add our own logic
                descriptor.set = function (val) {
                    // check for disposed first, do nothing
                    if (this.isDisposed) {
                        return;
                    }
                    var curVal = getter.call(this);
                    if (SmartPropertyPrim._checkUnchanged(curVal, val)) {
                        return;
                    }
                    // Cast the object we're working one
                    var prim = this;
                    // Change the value
                    setter.call(this, val);
                    // If the property change also dirty the boundingInfo, update the boundingInfo dirty flags
                    if (propInfo.dirtyBoundingInfo) {
                        prim._levelBoundingInfoDirty = true;
                        // Escalate the dirty flag in the instance hierarchy, stop when a renderable group is found or at the end
                        if (prim instanceof BABYLON.Prim2DBase) {
                            var curprim = prim.parent;
                            while (curprim) {
                                curprim._boundingInfoDirty = true;
                                if (curprim instanceof BABYLON.Group2D) {
                                    if (curprim.isRenderableGroup) {
                                        break;
                                    }
                                }
                                curprim = curprim.parent;
                            }
                        }
                    }
                    // Notify change, dirty flags update
                    prim._handlePropChanged(curVal, val, propName, propInfo, typeLevelCompare);
                };
            };
        };
        SmartPropertyPrim.propChangedInfo = new PropertyChangedInfo();
        SmartPropertyPrim = __decorate([
            BABYLON.className("SmartPropertyPrim")
        ], SmartPropertyPrim);
        return SmartPropertyPrim;
    })();
    BABYLON.SmartPropertyPrim = SmartPropertyPrim;
    function modelLevelProperty(propId, piStore, typeLevelCompare, dirtyBoundingInfo) {
        if (typeLevelCompare === void 0) { typeLevelCompare = false; }
        if (dirtyBoundingInfo === void 0) { dirtyBoundingInfo = false; }
        return SmartPropertyPrim._hookProperty(propId, piStore, typeLevelCompare, dirtyBoundingInfo, Prim2DPropInfo.PROPKIND_MODEL);
    }
    BABYLON.modelLevelProperty = modelLevelProperty;
    function instanceLevelProperty(propId, piStore, typeLevelCompare, dirtyBoundingInfo) {
        if (typeLevelCompare === void 0) { typeLevelCompare = false; }
        if (dirtyBoundingInfo === void 0) { dirtyBoundingInfo = false; }
        return SmartPropertyPrim._hookProperty(propId, piStore, typeLevelCompare, dirtyBoundingInfo, Prim2DPropInfo.PROPKIND_INSTANCE);
    }
    BABYLON.instanceLevelProperty = instanceLevelProperty;
    function dynamicLevelProperty(propId, piStore, typeLevelCompare, dirtyBoundingInfo) {
        if (typeLevelCompare === void 0) { typeLevelCompare = false; }
        if (dirtyBoundingInfo === void 0) { dirtyBoundingInfo = false; }
        return SmartPropertyPrim._hookProperty(propId, piStore, typeLevelCompare, dirtyBoundingInfo, Prim2DPropInfo.PROPKIND_DYNAMIC);
    }
    BABYLON.dynamicLevelProperty = dynamicLevelProperty;
})(BABYLON || (BABYLON = {}));
