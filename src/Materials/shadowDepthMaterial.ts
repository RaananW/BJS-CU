import { Observer } from "../Misc/observable";
import { Nullable } from "../types";
import { Scene } from "../scene";
import { SubMesh } from "../Meshes/subMesh";
import { Material } from "../Materials/material";
import { _TypeStore } from "../Misc/typeStore";
import { Effect, IEffectCreationOptions } from './effect';
import { AbstractMesh } from '../Meshes/abstractMesh';
import { Node } from '../Node';

export class ShadowDepthMaterial {

    private _scene: Scene;
    private _baseMaterial: Material;
    private _onEffectCreatedObserver: Nullable<Observer<{ effect: Effect, subMesh: Nullable<SubMesh>}>>;
    private _subMeshToEffect: Map<Nullable<SubMesh>, { origEffect: Effect, depthEffect: Nullable<Effect>, depthDefines: string }>;
    private _meshes: Map<AbstractMesh, Nullable<Observer<Node>>>;

    constructor(baseMaterial: Material, scene: Scene) {
        this._scene = scene;
        this._baseMaterial = baseMaterial;
        this._subMeshToEffect = new Map();
        this._meshes = new Map();

        this._onEffectCreatedObserver = this._baseMaterial.onEffectCreatedObservable.add((params: { effect: Effect, subMesh: Nullable<SubMesh> }) => {
            const mesh = params.subMesh?.getMesh();

            if (mesh && !this._meshes.has(mesh)) {
                this._meshes.set(mesh,
                    mesh.onDisposeObservable.add((mesh: Node) => {
                        const iterator = this._subMeshToEffect.keys();
                        for (let key = iterator.next(); key.done !== true; key = iterator.next()) {
                            const subMesh = key.value;
                            if (subMesh?.getMesh() === mesh as AbstractMesh) {
                                this._subMeshToEffect.delete(subMesh);
                            }
                        }
                    })
                );
            }

            this._subMeshToEffect.set(params.subMesh, { origEffect: params.effect, depthEffect: null, depthDefines: "" });
        });
    }

    public getEffect(subMesh: Nullable<SubMesh>): Nullable<Effect> {
        return this._subMeshToEffect.get(subMesh)?.depthEffect ?? this._subMeshToEffect.get(null)?.depthEffect ?? null;
    }

    public isReadyForSubMesh(subMesh: SubMesh, defines: string[]): boolean {
        return this._makeEffect(subMesh, defines)?.isReady() ?? false;
    }

    public dispose(): void {
        this._baseMaterial.onEffectCreatedObservable.remove(this._onEffectCreatedObserver);
        this._onEffectCreatedObserver = null;

        const iterator = this._meshes.entries();
        for (let entry = iterator.next(); entry.done !== true; entry = iterator.next()) {
            const [mesh, observer] = entry.value;

            mesh.onDisposeObservable.remove(observer);
        }
    }

    private _makeEffect(subMesh: Nullable<SubMesh>, defines: string[]): Nullable<Effect> {
        const params = this._subMeshToEffect.get(subMesh) ?? this._subMeshToEffect.get(null);

        if (!params) {
            return null;
        }

        let join = defines.join("\n");

        if (params.depthEffect) {
            if (join === params.depthDefines) {
                // we already created the depth effect and it is still up to date
                return params.depthEffect;
            }
        }

        // the depth effect is either out of date or has not been created yet
        let vertexCode = params.origEffect.vertexSourceCode,
            fragmentCode = params.origEffect.fragmentSourceCode;

        vertexCode = vertexCode.replace(/void\s+?main/g, Effect.IncludesShadersStore["shadowMapVertexDeclaration"] + "\r\nvoid main");
        vertexCode = vertexCode.replace(/}\s*$/g, Effect.IncludesShadersStore["shadowMapVertexMetric"] + "\r\n}");
        vertexCode = vertexCode.replace(/#define SHADER_NAME.*?\n|out vec4 glFragColor;\n/g, "");

        fragmentCode = fragmentCode.replace(/void\s+?main/g, Effect.IncludesShadersStore["shadowMapFragmentDeclaration"] + "\r\nvoid main");
        fragmentCode = fragmentCode.replace(/}\s*$/g, Effect.IncludesShadersStore["shadowMapFragment"] + "\r\n}");
        fragmentCode = fragmentCode.replace(/#define SHADER_NAME.*?\n|out vec4 glFragColor;\n/g, "");

        const uniforms = params.origEffect.getUniformNames().slice();

        uniforms.push("biasAndScaleSM", "depthValuesSM", "lightDataSM");

        params.depthEffect = this._scene.getEngine().createEffect({
            vertexSource: vertexCode,
            fragmentSource: fragmentCode,
        }, <IEffectCreationOptions>{
            attributes: params.origEffect.getAttributesNames(),
            uniformsNames: uniforms,
            uniformBuffersNames: params.origEffect.getUniformBuffersNames(),
            samplers: params.origEffect.getSamplers(),
            defines: join,
            indexParameters: params.origEffect.getIndexParameters(),
        }, this._scene.getEngine());

        return params.depthEffect;
    }
}
