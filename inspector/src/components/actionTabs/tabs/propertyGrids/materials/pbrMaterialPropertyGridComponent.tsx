import * as React from "react";
import { Observable, PBRMaterial, BaseTexture } from "babylonjs";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { LineContainerComponent } from "../../../lineContainerComponent";
import { Color3LineComponent } from "../../../lines/color3LineComponent";
import { CheckBoxLineComponent } from "../../../lines/checkBoxLineComponent";
import { SliderLineComponent } from "../../../lines/sliderLineComponent";
import { CommonMaterialPropertyGridComponent } from "./commonMaterialPropertyGridComponent";
import { TextureLinkLineComponent } from "../../../lines/textureLinkLineComponent";

interface IPBRMaterialPropertyGridComponentProps {
    material: PBRMaterial,
    onSelectionChangedObservable?: Observable<any>,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class PBRMaterialPropertyGridComponent extends React.Component<IPBRMaterialPropertyGridComponentProps> {
    constructor(props: IPBRMaterialPropertyGridComponentProps) {
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
                <TextureLinkLineComponent label="Albedo" texture={material.albedoTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Metallic" texture={material.metallicTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Reflection" texture={material.reflectionTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Refraction" texture={material.refractionTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Micro-surface" texture={material.microSurfaceTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Bump" texture={material.bumpTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Emissive" texture={material.emissiveTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Opacity" texture={material.opacityTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Ambient" texture={material.ambientTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
                <TextureLinkLineComponent label="Lightmap" texture={material.lightmapTexture} material={material} onSelectionChangedObservable={this.props.onSelectionChangedObservable} onDebugSelectionChangeObservable={onDebugSelectionChangeObservable} />
            </LineContainerComponent>
        )
    }

    render() {
        const material = this.props.material;

        return (
            <div className="pane">
                <CommonMaterialPropertyGridComponent material={material} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                {this.renderTextures()}
                <LineContainerComponent title="LIGHTING & COLORS">
                    <Color3LineComponent label="Albedo" target={material} propertyName="albedoColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <Color3LineComponent label="Reflectivity" target={material} propertyName="reflectivityColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <Color3LineComponent label="Emissive" target={material} propertyName="emissiveColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <Color3LineComponent label="Ambient" target={material} propertyName="ambientColor" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
                <LineContainerComponent title="LEVELS" closed={true}>
                    <SliderLineComponent label="Environment" target={material} propertyName="environmentIntensity" minimum={0} maximum={1} step={0.01} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <SliderLineComponent label="Metallic" target={material} propertyName="metallic" minimum={0} maximum={1} step={0.01} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <SliderLineComponent label="Micro-surface" target={material} propertyName="microSurface" minimum={0} maximum={1} step={0.01} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <SliderLineComponent label="Specular" target={material} propertyName="specularIntensity" minimum={0} maximum={1} step={0.01} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    {
                        material.bumpTexture &&
                        <SliderLineComponent label="Bump strength" target={material.bumpTexture} propertyName="level" minimum={0} maximum={2} step={0.01} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    }
                    {
                        material.ambientTexture &&
                        <SliderLineComponent label="Ambient strength" target={material} propertyName="ambientTextureStrength" minimum={0} maximum={1} step={0.01} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    }
                    {
                        material.reflectionTexture &&
                        <SliderLineComponent label="Reflection strength" target={material.reflectionTexture} propertyName="level" minimum={0} maximum={1} step={0.01} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    }
                </LineContainerComponent>
                <LineContainerComponent title="RENDERING" closed={true}>
                    <CheckBoxLineComponent label="Alpha from albedo" target={material} propertyName="useAlphaFromAlbedoTexture" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Ambient in grayscale" target={material} propertyName="useAmbientInGrayScale" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Radiance over alpha" target={material} propertyName="useRadianceOverAlpha" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Link refraction with transparency" target={material} propertyName="linkRefractionWithTransparency" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Micro-surface from ref. map alpha" target={material} propertyName="useMicroSurfaceFromReflectivityMapAlpha" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Specular over alpha" target={material} propertyName="useSpecularOverAlpha" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Specular anti-aliasing" target={material} propertyName="enableSpecularAntiAliasing" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
                <LineContainerComponent title="ADVANCED" closed={true}>
                    <CheckBoxLineComponent label="Radiance occlusion" target={material} propertyName="useRadianceOcclusion" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Horizon occlusion " target={material} propertyName="useHorizonOcclusion" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Unlit" target={material} propertyName="unlit" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
            </div>
        );
    }
}