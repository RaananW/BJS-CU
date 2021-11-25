import * as React from "react";
import { FreeCamera } from "babylonjs/Cameras/freeCamera";
import { Observable } from "babylonjs/Misc/observable";
import { CommonCameraPropertyGridComponent } from "./commonCameraPropertyGridComponent";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { LineContainerComponent } from "../../../../../sharedUiComponents/lines/lineContainerComponent";
import { Vector3LineComponent } from "../../../../../sharedUiComponents/lines/vector3LineComponent";
import { FloatLineComponent } from "../../../../../sharedUiComponents/lines/floatLineComponent";
import { CheckBoxLineComponent } from "../../../../../sharedUiComponents/lines/checkBoxLineComponent";
import { LockObject } from "../../../../../sharedUiComponents/tabs/propertyGrids/lockObject";
import { GlobalState } from "../../../../globalState";

interface IFreeCameraPropertyGridComponentProps {
    globalState: GlobalState;
    camera: FreeCamera;
    lockObject: LockObject;
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>;
}

export class FreeCameraPropertyGridComponent extends React.Component<IFreeCameraPropertyGridComponentProps> {
    constructor(props: IFreeCameraPropertyGridComponentProps) {
        super(props);
    }

    render() {
        const camera = this.props.camera;

        return (
            <div className="pane">
                <CommonCameraPropertyGridComponent
                    globalState={this.props.globalState}
                    lockObject={this.props.lockObject}
                    camera={camera}
                    onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                />
                <LineContainerComponent title="TRANSFORMS" selection={this.props.globalState}>
                    <Vector3LineComponent label="Target" target={camera} propertyName="target" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <Vector3LineComponent label="Position" target={camera} propertyName="position" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <Vector3LineComponent
                        label="Rotation"
                        noSlider={true}
                        useEuler={this.props.globalState.onlyUseEulers}
                        target={camera}
                        propertyName="rotation"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                </LineContainerComponent>
                <LineContainerComponent title="CONTROLS" closed={true} selection={this.props.globalState}>
                    <FloatLineComponent
                        lockObject={this.props.lockObject}
                        label="Angular sensitivity"
                        target={camera}
                        propertyName="angularSensibility"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <FloatLineComponent
                        lockObject={this.props.lockObject}
                        label="Speed"
                        target={camera}
                        propertyName="speed"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                </LineContainerComponent>
                <LineContainerComponent title="COLLISIONS" closed={true} selection={this.props.globalState}>
                    <CheckBoxLineComponent
                        label="Check collisions"
                        target={camera}
                        propertyName="checkCollisions"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent label="Apply gravity" target={camera} propertyName="applyGravity" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <Vector3LineComponent label="Ellipsoid" target={camera} propertyName="ellipsoid" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <Vector3LineComponent
                        label="Ellipsoid offset"
                        target={camera}
                        propertyName="ellipsoidOffset"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                </LineContainerComponent>
            </div>
        );
    }
}
