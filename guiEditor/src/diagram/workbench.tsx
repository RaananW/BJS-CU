import * as React from "react";
import { GlobalState } from '../globalState';
import { GUINode } from './guiNode';
import { Nullable } from 'babylonjs/types';
import {Control} from 'babylonjs-gui/2D/controls/control';
import { AdvancedDynamicTexture } from "babylonjs-gui/2D/advancedDynamicTexture";
import { Matrix, Vector2, Vector3 } from "babylonjs/Maths/math.vector";
import { Engine } from "babylonjs/Engines/engine";
import { Scene } from "babylonjs/scene";
import { Color4 } from "babylonjs/Maths/math.color";
import { ArcRotateCamera } from "babylonjs/Cameras/arcRotateCamera";
import { HemisphericLight } from "babylonjs/Lights/hemisphericLight";
import { Axis } from "babylonjs/Maths/math.axis";
import { Mesh } from "babylonjs/Meshes/mesh";
import { Plane } from "babylonjs/Maths/math.plane";
import { PointerEventTypes, PointerInfoPre } from "babylonjs/Events/pointerEvents";
import { EventState } from "babylonjs/Misc/observable";
import { IWheelEvent } from "babylonjs/Events/deviceInputEvents";
import { Epsilon } from "babylonjs/Maths/math.constants";

require("./workbenchCanvas.scss");

export interface IWorkbenchComponentProps {
    globalState: GlobalState
}

export type FramePortData = {
}

export const isFramePortData = (variableToCheck: any): variableToCheck is FramePortData => {
    if (variableToCheck) {
        return (variableToCheck as FramePortData) !== undefined;
    }
    else return false;
}

export class WorkbenchComponent extends React.Component<IWorkbenchComponentProps> {
    private _gridCanvas: HTMLDivElement;
    private _svgCanvas: HTMLElement;
    private _rootContainer: HTMLDivElement;
    private _guiNodes: GUINode[] = [];
    private _mouseStartPointX: Nullable<number> = null;
    private _mouseStartPointY: Nullable<number> = null
    private _textureMesh: Mesh;
    private _scene: Scene;
    private _selectedGuiNodes: GUINode[] = [];
    private _ctrlKeyIsPressed = false;

    public _frameIsMoving = false;
    public _isLoading = false;
    public isOverGUINode = false;
    private _panning: boolean;

    public get globalState(){
        return this.props.globalState;
    }

    public get nodes() {
        return this._guiNodes;
    }

    public get selectedGuiNodes() {
        return this._selectedGuiNodes;
    }

    constructor(props: IWorkbenchComponentProps) {
        super(props);
        props.globalState.onSelectionChangedObservable.add(selection => {  
            if(!this._ctrlKeyIsPressed && selection != null)
            {
                this.selectedGuiNodes.forEach(element => {
                element.isSelected = false;
                });
            } 
            if (!selection) {
                this._selectedGuiNodes = [];
            } 
            else {
                if (selection instanceof GUINode ) {
                    if (this._ctrlKeyIsPressed) {
                        if (this._selectedGuiNodes.indexOf(selection) === -1) {
                            this._selectedGuiNodes.push(selection);
                        }
                    } 
                    else {              
                        this._selectedGuiNodes = [selection];
                    }              
                } 
            }
        });

        this.props.globalState.hostDocument!.addEventListener("keyup", () => this.onKeyUp(), false);
        this.props.globalState.hostDocument!.addEventListener("keydown", evt => {         
            this._ctrlKeyIsPressed = evt.ctrlKey;
        }, false);
        this.props.globalState.hostDocument!.defaultView!.addEventListener("blur", () => {
            this._ctrlKeyIsPressed = false;
        }, false);     

        this.props.globalState.workbench = this;
    }
   
    clearGuiTexture() {
        while(this._guiNodes.length > 0) {
            this._guiNodes[this._guiNodes.length-1].dispose();
            this._guiNodes.pop();
        }
    }

