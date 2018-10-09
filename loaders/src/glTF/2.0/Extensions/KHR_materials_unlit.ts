import { Material, Nullable, PBRMaterial, Color3 } from "babylonjs";
import { IMaterialV2 } from "../glTFLoaderInterfaces";
import { IGLTFLoaderExtensionV2 } from "../glTFLoaderExtension";
import { GLTFLoaderV2 } from "../glTFLoader";

const NAME = "KHR_materials_unlit";

/**
 * [Specification](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit)
 */
export class KHR_materials_unlit implements IGLTFLoaderExtensionV2 {
    /** The name of this extension. */
    public readonly name = NAME;

    /** Defines whether this extension is enabled. */
    public enabled = true;

    private _loader: GLTFLoaderV2;

    /** @hidden */
    constructor(loader: GLTFLoaderV2) {
        this._loader = loader;
    }

    /** @hidden */
    public dispose() {
        delete this._loader;
    }

    /** @hidden */
    public loadMaterialPropertiesAsync(context: string, material: IMaterialV2, babylonMaterial: Material): Nullable<Promise<void>> {
        return GLTFLoaderV2.LoadExtensionAsync(context, material, this.name, () => {
            return this._loadUnlitPropertiesAsync(context, material, babylonMaterial);
        });
    }

    private _loadUnlitPropertiesAsync(context: string, material: IMaterialV2, babylonMaterial: Material): Promise<void> {
        if (!(babylonMaterial instanceof PBRMaterial)) {
            throw new Error(`${context}: Material type not supported`);
        }

        const promises = new Array<Promise<any>>();

        babylonMaterial.unlit = true;

        const properties = material.pbrMetallicRoughness;
        if (properties) {
            if (properties.baseColorFactor) {
                babylonMaterial.albedoColor = Color3.FromArray(properties.baseColorFactor);
                babylonMaterial.alpha = properties.baseColorFactor[3];
            }
            else {
                babylonMaterial.albedoColor = Color3.White();
            }

            if (properties.baseColorTexture) {
                promises.push(this._loader.loadTextureInfoAsync(`${context}/baseColorTexture`, properties.baseColorTexture, (texture) => {
                    babylonMaterial.albedoTexture = texture;
                    return Promise.resolve();
                }));
            }
        }

        if (material.doubleSided) {
            babylonMaterial.backFaceCulling = false;
            babylonMaterial.twoSidedLighting = true;
        }

        this._loader.loadMaterialAlphaProperties(context, material, babylonMaterial);

        return Promise.all(promises).then(() => {});
    }
}

GLTFLoaderV2.RegisterExtension(NAME, (loader) => new KHR_materials_unlit(loader));