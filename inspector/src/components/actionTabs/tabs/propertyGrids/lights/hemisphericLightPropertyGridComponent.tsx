import * as React from "react";
import { Observable, HemisphericLight } from "babylonjs";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { CommonLightPropertyGridComponent } from "./commonLightPropertyGridComponent";
import { LineContainerComponent } from "../../../lineContainerComponent";
import { Color3LineComponent } from "../../../lines/color3LineComponent";
import { Vector3LineComponent } from "../../../lines/vector3LineComponent";
import { LockObject } from "../lockObject";

interface IHemisphericLightPropertyGridComponentProps {
    light: HemisphericLight,
    lockObject: LockObject,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class HemisphericLightPropertyGridComponent extends React.Component<IHemisphericLightPropertyGridComponentProps> {
    constructor(props: IHemisphericLightPropertyGridComponentProps) {
        super(props);
    }

    render() {
        const light = this.props.light;

        return (
            <div className="pane">
                <CommonLightPropertyGridComponent lockObject={this.props.lockObject} light={light} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <LineContainerComponent title="SETUP">
                    <Color3LineComponent label="Diffuse" target={light} propertyName="diffuse" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <Color3LineComponent label="Ground" target={light} propertyName="groundColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <Vector3LineComponent label="Direction" target={light} propertyName="direction" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
            </div>
        );
    }
}