    loadFromJson(serializationObject: any) {
        this.globalState.onSelectionChangedObservable.notifyObservers(null);
        this.clearGuiTexture();
        this.globalState.guiTexture.parseContent(serializationObject);
        this.props.globalState.workbench.loadFromGuiTexture();
    }    
    async loadFromSnippet(snippedID: string) {
        this.globalState.onSelectionChangedObservable.notifyObservers(null);
        this.clearGuiTexture();
        await this.globalState.guiTexture.parseFromSnippetAsync(snippedID);
        this.props.globalState.workbench.loadFromGuiTexture();
    }
    
    loadFromGuiTexture() {
        var children = this.globalState.guiTexture.getChildren();
        children[0].children.forEach(guiElement => {
            var newGuiNode = new GUINode(this.props.globalState, guiElement);
            this._guiNodes.push(newGuiNode);
        });
    }

    resizeGuiTexture(newvalue: Vector2) {
        this._textureMesh.scaling.x = newvalue.x;
        this._textureMesh.scaling.z = newvalue.y;
        this.globalState.guiTexture.scaleTo(newvalue.x, newvalue.y);
        this.globalState.guiTexture.markAsDirty();
        this.globalState.onResizeObservable.notifyObservers(newvalue);
    }

    onKeyUp() {        
        this._ctrlKeyIsPressed = false;
    }

    findNodeFromGuiElement(guiControl: Control) {
       return this._guiNodes.filter(n => n.guiControl === guiControl)[0];
    }

    reset() {
        for (var node of this._guiNodes) {
            node.dispose();
        }
        this._guiNodes = [];
        this._gridCanvas.innerHTML = "";
        this._svgCanvas.innerHTML = "";
    }

    appendBlock(guiElement: Control) {
        var newGuiNode = new GUINode(this.props.globalState, guiElement);
        this._guiNodes.push(newGuiNode);
        this.globalState.guiTexture.addControl(guiElement);  
        return newGuiNode;
    }

    componentDidMount() {
        this._rootContainer = this.props.globalState.hostDocument.getElementById("workbench-container") as HTMLDivElement;
        this._gridCanvas = this.props.globalState.hostDocument.getElementById("workbench-canvas-container") as HTMLDivElement;
        this._svgCanvas = this.props.globalState.hostDocument.getElementById("workbench-svg-container") as HTMLElement;        
    }    

    onMove(evt: React.PointerEvent) {        

        var pos = this.getGroundPosition();
        // Move or guiNodes
        if (this._mouseStartPointX != null && this._mouseStartPointY != null && !this._panning) {

            var x = this._mouseStartPointX;
            var y = this._mouseStartPointY;
            let selected = false;
            console.log(this.selectedGuiNodes);
            this.selectedGuiNodes.forEach(element => {
                //var zoom = this._camera.radius;

                if(pos) {
                    selected = element._onMove(new Vector2(pos.x, -pos.z), //need to add zoom factor here.
                    new Vector2( x, y), false) ||  selected;
                }
            });

            this._mouseStartPointX = pos? pos.x : this._mouseStartPointX;
            this._mouseStartPointY = pos? pos.z * -1 : this._mouseStartPointY; 
        }
    }

    public getGroundPosition() {
        var tex = this._textureMesh;
        // Use a predicate to get position on the ground
        var pickinfo = this._scene.pick(this._scene.pointerX, this._scene.pointerY, function (mesh) { return mesh == tex; });
        if (pickinfo?.hit) {
            return pickinfo.pickedPoint;
        }

        return null;
    }

    onDown(evt: React.PointerEvent<HTMLElement>) {
        this._rootContainer.setPointerCapture(evt.pointerId);

        if(!this.isOverGUINode) {
            this.props.globalState.onSelectionChangedObservable.notifyObservers(null);
        }

        var pos = this.getGroundPosition();
        this._mouseStartPointX = pos? pos.x : this._mouseStartPointX;
        this._mouseStartPointY = pos? -pos.z : this._mouseStartPointY; 
             
    }

