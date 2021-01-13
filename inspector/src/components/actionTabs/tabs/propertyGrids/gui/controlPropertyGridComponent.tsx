import * as React from "react";
import { Observable } from "babylonjs/Misc/observable";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { Control } from "babylonjs-gui/2D/controls/control";
import { CommonControlPropertyGridComponent } from "../../../../../sharedUiComponents/tabs/propertyGrids/gui/commonControlPropertyGridComponent";
import { GlobalState } from '../../../../globalState';
import { LockObject } from "../../../../../sharedUiComponents/tabs/propertyGrids/lockObject";

interface IControlPropertyGridComponentProps {
    globalState: GlobalState;
    control: Control,
    lockObject: LockObject,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class ControlPropertyGridComponent extends React.Component<IControlPropertyGridComponentProps> {
    constructor(props: IControlPropertyGridComponentProps) {
        super(props);
    }

    render() {
        const control = this.props.control;

        return (
            <div className="pane">
                <CommonControlPropertyGridComponent  lockObject={this.props.lockObject} control={control} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
            </div>
        );
    }
}