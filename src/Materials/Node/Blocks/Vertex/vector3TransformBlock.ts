import { NodeMaterialBlock } from '../../nodeMaterialBlock';
import { NodeMaterialBlockConnectionPointTypes } from '../../nodeMaterialBlockConnectionPointTypes';
import { NodeMaterialCompilationState } from '../../nodeMaterialCompilationState';

export class Vector3TransformBlock extends NodeMaterialBlock {
    /**
     * Defines the value to use to complement Vector3 to transform it to a Vector4
     */
    public complement = 1;

    public constructor(name: string) {
        super(name);

        this.registerEntryPoint("vector", NodeMaterialBlockConnectionPointTypes.Vector3);
        this.registerEntryPoint("transform", NodeMaterialBlockConnectionPointTypes.Matrix);
        this.registerExitPoint("output", NodeMaterialBlockConnectionPointTypes.Vector4);
    }

    public compile(state: NodeMaterialCompilationState) {
        super.compile(state);

        let output = this._exitPoints[0];
        let vector = this._entryPoints[0];
        let transform = this._entryPoints[1];

        state.compilationString += `vec4 ${output.associatedVariableName} = ${transform.associatedVariableName} * vec4(${vector.associatedVariableName}, ${this.complement});\r\n`;
    }
}