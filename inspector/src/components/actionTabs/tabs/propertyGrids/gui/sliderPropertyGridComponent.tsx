import * as React from "react";
import { Observable } from "babylonjs/Misc/observable";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { CommonControlPropertyGridComponent } from "./commonControlPropertyGridComponent";
import { LineContainerComponent } from "../../../lineContainerComponent";
import { LockObject } from "../lockObject";
import { Slider } from "babylonjs-gui/2D/controls/sliders/slider";
import { FloatLineComponent } from "../../../lines/floatLineComponent";
import { CheckBoxLineComponent } from "../../../lines/checkBoxLineComponent";
import { TextInputLineComponent } from "../../../lines/textInputLineComponent";
import { GlobalState } from '../../../../globalState';

interface ISliderPropertyGridComponentProps {
    globalState: GlobalState;
    slider: Slider,
    lockObject: LockObject,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class SliderPropertyGridComponent extends React.Component<ISliderPropertyGridComponentProps> {
    constructor(props: ISliderPropertyGridComponentProps) {
        super(props);
    }

    render() {
        const slider = this.props.slider;

        return (
            <div className="pane">
                <CommonControlPropertyGridComponent globalState={this.props.globalState} lockObject={this.props.lockObject} control={slider} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <LineContainerComponent globalState={this.props.globalState} title="SLIDER">
                    <TextInputLineComponent lockObject={this.props.lockObject} label="Border color" target={slider} propertyName="borderColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Display thumb" target={slider} propertyName="displayThumb" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Thumb circle" target={slider} propertyName="isThumbCircle" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Vertical" target={slider} propertyName="isVertical" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Thumb clamped" target={slider} propertyName="isThumbClamped" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <TextInputLineComponent lockObject={this.props.lockObject} label="Bar offset" target={slider} propertyName="barOffset" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <TextInputLineComponent lockObject={this.props.lockObject} label="Thumb width" target={slider} propertyName="thumbWidth" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <FloatLineComponent lockObject={this.props.lockObject} label="Minimum" target={slider} propertyName="minimum" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <FloatLineComponent lockObject={this.props.lockObject} label="Maximum" target={slider} propertyName="maximum" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <FloatLineComponent lockObject={this.props.lockObject} label="Value" target={slider} propertyName="value" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
            </div>
        );
    }
}