import * as React from "react";
import { Observable } from "babylonjs";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { CommonControlPropertyGridComponent } from "./commonControlPropertyGridComponent";
import { LockObject } from "../lockObject";
import { Ellipse } from "babylonjs-gui";
import { LineContainerComponent } from "../../../lineContainerComponent";
import { FloatLineComponent } from "../../../lines/floatLineComponent";

interface IEllipsePropertyGridComponentProps {
    ellipse: Ellipse,
    lockObject: LockObject,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class EllipsePropertyGridComponent extends React.Component<IEllipsePropertyGridComponentProps> {
    constructor(props: IEllipsePropertyGridComponentProps) {
        super(props);
    }

    render() {
        const ellipse = this.props.ellipse;

        return (
            <div className="pane">
                <CommonControlPropertyGridComponent lockObject={this.props.lockObject} control={ellipse} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <LineContainerComponent title="ELLIPSE">
                    <FloatLineComponent lockObject={this.props.lockObject} label="Thickness" target={ellipse} propertyName="thickness" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
            </div>
        );
    }
}