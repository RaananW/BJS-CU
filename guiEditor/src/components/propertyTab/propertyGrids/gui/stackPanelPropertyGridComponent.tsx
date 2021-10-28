import * as React from "react";
import { Observable } from "babylonjs/Misc/observable";
import { PropertyChangedEvent } from "../../../../sharedUiComponents/propertyChangedEvent";
import { CommonControlPropertyGridComponent } from "../gui/commonControlPropertyGridComponent";
import { LockObject } from "../../../../sharedUiComponents/tabs/propertyGrids/lockObject";
import { StackPanel } from "babylonjs-gui/2D/controls/stackPanel";
import { CheckBoxLineComponent } from "../../../../sharedUiComponents/lines/checkBoxLineComponent";
import { TextLineComponent } from "../../../../sharedUiComponents/lines/textLineComponent";

const fillColorIcon: string = require("../../../../sharedUiComponents/imgs/fillColorIcon.svg");

interface IStackPanelPropertyGridComponentProps {
    stackPanel: StackPanel,
    lockObject: LockObject,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class StackPanelPropertyGridComponent extends React.Component<IStackPanelPropertyGridComponentProps> {
    constructor(props: IStackPanelPropertyGridComponentProps) {
        super(props);
    }

    render() {
        const stackPanel = this.props.stackPanel;

        return (
            <div className="pane">
                <CommonControlPropertyGridComponent lockObject={this.props.lockObject} control={stackPanel} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <hr />
                <TextLineComponent label="STACKPANEL" value=" " color="grey"></TextLineComponent>
                <CheckBoxLineComponent iconLabel={"Clip children"} icon={fillColorIcon} label="" target={stackPanel} propertyName="clipChildren" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <CheckBoxLineComponent iconLabel={"Vertical"} icon={fillColorIcon} label="" target={stackPanel} propertyName="isVertical" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
            </div>
        );
    }
}