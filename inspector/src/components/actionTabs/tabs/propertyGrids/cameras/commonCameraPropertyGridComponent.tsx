import * as React from "react";
import { Camera, Observable } from "babylonjs";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { SliderLineComponent } from "../../../lines/sliderLineComponent";
import { LineContainerComponent } from "../../../lineContainerComponent";
import { FloatLineComponent } from "../../../lines/floatLineComponent";
import { TextLineComponent } from "../../../lines/textLineComponent";
import { OptionsLineComponent } from "../../../lines/optionsLineComponent";

interface ICommonCameraPropertyGridComponentProps {
    camera: Camera,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class CommonCameraPropertyGridComponent extends React.Component<ICommonCameraPropertyGridComponentProps, { mode: number }> {
    constructor(props: ICommonCameraPropertyGridComponentProps) {
        super(props);

        this.state = { mode: this.props.camera.mode };
    }

    render() {
        const camera = this.props.camera;

        var modeOptions = [
            { label: "Perspective", value: BABYLON.Camera.PERSPECTIVE_CAMERA },
            { label: "Orthographic", value: BABYLON.Camera.ORTHOGRAPHIC_CAMERA }
        ];

        return (
            <LineContainerComponent title="GENERAL">
                <TextLineComponent label="ID" value={camera.id} />
                <TextLineComponent label="Unique ID" value={camera.uniqueId.toString()} />
                <TextLineComponent label="Class" value={camera.getClassName()} />
                <FloatLineComponent label="Near plane" target={camera} propertyName="minZ" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <FloatLineComponent label="Far plane" target={camera} propertyName="maxZ" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <SliderLineComponent label="Inertia" target={camera} propertyName="inertia" minimum={0} maximum={1} step={0.01} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                <OptionsLineComponent label="Mode" options={modeOptions} target={camera} propertyName="mode" onPropertyChangedObservable={this.props.onPropertyChangedObservable} onSelect={value => this.setState({ mode: value })} />
                {
                    camera.mode === BABYLON.Camera.PERSPECTIVE_CAMERA &&
                    <SliderLineComponent label="Field of view" target={camera} propertyName="fov" minimum={0.1} maximum={Math.PI} step={0.1} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                }
                {
                    camera.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA &&
                    <FloatLineComponent label="Left" target={camera} propertyName="orthoLeft" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                }
                {
                    camera.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA &&
                    <FloatLineComponent label="Top" target={camera} propertyName="orthoTop" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                }
                {
                    camera.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA &&
                    <FloatLineComponent label="Right" target={camera} propertyName="orthoRight" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                }
                {
                    camera.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA &&
                    <FloatLineComponent label="Bottom" target={camera} propertyName="orthoBottom" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                }

            </LineContainerComponent>
        );
    }
}