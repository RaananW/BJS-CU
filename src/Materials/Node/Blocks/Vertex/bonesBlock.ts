import { NodeMaterialBlock } from '../../nodeMaterialBlock';
import { NodeMaterialBlockConnectionPointTypes } from '../../nodeMaterialBlockConnectionPointTypes';
import { NodeMaterialBuildState } from '../../nodeMaterialBuildState';
import { NodeMaterialWellKnownValues } from '../../nodeMaterialWellKnownValues';
import { NodeMaterialBlockTargets } from '../../nodeMaterialBlockTargets';
import { AbstractMesh } from '../../../../Meshes/abstractMesh';
import { Mesh } from '../../../../Meshes/mesh';
import { Effect, EffectFallbacks } from '../../../effect';
import { MaterialHelper } from '../../../materialHelper';

/**
 * Block used to add support for vertex skinning (bones)
 */
export class BonesBlock extends NodeMaterialBlock {
    /**
     * Creates a new BonesBlock
     * @param name defines the block name
     */
    public constructor(name: string) {
        super(name, NodeMaterialBlockTargets.Vertex);

        this.registerInput("matricesIndices", NodeMaterialBlockConnectionPointTypes.Vector4);
        this.registerInput("matricesWeights", NodeMaterialBlockConnectionPointTypes.Vector4);
        this.registerInput("matricesIndicesExtra", NodeMaterialBlockConnectionPointTypes.Vector4);
        this.registerInput("matricesWeightsExtra", NodeMaterialBlockConnectionPointTypes.Vector4);
        this.registerInput("world", NodeMaterialBlockConnectionPointTypes.Matrix);

        this.registerOutput("output", NodeMaterialBlockConnectionPointTypes.Matrix);

        // Auto configuration
        this._inputs[0].setAsAttribute();
        this._inputs[1].setAsAttribute();
        this._inputs[2].setAsAttribute();
        this._inputs[3].setAsAttribute();
        this._inputs[4].setAsWellKnownValue(NodeMaterialWellKnownValues.World);
    }

    /**
     * Initialize the block and prepare the context for build
     * @param state defines the state that will be used for the build
     */
    public initialize(state: NodeMaterialBuildState) {
        state._excludeVariableName("boneSampler");
        state._excludeVariableName("boneTextureWidth");
        state._excludeVariableName("mBones");
        state._excludeVariableName("BonesPerMesh");
    }

    /**
     * Gets the current class name
     * @returns the class name
     */
    public getClassName() {
        return "BonesBlock";
    }

    public provideFallbacks(mesh: AbstractMesh, fallbacks: EffectFallbacks) {
        if (mesh && mesh.useBones && mesh.computeBonesUsingShaders && mesh.skeleton) {
            fallbacks.addCPUSkinningFallback(0, mesh);
        }
    }

    public bind(effect: Effect, mesh?: Mesh) {
        MaterialHelper.BindBonesParameters(mesh, effect);
    }

    protected _buildBlock(state: NodeMaterialBuildState) {
        super._buildBlock(state);

        // Register for compilation fallbacks
        state.sharedData.blocksWithFallbacks.push(this);

        // Register for binding
        state.sharedData.bindableBlocks.push(this);

        // Register internal uniforms and samplers
        state.uniforms.push("boneTextureWidth");
        state.uniforms.push("mBones");

        state.samplers.push("boneSampler");

        // Emit code
        state._emitFunctionFromInclude("BonesDeclaration", "bonesDeclaration", {
            removeAttributes: true,
            removeUniforms: false,
            removeVaryings: true,
            removeifDef: false
        });

        let influenceVariablename = state._getFreeVariableName("influence");

        state.compilationString += state._emitCodeFromInclude("bonesVertex", {
            replaceStrings: [
                {
                    search: /finalWorld=finalWorld\*influence;/,
                    replace: ""
                },
                {
                    search: /influence/gm,
                    replace: influenceVariablename
                }
            ]
        });

        let output = this._outputs[0];
        let worldInput = this._inputs[4];

        state.compilationString += this._declareOutput(output, state) + ` = ${worldInput.associatedVariableName} * ${influenceVariablename};`;
        return this;
    }
}