    public isUp : boolean = true;
    onUp(evt: React.PointerEvent) {
        this._mouseStartPointX = null;
        this._mouseStartPointY = null;
        this._rootContainer.releasePointerCapture(evt.pointerId);   
        this.isUp = true;
    }

    public createGUICanvas() {
        
        // Get the canvas element from the DOM.
        const canvas = document.getElementById("workbench-canvas") as HTMLCanvasElement;

        // Associate a Babylon Engine to it.
        const engine = new Engine(canvas);
        
        // Create our first scene.
        this._scene = new Scene(engine);
        this._scene.clearColor = new Color4(0.2, 0.2, 0.3, 1.0);
        let camera = new ArcRotateCamera(
            "Camera", -Math.PI / 2, 0, 1024, Vector3.Zero(), this._scene);
        const light = new HemisphericLight(
            "light1", Axis.Y, this._scene);
        light.intensity = 0.9;
    
        let textureSize = 1200;
        this._textureMesh = Mesh.CreateGround("earth", 1, 1, 1, this._scene);
        this._textureMesh.scaling.x = textureSize;
        this._textureMesh.scaling.z = textureSize;
        this.globalState.guiTexture = AdvancedDynamicTexture.CreateForMesh(this._textureMesh, textureSize, textureSize);
        this._textureMesh.showBoundingBox = true;  
        this.addControls(this._scene, camera);
    
        this._scene.getEngine().onCanvasPointerOutObservable.clear();
        
        // Watch for browser/canvas resize events
        window.addEventListener("resize", function () {
        engine.resize();
        });

        this.props.globalState.onErrorMessageDialogRequiredObservable.notifyObservers(`Please note: This editor is still a work in progress. You may submit feedback to msDestiny14 on GitHub.`);
        engine.runRenderLoop(() => {this.updateGUIs(); this._scene.render()});
    };
    
