import * as React from "react";
import { Control } from "babylonjs-gui/2D/controls/control";
import { TextLineComponent } from "../sharedUiComponents/lines/textLineComponent";
import { FloatLineComponent } from "../sharedUiComponents/lines/floatLineComponent";
import { LockObject } from "../sharedUiComponents/tabs/propertyGrids/lockObject";
import { PropertyChangedEvent } from "../sharedUiComponents/propertyChangedEvent";
import { Observable } from "babylonjs/Misc/observable";
import { Grid } from "babylonjs-gui/2D/controls/grid";

interface IParentingPropertyGridComponentProps {
    control: Control,
    lockObject: LockObject,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class ParentingPropertyGridComponent extends React.Component<IParentingPropertyGridComponentProps> {
    constructor(props: IParentingPropertyGridComponentProps) {
        super(props);
        this.getCellInfo();
    }
    private _columnNumber: number;
    private _rowNumber: number;

    updateGridPosition() {
        const grid = this.props.control.parent as Grid;
        if (grid) {
            grid.removeControl(this.props.control);
            grid.addControl(this.props.control, this._rowNumber, this._columnNumber);
        }
    }

    getCellInfo() {
        const cellInfo = (this.props.control.parent as Grid).getChildCellInfo(this.props.control);
        this._rowNumber = parseInt(cellInfo.substring(0, cellInfo.search(":")));
        if (isNaN(this._rowNumber)) {
            this._rowNumber = 0;
        }
        this._columnNumber = parseInt(cellInfo.substring(cellInfo.search(":") + 1));
        if (isNaN(this._columnNumber)) {
            this._columnNumber = 0;
        }
    }

    render() {
        this.getCellInfo();
        return (
            <div className="pane">
                <hr className="ge" />
                <TextLineComponent tooltip="" label="GRID PARENTING" value=" " color="grey"></TextLineComponent>
                <div className="divider">
                    <FloatLineComponent label={"Row #"} target={this} propertyName={"_rowNumber"} isInteger={true} min={0} onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        onChange={(newValue) => {
                            this.updateGridPosition();
                        }} />
                    <FloatLineComponent label={"Column #"} target={this} propertyName={"_columnNumber"} isInteger={true} min={0} onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        onChange={(newValue) => {
                            this.updateGridPosition();
                        }} />
                </div>
            </div>
        );
    }
}
