import { NodeMaterialBlock } from '../../nodeMaterialBlock';
import { NodeMaterialBlockConnectionPointTypes } from '../../nodeMaterialBlockConnectionPointTypes';
import { NodeMaterialBuildState } from '../../nodeMaterialBuildState';
import { NodeMaterialBlockTargets } from '../../nodeMaterialBlockTargets';
import { NodeMaterialConnectionPoint } from '../../nodeMaterialBlockConnectionPoint';
import { BaseTexture } from '../../../Textures/baseTexture';
import { AbstractMesh } from '../../../../Meshes/abstractMesh';
import { NodeMaterial, NodeMaterialDefines } from '../../nodeMaterial';
import { InputBlock } from '../Input/inputBlock';
import { Effect } from '../../../../Materials/effect';
import { Mesh } from '../../../../Meshes/mesh';

/**
 * Block used to read a texture from a sampler
 */
export class TextureBlock extends NodeMaterialBlock {
    private _defineName: string;
    private _samplerName: string;
    private _transformedUVName: string;
    private _textureTransformName: string;
    private _textureInfoName: string;
    private _mainUVName: string;

    /**
     * Gets or sets the texture associated with the node
     */
    public texture: BaseTexture;

    /**
     * Create a new TextureBlock
     * @param name defines the block name
     */
    public constructor(name: string) {
        super(name, NodeMaterialBlockTargets.VertexAndFragment);

        this.registerInput("uv", NodeMaterialBlockConnectionPointTypes.Vector2, false);

        this.registerOutput("color", NodeMaterialBlockConnectionPointTypes.Color4);
    }

    /**
     * Gets the current class name
     * @returns the class name
     */
    public getClassName() {
        return "TextureBlock";
    }

    /**
     * Gets the uv input component
     */
    public get uv(): NodeMaterialConnectionPoint {
        return this._inputs[0];
    }

    /**
     * Gets the output component
     */
    public get output(): NodeMaterialConnectionPoint {
        return this._outputs[0];
    }

    public autoConfigure() {
        if (!this.uv.isConnected) {
            let uvInput = new InputBlock("uv");
            uvInput.setAsAttribute();
            uvInput.output.connectTo(this.uv);
        }
    }

    public prepareDefines(mesh: AbstractMesh, nodeMaterial: NodeMaterial, defines: NodeMaterialDefines) {
        if (!this.texture || !this.texture.getTextureMatrix) {
            return;
        }

        if (!this.texture.getTextureMatrix().isIdentityAs3x2()) {
            defines.setValue(this._defineName, true);
        } else {
            defines.setValue(this._defineName, false);
        }
    }

    public isReady() {
        if (this.texture && !this.texture.isReadyOrNotBlocking()) {
            return false;
        }

        return true;
    }

    public bind(effect: Effect, nodeMaterial: NodeMaterial, mesh?: Mesh) {
        if (!mesh) {
            return;
        }

        effect.setFloat(this._textureInfoName, this.texture.level);
        effect.setMatrix(this._textureTransformName, this.texture.getTextureMatrix());
        effect.setTexture(this._samplerName, this.texture);
    }

    private _injectVertexCode(state: NodeMaterialBuildState) {
        let uvInput = this.uv;

        // Inject code in vertex
        this._defineName = state._getFreeDefineName("UVTRANSFORM");

        this._mainUVName = "vMain" + uvInput.associatedVariableName;
        this._transformedUVName = state._getFreeVariableName("transformedUV");
        this._textureTransformName = state._getFreeVariableName("textureTransform");
        this._textureInfoName = state._getFreeVariableName("textureInfoName");

        state._emitVaryingFromString(this._transformedUVName, "vec2", this._defineName);
        state._emitVaryingFromString(this._mainUVName, "vec2", this._defineName, true);

        state._emitUniformFromString(this._textureTransformName, "mat4", this._defineName)

        if (state.sharedData.emitComments) {
            state.compilationString += `\r\n//${this.name}\r\n`;
        }
        state.compilationString += `#ifdef ${this._defineName}\r\n`;
        state.compilationString += `${this._transformedUVName} = vec2(${this._textureTransformName} * vec4(${uvInput.associatedVariableName}, 1.0, 0.0));\r\n`;
        state.compilationString += `#else\r\n`;
        state.compilationString += `${this._mainUVName} = ${uvInput.associatedVariableName};\r\n`;
        state.compilationString += `#endif\r\n`;
    }

    protected _buildBlock(state: NodeMaterialBuildState) {
        super._buildBlock(state);

        if (state.target !== NodeMaterialBlockTargets.Fragment) {
            return;
        }

        state.sharedData.blockingBlocks.push(this);

        this._samplerName = state._getFreeVariableName(this.name + "Sampler");
        state.samplers.push(this._samplerName);
        state._samplerDeclaration += `uniform sampler2D ${this._samplerName};\r\n`;

        // Vertex
        this._injectVertexCode(state._vertexState);

        // Fragment
        state.sharedData.blocksWithDefines.push(this);
        state.sharedData.bindableBlocks.push(this);

        state._emitUniformFromString(this._textureInfoName, "float")

        let uvInput = this.uv;
        let output = this._outputs[0];
        const complement = ` * ${this._textureInfoName}`;

        state.compilationString += `#ifdef ${this._defineName}\r\n`;
        state.compilationString += `vec4 ${output.associatedVariableName} = texture2D(${this._samplerName}, ${this._transformedUVName})${complement};\r\n`;
        state.compilationString += `#else\r\n`;
        state.compilationString += `vec4 ${output.associatedVariableName} = texture2D(${this._samplerName}, ${"vMain" + uvInput.associatedVariableName})${complement};\r\n`;
        state.compilationString += `#endif\r\n`;

        return this;
    }
}