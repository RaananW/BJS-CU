import { faBrush } from '@fortawesome/free-solid-svg-icons';
import { Material } from "babylonjs";
import { TreeItemLabelComponent } from "../treeItemLabelComponent";
import { IExtensibilityGroup } from "../../../inspector";
import { ExtensionsComponent } from "../extensionsComponent";
import * as React from 'react';

interface IMaterialTreeItemComponentProps {
    material: Material,
    extensibilityGroups?: IExtensibilityGroup[],
    onClick: () => void
}

export class MaterialTreeItemComponent extends React.Component<IMaterialTreeItemComponentProps> {
    constructor(props: IMaterialTreeItemComponentProps) {
        super(props);
    }

    render() {
        return (
            <div className="materialTools">
                <TreeItemLabelComponent label={this.props.material.name} onClick={() => this.props.onClick()} icon={faBrush} color="orange" />
                {
                    <ExtensionsComponent target={this.props.material} extensibilityGroups={this.props.extensibilityGroups} />
                }
            </div>
        )
    }
}