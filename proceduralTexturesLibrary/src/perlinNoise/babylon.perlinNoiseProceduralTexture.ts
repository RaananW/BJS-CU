/// <reference path="../../../dist/preview release/babylon.d.ts"/>

module BABYLON {
    export class PerlinNoiseProceduralTexture extends ProceduralTexture {
        @serialize()
        public time: number = 0.0;

        @serialize()
        public speed: number = 1.0;

        @serialize()
        public translationSpeed: number = 1.0;

        private _currentTranslation: number = 0;

        constructor(name: string, size: number, scene: Scene, fallbackTexture?: Texture, generateMipMaps?: boolean) {
            super(name, size, "perlinNoiseProceduralTexture", scene, fallbackTexture, generateMipMaps);
            this.updateShaderUniforms();
        }

        public updateShaderUniforms() {
            this.setFloat("size", this.getRenderSize());

            let scene = this.getScene();

            if (!scene) {
                return;
            }
            var deltaTime = scene.getEngine().getDeltaTime();

            this.time += deltaTime;
            this.setFloat("time", this.time * this.speed / 1000);

            this._currentTranslation += deltaTime * this.translationSpeed / 1000.0;
            this.setFloat("translationSpeed", this._currentTranslation);
        }

        public render(useCameraPostProcess?: boolean) {
            this.updateShaderUniforms();
            super.render(useCameraPostProcess);
        }

        public resize(size: any, generateMipMaps: any): void {
            super.resize(size, generateMipMaps);
        }

        /**
         * Serializes this perlin noise procedural texture
         * @returns a serialized perlin noise procedural texture object
         */
        public serialize(): any {
            var serializationObject = SerializationHelper.Serialize(this, super.serialize());
            serializationObject.customType = "BABYLON.PerlinNoiseProceduralTexture";

            return serializationObject;
        }

        /**
         * Creates a Perlin Noise Procedural Texture from parsed perlin noise procedural texture data
         * @param parsedTexture defines parsed texture data
         * @param scene defines the current scene
         * @param rootUrl defines the root URL containing perlin noise procedural texture information
         * @returns a parsed Perlin Noise Procedural Texture
         */
        public static Parse(parsedTexture: any, scene: Scene, rootUrl: string): PerlinNoiseProceduralTexture {
            var texture = SerializationHelper.Parse(() => new PerlinNoiseProceduralTexture(parsedTexture.name, parsedTexture._size, scene, undefined, parsedTexture._generateMipMaps), parsedTexture, scene, rootUrl);

            return texture;
        }
    }
}
