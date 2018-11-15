import * as React from "react";
import { Mesh, Observable } from "babylonjs";
import { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { LineContainerComponent } from "../../../lineContainerComponent";
import { TextLineComponent } from "../../../lines/textLineComponent";
import { CheckBoxLineComponent } from "../../../lines/checkBoxLineComponent";
import { Vector3LineComponent } from "../../../lines/vector3LineComponent";
import { SliderLineComponent } from "../../../lines/sliderLineComponent";
import { QuaternionLineComponent } from "../../../lines/quaternionLineComponent";
import { AxesViewerComponent } from "./axesViewerComponent";
import { FloatLineComponent } from "../../../lines/floatLineComponent";

interface IMeshPropertyGridComponentProps {
    mesh: Mesh,
    onSelectionChangedObservable?: Observable<any>,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class MeshPropertyGridComponent extends React.Component<IMeshPropertyGridComponentProps, { displayNormals: boolean, renderNormalVectors: boolean }> {
    constructor(props: IMeshPropertyGridComponentProps) {
        super(props);
        const mesh = this.props.mesh;

        this.state = { displayNormals: false, renderNormalVectors: mesh.metadata && mesh.metadata.normalLines }
    }

    renderNormalVectors() {
        const mesh = this.props.mesh;
        const scene = mesh.getScene();

        if (mesh.metadata && mesh.metadata.normalLines) {
            mesh.metadata.normalLines.dispose();
            mesh.metadata.normalLines = null;

            this.setState({ renderNormalVectors: false });
            return;
        }

        var normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        var positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);

        const color = BABYLON.Color3.White();
        const size = mesh.getBoundingInfo().diagonalLength * 0.05;

        var lines = [];
        for (var i = 0; i < normals!.length; i += 3) {
            var v1 = BABYLON.Vector3.FromArray(positions!, i);
            var v2 = v1.add(BABYLON.Vector3.FromArray(normals!, i).scaleInPlace(size));
            lines.push([v1, v2]);
        }

        var normalLines = BABYLON.MeshBuilder.CreateLineSystem("normalLines", { lines: lines }, scene);
        normalLines.color = color;
        normalLines.parent = mesh;

        if (!mesh.metadata) {
            mesh.metadata = {};
        }

        mesh.metadata.normalLines = normalLines;

        this.setState({ renderNormalVectors: true });
    }

    displayNormals() {
        const mesh = this.props.mesh;
        const scene = mesh.getScene();
        if (!mesh.material) {
            return;
        }

        if (mesh.material.getClassName() === "NormalMaterial") {
            mesh.material.dispose();

            mesh.material = mesh.metadata.originalMaterial;
            mesh.metadata.originalMaterial = null;
            this.setState({ displayNormals: false });
        } else {

            if (!(BABYLON as any).NormalMaterial) {
                this.setState({ displayNormals: true });
                BABYLON.Tools.LoadScript("https://preview.babylonjs.com/materialsLibrary/babylonjs.materials.js", () => {
                    this.displayNormals();
                });
                return;
            }

            if (!mesh.metadata) {
                mesh.metadata = {};
            }

            mesh.metadata.originalMaterial = mesh.material;
            const normalMaterial = new (BABYLON as any).NormalMaterial("normalMaterial", scene);
            normalMaterial.disableLighting = true;
            normalMaterial.sideOrientation = mesh.material.sideOrientation;
            normalMaterial.metadata = { hidden: true };
            mesh.material = normalMaterial;
            this.setState({ displayNormals: true });
        }
    }

    onMaterialLink() {
        if (!this.props.onSelectionChangedObservable) {
            return;
        }

        const mesh = this.props.mesh;
        this.props.onSelectionChangedObservable.notifyObservers(mesh.material)
    }

    convertPhysicsTypeToString(): string {
        const mesh = this.props.mesh;
        switch (mesh.physicsImpostor!.type) {
            case BABYLON.PhysicsImpostor.NoImpostor:
                return "No impostor";
            case BABYLON.PhysicsImpostor.SphereImpostor:
                return "Sphere";
            case BABYLON.PhysicsImpostor.BoxImpostor:
                return "Box";
            case BABYLON.PhysicsImpostor.PlaneImpostor:
                return "Plane";
            case BABYLON.PhysicsImpostor.MeshImpostor:
                return "Mesh";
            case BABYLON.PhysicsImpostor.CylinderImpostor:
                return "Cylinder";
            case BABYLON.PhysicsImpostor.ParticleImpostor:
                return "Particle";
            case BABYLON.PhysicsImpostor.HeightmapImpostor:
                return "Heightmap";
        }

        return "Unknown";
    }

    render() {
        const mesh = this.props.mesh;
        const scene = mesh.getScene();

        const displayNormals = mesh.material != null && mesh.material.getClassName() === "NormalMaterial";
        const renderNormalVectors = (mesh.metadata && mesh.metadata.normalLines) ? true : false;

        return (
            <div className="pane">
                <LineContainerComponent title="GENERAL">
                    <TextLineComponent label="ID" value={mesh.id} />
                    <TextLineComponent label="Unique ID" value={mesh.uniqueId.toString()} />
                    <TextLineComponent label="Class" value={mesh.getClassName()} />
                    <TextLineComponent label="Vertices" value={mesh.getTotalVertices().toString()} />
                    <TextLineComponent label="Faces" value={(mesh.getTotalIndices() / 3).toFixed(0)} />
                    <TextLineComponent label="Sub-meshes" value={mesh.subMeshes ? mesh.subMeshes.length.toString() : "0"} />
                    <TextLineComponent label="Has skeleton" value={mesh.skeleton ? "Yes" : "No"} />
                    <CheckBoxLineComponent label="IsEnabled" isSelected={() => mesh.isEnabled()} onSelect={(value) => mesh.setEnabled(value)} />
                    <CheckBoxLineComponent label="IsPickable" target={mesh} propertyName="isPickable" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    {
                        mesh.material &&
                        <TextLineComponent label="Material" value={mesh.material.name} onLink={() => this.onMaterialLink()} />
                    }
                </LineContainerComponent>
                <LineContainerComponent title="TRANSFORMS">
                    <Vector3LineComponent label="Position" target={mesh} propertyName="position" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    {
                        !mesh.rotationQuaternion &&
                        <Vector3LineComponent label="Rotation" target={mesh} propertyName="rotation" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    }
                    {
                        mesh.rotationQuaternion &&
                        <QuaternionLineComponent label="Rotation" target={mesh} propertyName="rotationQuaternion" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    }
                    <Vector3LineComponent label="Scaling" target={mesh} propertyName="scaling" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
                <LineContainerComponent title="DISPLAY" closed={true}>
                    <SliderLineComponent label="Visibility" target={mesh} propertyName="visibility" minimum={0} maximum={1} step={0.01} onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <FloatLineComponent label="Alpha index" target={mesh} propertyName="alphaIndex" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <CheckBoxLineComponent label="Receive shadows" target={mesh} propertyName="receiveShadows" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    {
                        mesh.isVerticesDataPresent(BABYLON.VertexBuffer.ColorKind) &&
                        <CheckBoxLineComponent label="Use vertex colors" target={mesh} propertyName="useVertexColors" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    }
                    {
                        scene.fogMode !== BABYLON.Scene.FOGMODE_NONE &&
                        <CheckBoxLineComponent label="Apply fog" target={mesh} propertyName="applyFog" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    }
                    {
                        !mesh.parent &&
                        <CheckBoxLineComponent label="Infinite distance" target={mesh} propertyName="infiniteDistance" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    }
                </LineContainerComponent>
                <LineContainerComponent title="ADVANCED" closed={true}>
                    {
                        mesh.useBones &&
                        <CheckBoxLineComponent label="Compute bones using shaders" target={mesh} propertyName="computeBonesUsingShaders" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    }
                    <CheckBoxLineComponent label="Collisions" target={mesh} propertyName="checkCollisions" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    <TextLineComponent label="Has normals" value={mesh.isVerticesDataPresent(BABYLON.VertexBuffer.NormalKind) ? "Yes" : "No"} />
                    <TextLineComponent label="Has vertex colors" value={mesh.isVerticesDataPresent(BABYLON.VertexBuffer.ColorKind) ? "Yes" : "No"} />
                    <TextLineComponent label="has UV set 0" value={mesh.isVerticesDataPresent(BABYLON.VertexBuffer.UVKind) ? "Yes" : "No"} />
                    <TextLineComponent label="has UV set 1" value={mesh.isVerticesDataPresent(BABYLON.VertexBuffer.UV2Kind) ? "Yes" : "No"} />
                    <TextLineComponent label="has UV set 2" value={mesh.isVerticesDataPresent(BABYLON.VertexBuffer.UV3Kind) ? "Yes" : "No"} />
                    <TextLineComponent label="has UV set 3" value={mesh.isVerticesDataPresent(BABYLON.VertexBuffer.UV4Kind) ? "Yes" : "No"} />
                    <TextLineComponent label="has tangents" value={mesh.isVerticesDataPresent(BABYLON.VertexBuffer.TangentKind) ? "Yes" : "No"} />
                    <TextLineComponent label="has matrix weights" value={mesh.isVerticesDataPresent(BABYLON.VertexBuffer.MatricesWeightsKind) ? "Yes" : "No"} />
                    <TextLineComponent label="has matrix indices" value={mesh.isVerticesDataPresent(BABYLON.VertexBuffer.MatricesIndicesKind) ? "Yes" : "No"} />
                </LineContainerComponent>
                {
                    mesh.physicsImpostor != null &&
                    <LineContainerComponent title="PHYSICS" closed={true}>
                        <FloatLineComponent label="Mass" target={mesh.physicsImpostor} propertyName="mass" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                        <FloatLineComponent label="Friction" target={mesh.physicsImpostor} propertyName="friction" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                        <FloatLineComponent label="Restitution" target={mesh.physicsImpostor} propertyName="restitution" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                        <TextLineComponent label="Type" value={this.convertPhysicsTypeToString()} />
                    </LineContainerComponent>
                }
                <LineContainerComponent title="DEBUG" closed={true}>
                    <CheckBoxLineComponent label="Show bounding box" target={mesh} propertyName="showBoundingBox" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                    {
                        mesh.material &&
                        <CheckBoxLineComponent label="Display normals" isSelected={() => displayNormals} onSelect={() => this.displayNormals()} />
                    }
                    {
                        mesh.isVerticesDataPresent(BABYLON.VertexBuffer.NormalKind) &&
                        <CheckBoxLineComponent label="Render vertex normals" isSelected={() => renderNormalVectors} onSelect={() => this.renderNormalVectors()} />
                    }
                    <AxesViewerComponent node={mesh} />
                </LineContainerComponent>
            </div>
        );
    }
}