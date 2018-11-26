import * as React from "react";
import { Observable } from "babylonjs";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { CommonControlPropertyGridComponent } from "./commonControlPropertyGridComponent";
import { TextBlock } from "babylonjs-gui";
import { LineContainerComponent } from "../../../lineContainerComponent";
import { TextInputLineComponent } from "../../../lines/textInputLineComponent";
import { LockObject } from "../lockObject";
import { OptionsLineComponent } from "../../../lines/optionsLineComponent";
import { CheckBoxLineComponent } from "../../../lines/checkBoxLineComponent";
import { FloatLineComponent } from "../../../lines/floatLineComponent";

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

        var wrappingOptions = [
            { label: "Clip", value: BABYLON.GUI.TextWrapping.Clip },
            { label: "Ellipsis", value: BABYLON.GUI.TextWrapping.Ellipsis },
            { label: "Word wrap", value: BABYLON.GUI.TextWrapping.WordWrap },
        ];

        return (
            <div className="pane">
                <CommonControlPropertyGridComponent lockObject={this.props.lockObject} control={textBlock} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <LineContainerComponent title="TEXTBLOCK">
                    <TextInputLineComponent lockObject={this.props.lockObject} label="Text" target={textBlock} propertyName="text" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <OptionsLineComponent label="Horizontal text alignment" options={horizontalOptions} target={textBlock} propertyName="textHorizontalAlignment" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <OptionsLineComponent label="Vertical text alignment" options={verticalOptions} target={textBlock} propertyName="textVerticalAlignment" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Resize to fit" target={textBlock} propertyName="resizeToFit" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <OptionsLineComponent label="Wrapping" options={wrappingOptions} target={textBlock} propertyName="textWrapping" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <TextInputLineComponent lockObject={this.props.lockObject} label="Line spacing" target={textBlock} propertyName="lineSpacing" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
                <LineContainerComponent title="OUTLINE">
                    <FloatLineComponent lockObject={this.props.lockObject} label="Outline width" target={textBlock} propertyName="outlineWidth" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <TextInputLineComponent lockObject={this.props.lockObject} label="Outline color" target={textBlock} propertyName="outlineColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
            </div>
        );
    }
}