    //Add map-like controls to an ArcRotate camera
    addControls(scene: Scene, camera: ArcRotateCamera) {
        camera.inertia = 0.7;
        camera.lowerRadiusLimit = 10;
        camera.upperRadiusLimit = 1500;
        camera.upperBetaLimit = Math.PI / 2 - 0.1;
        camera.angularSensibilityX = camera.angularSensibilityY = 500;
    
        const plane =
            Plane.FromPositionAndNormal(Vector3.Zero(), Axis.Y);
        
        const inertialPanning = Vector3.Zero();
        
        let initialPos = new Vector3(0,0,0);
        const panningFn = () => {
            const pos = this.getPosition(scene, camera, plane);
            this.panning(pos, initialPos, camera.inertia, inertialPanning);
        };
    
        const inertialPanningFn = () => {
            if (inertialPanning.x !== 0 || inertialPanning.y !== 0 || inertialPanning.z !== 0) {
                camera.target.addInPlace(inertialPanning);
                inertialPanning.scaleInPlace(camera.inertia);
                this.zeroIfClose(inertialPanning);
            }
        };
    
        const wheelPrecisionFn = () => {
            camera.wheelPrecision = 1 / camera.radius * 1000;
        };
    
        const zoomFn = (p: any,e:any) => {
            const delta = this.zoomWheel(p,e,camera);
            this.zooming(delta, scene, camera, plane, inertialPanning);
        }
        
        const removeObservers = () => {
            scene.onPointerObservable.removeCallback(panningFn);
        }
    
        scene.onPointerObservable.add((p, e) => {
            removeObservers();
            if (p.event.button !== 0) {
                initialPos = this.getPosition(scene, camera, plane);
                scene.onPointerObservable.add(panningFn, PointerEventTypes.POINTERMOVE);
                this._panning = true;
            }
            else {
                this._panning = false;
            }
        }, PointerEventTypes.POINTERDOWN);
    
        scene.onPointerObservable.add((p, e) => {
            removeObservers();
        }, PointerEventTypes.POINTERUP);
    
        scene.onPointerObservable.add(zoomFn, PointerEventTypes.POINTERWHEEL);
        scene.onBeforeRenderObservable.add(inertialPanningFn);
        scene.onBeforeRenderObservable.add(wheelPrecisionFn);
    
        // stop context menu showing on canvas right click
        scene.getEngine().getRenderingCanvas()?.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });
    }
    
    //Get pos on plane
    getPosition(scene: Scene, camera: ArcRotateCamera, plane: Plane) {
        const ray = scene.createPickingRay(
            scene.pointerX, scene.pointerY, Matrix.Identity(), camera, false);
        const distance = ray.intersectsPlane(plane);
    
        //not using this ray again, so modifying its vectors here is fine
        return distance !== null ?
            ray.origin.addInPlace(ray.direction.scaleInPlace(distance)) : Vector3.Zero();
    }
    
    //Return offsets for inertial panning given initial and current pointer positions
    panning(newPos: Vector3, initialPos: Vector3, inertia: number, ref: Vector3) {

        const directionToZoomLocation = initialPos.subtract(newPos);
        const panningX = directionToZoomLocation.x * (1-inertia);
        const panningZ = directionToZoomLocation.z * (1-inertia);
        ref.copyFromFloats(panningX, 0, panningZ);
        return ref;
    };
    
    //Get the wheel delta divided by the camera wheel precision
    zoomWheel(p: PointerInfoPre, e: EventState, camera: ArcRotateCamera) {
        const event = p.event as IWheelEvent;
        
        event.preventDefault();
        let delta = 0;
        if (event.deltaY) {
            delta = -event.deltaY;
        } else if (event.detail) {
            delta = -event.detail;
        }
        delta /= camera.wheelPrecision;
        return delta;
    }
    
    //Zoom to pointer position. Zoom amount determined by delta
    zooming(delta: number, scene: Scene, camera: ArcRotateCamera, plane :Plane, ref: Vector3) {
        let lr = camera.lowerRadiusLimit;
        let ur = camera.upperRadiusLimit;
        if(!lr || !ur){
            return;
        }
        if (camera.radius - lr < 1 && delta > 0) {
            return;
        } else if (ur - camera.radius < 1 && delta < 0) {
            return;
        }
        const inertiaComp = 1 - camera.inertia;
        if (camera.radius - (camera.inertialRadiusOffset + delta) / inertiaComp <
              lr) {
            delta = (camera.radius - lr) * inertiaComp - camera.inertialRadiusOffset;
        } else if (camera.radius - (camera.inertialRadiusOffset + delta) / inertiaComp >
                   ur) {
            delta = (camera.radius - ur) * inertiaComp - camera.inertialRadiusOffset;
        }
    
        const zoomDistance = delta / inertiaComp;
        const ratio = zoomDistance / camera.radius;
        const vec = this.getPosition(scene, camera, plane);
    
        const directionToZoomLocation = vec.subtract(camera.target);
        const offset = directionToZoomLocation.scale(ratio);
        offset.scaleInPlace(inertiaComp);
        ref.addInPlace(offset);
    
        camera.inertialRadiusOffset += delta;
    }
    
    //Sets x y or z of passed in vector to zero if less than Epsilon
    zeroIfClose(vec: Vector3) {
        if (Math.abs(vec.x) < Epsilon) {
            vec.x = 0;
        }
        if (Math.abs(vec.y) < Epsilon) {
            vec.y = 0;
        }
        if (Math.abs(vec.z) < Epsilon) {
            vec.z = 0;
        }
    }

    updateGUIs() {
        this._guiNodes.forEach(element => {
            element.updateVisual();
            
        });
    }
 
    render() {
 
        return <canvas id="workbench-canvas" 
        onPointerMove={evt => this.onMove(evt)}
        onPointerDown={evt =>  this.onDown(evt)}   
        onPointerUp={evt =>  this.onUp(evt)} 
        >   
        <div id="workbench-container">
            <div id="workbench-canvas-container">  
            </div>     
            <div id="frame-container">                        
            </div>
            <svg id="workbench-svg-container">
            </svg>                    
            <div id="selection-container">                        
            </div>
        </div>
        </canvas>
    }
}
