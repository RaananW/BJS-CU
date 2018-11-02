import * as React from "react";
import { Scene, AbstractMesh } from "babylonjs";
import { CheckBoxLineComponent } from "../../lines/checkBoxLineComponent";

interface IGridPropertyGridComponentProps {
    scene: Scene
}

export class GridPropertyGridComponent extends React.Component<IGridPropertyGridComponentProps, { isEnabled: boolean }> {
    private _gridMesh: AbstractMesh;

    constructor(props: IGridPropertyGridComponentProps) {
        super(props);
        this.state = { isEnabled: false };
    }

    componentWillMount() {
        const scene = BABYLON.UtilityLayerRenderer.DefaultKeepDepthUtilityLayer.utilityLayerScene;

        for (var mesh of scene.meshes) {
            if (mesh.metadata && mesh.metadata.isInspectorGrid) {
                this._gridMesh = mesh;
                this.setState({ isEnabled: true });
                return;
            }
        }
    }

    componentWillUnmount() {
    }

    addOrRemoveGrid() {
        const scene = BABYLON.UtilityLayerRenderer.DefaultKeepDepthUtilityLayer.utilityLayerScene;

        if (!(BABYLON as any).GridMaterial) {
            this.setState({ isEnabled: true });
            BABYLON.Tools.LoadScript("https://preview.babylonjs.com/materialsLibrary/babylonjs.materials.min.js", () => {
                this.addOrRemoveGrid();
            });
            return;
        }

        if (!this._gridMesh) {
            var extend = this.props.scene.getWorldExtends();
            var width = extend.max.x - extend.min.x;
            var depth = extend.max.z - extend.min.z;

            this._gridMesh = BABYLON.Mesh.CreateGround("grid", width, depth, 1, scene);
            if (!this._gridMesh.metadata) {
                this._gridMesh.metadata = {}
            }
            this._gridMesh.metadata.isInspectorGrid = true;
            this._gridMesh.isPickable = false;

            var groundMaterial = new (BABYLON as any).GridMaterial("GridMaterial", scene);
            groundMaterial.majorUnitFrequency = width / 10;
            groundMaterial.minorUnitVisibility = 0.3;
            groundMaterial.gridRatio = 1;
            groundMaterial.backFaceCulling = false;
            groundMaterial.mainColor = new BABYLON.Color3(1, 1, 1);
            groundMaterial.lineColor = new BABYLON.Color3(1.0, 1.0, 1.0);
            groundMaterial.opacity = 0.8;
            groundMaterial.zOffset = 1.0;
            groundMaterial.opacityTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/backgroundGround.png", scene);

            this._gridMesh.material = groundMaterial;

            this.setState({ isEnabled: true });
            return;
        }

        this.setState({ isEnabled: !this.state.isEnabled });
        this._gridMesh.setEnabled(!this._gridMesh.isEnabled());
    }

    render() {

        return (
            <div>
                <CheckBoxLineComponent label="Render grid" isSelected={() => this.state.isEnabled} onSelect={() => this.addOrRemoveGrid()} />
            </div>
        );
    }
}