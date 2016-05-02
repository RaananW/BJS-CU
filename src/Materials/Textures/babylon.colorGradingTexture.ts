module BABYLON {

    /**
     * This represents a color grading texture. This acts as a lookup table LUT, useful during post process
     * It can help converting any input color in a desired output one. This can then be used to create effects
     * from sepia, black and white to sixties or futuristic rendering...
     * 
     * The only supported format is currently 3dl.
     * More information on LUT: https://en.wikipedia.org/wiki/3D_lookup_table/
     */
    export class ColorGradingTexture extends BaseTexture {

        /**
         * The current internal texture size.
         */        
        private _size: number;
        
        /**
         * The current texture matrix. (will always be identity in color grading texture)
         */
        private _textureMatrix: Matrix;
        
        /**
         * The texture URL.
         */
        public url: string;

        /**
         * Empty line regex stored for GC.
         */
        private static _noneEmptyLineRegex = /\S+/;
        
        /**
         * Instantiates a ColorGradingTexture from the following parameters.
         * 
         * @param url The location of the color gradind data (currently only supporting 3dl)
         * @param scene The scene the texture will be used in
         */
        constructor(url: string, scene: Scene) {
            super(scene);

            if (!url) {
                return;
            }

            this._textureMatrix = Matrix.Identity();
            this.name = url;
            this.url = url;
            this.hasAlpha = false;
            this.isCube = false;
            
            this._texture = this._getFromCache(url, true);

            if (!this._texture) {
                if (!scene.useDelayedTextureLoading) {
                    this.loadTexture();
                } else {
                    this.delayLoadState = Engine.DELAYLOADSTATE_NOTLOADED;
                }
            }
        }

        /**
         * Returns the texture matrix used in most of the material.
         * This is not used in color grading but keep for troubleshooting purpose (easily swap diffuse by colorgrading to look in).
         */
        public getTextureMatrix(): Matrix {
            return this._textureMatrix;
        }
        
        /**
         * Occurs when the file being loaded is a .3dl LUT file.
         */
        private load3dlTexture() {

            var mipLevels = 0;
            var floatArrayView: Float32Array = null;
            var texture = this.getScene().getEngine().createRawTexture(null, 1, 1, BABYLON.Engine.TEXTUREFORMAT_RGB, false, false, Texture.NEAREST_SAMPLINGMODE);
            this._texture = texture;
            
            var callback = (text: string) => {
                var buffer: ArrayBuffer;
                var data: Uint8Array;
                
                var line: string;
                var lines = text.split('\n');
                var size = 0, pixelIndex = 0;
                
                for (let i = 0; i < lines.length; i++) {
                    line = lines[i];
                    
                    if (!ColorGradingTexture._noneEmptyLineRegex.test(line))
                        continue;
                        
                    if (line.indexOf('#') === 0)
                        continue;
                    
                    var words = line.split(" ");
                    if (size === 0) {
                        // Number of space + one
                        size = words.length;
                        buffer = new ArrayBuffer(size * size * size * 3); // volume texture of side size and rgb 8
                        data = new Uint8Array(buffer);
                        continue;
                    }
                    
                    if (size != 0)
                    {
                        var r = parseInt(words[0]);
                        var g = parseInt(words[1]);
                        var b = parseInt(words[2]);
                        
                        r = Math.round(Math.max(Math.min(255, r), 0));
                        g = Math.round(Math.max(Math.min(255, g), 0));
                        b = Math.round(Math.max(Math.min(255, b), 0));

                        // Transpose ordering from RGB to BGR (naming here might also be transposed).
                        var indexR = pixelIndex % size;
                        var indexG = (pixelIndex / size) % size;
                        var indexB = (pixelIndex / size) / size;

                        var pixelStorageIndex = indexR * (size * size * 3) + indexG * size * 3 + indexB * 3;
                        data[pixelStorageIndex + 0] = r;//255;//r;
                        data[pixelStorageIndex + 1] = g;//0;//g;
                        data[pixelStorageIndex + 2] = b;//255;//b;

                        pixelIndex++;
                    }
                }
                
                this.getScene().getEngine().updateRawTexture(texture, data, BABYLON.Engine.TEXTUREFORMAT_RGB, false);
                this.getScene().getEngine().updateTextureSize(texture, size * size, size);
            }

            Tools.LoadFile(this.url, callback);
            return this._texture;
        }

        /**
         * Starts the loading process of the texture.
         */
        private loadTexture() {
            if (this.url && this.url.toLocaleLowerCase().indexOf(".3dl") == (this.url.length - 4)) {
                this.load3dlTexture();
            }
        }

        /**
         * Clones the color gradind texture.
         */
        public clone(): ColorGradingTexture {
            var newTexture = new ColorGradingTexture(this.url, this.getScene());

            // Base texture
            newTexture.level = this.level;

            return newTexture;
        }

        /**
         * Called during delayed load for textures.
         */
        public delayLoad(): void {
            if (this.delayLoadState !== Engine.DELAYLOADSTATE_NOTLOADED) {
                return;
            }

            this.delayLoadState = Engine.DELAYLOADSTATE_LOADED;
            this._texture = this._getFromCache(this.url, true);

            if (!this._texture) {
                this.loadTexture();
            }
        }

        /**
         * Parses a color grading texture serialized by Babylon.
         * @param parsedTexture The texture information being parsedTexture
         * @param scene The scene to load the texture in
         * @param rootUrl The root url of the data assets to load
         * @return A color gradind texture
         */
        public static Parse(parsedTexture: any, scene: Scene, rootUrl: string): ColorGradingTexture {
            var texture = null;
            if (parsedTexture.name && !parsedTexture.isRenderTarget) {
                texture = new BABYLON.ColorGradingTexture(parsedTexture.name, scene);
                texture.name = parsedTexture.name;
                texture.level = parsedTexture.level;
            }
            return texture;
        }
        
        /**
         * Serializes the LUT texture to json format.
         */
        public serialize(): any {
            if (!this.name) {
                return null;
            }

            var serializationObject: any = {};
            serializationObject.name = this.name;
            serializationObject.level = this.level;

            return serializationObject;
        }
    }
}
