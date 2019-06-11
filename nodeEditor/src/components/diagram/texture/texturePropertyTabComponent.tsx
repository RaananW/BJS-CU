
import * as React from "react";
import { GlobalState } from '../../../globalState';
import { Texture } from 'babylonjs/Materials/Textures/texture';
import { FileButtonLineComponent } from '../../../sharedComponents/fileButtonLineComponent';
import { Tools } from 'babylonjs/Misc/tools';
import { Engine } from 'babylonjs/Engines/engine';
import { TextureNodeModel } from './textureNodeModel';
import { TextLineComponent } from '../../../sharedComponents/textLineComponent';
import { LineContainerComponent } from '../../../sharedComponents/lineContainerComponent';
import { TextInputLineComponent } from '../../../sharedComponents/textInputLineComponent';
import { CheckBoxLineComponent } from '../../../sharedComponents/checkBoxLineComponent';

interface ITexturePropertyTabComponentProps {
    globalState: GlobalState;
    node: TextureNodeModel;
}

export class TexturePropertyTabComponent extends React.Component<ITexturePropertyTabComponentProps> {

	/**
	 * Replaces the texture of the node
	 * @param file the file of the texture to use
	 */
    replaceTexture(file: File) {
        if (!this.props.node) {
            return;
        }

        let texture = this.props.node.texture as Texture;
        if (!texture) {
            this.props.node.texture = new Texture(null, Engine.LastCreatedScene)
            texture = this.props.node.texture;
        }

        Tools.ReadFile(file, (data) => {
            var blob = new Blob([data], { type: "octet/stream" });
            var url = URL.createObjectURL(blob);

            if (texture.isCube) {
                let extension: string | undefined = undefined;
                if (file.name.toLowerCase().indexOf(".dds") > 0) {
                    extension = ".dds";
                } else if (file.name.toLowerCase().indexOf(".env") > 0) {
                    extension = ".env";
                }

                (texture as Texture).updateURL(url, extension, () => this.props.globalState.onUpdateRequiredObservable.notifyObservers());
            } else {
                (texture as Texture).updateURL(url, null, () => this.props.globalState.onUpdateRequiredObservable.notifyObservers());
            }

            this.props.globalState.onUpdateRequiredObservable.notifyObservers();
            this.props.globalState.onRebuildRequiredObservable.notifyObservers();
        }, undefined, true);
    }

    render() {
        return (
            <div>
                <LineContainerComponent title="GENERAL">
                    <TextInputLineComponent label="Name" propertyName="name" target={this.props.node.block!} onChange={() => this.props.globalState.onUpdateRequiredObservable.notifyObservers()} />
                    <TextLineComponent label="Type" value="Texture" />
                </LineContainerComponent>

                <LineContainerComponent title="PROPERTIES">
                    <CheckBoxLineComponent label="Auto select UV" propertyName="autoSelectUV" target={this.props.node.block!} />
                    <FileButtonLineComponent label="Replace texture" onClick={(file) => this.replaceTexture(file)} accept=".jpg, .png, .tga, .dds, .env" />
                </LineContainerComponent>
            </div>
        );
    }
}