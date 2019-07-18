import { NodeMaterialBlock } from '../nodeMaterialBlock';
import { NodeMaterialBlockConnectionPointTypes } from '../nodeMaterialBlockConnectionPointTypes';
import { NodeMaterialBuildState } from '../nodeMaterialBuildState';
import { NodeMaterialConnectionPoint } from '../nodeMaterialBlockConnectionPoint';
import { NodeMaterialBlockTargets } from '../nodeMaterialBlockTargets';
import { _TypeStore } from '../../../Misc/typeStore';
/**
 * Block used to multiply 2 values
 */
export class MultiplyBlock extends NodeMaterialBlock {
    /**
     * Creates a new MultiplyBlock
     * @param name defines the block name
     */
    public constructor(name: string) {
        super(name, NodeMaterialBlockTargets.Neutral);

        this.registerInput("left", NodeMaterialBlockConnectionPointTypes.AutoDetect);
        this.registerInput("right", NodeMaterialBlockConnectionPointTypes.BasedOnInput);
        this.registerOutput("output", NodeMaterialBlockConnectionPointTypes.BasedOnInput);

        this._outputs[0]._typeConnectionSource = this._inputs[0];
        this._inputs[1]._typeConnectionSource = this._inputs[0];
    }

    /**
     * Gets the current class name
     * @returns the class name
     */
    public getClassName() {
        return "MultiplyBlock";
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

    /**
     * Gets the output component
     */
    public get output(): NodeMaterialConnectionPoint {
        return this._outputs[0];
    }

    protected _buildBlock(state: NodeMaterialBuildState) {
        super._buildBlock(state);

        let output = this._outputs[0];

        state.compilationString += this._declareOutput(output, state) + ` = ${this.left.associatedVariableName} * ${this.right.associatedVariableName};\r\n`;

        return this;
    }
}

_TypeStore.RegisteredTypes["BABYLON.MultiplyBlock"] = MultiplyBlock;