import * as React from "react";
import { Material, Observable } from "babylonjs";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { CheckBoxLineComponent } from "../../../lines/checkBoxLineComponent";
import { SliderLineComponent } from "../../../lines/sliderLineComponent";
import { LineContainerComponent } from "../../../lineContainerComponent";
import { TextLineComponent } from "../../../lines/textLineComponent";
import { OptionsLineComponent } from "../../../lines/optionsLineComponent";

interface ICommonMaterialPropertyGridComponentProps {
    material: Material,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class CommonMaterialPropertyGridComponent extends React.Component<ICommonMaterialPropertyGridComponentProps> {
    constructor(props: ICommonMaterialPropertyGridComponentProps) {
        super(props);
    }

    render() {
        const material = this.props.material;

        var orientationOptions = [
            { label: "Clockwise", value: BABYLON.Material.ClockWiseSideOrientation },
            { label: "Counterclockwise", value: BABYLON.Material.CounterClockWiseSideOrientation }
        ]

        var transparencyModeOptions = [
            { label: "Opaque", value: BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE },
            { label: "Alpha test", value: BABYLON.PBRMaterial.PBRMATERIAL_ALPHATEST },
            { label: "Alpha blend", value: BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND },
            { label: "Alpha blend and test", value: BABYLON.PBRMaterial.PBRMATERIAL_ALPHATESTANDBLEND },
        ];

        var alphaModeOptions = [
            { label: "Combine", value: BABYLON.Engine.ALPHA_COMBINE },
            { label: "One one", value: BABYLON.Engine.ALPHA_ONEONE },
            { label: "Add", value: BABYLON.Engine.ALPHA_ADD },
            { label: "Subtract", value: BABYLON.Engine.ALPHA_SUBTRACT },
            { label: "Multiply", value: BABYLON.Engine.ALPHA_MULTIPLY },
            { label: "Maximized", value: BABYLON.Engine.ALPHA_MAXIMIZED },
            { label: "Pre-multiplied", value: BABYLON.Engine.ALPHA_PREMULTIPLIED },
        ];

        return (
            <div>
                <LineContainerComponent title="GENERAL">
                    <TextLineComponent label="ID" value={material.id} />
                    <TextLineComponent label="Unique ID" value={material.uniqueId.toString()} />
                    <TextLineComponent label="Class" value={material.getClassName()} />
                    <CheckBoxLineComponent label="Backface culling" target={material} propertyName="backFaceCulling" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <OptionsLineComponent label="Orientation" options={orientationOptions} target={material} propertyName="sideOrientation" onPropertyChangedObservable={this.props.onPropertyChangedObservable} onSelect={value => this.setState({ mode: value })} />
                    <CheckBoxLineComponent label="Disable lighting" target={material} propertyName="disableLighting" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Disable depth write" target={material} propertyName="disableDepthWrite" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Need depth pre-pass" target={material} propertyName="needDepthPrePass" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Wireframe" target={material} propertyName="wireframe" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Point cloud" target={material} propertyName="pointsCloud" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <SliderLineComponent label="Point size" target={material} propertyName="pointSize" minimum={0} maximum={100} step={0.1} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <SliderLineComponent label="Z-offset" target={material} propertyName="zOffset" minimum={-10} maximum={10} step={0.1} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
                <LineContainerComponent title="TRANSPARENCY">
                    <SliderLineComponent label="Alpha" target={material} propertyName="alpha" minimum={0} maximum={1} step={0.01} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    {
                        (material as any).transparencyMode !== undefined &&
                        <OptionsLineComponent label="Transparency mode" options={transparencyModeOptions} target={material} propertyName="transparencyMode" onPropertyChangedObservable={this.props.onPropertyChangedObservable} onSelect={value => this.setState({ transparencyMode: value })} />
                    }
                    <OptionsLineComponent label="Alpha mode" options={alphaModeOptions} target={material} propertyName="alphaMode" onPropertyChangedObservable={this.props.onPropertyChangedObservable} onSelect={value => this.setState({ alphaMode: value })} />
                </LineContainerComponent>
            </div>
        );
    }
}