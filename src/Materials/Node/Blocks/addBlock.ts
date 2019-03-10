import { NodeMaterialBlock } from '../nodeMaterialBlock';
import { NodeMaterialBlockConnectionPointTypes } from '../nodeMaterialBlockConnectionPointTypes';
import { NodeMaterialBuildState } from '../nodeMaterialBuildState';
import { NodeMaterialConnectionPoint } from '../nodeMaterialBlockConnectionPoint';
/**
 * Block used to add 2 vector4
 */
export class AddBlock extends NodeMaterialBlock {
    /**
     * Creates a new AddBlock
     * @param name defines the block name
     */
    public constructor(name: string) {
        super(name);

        this.registerInput("left", NodeMaterialBlockConnectionPointTypes.Vector4OrColor4);
        this.registerInput("right", NodeMaterialBlockConnectionPointTypes.Vector4OrColor4);
        this.registerOutput("output", NodeMaterialBlockConnectionPointTypes.Vector4OrColor4);
    }

    /**
     * Gets the current class name
     * @returns the class name
     */
    public getClassName() {
        return "AddBlock";
    }

    /**
     * Gets the left operand input component
     */
    public get left(): NodeMaterialConnectionPoint {
        return this._inputs[0];
    }

    /**
     * Gets the right operand input component
     */
    public get right(): NodeMaterialConnectionPoint {
        return this._inputs[1];
    }    

    protected _buildBlock(state: NodeMaterialBuildState) {
        super._buildBlock(state);

        let output = this._outputs[0];

        state.compilationString += this._declareOutput(output, state) + ` = ${this.left.associatedVariableName} + ${this.right.associatedVariableName};\r\n`;

        return this;
    }
}