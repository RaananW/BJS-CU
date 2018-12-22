import * as React from "react";
import { Observable } from "babylonjs/Misc/observable";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { CommonControlPropertyGridComponent } from "./commonControlPropertyGridComponent";
import { LineContainerComponent } from "../../../lineContainerComponent";
import { LockObject } from "../lockObject";
import { Image } from "babylonjs-gui/2D/controls/image";
import { FloatLineComponent } from "../../../lines/floatLineComponent";
import { CheckBoxLineComponent } from "../../../lines/checkBoxLineComponent";
import { OptionsLineComponent } from "../../../lines/optionsLineComponent";

interface IImagePropertyGridComponentProps {
    image: Image,
    lockObject: LockObject,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class ImagePropertyGridComponent extends React.Component<IImagePropertyGridComponentProps> {
    constructor(props: IImagePropertyGridComponentProps) {
        super(props);
    }

    render() {
        const image = this.props.image;

        var stretchOptions = [
            { label: "None", value: BABYLON.GUI.Image.STRETCH_NONE },
            { label: "Fill", value: BABYLON.GUI.Image.STRETCH_FILL },
            { label: "Uniform", value: BABYLON.GUI.Image.STRETCH_UNIFORM },
            { label: "Extend", value: BABYLON.GUI.Image.STRETCH_EXTEND },
            { label: "NinePatch", value: BABYLON.GUI.Image.STRETCH_NINE_PATCH }
        ];

        return (
            <div className="pane">
                <CommonControlPropertyGridComponent lockObject={this.props.lockObject} control={image} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <LineContainerComponent title="IMAGE">
                    <FloatLineComponent lockObject={this.props.lockObject} label="Source left" target={image} propertyName="sourceLeft" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <FloatLineComponent lockObject={this.props.lockObject} label="Source top" target={image} propertyName="sourceTop" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <FloatLineComponent lockObject={this.props.lockObject} label="Source width" target={image} propertyName="sourceWidth" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <FloatLineComponent lockObject={this.props.lockObject} label="Source height" target={image} propertyName="sourceHeight" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Autoscale" target={image} propertyName="autoScale" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <OptionsLineComponent label="Stretch" options={stretchOptions} target={image} propertyName="stretch" onPropertyChangedObservable={this.props.onPropertyChangedObservable} onSelect={value => this.setState({ mode: value })} />
                </LineContainerComponent>
                <LineContainerComponent title="ANIMATION SHEET">
                    <FloatLineComponent lockObject={this.props.lockObject} label="Cell Id" isInteger={true} target={image} propertyName="cellId" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <FloatLineComponent lockObject={this.props.lockObject} label="Cell width" target={image} propertyName="cellWidth" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <FloatLineComponent lockObject={this.props.lockObject} label="Cell height" target={image} propertyName="cellHeight" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
            </div>
        );
    }
}