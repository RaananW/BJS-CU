import * as React from "react";
import { GlobalState } from "../globalState";

require("./workbenchCanvas.scss");

export interface IGuiGizmoProps {
    globalState: GlobalState;
}


export class GuiGizmoComponent extends React.Component<IGuiGizmoProps> {

    scalePoints: HTMLDivElement[] = [];
    private _headerElement: any;
    private _borderElement: any;
    private _canvas: HTMLCanvasElement;

    constructor(props: IGuiGizmoProps) {
        super(props);
        this.props.globalState.guiGizmo = this;

        props.globalState.onSelectionChangedObservable.add((selection) => {
            if (selection) {
                this.scalePoints.forEach(scalePoint => {
                    scalePoint.style.display = "flex";
                });
            }
            else {
                this.scalePoints.forEach(scalePoint => {
                    scalePoint.style.display = "none";
                });
            }
        });

    }

    componentDidMount() {
    }

    onMove(evt: React.PointerEvent) {
    }

    onDown(evt: React.PointerEvent<HTMLElement>) {
    }


    updateGizmo() {
        const selectedGuiNodes = this.props.globalState.workbench.selectedGuiNodes;
        if (selectedGuiNodes.length > 0) {
            const node = selectedGuiNodes[0];
            console.log("selected");

            this.scalePoints.forEach(scalePoint => {
                scalePoint.style.left = node._currentMeasure.left + "px";
                scalePoint.style.top = node._currentMeasure.top + "px";

                console.log(node._currentMeasure.left.toString());
                console.log(node._currentMeasure.top.toString());


            });
        }

    }

    createBaseGizmo() {

        // Get the canvas element from the DOM.
        const canvas = document.getElementById("workbench-canvas") as HTMLCanvasElement;
        this._canvas = canvas;

        for (let i = 0; i < 4; ++i) {
            let scalePoint = canvas.ownerDocument!.createElement("div");
            scalePoint.className = "ge-scalePoint";
            canvas.parentElement?.appendChild(scalePoint);
            scalePoint.style.position = "absolute";
            scalePoint.style.left = i * 100 + 'px';
            scalePoint.style.top = i * 100 + 'px';
            scalePoint.style.transform = "translate(-50%, -50%)";
            this.scalePoints.push(scalePoint);
        }
        /*const root = canvas;
        this.element = root.ownerDocument!.createElement("div");
        this.element.classList.add("frame-box");
        root.appendChild(this.element);

        this._headerElement = root.ownerDocument!.createElement("div");
        this._headerElement.classList.add("frame-box-header");

        this.element.appendChild(this._headerElement);

        this._borderElement = root.ownerDocument!.createElement("div");
        this._borderElement.classList.add("frame-box-border");

        this.element.appendChild(this._borderElement);*/

        // add resizing side handles

        /*const rightHandle: HTMLDivElement = root.ownerDocument!.createElement("div");
        rightHandle.className = "handle right-handle";
        this.element.appendChild(rightHandle);
        rightHandle.addEventListener("pointerdown", this._onRightHandlePointerDown);

        const leftHandle: HTMLDivElement = root.ownerDocument!.createElement("div");
        leftHandle.className = "handle left-handle";
        this.element.appendChild(leftHandle);
        leftHandle.addEventListener("pointerdown", this._onLeftHandlePointerDown);

        const bottomHandle: HTMLDivElement = root.ownerDocument!.createElement("div");
        bottomHandle.className = "handle bottom-handle";
        this.element.appendChild(bottomHandle);
        bottomHandle.addEventListener("pointerdown", this._onBottomHandlePointerDown);

        const topHandle: HTMLDivElement = root.ownerDocument!.createElement("div");
        topHandle.className = "handle top-handle";
        this.element.appendChild(topHandle);
        topHandle.addEventListener("pointerdown", this._onTopHandlePointerDown);

        const topRightCornerHandle: HTMLDivElement = root.ownerDocument!.createElement("div");
        topRightCornerHandle.className = "handle right-handle top-right-corner-handle";
        this.element.appendChild(topRightCornerHandle);
        topRightCornerHandle.addEventListener("pointerdown", this._onTopRightHandlePointerDown);

        const bottomRightCornerHandle: HTMLDivElement = root.ownerDocument!.createElement("div");
        bottomRightCornerHandle.className = "handle right-handle bottom-right-corner-handle";
        this.element.appendChild(bottomRightCornerHandle);
        bottomRightCornerHandle.addEventListener("pointerdown", this._onBottomRightHandlePointerDown);

        const topLeftCornerHandle: HTMLDivElement = root.ownerDocument!.createElement("div");
        topLeftCornerHandle.className = "handle left-handle top-left-corner-handle";
        this.element.appendChild(topLeftCornerHandle);
        topLeftCornerHandle.addEventListener("pointerdown", this._onTopLeftHandlePointerDown);

        const bottomLeftCornerHandle: HTMLDivElement = root.ownerDocument!.createElement("div");
        bottomLeftCornerHandle.className = "handle left-handle bottom-left-corner-handle";
        this.element.appendChild(bottomLeftCornerHandle);
        bottomLeftCornerHandle.addEventListener("pointerdown", this._onBottomLeftHandlePointerDown);*/

    }
    private _onRightHandlePointerDown(arg0: string, _onRightHandlePointerDown: any) {
        throw new Error("Method not implemented.");
    }


    render() {
        return (
            null
        );
    }
}
