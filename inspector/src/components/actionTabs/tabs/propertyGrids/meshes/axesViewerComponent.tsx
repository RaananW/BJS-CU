import * as React from "react";
import { TransformNode } from "babylonjs";
import { CheckBoxLineComponent } from "../../../lines/checkBoxLineComponent";

interface IAxisViewerComponentProps {
    node: TransformNode
}

export class AxesViewerComponent extends React.Component<IAxisViewerComponentProps, { displayAxis: boolean }> {
    constructor(props: IAxisViewerComponentProps) {
        super(props);
        const node = this.props.node;

        if (!node.metadata) {
            node.metadata = {};
        }

        this.state = { displayAxis: (node.metadata && node.metadata.axisViewer) ? true : false }
    }

    displayAxes() {
        const node = this.props.node;
        const scene = node.getScene();

        if (node.metadata.axisViewer) {
            node.metadata.axisViewer.dispose();
            node.metadata.axisViewer = null;

            scene.onBeforeRenderObservable.remove(node.metadata.onBeforeRenderObserver);
            node.metadata.onBeforeRenderObserver = null;

            this.setState({ displayAxis: false });

            return;
        }

        const viewer = new BABYLON.Debug.AxesViewer(scene);
        node.metadata.axisViewer = viewer;
        const x = new BABYLON.Vector3(1, 0, 0);
        const y = new BABYLON.Vector3(0, 1, 0);
        const z = new BABYLON.Vector3(0, 0, 1);

        node.metadata.onBeforeRenderObserver = scene.onBeforeRenderObservable.add(() => {
            let matrix = node.getWorldMatrix();
            let extend = BABYLON.Tmp.Vector3[0];
            const worldExtend = scene.getWorldExtends();
            worldExtend.max.subtractToRef(worldExtend.min, extend);
            extend.scaleInPlace(0.5 * 0.5);

            viewer.scaleLines = Math.max(extend.x, extend.y, extend.z) * 2;
            viewer.update(node.getAbsolutePosition(), BABYLON.Vector3.TransformNormal(x, matrix), BABYLON.Vector3.TransformNormal(y, matrix), BABYLON.Vector3.TransformNormal(z, matrix));
        });

        this.setState({ displayAxis: true });
    }

    render() {
        return (
            <CheckBoxLineComponent label="Display axes" isSelected={() => this.state.displayAxis} onSelect={() => this.displayAxes()} />
        )
    }
}