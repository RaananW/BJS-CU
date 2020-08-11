import { IToolParameters, IToolData, IToolType } from '../textureEditorComponent';
import { PointerEventTypes, PointerInfo } from 'babylonjs/Events/pointerEvents';
import { TextBlock } from 'babylonjs-gui/2D/controls/textBlock';
import { Slider } from 'babylonjs-gui/2D/controls/sliders/slider';
import { Observer, Nullable } from 'babylonjs';

export const Paintbrush : IToolData = {
    name: 'Paintbrush',
    type: class implements IToolType {
        getParameters: () => IToolParameters;
        pointerObserver: Nullable<Observer<PointerInfo>>;
        isPainting: boolean;
        GUI: {
            radiusLabel : TextBlock;
            radiusSlider : Slider;
        };
        radius = 15;

        constructor(getParameters: () => IToolParameters) {
            this.getParameters = getParameters;
        }

        paint(pointerInfo : PointerInfo) {
            const {canvas2D, getMouseCoordinates, metadata, updateTexture, startPainting, stopPainting } = this.getParameters();
            const ctx = startPainting();//canvas2D.getContext('2d')!;
            let {x, y} = getMouseCoordinates(pointerInfo);
            if (metadata.select.x1 != -1) {
                x -= metadata.select.x1;
                y -= metadata.select.y1;
            }
            ctx.globalCompositeOperation = 'source-over';
            // ctx.strokeStyle = metadata.color;
            ctx.globalAlpha = metadata.alpha;
            // ctx.lineWidth = this.radius;
            // ctx.lineCap = 'round';
            // ctx.lineJoin = 'round';
            // ctx.lineTo(x, y);
            // ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, this.radius, 0, 360);
            ctx.fillStyle = metadata.color;
            ctx.fill();
            stopPainting(ctx);
            // updateTexture();
        }
        
        setup () {
            const {scene, getMouseCoordinates, GUI, canvas2D} = this.getParameters();
            const radiusLabel = new TextBlock();
            radiusLabel.text = `Brush Width: ${this.radius}`;
            radiusLabel.color = 'white';
            radiusLabel.height = '20px';
            radiusLabel.style = GUI.style;
            GUI.toolWindow.addControl(radiusLabel);
            const radiusSlider = new Slider();
            radiusSlider.height = '20px';
            radiusSlider.value = this.radius;
            radiusSlider.minimum = 1;
            radiusSlider.maximum = 100;
            radiusSlider.step = 1;
            radiusSlider.isThumbCircle = true;
            radiusSlider.background = '#a3a3a3';
            radiusSlider.color = '#33648f';
            radiusSlider.borderColor = '#33648f';
            radiusSlider.onValueChangedObservable.add(value => {
                this.radius = value;
                this.GUI.radiusLabel.text = `Brush Width: ${this.radius}`;
            });
            GUI.toolWindow.addControl(radiusSlider);
            this.GUI = {radiusLabel, radiusSlider};

            this.pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
                if (pointerInfo.pickInfo?.hit) {
                    if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                        if (pointerInfo.event.button == 0) {
                            this.isPainting = true;
                          }
                    }
                    if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.isPainting) {
                        this.paint(pointerInfo);
                    }
                }
                if (pointerInfo.type === PointerEventTypes.POINTERUP) {
                    if (pointerInfo.event.button == 0) {
                        this.isPainting = false;
                      }
                }
            });
            this.isPainting = false;
        }
        cleanup () {
            Object.entries(this.GUI).forEach(([key, value]) => value.dispose());
            this.isPainting = false;
            if (this.pointerObserver) {
                this.getParameters().scene.onPointerObservable.remove(this.pointerObserver);
            }
        }
    },
    usesWindow: true,
    icon: `PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHN0eWxlPSJmaWxsOm5vbmUiLz48cGF0aCBkPSJNMjksMTFhMy41
    NywzLjU3LDAsMCwxLDAsNS4wNkwxNywyOGEyLjM0LDIuMzQsMCwwLDEtMSwuNThMMTAuOTEsMzBhLjc1Ljc1LDAsMCwxLS45Mi0uOTJMMTEuMzgsMjRBMi4zNCwyLjM0LDAsMCwxLDEyLDIzbDEyLTEyQTMuNTcsMy41NywwLDAsMSwyOSwxMVpNMjMsMTQuMSwxMywy
    NGEuNjkuNjksMCwwLDAtLjE5LjMzbC0xLjA1LDMuODUsMy44NS0xQS42OS42OSwwLDAsMCwxNiwyN0wyNS45LDE3Wm0yLTItMSwxTDI3LDE2bDEtMUEyLjA4LDIuMDgsMCwxLDAsMjUsMTIuMDdaIiBzdHlsZT0iZmlsbDojZmZmIi8+PC9zdmc+`
};
