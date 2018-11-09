import { faImage, faCrosshairs } from '@fortawesome/free-solid-svg-icons';
import { IExplorerExtensibilityGroup, Nullable, Observer, Observable } from "babylonjs";
import { TreeItemLabelComponent } from "../../treeItemLabelComponent";
import { ExtensionsComponent } from "../../extensionsComponent";
import * as React from 'react';
import { AdvancedDynamicTexture, Control } from 'babylonjs-gui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface IAdvancedDynamicTextureTreeItemComponentProps {
    texture: AdvancedDynamicTexture,
    extensibilityGroups?: IExplorerExtensibilityGroup[],
    onSelectionChangeObservable?: Observable<any>,
    onClick: () => void
}

export class AdvancedDynamicTextureTreeItemComponent extends React.Component<IAdvancedDynamicTextureTreeItemComponentProps, { isInPickingMode: boolean }> {
    private _onControlPickedObserver: Nullable<Observer<Control>>;

    constructor(props: IAdvancedDynamicTextureTreeItemComponentProps) {
        super(props);

        this.state = { isInPickingMode: false };
    }

    onPickingMode() {
        let adt = this.props.texture;

        if (this._onControlPickedObserver) {
            adt.onControlPickedObservable.remove(this._onControlPickedObserver);
            this._onControlPickedObserver = null;
        }

        if (!this.state.isInPickingMode) {
            this._onControlPickedObserver = adt.onControlPickedObservable.add((control) => {
                if (!this.props.onSelectionChangeObservable) {
                    return;
                }
                this.props.onSelectionChangeObservable.notifyObservers(control);
            });
        }

        this.setState({ isInPickingMode: !this.state.isInPickingMode });
    }

    render() {
        return (
            <div className="adtextureTools">
                <TreeItemLabelComponent label={this.props.texture.name} onClick={() => this.props.onClick()} icon={faImage} color="mediumpurple" />
                <div className={this.state.isInPickingMode ? "pickingMode selected icon" : "pickingMode icon"} onClick={() => this.onPickingMode()} title="Turn picking mode on/off">
                    <FontAwesomeIcon icon={faCrosshairs} />
                </div>
                <ExtensionsComponent target={this.props.texture} extensibilityGroups={this.props.extensibilityGroups} />
            </div>
        )
    }
}