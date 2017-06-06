﻿module BABYLON {
    /**
     * The PBR material of BJS following the specular glossiness convention.
     * 
     * This fits to the define PBR convention in the GLTF definition: 
     * https://github.com/KhronosGroup/glTF/tree/2.0/extensions/Khronos/KHR_materials_pbrSpecularGlossiness
     */
    export class PBRSpecularGlossinessMaterial extends Internals.PBRBaseSimpleMaterial {

        /**
         * Specifies the diffuse Color of the material.
         */
        @serializeAsColor3()
        @expandToProperty(null, "_albedoColor")
        public diffuseColor: Color3;
        
        /**
         * Specifies the diffuse texture of the material. This can aslo contains the opcity value in its alpha
         * channel.
         */
        @serializeAsTexture()
        @expandToProperty(null, "_albedoTexture")
        public diffuseTexture: BaseTexture;

        /**
         * Specifies the specular color of the material. This indicates how reflective is the material (none to mirror).
         */
        @serializeAsColor3()
        @expandToProperty(null, "_reflectivityColor")
        public specularColor: Color3;

        /**
         * Specifies the glossiness of the material. This indicates "how sharp is the reflection".
         */
        @serialize()
        @expandToProperty(null, "_microSurface")
        public glossiness: number;
        
        /**
         * Spectifies both the specular color RGB and the glossiness A of the material per pixels.
         */
        @serializeAsTexture()
        @expandToProperty(null, "_reflectivityTexture")
        public specularGlossinessTexture: BaseTexture;

        /**
         * Instantiates a new PBRSpecularGlossinessMaterial instance.
         * 
         * @param name The material name
         * @param scene The scene the material will be use in.
         */
        constructor(name: string, scene: Scene) {
            super(name, scene);
            this._useMicroSurfaceFromReflectivityMapAlpha = true;
        }

        /**
         * Return the currrent class name of the material.
         */
        public getClassName(): string {
            return "PBRSpecularGlossinessMaterial";
        }

        /**
         * Serialize the material to a parsable JSON object.
         */
        public serialize(): any {
            var serializationObject = SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.PBRSpecularGlossinessMaterial";
            return serializationObject;
        }

        /**
         * Parses a JSON object correponding to the serialize function.
         */
        public static Parse(source: any, scene: Scene, rootUrl: string): PBRSpecularGlossinessMaterial {
            return SerializationHelper.Parse(() => new PBRSpecularGlossinessMaterial(source.name, scene), source, scene, rootUrl);
        }
    }
}