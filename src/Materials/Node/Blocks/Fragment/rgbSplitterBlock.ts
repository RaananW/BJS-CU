import { NodeMaterialBlock, NodeMaterialBlockTargets } from '../../nodeMaterialBlock';
import { NodeMaterialBlockConnectionPointTypes } from '../../nodeMaterialBlockConnectionPointTypes';
import { NodeMaterialCompilationState } from '../../nodeMaterialCompilationState';

/**
 * Block used to expand a Color3 or a Vector3 into 3 outputs (one for each component)
 */
export class RGBSplitterBlock extends NodeMaterialBlock {

    /**
     * Create a new RGBSplitterBlock
     * @param name defines the block name
     */
    public constructor(name: string) {
        super(name, NodeMaterialBlockTargets.Fragment);

        this.registerInput("input", NodeMaterialBlockConnectionPointTypes.Vector3OrColor3);
        this.registerOutput("r", NodeMaterialBlockConnectionPointTypes.Float);
        this.registerOutput("g", NodeMaterialBlockConnectionPointTypes.Float);
        this.registerOutput("b", NodeMaterialBlockConnectionPointTypes.Float);
    }

    protected _buildBlock(state: NodeMaterialCompilationState) {
        super._buildBlock(state);

        let input = this._inputs[0];
        let rOutput = this._outputs[0];
        let gOutput = this._outputs[1];
        let bOutput = this._outputs[2];

        if (rOutput.connectedBlocks.length > 0) {
            state.compilationString += this._declareOutput(rOutput, state) + ` = ${input.associatedVariableName}.r;\r\n`;
        }
        if (gOutput.connectedBlocks.length > 0) {
            state.compilationString += this._declareOutput(gOutput, state) + ` = ${input.associatedVariableName}.g;\r\n`;
        }
        if (bOutput.connectedBlocks.length > 0) {
            state.compilationString += this._declareOutput(bOutput, state) + ` = ${input.associatedVariableName}.b;\r\n`;
        }
        return this;
    }
}