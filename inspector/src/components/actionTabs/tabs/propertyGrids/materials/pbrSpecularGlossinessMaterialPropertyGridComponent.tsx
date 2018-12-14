import * as React from "react";
import { Observable, PBRSpecularGlossinessMaterial, BaseTexture } from "babylonjs";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { LineContainerComponent } from "../../../lineContainerComponent";
import { Color3LineComponent } from "../../../lines/color3LineComponent";
import { SliderLineComponent } from "../../../lines/sliderLineComponent";
import { CommonMaterialPropertyGridComponent } from "./commonMaterialPropertyGridComponent";
import { TextureLinkLineComponent } from "../../../lines/textureLinkLineComponent";
import { LockObject } from "../lockObject";

interface IPBRSpecularGlossinessMaterialPropertyGridComponentProps {
    material: PBRSpecularGlossinessMaterial,
    lockObject: LockObject,
    onSelectionChangedObservable?: Observable<any>,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class PBRSpecularGlossinessMaterialPropertyGridComponent extends React.Component<IPBRSpecularGlossinessMaterialPropertyGridComponentProps> {
    constructor(props: IPBRSpecularGlossinessMaterialPropertyGridComponentProps) {
        super(props);
    }

    renderTextures() {
        const material = this.props.material;

        if (material.getActiveTextures().length === 0) {
            return null;
        }

        const onDebugSelectionChangeObservable = new BABYLON.Observable<BaseTexture>();

        return (
            <LineContainerComponent title="TEXTURES">
                <TextureLinkLineComponent label="Diffuse" texture={material.diffuseTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Specular glossiness" texture={material.specularGlossinessTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Environment" texture={material.environmentTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Emissive" texture={material.emissiveTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Lightmap" texture={material.lightmapTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
            </LineContainerComponent>
        )
    }

    render() {
        const material = this.props.material;

        return (
            <div className="pane">
                <CommonMaterialPropertyGridComponent lockObject={this.props.lockObject} material={material} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                {this.renderTextures()}
                <LineContainerComponent title="LIGHTING & COLORS">
                    <Color3LineComponent label="Diffuse" target={material} propertyName="diffuseColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <Color3LineComponent label="Specular" target={material} propertyName="specularColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
                <LineContainerComponent title="LEVELS" closed={true}>
                    <SliderLineComponent label="Glossiness" target={material} propertyName="glossiness" minimum={0} maximum={1} step={0.01} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
            </div>
        );
    }
}