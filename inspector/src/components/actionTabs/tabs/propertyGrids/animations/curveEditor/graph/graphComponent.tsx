import * as React from "react";
import { GlobalState } from "../../../../../../globalState";
import { Context } from "../context";
import { Animation } from "babylonjs/Animations/animation";
import { Curve } from "./curve";
import { KeyPointComponent } from "./keyPoint";
import { CurveComponent } from "./curveComponent";
import { Nullable } from "babylonjs/types";
import { Vector2 } from "babylonjs/Maths/math.vector";
import { Observer } from "babylonjs/Misc/observable";
import { IAnimationKey } from "babylonjs/Animations/animationKey";

interface IGraphComponentProps {
    globalState: GlobalState;
    context: Context;
}

interface IGraphComponentState {
}

export class GraphComponent extends React.Component<
IGraphComponentProps,
IGraphComponentState
> {
    private readonly _MinScale = 0.5;
    private readonly _MaxScale = 4;
    private readonly _GraphAbsoluteWidth = 788;
    private readonly _GraphAbsoluteHeight = 357;

    private _viewWidth = 788;
    private _viewCurveWidth = 788;
    private _viewHeight = 357;
    private _viewScale = 1;
    private _offsetX = 0;
    private _offsetY = 0;
    
    private _graphOffsetX = 30;

    private _minValue: number;
    private _maxValue: number;
    private _minFrame: number;
    private _maxFrame: number;
    private _svgHost: React.RefObject<SVGSVGElement>;
    private _svgHost2: React.RefObject<SVGSVGElement>;
    private _curves: Curve[];

    private _pointerIsDown: boolean;
    private _sourcePointerX: number;
    private _sourcePointerY: number;

    private _currentAnimation: Nullable<Animation>;
   
    private _onActiveAnimationChangedObserver: Nullable<Observer<void>>;

    constructor(props: IGraphComponentProps) {
        super(props);

        this.state = { };
        
        this._svgHost = React.createRef();
        this._svgHost2 = React.createRef();

        this._evaluateKeys();

        this.props.context.onHostWindowResized.add(() => {
            this._computeSizes();
        });

        this._onActiveAnimationChangedObserver = this.props.context.onActiveAnimationChanged.add(() => {
            if (this._currentAnimation === this.props.context.activeAnimation) {
                return;
            }

            this._currentAnimation = this.props.context.activeAnimation;
            this._computeSizes();
            this._evaluateKeys();
            this.forceUpdate();
        });

        this.props.context.onFrameRequired.add(() => {
            this._frame();
            this.forceUpdate();
        });

        this.props.context.onDeleteKeyActiveKeyPoints.add(() => { // Delete keypoint
            if (!this._currentAnimation || !this.props.context.activeKeyPoints) {
                return;
            }

            let keys = this._currentAnimation.getKeys()
            let newKeys = keys.slice(0);
            let deletedFrame: Nullable<number> = null;            

            for (var keyPoint of this.props.context.activeKeyPoints) {
                // Cannot delete 0 and last
                if (keyPoint.props.keyId === 0 || keyPoint.props.keyId === keys.length - 1) {
                    continue;
                }

                let key = keys[keyPoint.props.keyId];

                let keyIndex = newKeys.indexOf(key);
                if (keyIndex > -1) {
                    newKeys.splice(keyIndex, 1);

                    if (deletedFrame === null) {
                        deletedFrame = key.frame;
                    }
                }
            }

            this.props.context.stop();
            this._currentAnimation.setKeys(newKeys);
            if (deletedFrame !== null) {
                this.props.context.moveToFrame(deletedFrame)
            }

            this.props.context.activeKeyPoints = [];
            this._currentAnimation = null;

            this.props.context.onActiveAnimationChanged.notifyObservers();
        });
    }

    componentWillUnmount() {
        if (this._onActiveAnimationChangedObserver) {
            this.props.context.onActiveAnimationChanged.remove(this._onActiveAnimationChangedObserver);
        }
    }

    private _computeSizes() {
        if (!this._svgHost.current || !this._svgHost2.current) {
            return;
        }

        this._viewWidth = this._svgHost.current.clientWidth;
        this._viewCurveWidth = this._svgHost2.current.clientWidth;
        this._viewHeight = this._svgHost.current.clientHeight;
        this.forceUpdate();
    }

    private _evaluateKeys() {
        if (!this.props.context.activeAnimation) {
            this._curves = [];
            return;
        }
        
        let animation = this.props.context.activeAnimation;
        let keys = animation.getKeys();

        this._curves = [];

        switch (animation.dataType) {
            case Animation.ANIMATIONTYPE_FLOAT:
                this._curves.push(new Curve("#DB3E3E", animation)); 
            break;
            case Animation.ANIMATIONTYPE_VECTOR2:
                this._curves.push(new Curve("#DB3E3E", animation, "x")); 
                this._curves.push(new Curve("#51E22D", animation, "y")); 
            case Animation.ANIMATIONTYPE_VECTOR3:
                this._curves.push(new Curve("#DB3E3E", animation, "x")); 
                this._curves.push(new Curve("#51E22D", animation, "y")); 
                this._curves.push(new Curve("#00A3FF", animation, "z")); 
                break;
            case Animation.ANIMATIONTYPE_COLOR3:
                this._curves.push(new Curve("#DB3E3E", animation, "r")); 
                this._curves.push(new Curve("#51E22D", animation, "g")); 
                this._curves.push(new Curve("#00A3FF", animation, "b")); 
                break;
            case Animation.ANIMATIONTYPE_QUATERNION:
                this._curves.push(new Curve("#DB3E3E", animation, "x")); 
                this._curves.push(new Curve("#51E22D", animation, "y")); 
                this._curves.push(new Curve("#00A3FF", animation, "z")); 
                this._curves.push(new Curve("#8700FF", animation, "w")); 
                break;
            case Animation.ANIMATIONTYPE_COLOR4:
                this._curves.push(new Curve("#DB3E3E", animation, "r")); 
                this._curves.push(new Curve("#51E22D", animation, "g")); 
                this._curves.push(new Curve("#00A3FF", animation, "b")); 
                this._curves.push(new Curve("#8700FF", animation, "a")); 
                break;
        }

        let values = this._extractValuesFromKeys(keys, animation.dataType, true);

        this._minValue = values.min;
        this._maxValue = values.max;

        this._minFrame = keys[0].frame;
        this._maxFrame = keys[keys.length - 1].frame;

        this._frame();
    }

    private _extractValuesFromKeys(keys: IAnimationKey[], dataType: number, pushToCurves: boolean) {
        let minValue = Number.MAX_VALUE;
        let maxValue = -Number.MAX_VALUE;

        for (var key of keys) {
            switch (dataType) {
                case Animation.ANIMATIONTYPE_FLOAT:
                    minValue = Math.min(minValue, key.value);
                    maxValue = Math.max(maxValue, key.value);

                    if (pushToCurves) {
                        this._curves[0].keys.push(new Vector2(key.frame, key.value));
                    }
                    break;
                case Animation.ANIMATIONTYPE_VECTOR2:
                    minValue = Math.min(minValue, key.value.x);
                    minValue = Math.min(minValue, key.value.y);
                    maxValue = Math.max(maxValue, key.value.x);
                    maxValue = Math.max(maxValue, key.value.y);

                    if (pushToCurves) {
                        this._curves[0].keys.push(new Vector2(key.frame, key.value.x));
                        this._curves[1].keys.push(new Vector2(key.frame, key.value.y));
                    }
                    break;
                case Animation.ANIMATIONTYPE_VECTOR3:
                    minValue = Math.min(minValue, key.value.x);
                    minValue = Math.min(minValue, key.value.y);
                    minValue = Math.min(minValue, key.value.z);
                    maxValue = Math.max(maxValue, key.value.x);
                    maxValue = Math.max(maxValue, key.value.y);
                    maxValue = Math.max(maxValue, key.value.z);
                    
                    if (pushToCurves) {
                        this._curves[0].keys.push(new Vector2(key.frame, key.value.x));
                        this._curves[1].keys.push(new Vector2(key.frame, key.value.y));
                        this._curves[2].keys.push(new Vector2(key.frame, key.value.z));
                    }
                    break;
                case Animation.ANIMATIONTYPE_COLOR3:
                    minValue = Math.min(minValue, key.value.r);
                    minValue = Math.min(minValue, key.value.g);
                    minValue = Math.min(minValue, key.value.b);
                    maxValue = Math.max(maxValue, key.value.r);
                    maxValue = Math.max(maxValue, key.value.g);
                    maxValue = Math.max(maxValue, key.value.b);

                    if (pushToCurves) {
                        this._curves[0].keys.push(new Vector2(key.frame, key.value.r));
                        this._curves[1].keys.push(new Vector2(key.frame, key.value.g));
                        this._curves[2].keys.push(new Vector2(key.frame, key.value.b));
                    }
                    break;                    
                case Animation.ANIMATIONTYPE_QUATERNION:
                    minValue = Math.min(minValue, key.value.x);
                    minValue = Math.min(minValue, key.value.y);
                    minValue = Math.min(minValue, key.value.z);
                    minValue = Math.min(minValue, key.value.w);
                    maxValue = Math.max(maxValue, key.value.x);
                    maxValue = Math.max(maxValue, key.value.y);
                    maxValue = Math.max(maxValue, key.value.z);
                    maxValue = Math.max(maxValue, key.value.w);
                    
                    if (pushToCurves) {
                        this._curves[0].keys.push(new Vector2(key.frame, key.value.x));
                        this._curves[1].keys.push(new Vector2(key.frame, key.value.y));
                        this._curves[2].keys.push(new Vector2(key.frame, key.value.z));  
                        this._curves[3].keys.push(new Vector2(key.frame, key.value.w));     
                    }                   
                    break;
                case Animation.ANIMATIONTYPE_COLOR4:
                    minValue = Math.min(minValue, key.value.r);
                    minValue = Math.min(minValue, key.value.g);
                    minValue = Math.min(minValue, key.value.b);
                    minValue = Math.min(minValue, key.value.a);
                    maxValue = Math.max(maxValue, key.value.r);
                    maxValue = Math.max(maxValue, key.value.g);
                    maxValue = Math.max(maxValue, key.value.b);
                    maxValue = Math.max(maxValue, key.value.a);
                    
                    if (pushToCurves) {
                        this._curves[0].keys.push(new Vector2(key.frame, key.value.r));
                        this._curves[1].keys.push(new Vector2(key.frame, key.value.g));
                        this._curves[2].keys.push(new Vector2(key.frame, key.value.b));  
                        this._curves[3].keys.push(new Vector2(key.frame, key.value.a));                        
                    }
                    break;                    
            }
        }

        return (
            {
                min: minValue,
                max: maxValue
            }
        )
    }

    
    private _convertX(x: number) {
        let diff = this._maxFrame - this._minFrame;

        if (diff === 0) {
            diff = 1;
        }

        return ((x - this._minFrame) / diff) *  (this._GraphAbsoluteWidth);
    }

    private _invertX(x: number) {
        return  (x / this._GraphAbsoluteWidth) * (this._maxFrame - this._minFrame) +  this._minFrame;
    }

    private _convertY(y: number) {
        let diff = this._maxValue - this._minValue;

        if (diff === 0) {
            diff = 1;
        }

        return this._GraphAbsoluteHeight - ((y - this._minValue) / diff) * this._GraphAbsoluteHeight;
    }

    private _invertY(y: number) {
        let diff = this._maxValue - this._minValue;

        if (diff === 0) {
            diff = 1;
        }

        return ((this._GraphAbsoluteHeight - y) / this._GraphAbsoluteHeight) * diff + this._minValue;
    }

    private _buildYAxis() {
        if (!this.props.context.activeAnimation) {
            return null;
        }

        let stepCounts = 10;
        let range = this._maxValue !== this._minValue ? this._maxValue - this._minValue : 1;
        let offset = range / stepCounts;
        let convertRatio = range / this._GraphAbsoluteHeight;

        let steps = [];

        let startPosition = ((this._viewHeight  * this._viewScale) - this._GraphAbsoluteHeight - this._offsetY) * convertRatio;
        let start = this._minValue - ((startPosition / offset) | 0) * offset;
        let end = start + (this._viewHeight * this._viewScale )* convertRatio;

        for (var step = start - offset; step <= end + offset; step += offset) {
            steps.push(step);
        }

        let precision = 2;

        while (steps[0].toFixed(precision) === steps[1].toFixed(precision)) {
            precision++;
        }

        return (
            steps.map((s, i) => {
                let y = this._GraphAbsoluteHeight - ((s - this._minValue) / convertRatio);
                return (
                    <g key={"axis" + s}>
                        <line
                            key={"line" + s}
                            x1={this._graphOffsetX * this._viewScale}
                            y1={y}
                            x2={this._viewWidth * this._viewScale}
                            y2={y}
                            style={{
                                stroke: "#333333",
                                strokeWidth: 0.5,
                            }}>
                        </line>
                        <text
                            key={"label" + s}
                            x={0}
                            y={y}
                            dx={`${15 * this._viewScale}px`}
                            textAnchor="middle"
                            dy={`${3 * this._viewScale}px`}
                            style={{
                                fontFamily:"acumin-pro-condensed",                                
                                fontSize: `${10 * this._viewScale}px`,
                                fill: "#888888",
                                textAlign: "center",
                            }}
                        >
                            {s.toFixed(precision)}
                        </text>
                    </g>
                )
            })
        )
    }

    private _frame() {
        if (!this._currentAnimation) {
            return;
        }

        this.props.context.onActiveKeyPointChanged.notifyObservers(null);

        this._offsetX = 20;
        this._offsetY = 20;

        let keys = this._currentAnimation.getKeys();
        this._minFrame = keys[0].frame;
        this._maxFrame = keys[keys.length - 1].frame;

        let values = this._extractValuesFromKeys(keys, this._currentAnimation.dataType, false);
        this._minValue = values.min;
        this._maxValue = values.max;

        const frameConvert = Math.abs(this._convertX(this._maxFrame ) - this._convertX(this._minFrame)) + this._offsetX * 2;
        const valueConvert = this._minValue !== this._maxValue ? Math.abs(this._convertY(this._minValue) - this._convertY(this._maxValue)) + this._offsetY * 2 : 1;

        let scaleWidth =  frameConvert/ this._viewCurveWidth;
        let scaleHeight = valueConvert / this._viewHeight;

        this._viewScale = scaleWidth * this._viewHeight < valueConvert ? scaleHeight : scaleWidth;

        this.props.context.onGraphMoved.notifyObservers(this._offsetX);
        this.props.context.onGraphScaled.notifyObservers(this._viewScale);
    }

    private _dropKeyFrames(curveId: number) {
        if (!this.props.context.activeAnimation || !this._curves || !this._curves.length) {
            return null;
        }

        if (curveId >= this._curves.length) {
            return null;
        }
        let curve = this._curves[curveId];

        return curve.keys.map((key, i) => {
            let x = this._convertX(key.x);
            let y = this._convertY(key.y);

            return (
               <KeyPointComponent 
                    x={x} y={y} context={this.props.context} 
                    scale={this._viewScale} 
                    getPreviousX={() => i > 0 ? this._convertX(curve.keys[i - 1].x) : null}
                    getNextX={() => i < curve.keys.length - 1 ? this._convertX(curve.keys[i + 1].x) : null}
                    channel={curve.color}
                    keyId={i}
                    curve={curve}
                    key={curveId + "-" + i}
                    invertX={x => this._invertX(x)}
                    invertY={y => this._invertY(y)}
                    convertX={x => this._convertX(x)}
                    convertY={y => this._convertY(y)}
                    onFrameValueChanged={value => { curve.updateKeyFrame(i, value)}}
                    onKeyValueChanged={value => { curve.updateKeyValue(i, value)}}
                />
            );
        })
    }

    private _onPointerDown(evt: React.PointerEvent<HTMLDivElement>) {
        if ((evt.nativeEvent.target as any).id !== "svg-graph-curves") {
            return;
        }

        this._pointerIsDown = true;
        evt.currentTarget.setPointerCapture(evt.pointerId);
        this._sourcePointerX = evt.nativeEvent.offsetX;
        this._sourcePointerY = evt.nativeEvent.offsetY;
    }

    private _onPointerMove(evt: React.PointerEvent<HTMLDivElement>) {
        if (!this._pointerIsDown) {
            return;
        }
        this._offsetX += (evt.nativeEvent.offsetX - this._sourcePointerX) * this._viewScale;
        this._offsetY += (evt.nativeEvent.offsetY - this._sourcePointerY) * this._viewScale;
        
        this._sourcePointerX = evt.nativeEvent.offsetX;
        this._sourcePointerY = evt.nativeEvent.offsetY;

        
        this.props.context.onGraphMoved.notifyObservers(this._offsetX);

        this.forceUpdate();
    }

    private _onPointerUp(evt: React.PointerEvent<HTMLDivElement>) {
        this._pointerIsDown = false;
        evt.currentTarget.releasePointerCapture(evt.pointerId);
    }

    private _onWheel(evt: React.WheelEvent) {
        let delta = evt.deltaY < 0 ? -0.05 : 0.05;

        const oldScale = this._viewScale;
        this._viewScale = Math.min(Math.max(this._MinScale, this._viewScale + delta * this._viewScale), this._MaxScale);

        const clientX = evt.nativeEvent.offsetX;
        const clientY = evt.nativeEvent.offsetY;

        const xDiff = clientX * oldScale - clientX * this._viewScale;
        const yDiff = clientY * oldScale - clientY * this._viewScale;

        this._offsetX -= xDiff;
        this._offsetY -= yDiff;

        this.forceUpdate();

        evt.stopPropagation();

        this.props.context.onGraphMoved.notifyObservers(this._offsetX);
        this.props.context.onGraphScaled.notifyObservers(this._viewScale);
    }

    public render() {
        const scale = this._viewScale;
        const viewBoxScalingCurves = `${-this._offsetX} ${-this._offsetY} ${Math.round(scale * this._viewCurveWidth)} ${Math.round(scale * this._viewHeight)}`;
        const viewBoxScalingGrid = `0 ${-this._offsetY} ${Math.round(scale * this._viewWidth)} ${Math.round(scale * this._viewHeight)}`;

        return (
            <div 
                id="graph"                
                onWheel={evt => this._onWheel(evt)}
                onPointerDown={evt => this._onPointerDown(evt)}
                onPointerMove={evt => this._onPointerMove(evt)}
                onPointerUp={evt => this._onPointerUp(evt)}
            >
                <svg
                    id="svg-graph-grid"
                    viewBox={viewBoxScalingGrid}
                    ref={this._svgHost}
                    >
                    {
                        this._buildYAxis()
                    }
                </svg>
                <div id="dark-rectangle"/>
                <svg
                    ref={this._svgHost2}
                    id="svg-graph-curves"
                    tabIndex={0}
                    viewBox={viewBoxScalingCurves}
                    >
                    {
                        this._curves !== undefined && this._curves.length > 0 &&
                        <CurveComponent context={this.props.context} curve={this._curves[0]} convertX={x => this._convertX(x)} convertY={y => this._convertY(y)}/>
                    }
                    {
                        this._curves !== undefined && this._curves.length > 1 &&
                        <CurveComponent context={this.props.context} curve={this._curves[1]} convertX={x => this._convertX(x)} convertY={y => this._convertY(y)}/>
                    }
                    {
                        this._curves !== undefined && this._curves.length > 2 &&
                        <CurveComponent context={this.props.context} curve={this._curves[2]} convertX={x => this._convertX(x)} convertY={y => this._convertY(y)}/>
                    }
                    {
                        this._curves !== undefined && this._curves.length > 3 &&
                        <CurveComponent context={this.props.context} curve={this._curves[3]} convertX={x => this._convertX(x)} convertY={y => this._convertY(y)}/>
                    }
                    {
                        this._dropKeyFrames(0)
                    }
                    {
                        this._dropKeyFrames(1)
                    }
                    {
                        this._dropKeyFrames(2)
                    }
                    {
                        this._dropKeyFrames(3)
                    }
                </svg>
            </div>
        );
    }
}