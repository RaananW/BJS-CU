import * as React from "react";
import { Observable } from "babylonjs";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { CommonControlPropertyGridComponent } from "./commonControlPropertyGridComponent";
import { TextBlock } from "babylonjs-gui";
import { LineContainerComponent } from "../../../lineContainerComponent";
import { TextInputLineComponent } from "../../../lines/textInputLineComponent";
import { LockObject } from "../lockObject";
import { OptionsLineComponent } from "../../../lines/optionsLineComponent";

interface ITextBlockPropertyGridComponentProps {
    textBlock: TextBlock,
    lockObject: LockObject,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class TextBlockPropertyGridComponent extends React.Component<ITextBlockPropertyGridComponentProps> {
    constructor(props: ITextBlockPropertyGridComponentProps) {
        super(props);
    }

    render() {
        const textBlock = this.props.textBlock;

        var horizontalOptions = [
            { label: "Left", value: BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT },
            { label: "Right", value: BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT },
            { label: "Center", value: BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER },
        ];

        var verticalOptions = [
            { label: "Top", value: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP },
            { label: "Bottom", value: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM },
            { label: "Center", value: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER },
        ];

        return (
            <div className="pane">
                <CommonControlPropertyGridComponent lockObject={this.props.lockObject} control={textBlock} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <LineContainerComponent title="TEXTBLOCK">
                    <TextInputLineComponent lockObject={this.props.lockObject} label="Text" target={textBlock} propertyName="text" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <OptionsLineComponent label="Horizontal text alignment" options={horizontalOptions} target={textBlock} propertyName="textHorizontalAlignment" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <OptionsLineComponent label="Vertical text alignment" options={verticalOptions} target={textBlock} propertyName="textVerticalAlignment" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
            </div>
        );
    }
}