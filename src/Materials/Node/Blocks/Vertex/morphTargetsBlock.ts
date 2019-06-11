import { NodeMaterialBlock } from '../../nodeMaterialBlock';
import { NodeMaterialBlockConnectionPointTypes } from '../../nodeMaterialBlockConnectionPointTypes';
import { NodeMaterialBuildState } from '../../nodeMaterialBuildState';
import { NodeMaterialBlockTargets } from '../../nodeMaterialBlockTargets';
import { NodeMaterialConnectionPoint } from '../../nodeMaterialBlockConnectionPoint';
import { AbstractMesh } from '../../../../Meshes/abstractMesh';
import { NodeMaterial, NodeMaterialDefines } from '../../nodeMaterial';
import { Effect } from '../../../effect';
import { Mesh } from '../../../../Meshes/mesh';
import { MaterialHelper } from '../../../materialHelper';
import { VertexBuffer } from '../../../../Meshes/buffer';

/**
 * Block used to add morph targets support to vertex shader
 */
export class MorphTargetsBlock extends NodeMaterialBlock {
    private _repeatableContentAnchor: string;
    private _repeatebleContentGenerated = 0;

    /**
     * Create a new MorphTargetsBlock
     * @param name defines the block name
     */
    public constructor(name: string) {
        super(name, NodeMaterialBlockTargets.Vertex);

        this.registerInput("position", NodeMaterialBlockConnectionPointTypes.Vector3);
        this.registerInput("normal", NodeMaterialBlockConnectionPointTypes.Vector3);
        this.registerInput("tangent", NodeMaterialBlockConnectionPointTypes.Vector3);
        this.registerOutput("positionOutput", NodeMaterialBlockConnectionPointTypes.Vector3);
        this.registerOutput("normalOutput", NodeMaterialBlockConnectionPointTypes.Vector3);
        this.registerOutput("tangentOutput", NodeMaterialBlockConnectionPointTypes.Vector3);
    }

    /**
     * Gets the current class name
     * @returns the class name
     */
    public getClassName() {
        return "MorphTargetsBlock";
    }

    /**
     * Gets the position input component
     */
    public get position(): NodeMaterialConnectionPoint {
        return this._inputs[0];
    }

    /**
     * Gets the normal input component
     */
    public get normal(): NodeMaterialConnectionPoint {
        return this._inputs[1];
    }

    /**
     * Gets the tangent input component
     */
    public get tangent(): NodeMaterialConnectionPoint {
        return this._inputs[2];
    }

    /**
     * Gets the position output component
     */
    public get positionOutput(): NodeMaterialConnectionPoint {
        return this._outputs[0];
    }

    /**
     * Gets the normal output component
     */
    public get normalOutput(): NodeMaterialConnectionPoint {
        return this._outputs[1];
    }

    /**
     * Gets the tangent output component
     */
    public get tangentOutput(): NodeMaterialConnectionPoint {
        return this._outputs[2];
    }

    public initialize(state: NodeMaterialBuildState) {
        state._excludeVariableName("morphTargetInfluences");
    }

    public autoConfigure() {
        if (this.position.isUndefined) {
            this.position.setAsAttribute();
        }
        if (this.normal.isUndefined) {
            this.normal.setAsAttribute();
            this.normal.define = "NORMAL";
        }
        if (this.tangent.isUndefined) {
            this.tangent.setAsAttribute();
            this.tangent.define = "TANGENT";
        }
    }

    public prepareDefines(mesh: AbstractMesh, nodeMaterial: NodeMaterial, defines: NodeMaterialDefines) {
        if (!defines._areAttributesDirty) {
            return;
        }
        MaterialHelper.PrepareDefinesForMorphTargets(mesh, defines);
    }

    public bind(effect: Effect, nodeMaterial: NodeMaterial, mesh?: Mesh) {
        if (mesh && this._repeatebleContentGenerated) {
            MaterialHelper.BindMorphTargetParameters(mesh, effect);
        }
    }

