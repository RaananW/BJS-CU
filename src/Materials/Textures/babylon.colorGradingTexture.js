var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    /**
     * This represents a color grading texture. This acts as a lookup table LUT, useful during post process
     * It can help converting any input color in a desired output one. This can then be used to create effects
     * from sepia, black and white to sixties or futuristic rendering...
     *
     * The only supported format is currently 3dl.
     * More information on LUT: https://en.wikipedia.org/wiki/3D_lookup_table/
     */
    var ColorGradingTexture = (function (_super) {
        __extends(ColorGradingTexture, _super);
        /**
         * Instantiates a ColorGradingTexture from the following parameters.
         *
         * @param url The location of the color gradind data (currently only supporting 3dl)
         * @param scene The scene the texture will be used in
         */
        function ColorGradingTexture(url, scene) {
            _super.call(this, scene);
            if (!url) {
                return;
            }
            this._textureMatrix = BABYLON.Matrix.Identity();
            this.name = url;
            this.url = url;
            this.hasAlpha = false;
            this.isCube = false;
            this.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
            this.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
            this._texture = this._getFromCache(url, true);
            if (!this._texture) {
                if (!scene.useDelayedTextureLoading) {
                    this.loadTexture();
                }
                else {
                    this.delayLoadState = BABYLON.Engine.DELAYLOADSTATE_NOTLOADED;
                }
            }
        }
        /**
         * Returns the texture matrix used in most of the material.
         * This is not used in color grading but keep for troubleshooting purpose (easily swap diffuse by colorgrading to look in).
         */
        ColorGradingTexture.prototype.getTextureMatrix = function () {
            return this._textureMatrix;
        };
        /**
         * Occurs when the file being loaded is a .3dl LUT file.
         */
        ColorGradingTexture.prototype.load3dlTexture = function () {
            var _this = this;
            var mipLevels = 0;
            var floatArrayView = null;
            var texture = this.getScene().getEngine().createRawTexture(null, 1, 1, BABYLON.Engine.TEXTUREFORMAT_RGB, false, false, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
            this._texture = texture;
            var callback = function (text) {
                var data;
                var tempData;
                var line;
                var lines = text.split('\n');
                var size = 0, pixelIndexW = 0, pixelIndexH = 0, pixelIndexSlice = 0;
                var maxColor = 0;
                for (var i = 0; i < lines.length; i++) {
                    line = lines[i];
                    if (!ColorGradingTexture._noneEmptyLineRegex.test(line))
                        continue;
                    if (line.indexOf('#') === 0)
                        continue;
                    var words = line.split(" ");
                    if (size === 0) {
                        // Number of space + one
                        size = words.length;
                        data = new Uint8Array(size * size * size * 3); // volume texture of side size and rgb 8
                        tempData = new Float32Array(size * size * size * 3);
                        continue;
                    }
                    if (size != 0) {
                        var r = Math.max(parseInt(words[0]), 0);
                        var g = Math.max(parseInt(words[1]), 0);
                        var b = Math.max(parseInt(words[2]), 0);
                        maxColor = Math.max(r, maxColor);
                        maxColor = Math.max(g, maxColor);
                        maxColor = Math.max(b, maxColor);
                        var pixelStorageIndex = (pixelIndexW + pixelIndexSlice * size + pixelIndexH * size * size) * 3;
                        tempData[pixelStorageIndex + 0] = r;
                        tempData[pixelStorageIndex + 1] = g;
                        tempData[pixelStorageIndex + 2] = b;
                        pixelIndexSlice++;
                        if (pixelIndexSlice % size == 0) {
                            pixelIndexH++;
                            pixelIndexSlice = 0;
                            if (pixelIndexH % size == 0) {
                                pixelIndexW++;
                                pixelIndexH = 0;
                            }
                        }
                    }
                }
                for (var i = 0; i < tempData.length; i++) {
                    var value = tempData[i];
                    data[i] = (value / maxColor * 255);
                }
                _this.getScene().getEngine().updateTextureSize(texture, size * size, size);
                _this.getScene().getEngine().updateRawTexture(texture, data, BABYLON.Engine.TEXTUREFORMAT_RGB, false);
            };
            BABYLON.Tools.LoadFile(this.url, callback);
            return this._texture;
        };
        /**
         * Starts the loading process of the texture.
         */
        ColorGradingTexture.prototype.loadTexture = function () {
            if (this.url && this.url.toLocaleLowerCase().indexOf(".3dl") == (this.url.length - 4)) {
                this.load3dlTexture();
            }
        };
        /**
         * Clones the color gradind texture.
         */
        ColorGradingTexture.prototype.clone = function () {
            var newTexture = new ColorGradingTexture(this.url, this.getScene());
            // Base texture
            newTexture.level = this.level;
            return newTexture;
        };
        /**
         * Called during delayed load for textures.
         */
        ColorGradingTexture.prototype.delayLoad = function () {
            if (this.delayLoadState !== BABYLON.Engine.DELAYLOADSTATE_NOTLOADED) {
                return;
            }
            this.delayLoadState = BABYLON.Engine.DELAYLOADSTATE_LOADED;
            this._texture = this._getFromCache(this.url, true);
            if (!this._texture) {
                this.loadTexture();
            }
        };
        /**
         * Parses a color grading texture serialized by Babylon.
         * @param parsedTexture The texture information being parsedTexture
         * @param scene The scene to load the texture in
         * @param rootUrl The root url of the data assets to load
         * @return A color gradind texture
         */
        ColorGradingTexture.Parse = function (parsedTexture, scene, rootUrl) {
            var texture = null;
            if (parsedTexture.name && !parsedTexture.isRenderTarget) {
                texture = new BABYLON.ColorGradingTexture(parsedTexture.name, scene);
                texture.name = parsedTexture.name;
                texture.level = parsedTexture.level;
            }
            return texture;
        };
        /**
         * Serializes the LUT texture to json format.
         */
        ColorGradingTexture.prototype.serialize = function () {
            if (!this.name) {
                return null;
            }
            var serializationObject = {};
            serializationObject.name = this.name;
            serializationObject.level = this.level;
            return serializationObject;
        };
        /**
         * Empty line regex stored for GC.
         */
        ColorGradingTexture._noneEmptyLineRegex = /\S+/;
        return ColorGradingTexture;
    }(BABYLON.BaseTexture));
    BABYLON.ColorGradingTexture = ColorGradingTexture;
})(BABYLON || (BABYLON = {}));
