import * as React from "react";
import { Observable } from "babylonjs/Misc/observable";
import { PropertyChangedEvent } from "../../../../sharedUiComponents/propertyChangedEvent";
import { CommonControlPropertyGridComponent } from "./commonControlPropertyGridComponent";
import { LockObject } from "../../../../sharedUiComponents/tabs/propertyGrids/lockObject";
import { Slider } from "babylonjs-gui/2D/controls/sliders/slider";
import { FloatLineComponent } from "../../../../sharedUiComponents/lines/floatLineComponent";
import { CheckBoxLineComponent } from "../../../../sharedUiComponents/lines/checkBoxLineComponent";
import { TextInputLineComponent } from "../../../../sharedUiComponents/lines/textInputLineComponent";
import { TextLineComponent } from "../../../../sharedUiComponents/lines/textLineComponent";
import { Color3LineComponent } from "../../../../sharedUiComponents/lines/Color3LineComponent";

interface ISliderPropertyGridComponentProps {
    slider: Slider
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
                <CommonControlPropertyGridComponent lockObject={this.props.lockObject} control={slider} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <hr />
                <TextLineComponent label="SLIDER" value=" " color="grey"></TextLineComponent>
                <Color3LineComponent lockObject={this.props.lockObject} label="Border color" target={slider} propertyName="borderColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <CheckBoxLineComponent label="Display thumb" target={slider} propertyName="displayThumb" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <CheckBoxLineComponent label="Thumb circle" target={slider} propertyName="isThumbCircle" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <CheckBoxLineComponent label="Vertical" target={slider} propertyName="isVertical" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <CheckBoxLineComponent label="Thumb clamped" target={slider} propertyName="isThumbClamped" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <TextInputLineComponent lockObject={this.props.lockObject} label="Bar offset" target={slider} propertyName="barOffset" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <TextInputLineComponent lockObject={this.props.lockObject} label="Thumb width" target={slider} propertyName="thumbWidth" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <FloatLineComponent lockObject={this.props.lockObject} label="Minimum" target={slider} propertyName="minimum" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <FloatLineComponent lockObject={this.props.lockObject} label="Maximum" target={slider} propertyName="maximum" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <FloatLineComponent lockObject={this.props.lockObject} label="Value" target={slider} propertyName="value" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
            </div>
        );
    }
}