    public replaceRepeatableContent(vertexShaderState: NodeMaterialBuildState, fragmentShaderState: NodeMaterialBuildState, mesh: AbstractMesh, defines: NodeMaterialDefines) {
        let position = this.position;
        let normal = this.normal;
        let tangent = this.tangent;
        let positionOutput = this.positionOutput;
        let normalOutput = this.normalOutput;
        let tangentOutput = this.tangentOutput;
        let state = vertexShaderState;
        let repeatCount = defines.NUM_MORPH_INFLUENCERS as number;
        this._repeatebleContentGenerated = repeatCount;

        var manager = (<Mesh>mesh).morphTargetManager;
        var hasNormals = manager && manager.supportsNormals && defines["NORMAL"];
        var hasTangents = manager && manager.supportsTangents && defines["TANGENT"];

        let injectionCode = "";

        for (var index = 0; index < repeatCount; index++) {
            injectionCode += `#ifdef MORPHTARGETS\r\n`;
            injectionCode += `${positionOutput.associatedVariableName} += (position${index} - ${position.associatedVariableName}) * morphTargetInfluences[${index}];\r\n`;

            if (hasNormals) {
                injectionCode += `#ifdef MORPHTARGETS_NORMAL\r\n`;
                injectionCode += `${normalOutput.associatedVariableName} += (normal${index} - ${normal.associatedVariableName}) * morphTargetInfluences[${index}];\r\n`;
                injectionCode += `#endif\r\n`;
            }

            if (hasTangents) {
                injectionCode += `#ifdef MORPHTARGETS_TANGENT\r\n`;
                injectionCode += `${tangentOutput.associatedVariableName}.xyz += (tangent${index} - ${tangent.associatedVariableName}.xyz) * morphTargetInfluences[${index}];\r\n`;
                injectionCode += `#endif\r\n`;
            }

            injectionCode += `#endif\r\n`;
        }

        state.compilationString = state.compilationString.replace(this._repeatableContentAnchor, injectionCode);

        if (repeatCount > 0) {
            for (var index = 0; index < repeatCount; index++) {
                state.attributes.push(VertexBuffer.PositionKind + index);

                if (hasNormals) {
                    state.attributes.push(VertexBuffer.NormalKind + index);
                }

                if (hasTangents) {
                    state.attributes.push(VertexBuffer.TangentKind + index);
                }
            }
        }
    }

    protected _buildBlock(state: NodeMaterialBuildState) {
        super._buildBlock(state);

        // Register for defines
        state.sharedData.blocksWithDefines.push(this);

        // Register for binding
        state.sharedData.bindableBlocks.push(this);

        // Register for repeatable content generation
        state.sharedData.repeatableContentBlocks.push(this);

        // Emit code
        let position = this.position;
        let normal = this.normal;
        let tangent = this.tangent;
        let positionOutput = this.positionOutput;
        let normalOutput = this.normalOutput;
        let tangentOutput = this.tangentOutput;
        let comments = `//${this.name}`;

        state.uniforms.push("morphTargetInfluences");

        state._emitFunctionFromInclude("morphTargetsVertexGlobalDeclaration", comments);
        state._emitFunctionFromInclude("morphTargetsVertexDeclaration", comments, {
            repeatKey: "maxSimultaneousMorphTargets"
        });

        state.compilationString += `${this._declareOutput(positionOutput, state)} = ${position.associatedVariableName};\r\n`;
        state.compilationString += `#ifdef NORMAL\r\n`;
        state.compilationString += `${this._declareOutput(normalOutput, state)} = ${normal.associatedVariableName};\r\n`;
        state.compilationString += `#endif\r\n`;
        state.compilationString += `#ifdef TANGENT\r\n`;
        state.compilationString += `${this._declareOutput(tangentOutput, state)} = ${tangent.associatedVariableName};\r\n`;
        state.compilationString += `#endif\r\n`;

        // Repeatable content
        this._repeatableContentAnchor = state._repeatableContentAnchor;
        state.compilationString += this._repeatableContentAnchor;

        return this;
    }
}