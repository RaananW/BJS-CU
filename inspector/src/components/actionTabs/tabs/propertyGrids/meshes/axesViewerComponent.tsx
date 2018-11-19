import * as React from "react";
import { TransformNode, Vector3, Tmp, AxesViewer } from "babylonjs";
import { CheckBoxLineComponent } from "../../../lines/checkBoxLineComponent";

interface IAxisViewerComponentProps {
    node: TransformNode;
}

export class AxesViewerComponent extends React.Component<IAxisViewerComponentProps, { displayAxis: boolean }> {
    constructor(props: IAxisViewerComponentProps) {
        super(props);
        const node = this.props.node;

        if (!node.reservedDataStore) {
            node.reservedDataStore = {};
        }

        this.state = { displayAxis: (node.reservedDataStore && node.reservedDataStore.axisViewer) ? true : false };
    }

    displayAxes() {
        const node = this.props.node;
        const scene = node.getScene();

        if (node.reservedDataStore.axisViewer) {
            node.reservedDataStore.axisViewer.dispose();
            node.reservedDataStore.axisViewer = null;

            scene.onBeforeRenderObservable.remove(node.reservedDataStore.onBeforeRenderObserver);
            node.reservedDataStore.onBeforeRenderObserver = null;

            this.setState({ displayAxis: false });

            return;
        }

        const viewer = new AxesViewer(scene);
        node.reservedDataStore.axisViewer = viewer;
        const x = new Vector3(1, 0, 0);
        const y = new Vector3(0, 1, 0);
        const z = new Vector3(0, 0, 1);

        viewer.xAxisMesh!.reservedDataStore = { hidden: true };
        viewer.yAxisMesh!.reservedDataStore = { hidden: true };
        viewer.zAxisMesh!.reservedDataStore = { hidden: true };

        node.reservedDataStore.onBeforeRenderObserver = scene.onBeforeRenderObservable.add(() => {
            let matrix = node.getWorldMatrix();
            let extend = Tmp.Vector3[0];
            const worldExtend = scene.getWorldExtends();
            worldExtend.max.subtractToRef(worldExtend.min, extend);
            extend.scaleInPlace(0.5 * 0.5);

            viewer.scaleLines = Math.max(extend.x, extend.y, extend.z) * 2;
            viewer.update(node.getAbsolutePosition(), Vector3.TransformNormal(x, matrix), Vector3.TransformNormal(y, matrix), Vector3.TransformNormal(z, matrix));
        });

        this.setState({ displayAxis: true });
    }

    render() {
        return (
            <CheckBoxLineComponent label="Display axes" isSelected={() => this.state.displayAxis} onSelect={() => this.displayAxes()} />
        );
    }
}