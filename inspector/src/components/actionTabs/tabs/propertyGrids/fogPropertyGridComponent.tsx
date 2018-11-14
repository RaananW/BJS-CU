import * as React from "react";
import { Observable, Scene } from "babylonjs";
import { PropertyChangedEvent } from "../../../propertyChangedEvent";
import { Color3LineComponent } from "../../lines/color3LineComponent";
import { FloatLineComponent } from "../../lines/floatLineComponent";
import { OptionsLineComponent } from "../../lines/optionsLineComponent";

interface IFogPropertyGridComponentProps {
    scene: Scene,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class FogPropertyGridComponent extends React.Component<IFogPropertyGridComponentProps, { mode: number }> {

    constructor(props: IFogPropertyGridComponentProps) {
        super(props);
        this.state = { mode: 0 };
    }

    render() {
        const scene = this.props.scene;

        var fogModeOptions = [
            { label: "None", value: BABYLON.Scene.FOGMODE_NONE },
            { label: "Linear", value: BABYLON.Scene.FOGMODE_LINEAR },
            { label: "Exp", value: BABYLON.Scene.FOGMODE_EXP },
            { label: "Exp2", value: BABYLON.Scene.FOGMODE_EXP2 },
        ]

        return (
            <div>
                <OptionsLineComponent label="Fog mode" options={fogModeOptions} target={scene} propertyName="fogMode" onPropertyChangedObservable={this.props.onPropertyChangedObservable} onSelect={value => this.setState({ mode: value })} />
                {
                    this.state.mode !== BABYLON.Scene.FOGMODE_NONE &&
                    <Color3LineComponent label="Fog color" target={scene} propertyName="fogColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                }
                {
                    (this.state.mode === BABYLON.Scene.FOGMODE_EXP || this.state.mode === BABYLON.Scene.FOGMODE_EXP2) &&
                    <FloatLineComponent label="Fog density" target={scene} propertyName="fogDensity" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                }
                {
                    this.state.mode === BABYLON.Scene.FOGMODE_LINEAR &&
                    <FloatLineComponent label="Fog start" target={scene} propertyName="fogStart" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                }
                {
                    this.state.mode === BABYLON.Scene.FOGMODE_LINEAR &&
                    <FloatLineComponent label="Fog end" target={scene} propertyName="fogEnd" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                }
            </div>
        );
    }
}