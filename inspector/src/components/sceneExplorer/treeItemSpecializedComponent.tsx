import { AbstractMesh, Camera, Light, Material, Texture, TransformNode, IExplorerExtensibilityGroup } from "babylonjs";
import { MeshTreeItemComponent } from "./entities/meshTreeItemComponent";
import { CameraTreeItemComponent } from "./entities/cameraTreeItemComponent";
import { LightTreeItemComponent } from "./entities/lightTreeItemComponent";
import { TreeItemLabelComponent } from "./treeItemLabelComponent";
import { faProjectDiagram } from '@fortawesome/free-solid-svg-icons';
import { MaterialTreeItemComponent } from "./entities/materialTreeItemComponent";
import { TextureTreeItemComponent } from "./entities/textureTreeItemComponent";
import { TransformNodeItemComponent } from "./entities/transformNodeTreeItemComponent";
import * as React from "react";

interface ITreeItemSpecializedComponentProps {
    label: string,
    entity?: any,
    extensibilityGroups?: IExplorerExtensibilityGroup[],
    onClick?: () => void
}

export class TreeItemSpecializedComponent extends React.Component<ITreeItemSpecializedComponentProps> {
    constructor(props: ITreeItemSpecializedComponentProps) {
        super(props);
    }

    onClick() {
        if (!this.props.onClick) {
            return;
        }

        this.props.onClick();
    }

    render() {
        const entity = this.props.entity;

        if (entity && entity.getClassName) {
            const className = entity.getClassName();

            if (className.indexOf("Mesh") !== -1) {
                const mesh = entity as AbstractMesh;
                if (mesh.getTotalVertices() > 0) {
                    return (<MeshTreeItemComponent extensibilityGroups={this.props.extensibilityGroups} mesh={mesh} onClick={() => this.onClick()} />);
                } else {
                    return (<TransformNodeItemComponent extensibilityGroups={this.props.extensibilityGroups} transformNode={entity as TransformNode} onClick={() => this.onClick()} />);
                }
            }

            if (className.indexOf("TransformNode") !== -1) {
                return (<TransformNodeItemComponent extensibilityGroups={this.props.extensibilityGroups} transformNode={entity as TransformNode} onClick={() => this.onClick()} />);
            }

            if (className.indexOf("Camera") !== -1) {
                return (<CameraTreeItemComponent extensibilityGroups={this.props.extensibilityGroups} camera={entity as Camera} onClick={() => this.onClick()} />);
            }

            if (className.indexOf("Light") !== -1) {
                return (<LightTreeItemComponent extensibilityGroups={this.props.extensibilityGroups} light={entity as Light} onClick={() => this.onClick()} />);
            }

            if (className.indexOf("Material") !== -1) {
                return (<MaterialTreeItemComponent extensibilityGroups={this.props.extensibilityGroups} material={entity as Material} onClick={() => this.onClick()} />);
            }

            if (className.indexOf("Texture") !== -1) {
                return (<TextureTreeItemComponent extensibilityGroups={this.props.extensibilityGroups} texture={entity as Texture} onClick={() => this.onClick()} />);
            }
        }

        return (
            <div className="meshTools">
                <TreeItemLabelComponent label={entity.name} onClick={() => this.onClick()} icon={faProjectDiagram} color="cornflowerblue" />
            </div>
        )
    }
}
