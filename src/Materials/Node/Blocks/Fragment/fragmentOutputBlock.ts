import { NodeMaterialBlock, NodeMaterialBlockTargets } from '../../nodeMaterialBlock';
import { NodeMaterialBlockConnectionPointTypes } from '../../nodeMaterialBlockConnectionPointTypes';
import { NodeMaterialCompilationState } from '../../nodeMaterialCompilationState';

/**
 * Block used to output the final color
 */
export class FragmentOutputBlock extends NodeMaterialBlock {
    /**
     * Create a new FragmentOutputBlock
     * @param name defines the block name
     */
    public constructor(name: string) {
        super(name, NodeMaterialBlockTargets.Fragment);

        this.registerInput("color", NodeMaterialBlockConnectionPointTypes.Color4);
    }

    /** @hidden */
    public get _canAddAtVertexRoot(): boolean {
        return false;
    }

    /** @hidden */
    public get _canAddAtFragmentRoot(): boolean {
        return false;
    }

    protected _buildBlock(state: NodeMaterialCompilationState) {
        super._buildBlock(state);

        let input = this._inputs[0];

        state.compilationString += `gl_FragColor = ${input.associatedVariableName};\r\n`;

        return this;
    }
}