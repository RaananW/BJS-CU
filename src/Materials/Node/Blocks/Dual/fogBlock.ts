import { NodeMaterialBlock } from '../../nodeMaterialBlock';
import { NodeMaterialBlockConnectionPointTypes } from '../../nodeMaterialBlockConnectionPointTypes';
import { NodeMaterialBuildState } from '../../nodeMaterialBuildState';
import { NodeMaterialWellKnownValues } from '../../nodeMaterialWellKnownValues';
import { NodeMaterialBlockTargets } from '../../nodeMaterialBlockTargets';
import { Mesh } from '../../../../Meshes/mesh';
import { Effect } from '../../../effect';
import { NodeMaterialConnectionPoint } from '../../nodeMaterialBlockConnectionPoint';
import { AbstractMesh } from '../../../../Meshes/abstractMesh';
import { MaterialHelper } from '../../../materialHelper';
import { NodeMaterial, NodeMaterialDefines } from '../../nodeMaterial';

/**
 * Block used to add support for scene fog
 */
export class FogBlock extends NodeMaterialBlock {
    /**
     * Create a new FogBlock
     * @param name defines the block name
     */
    public constructor(name: string) {
        super(name, NodeMaterialBlockTargets.VertexAndFragment, true);

        // Vertex
        this.registerInput("worldPosition", NodeMaterialBlockConnectionPointTypes.Vector4, false, NodeMaterialBlockTargets.Vertex);
        this.registerInput("view", NodeMaterialBlockConnectionPointTypes.Matrix, false, NodeMaterialBlockTargets.Vertex);

        this.registerOutput("vFogDistance", NodeMaterialBlockConnectionPointTypes.Vector3, NodeMaterialBlockTargets.Vertex);

        // Fragment
        this.registerInput("color", NodeMaterialBlockConnectionPointTypes.Color3OrColor4, false, NodeMaterialBlockTargets.Fragment);
        this.registerInput("fogColor", NodeMaterialBlockConnectionPointTypes.Color3, false, NodeMaterialBlockTargets.Fragment);
        this.registerInput("fogParameters", NodeMaterialBlockConnectionPointTypes.Vector4, false, NodeMaterialBlockTargets.Fragment);

        this.registerOutput("output", NodeMaterialBlockConnectionPointTypes.Color3, NodeMaterialBlockTargets.Fragment);
    }

    /**
     * Gets the current class name
     * @returns the class name
     */
    public getClassName() {
        return "FogBlock";
    }

    /**
     * Gets the world position input component
     */
    public get worldPosition(): NodeMaterialConnectionPoint {
        return this._inputs[0];
    }

    /**
     * Gets the view input component
     */
    public get view(): NodeMaterialConnectionPoint {
        return this._inputs[1];
    }

    /**
     * Gets the color input component
     */
    public get color(): NodeMaterialConnectionPoint {
        return this._inputs[2];
    }

    /**
     * Gets the fog color input component
     */
    public get fogColor(): NodeMaterialConnectionPoint {
        return this._inputs[3];
    }

    /**
     * Gets the for parameter input component
     */
    public get fogParameters(): NodeMaterialConnectionPoint {
        return this._inputs[4];
    }

    /**
     * Gets the output component
     */
    public get output(): NodeMaterialConnectionPoint {
        return this._outputs[0];
    }

    public autoConfigure() {
        if (this.view.isUndefined) {
            this.view.setAsWellKnownValue(NodeMaterialWellKnownValues.View);
        }
        if (this.fogColor.isUndefined) {
            this.fogColor.setAsWellKnownValue(NodeMaterialWellKnownValues.Automatic);
        }
        if (this.fogParameters.isUndefined) {
            this.fogParameters.setAsWellKnownValue(NodeMaterialWellKnownValues.Automatic);
        }
        this._outputs[0].isVarying = true;
    }

    public prepareDefines(mesh: AbstractMesh, nodeMaterial: NodeMaterial, defines: NodeMaterialDefines) {
        let scene = mesh.getScene();
        defines.setValue("FOG", nodeMaterial.fogEnabled && MaterialHelper.GetFogState(mesh, scene));
    }

    public bind(effect: Effect, nodeMaterial: NodeMaterial, mesh?: Mesh) {
        if (!mesh) {
            return;
        }

        const scene = mesh.getScene();
        effect.setColor3("fogColor", scene.fogColor);
        effect.setFloat4("fogParameters", scene.fogMode, scene.fogStart, scene.fogEnd, scene.fogDensity);
    }

    protected _buildBlock(state: NodeMaterialBuildState) {
        super._buildBlock(state);

        state.sharedData.blocksWithDefines.push(this);

        if (state.target === NodeMaterialBlockTargets.Fragment) {
            state._emitFunctionFromInclude("fogFragmentDeclaration", `//${this.name}`, {
                removeUniforms: true,
                removeVaryings: true,
                removeIfDef: false,
                replaceStrings: [{ search: /float CalcFogFactor\(\)/, replace: "float CalcFogFactor(vec3 vFogDistance, vec4 vFogInfos)" }]
            });

            let tempFogVariablename = state._getFreeVariableName("fog");
            let color = this.color;
            let fogColor = this.fogColor;
            let fogParameters = this.fogParameters;
            let output = this._outputs[1];
            let vFogDistance = this._outputs[0];

            state.compilationString += `#ifdef FOG\r\n`;
            state.compilationString += `float ${tempFogVariablename} = CalcFogFactor(${vFogDistance.associatedVariableName}, ${fogParameters.associatedVariableName});\r\n`;
            state.compilationString += this._declareOutput(output, state) + ` = ${tempFogVariablename} * ${color.associatedVariableName}.rgb + (1.0 - ${tempFogVariablename}) * ${fogColor.associatedVariableName};\r\n`;
            state.compilationString += `#else\r\n${this._declareOutput(output, state)} =  ${color.associatedVariableName}.rgb;\r\n`;
            state.compilationString += `#endif\r\n`;
        } else {
            let worldPos = this.worldPosition;
            let view = this.view;
            let vFogDistance = this._outputs[0];
            state.compilationString += this._declareOutput(vFogDistance, state) + ` = (${view.associatedVariableName} * ${worldPos.associatedVariableName}).xyz;\r\n`;
        }

        return this;
    }
}