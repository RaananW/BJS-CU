module BABYLON {
    /**
     * Single axis drag gizmo
     */
    export class AxisDragGizmo extends Gizmo {
        private _dragBehavior:PointerDragBehavior;
        private _pointerObserver:Nullable<Observer<PointerInfo>> = null;
        /**
         * Creates an AxisDragGizmo
         * @param gizmoLayer The utility layer the gizmo will be added to
         * @param dragAxis The axis which the gizmo will be able to drag on
         * @param color The color of the gizmo
         */
        constructor(gizmoLayer:UtilityLayerRenderer, dragAxis:Vector3, color:Color3){
            super(gizmoLayer);
            
            // Create Material
            var coloredMaterial = new BABYLON.StandardMaterial("", gizmoLayer.utilityLayerScene);
            coloredMaterial.disableLighting = true;
            coloredMaterial.emissiveColor = color;

            var hoverMaterial = new BABYLON.StandardMaterial("", gizmoLayer.utilityLayerScene);
            hoverMaterial.disableLighting = true;
            hoverMaterial.emissiveColor = color.add(new Color3(0.2,0.2,0.2));

            // Build mesh on root node
            var arrow = new BABYLON.AbstractMesh("", gizmoLayer.utilityLayerScene);
            var arrowMesh = BABYLON.MeshBuilder.CreateCylinder("yPosMesh", {diameterTop:0, height: 2, tessellation: 96}, gizmoLayer.utilityLayerScene);
            var arrowTail = BABYLON.MeshBuilder.CreateCylinder("yPosMesh", {diameter:0.015, height: 0.3, tessellation: 96}, gizmoLayer.utilityLayerScene);
            arrow.addChild(arrowMesh);
            arrow.addChild(arrowTail);

            // Position arrow pointing in its drag axis
            arrowMesh.scaling.scaleInPlace(0.05);
            arrowMesh.material = coloredMaterial;
            arrowMesh.rotation.x = Math.PI/2;
            arrowMesh.position.z+=0.3;
            arrowTail.rotation.x = Math.PI/2;
            arrowTail.material = coloredMaterial;
            arrowTail.position.z+=0.15;
            arrow.lookAt(this._rootMesh.position.subtract(dragAxis));

            this._rootMesh.addChild(arrow)

            // Add drag behavior to handle events when the gizmo is dragged
            this._dragBehavior = new PointerDragBehavior({dragAxis: dragAxis});
            this._dragBehavior.moveAttached = false;
            this._rootMesh.addBehavior(this._dragBehavior);
            this._dragBehavior.onDragObservable.add((event)=>{
                if(!this.interactionsEnabled){
                    return;
                }
                if(this.attachedMesh){
                    this.attachedMesh.position.addInPlace(event.delta);
                }
            })

            this._pointerObserver = gizmoLayer.utilityLayerScene.onPointerObservable.add((pointerInfo, eventState)=>{
                if(pointerInfo.pickInfo && (this._rootMesh.getChildMeshes().indexOf(<Mesh>pointerInfo.pickInfo.pickedMesh) != -1)){
                    this._rootMesh.getChildMeshes().forEach((m)=>{
                        m.material = hoverMaterial;
                    });
                }else{
                    this._rootMesh.getChildMeshes().forEach((m)=>{
                        m.material = coloredMaterial;
                    });
                }
            });
        }
        protected _onInteractionsEnabledChanged(value:boolean){
            this._dragBehavior.enabled = value;
        }
        /**
         * Disposes of the gizmo
         */
        public dispose(){
            this.gizmoLayer.utilityLayerScene.onPointerObservable.remove(this._pointerObserver);
            this._dragBehavior.detach();
            super.dispose();
        } 
    }
}