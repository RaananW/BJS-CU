import * as React from "react";
import { Observable, Scene, BaseTexture, Nullable, Vector3 } from "babylonjs";
import { PropertyChangedEvent } from "../../../propertyChangedEvent";
import { LineContainerComponent } from "../../lineContainerComponent";
import { RadioButtonLineComponent } from "../../lines/radioLineComponent";
import { Color3LineComponent } from "../../lines/color3LineComponent";
import { CheckBoxLineComponent } from "../../lines/checkBoxLineComponent";
import { FogPropertyGridComponent } from "./fogPropertyGridComponent";
import { FileButtonLineComponent } from "../../lines/fileButtonLineComponent";
import { TextureLinkLineComponent } from "../../lines/textureLinkLineComponent";
import { Vector3LineComponent } from "../../lines/vector3LineComponent";
import { FloatLineComponent } from "../../lines/floatLineComponent";

interface IScenePropertyGridComponentProps {
    scene: Scene,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>,
    onSelectionChangedObservable?: Observable<any>
}

export class ScenePropertyGridComponent extends React.Component<IScenePropertyGridComponentProps> {
    private _storedEnvironmentTexture: Nullable<BaseTexture>;

    constructor(props: IScenePropertyGridComponentProps) {
        super(props);
    }

    setRenderingModes(point: boolean, wireframe: boolean) {
        const scene = this.props.scene;
        scene.forcePointsCloud = point;
        scene.forceWireframe = wireframe;
    }

    switchIBL() {
        const scene = this.props.scene;

        if (scene.environmentTexture) {
            this._storedEnvironmentTexture = scene.environmentTexture;
            scene.environmentTexture = null;
        } else {
            scene.environmentTexture = this._storedEnvironmentTexture;
            this._storedEnvironmentTexture = null;
        }
    }

    updateEnvironmentTexture(file: File) {
        let isFileDDS = file.name.toLowerCase().indexOf(".dds") > 0;
        let isFileEnv = file.name.toLowerCase().indexOf(".env") > 0;
        if (!isFileDDS && !isFileEnv) {
            console.error("Unable to update environment texture. Please select a dds or env file.");
            return;
        }

        const scene = this.props.scene;
        BABYLON.Tools.ReadFile(file, (data) => {
            var blob = new Blob([data], { type: "octet/stream" });
            var url = URL.createObjectURL(blob);
            if (isFileDDS) {
                scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(url, scene, ".dds");
            }
            else {
                scene.environmentTexture = new BABYLON.CubeTexture(url, scene,
                    undefined, undefined, undefined,
                    () => {
                    },
                    (message) => {
                        if (message) {
                            console.error(message);
                        }
                    },
                    undefined, undefined,
                    ".env");
            }
        }, undefined, true);
    }

    updateGravity(newValue: Vector3) {
        const scene = this.props.scene;
        const physicsEngine = scene.getPhysicsEngine()!;

        physicsEngine.setGravity(newValue);
    }

    updateTimeStep(newValue: number) {
        const scene = this.props.scene;
        const physicsEngine = scene.getPhysicsEngine()!;

        physicsEngine.setTimeStep(newValue);
    }

    render() {
        const scene = this.props.scene;

        const renderingModeGroupObservable = new BABYLON.Observable<RadioButtonLineComponent>();

        const physicsEngine = scene.getPhysicsEngine();
        let dummy: Nullable<{ gravity: Vector3, timeStep: number }> = null;

        if (physicsEngine) {
            dummy = {
                gravity: physicsEngine.gravity,
                timeStep: physicsEngine.getTimeStep()
            }
        }

        return (
            <div className="pane">
                <LineContainerComponent title="RENDERING MODE">
                    <RadioButtonLineComponent onSelectionChangedObservable={renderingModeGroupObservable} label="Point" isSelected={() => scene.forcePointsCloud} onSelect={() => this.setRenderingModes(true, false)} />
                    <RadioButtonLineComponent onSelectionChangedObservable={renderingModeGroupObservable} label="Wireframe" isSelected={() => scene.forceWireframe} onSelect={() => this.setRenderingModes(false, true)} />
                    <RadioButtonLineComponent onSelectionChangedObservable={renderingModeGroupObservable} label="Solid" isSelected={() => !scene.forcePointsCloud && !scene.forceWireframe} onSelect={() => this.setRenderingModes(false, false)} />
                </LineContainerComponent>
                <LineContainerComponent title="ENVIRONMENT">
                    <Color3LineComponent label="Clear color" target={scene} propertyName="clearColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Clear color enabled" target={scene} propertyName="autoClear" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <Color3LineComponent label="Ambient color" target={scene} propertyName="ambientColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Environment texture (IBL)" isSelected={() => scene.environmentTexture != null} onSelect={() => this.switchIBL()} />
                    {
                        scene.environmentTexture &&
                        <TextureLinkLineComponent label="Env. texture" texture={scene.environmentTexture} onSelectionChangedObservable={this.props.onSelectionChangedObservable} />
                    }
                    <FileButtonLineComponent label="Update environment texture" onClick={(file) => this.updateEnvironmentTexture(file)} accept=".dds, .env" />
                    <FogPropertyGridComponent scene={scene} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
                {
                    dummy !== null &&
                    <LineContainerComponent title="PHYSICS" closed={true}>
                        <FloatLineComponent label="Time step" target={dummy} propertyName="timeStep" onChange={newValue => this.updateTimeStep(newValue)} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                        <Vector3LineComponent label="Gravity" target={dummy} propertyName="gravity" onChange={newValue => this.updateGravity(newValue)} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    </LineContainerComponent>
                }
                <LineContainerComponent title="COLLISIONS" closed={true}>
                    <Vector3LineComponent label="Gravity" target={scene} propertyName="gravity" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
            </div>
        );
    }
}