import { Material, Nullable, PBRMaterial, Color3 } from "babylonjs";
import { ITextureInfo, IMaterial } from "../glTFLoaderInterfaces";
import { IGLTFLoaderExtensionV2 } from "../glTFLoaderExtension";
import { GLTF2Loader } from "../glTF2Loader";

const NAME = "KHR_materials_pbrSpecularGlossiness";

interface IKHRMaterialsPbrSpecularGlossiness {
    diffuseFactor: number[];
    diffuseTexture: ITextureInfo;
    specularFactor: number[];
    glossinessFactor: number;
    specularGlossinessTexture: ITextureInfo;
}

/**
 * [Specification](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness)
 */
export class KHR_materials_pbrSpecularGlossiness implements IGLTFLoaderExtensionV2 {
    /** The name of this extension. */
    public readonly name = NAME;

    /** Defines whether this extension is enabled. */
    public enabled = true;

    private _loader: GLTF2Loader;

    /** @hidden */
    constructor(loader: GLTF2Loader) {
        this._loader = loader;
    }

    /** @hidden */
    public dispose() {
        delete this._loader;
    }

    /** @hidden */
    public loadMaterialPropertiesAsync(context: string, material: IMaterial, babylonMaterial: Material): Nullable<Promise<void>> {
        return GLTF2Loader.LoadExtensionAsync<IKHRMaterialsPbrSpecularGlossiness>(context, material, this.name, (extensionContext, extension) => {
            const promises = new Array<Promise<any>>();
            promises.push(this._loader.loadMaterialBasePropertiesAsync(context, material, babylonMaterial));
            promises.push(this._loadSpecularGlossinessPropertiesAsync(extensionContext, material, extension, babylonMaterial));
            this._loader.loadMaterialAlphaProperties(context, material, babylonMaterial);
            return Promise.all(promises).then(() => {});
        });
    }

    private _loadSpecularGlossinessPropertiesAsync(context: string, material: IMaterial, properties: IKHRMaterialsPbrSpecularGlossiness, babylonMaterial: Material): Promise<void> {
        if (!(babylonMaterial instanceof PBRMaterial)) {
            throw new Error(`${context}: Material type not supported`);
        }

        const promises = new Array<Promise<any>>();

        babylonMaterial.metallic = null;
        babylonMaterial.roughness = null;

        if (properties.diffuseFactor) {
            babylonMaterial.albedoColor = Color3.FromArray(properties.diffuseFactor);
            babylonMaterial.alpha = properties.diffuseFactor[3];
        }
        else {
            babylonMaterial.albedoColor = Color3.White();
        }

        babylonMaterial.reflectivityColor = properties.specularFactor ? Color3.FromArray(properties.specularFactor) : Color3.White();
        babylonMaterial.microSurface = properties.glossinessFactor == undefined ? 1 : properties.glossinessFactor;

        if (properties.diffuseTexture) {
            promises.push(this._loader.loadTextureInfoAsync(`${context}/diffuseTexture`, properties.diffuseTexture, (texture) => {
                babylonMaterial.albedoTexture = texture;
                return Promise.resolve();
            }));
        }

        if (properties.specularGlossinessTexture) {
            promises.push(this._loader.loadTextureInfoAsync(`${context}/specularGlossinessTexture`, properties.specularGlossinessTexture, (texture) => {
                babylonMaterial.reflectivityTexture = texture;
                return Promise.resolve();
            }));

            babylonMaterial.reflectivityTexture.hasAlpha = true;
            babylonMaterial.useMicroSurfaceFromReflectivityMapAlpha = true;
        }

        return Promise.all(promises).then(() => {});
    }
}

GLTF2Loader.RegisterExtension(NAME, (loader) => new KHR_materials_pbrSpecularGlossiness(loader));