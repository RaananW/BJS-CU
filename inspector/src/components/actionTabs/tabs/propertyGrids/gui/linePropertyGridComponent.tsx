import * as React from "react";
import { Observable } from "babylonjs/Misc/observable";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { CommonControlPropertyGridComponent } from "./commonControlPropertyGridComponent";
import { LockObject } from "../lockObject";
import { Line } from "babylonjs-gui/2D/controls/line";
import { LineContainerComponent } from "../../../lineContainerComponent";
import { FloatLineComponent } from "../../../lines/floatLineComponent";
import { TextInputLineComponent } from "../../../lines/textInputLineComponent";
import { GlobalState } from '../../../../globalState';

interface ILinePropertyGridComponentProps {
    globalState: GlobalState;
    line: Line,
    lockObject: LockObject,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class LinePropertyGridComponent extends React.Component<ILinePropertyGridComponentProps> {
    constructor(props: ILinePropertyGridComponentProps) {
        super(props);
    }

    onDashChange(value: string) {
        const line = this.props.line;
        const split = value.split(",");
        line.dash = [];

        split.forEach(v => {
            const int = parseInt(v);

            if (isNaN(int)) {
                return;
            }

            line.dash.push(int);
        });
    }

    render() {
        const line = this.props.line;

        return (
            <div className="pane">
                <CommonControlPropertyGridComponent globalState={this.props.globalState} lockObject={this.props.lockObject} control={line} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <LineContainerComponent globalState={this.props.globalState} title="LINE">
                    <FloatLineComponent lockObject={this.props.lockObject} label="Line width" target={line} propertyName="lineWidth" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <TextInputLineComponent lockObject={this.props.lockObject} label="X1" target={line} propertyName="x1" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <TextInputLineComponent lockObject={this.props.lockObject} label="Y1" target={line} propertyName="y1" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <TextInputLineComponent lockObject={this.props.lockObject} label="X2" target={line} propertyName="x2" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <TextInputLineComponent lockObject={this.props.lockObject} label="Y2" target={line} propertyName="y2" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <TextInputLineComponent lockObject={this.props.lockObject} label="Dash pattern" target={line} value={line.dash.join(",")} onChange={newValue => this.onDashChange(newValue)} />
                </LineContainerComponent>
            </div>
        );
    }
}