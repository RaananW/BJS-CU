import * as React from "react";
import { Animation } from "babylonjs/Animations/animation";
import { Vector2, Vector3, Quaternion } from "babylonjs/Maths/math.vector";
import { Color3, Color4 } from "babylonjs/Maths/math.color";
import { Size } from "babylonjs/Maths/math.size";
import { EasingFunction } from "babylonjs/Animations/easing";
import { IAnimationKey } from "babylonjs/Animations/animationKey";
import { IKeyframeSvgPoint } from "./keyframeSvgPoint";
import { SvgDraggableArea } from "./svgDraggableArea";
import { Timeline } from "./timeline";
import { Notification } from "./notification";
import { GraphActionsBar } from "./graphActionsBar";
import { Scene } from "babylonjs/scene";
import { IAnimatable } from "babylonjs/Animations/animatable.interface";
import { Animatable } from "babylonjs/Animations/animatable";
import { TargetedAnimation } from "babylonjs/Animations/animationGroup";
import { EditorControls } from "./editorControls";
import { SelectedCoordinate } from "./animationListTree";
import { LockObject } from "../lockObject";
import { GlobalState } from "../../../../globalState";
import { Nullable } from "babylonjs/types";
import { Observer } from "babylonjs/Misc/observable";
import { ScaleLabel } from "./scale-label";
import { KeyframeSvgPoint } from "./keyframeSvgPoint";

require("./curveEditor.scss");

interface IAnimationCurveEditorComponentProps {
    playOrPause?: () => void;
    scene: Scene;
    entity: IAnimatable | TargetedAnimation;
    lockObject: LockObject;
    globalState: GlobalState;
}

/**
 * Represent an Axis of the canvas. This help us control the frame/panning
 */
interface ICanvasAxis {
    value: number;
    label: number;
}

/**
 * This help us identify the type of scaling on the selected animated property
 */
export enum CurveScale {
    float,
    radians,
    degrees,
    integers,
    default,
}

/**
 * This represents the visible selected keyframe in the canvas. If the keyframe is selected
 * we should be able to edit the frame and value.
 */
export interface IActionableKeyFrame {
    frame?: number | string;
    value?: any;
}

/**
 * Each curve is an SVG Path. This Interface give us its properties to render on the canvas.
 */
interface ICurveData {
    pathData: string;
    pathLength: number;
    domCurve: React.RefObject<SVGPathElement>;
    color: string;
    id: string;
}

/**
 * The curve editor state
 */
interface IAnimationCurveEditorComponentState {
    /** If the editor is opened or closed */
    isOpen: boolean;
    /** The currently selected animation from which the curves will render */
    selected: Animation | null;
    /** A list of keyframes to be rendered as SVG Elements in the curve */
    svgKeyframes: IKeyframeSvgPoint[] | undefined;
    /** The current frame in which the playhead is positioned */
    currentFrame: number;
    /** The current value in which the playhead is positioned */
    currentValue: number;
    /** The number of frame in which the current canvas is divided. The helps to render the frames in the graph editor */
    frameAxisLength: ICanvasAxis[];
    /** The number of values in which the current canvas is divided. The helps to render the frames in the graph editor. The current scale decides how these values are rendered*/
    valueAxisLength: ICanvasAxis[];
    /** If the selected keyframe should be treated as a flat tangent curve */
    isFlatTangentMode: boolean;
    /** If the tangent mode is active */
    isTangentMode: boolean;
    /** If the control points are broken or not */
    isBrokenMode: boolean;
    /** If selected keyframe should render its selected control point to be linear or not */
    lerpMode: boolean;
    /** The scale of the canvas */
    scale: number;
    /** The offset of the playhead to position itself on the canvas */
    playheadOffset: number;
    /** The error or warning message to display */
    notification: string;
    /** The current selected point in the SVG curve */
    currentPoint: SVGPoint | undefined;
    /** The start position of the playhead */
    playheadPos: number;
    /** If the animation is playing or not */
    isPlaying: boolean;
    /** The selected curve represented with an array of curves */
    selectedPathData: ICurveData[] | undefined;
    /** The currently selected coordinate of a complex property (i.e. x, y, z) */
    selectedCoordinate: number;
    /** The number of frames available in the canvas timeline*/
    animationLimit: number;
    /** The currently animation frames per second */
    fps: number;
    /** If the animation is set to loop or not while animation is playing */
    isLooping: boolean;
    /** The amount of vertical panning the user has moved the canvas */
    panningY: number;
    /** The amount of horizontal panning the user has moved the canvas */
    panningX: number;
    /** If the canvas has finished repositioned itself */
    repositionCanvas: boolean;
    /** The current selected keyframe on which we can perform actions (update frame and value) */
    actionableKeyframe: IActionableKeyFrame;
    /** The current value scale */
    valueScaleType: CurveScale;
    /** The amount scale to update valyes */
    valueScale: number;
    /** The canvas proportion width */
    canvasLength: number;
    /** The last frame to be created. */
    lastKeyframeCreated: Nullable<string>;
    /** The canvas scale width */
    canvasWidthScale: number;
    /** How the resize of the canvas will change the value axis */
    valuesPositionResize: number;
    /** How many frames are currently visible in the canvas */
    framesInCanvasView: { from: number; to: number };
    /** Limits the maximum frame from which a keyframe can move in the curve. So it wont overlap the curve*/
    maxFrame: number | undefined;
    /** Limits the minimum frame from which a keyframe can move in the curve. So it wont overlap the curve*/
    minFrame: number | undefined;
    /** How many frames have been increased or reduced on a windows resize event */
    framesResized: number;
}

/**
 * Animation curve Editor Component
 * This component allows the use to create animations visualy from the Babylon.js playground.
 * The principal features for the curve editor are:
 * 1. Create animations for the selected entity properties.
 * 2. Edit the animations a selected entity has.
 * 3. You can load and save animations locally and from the snippet server.
 * 4. After creating an animation you need to add keyframes.
 * 5. You can update the frame and value of each frame.
 * @property {() => void} playOrPause is the event to stop or inititate the animation on the playground scene
 * @property {Scene} scene is the scene object from the playground
 * @property {IAnimatable | TargetedAnimation} entity represents the selected entity which will be the animations target
 * @property {LockObject} lockObject the inherited object to lock for modification with the Observable pattern
 * @property {GlobalState} globalState the playground globalstate
 * Check the IAnimationCurveEditorComponentState for state functionality
 */
export class AnimationCurveEditorComponent extends React.Component<
    IAnimationCurveEditorComponentProps,
    IAnimationCurveEditorComponentState
> {
    // Global properties
    readonly _entityName: string;
    private _snippetUrl = "https://snippet.babylonjs.com";
    // Default values
    private _heightScale: number = 100;
    private _scaleFactor: number = 2;
    private _currentScale: number = 10;
    private _pixelFrameUnit: number = 10;

    // SVG properties
    private _svgKeyframes: IKeyframeSvgPoint[] = [];
    private _isPlaying: boolean = false;
    private _graphCanvas: React.RefObject<HTMLDivElement>;
    private _editor: React.RefObject<HTMLDivElement>;
    private _editorWindow: Window;
    private _resizeId: ReturnType<typeof setTimeout>;
    private _svgCanvas: React.RefObject<SvgDraggableArea>;
    private _isTargetedAnimation: boolean;
    private _resizedTimeline: number;
    private _onBeforeRenderObserver: Nullable<Observer<Scene>>;
    private _mainAnimatable: Nullable<Animatable>;

    constructor(props: IAnimationCurveEditorComponentProps) {
        super(props);
        this._entityName = (this.props.entity as any).id;

        // Dom Refs to control events
        this._editor = React.createRef();
        this._graphCanvas = React.createRef();
        this._svgCanvas = React.createRef();

        // Initial values
        const _canvasLength = 240;
        const valueInd = [2, 1.8, 1.6, 1.4, 1.2, 1, 0.8, 0.6, 0.4, 0.2, 0];

        let initialSelection;
        let initialPathData;
        let initialLerpMode;

        // Controls wether the entity is a TargetedAnimation entity
        if (this.props.entity instanceof TargetedAnimation) {
            this._isTargetedAnimation = true;
            initialSelection = this.props.entity.animation;
            initialLerpMode = initialSelection !== undefined ? this.analyzeAnimationForLerp(initialSelection) : false;
            initialPathData = initialSelection !== undefined ? this.getPathData(initialSelection) : undefined;
        } else {
            this._isTargetedAnimation = false;

            let hasAnimations =
                this.props.entity.animations !== undefined || this.props.entity.animations !== null
                    ? this.props.entity.animations
                    : false;
            initialSelection = hasAnimations !== false ? hasAnimations && hasAnimations[0] : null;

            initialLerpMode =
                initialSelection !== undefined
                    ? this.analyzeAnimationForLerp(this.props.entity.animations && initialSelection)
                    : false;
            initialPathData = initialSelection && this.getPathData(initialSelection);
            initialPathData = initialPathData === null || initialPathData === undefined ? undefined : initialPathData;
        }

        // Verify the animations are stopped before rendering the editor
        this.stopAnimation();

        // Set the initial state
        this.state = {
            selected: initialSelection,
            isOpen: true,
            svgKeyframes: this._svgKeyframes,
            currentFrame: 0,
            currentValue: 1,
            isFlatTangentMode: false,
            isTangentMode: false,
            isBrokenMode: false,
            lerpMode: initialLerpMode,
            playheadOffset: this._graphCanvas.current
                ? this._graphCanvas.current.children[0].clientWidth / (_canvasLength * 10)
                : 0,
            // Set default frame for visible canvas
            frameAxisLength: this.setFrameAxis(_canvasLength),
            // Set default values for the visible canvas
            valueAxisLength: new Array(10).fill(0).map((s, i) => {
                return { value: i * 10, label: valueInd[i] };
            }),
            notification: "",
            currentPoint: undefined,
            scale: 1,
            playheadPos: 0,
            isPlaying: false,
            // The initial curve if exists on load
            selectedPathData: initialPathData,
            selectedCoordinate: 0,
            animationLimit: _canvasLength / 2,
            canvasLength: _canvasLength,
            fps: 60,
            isLooping: true,
            panningY: 0,
            panningX: 0,
            repositionCanvas: false,
            actionableKeyframe: { frame: undefined, value: undefined },
            valueScaleType: CurveScale.default,
            valueScale: 2,
            lastKeyframeCreated: null,
            canvasWidthScale: 200,
            valuesPositionResize: 2,
            framesInCanvasView: { from: 0, to: 20 },
            maxFrame: undefined,
            minFrame: undefined,
            framesResized: 0,
        };
    }

    componentDidMount() {
        this.state.selected && this.selectAnimation(this.state.selected);
        // Control the window resize event
        if (
            this._editor.current &&
            this._editor.current.ownerDocument &&
            this._editor.current.ownerDocument.defaultView
        ) {
            this._editorWindow = this._editor.current.ownerDocument.defaultView;
            this._editorWindow.addEventListener("resize", this.onWindowResizeWidth.bind(this));
        }
    }

    /**
     * Connects scene frame with curve editor animation
     * @param prevProps previous Props
     * @param prevState previous State
     */
    componentDidUpdate(prevProps: IAnimationCurveEditorComponentProps, prevState: any) {
        if (prevState.currentFrame !== this.state.currentFrame) {
            this.onCurrentFrameChangeScene(this.state.currentFrame);
        }
    }

    /**
     * Clean up observer and listeners
     */
    componentWillUnmount() {
        this.playPause(0);
        if (this._onBeforeRenderObserver) {
            this.props.scene.onBeforeRenderObservable.remove(this._onBeforeRenderObserver);
            this._onBeforeRenderObserver = null;
        }

        this._editorWindow.removeEventListener("resize", this.onWindowResizeWidth);
    }

    /**
     * Set the frame on the animation
     * @param value number of frame to move animation
     */
    onCurrentFrameChangeScene(value: number) {
        if (!this._mainAnimatable) {
            return;
        }
        this._mainAnimatable.goToFrame(value);
    }

    /**
     * Notifications
     * To add notification we set the state and clear to make the notification bar hide.
     */
    clearNotification = () => {
        this.setState({ notification: "" });
    };

    /**
     * Zoom and Scroll
     * This section handles zoom and scroll
     * of the graph area.
     */
    zoom = (e: React.WheelEvent<HTMLDivElement>) => {
        e.nativeEvent.stopImmediatePropagation();
        let scaleX = 1;
        if (Math.sign(e.deltaY) === -1) {
            scaleX = this.state.scale; //- 0.01; //+ 0.01;
        }
        this.setState({ scale: scaleX });
    };

    /**
     * Returns Array with labels and values for Frame axis in Canvas
     */
    setFrameAxis(currentLength: number) {
        let halfNegative = new Array(currentLength).fill(0).map((s, i) => {
            return { value: -i * 10, label: -i };
        });

        let halfPositive = new Array(currentLength).fill(0).map((s, i) => {
            return { value: i * 10, label: i };
        });

        return [...halfNegative, ...halfPositive];
    }

    /**
     * Returns Array with labels, lines and values for Value axis in Canvas
     */
    setValueLines() {
        const lineV = this._heightScale / 10;

        const initialValues = new Array(this._currentScale).fill(0).map((_, i) => {
            return {
                value: i * lineV,
                label: (this._scaleFactor * ((this._currentScale - i) / this._currentScale)).toFixed(2),
            };
        });

        initialValues.shift();

        const valueHeight = Math.abs(Math.round(this.state.panningY / this._currentScale));
        const sign = Math.sign(this.state.panningY);

        const pannedValues = new Array(valueHeight).fill(0).map((s, i) => {
            return sign === -1
                ? {
                      value: -i * lineV,
                      label: ((i + this._currentScale) / (this._currentScale / this._scaleFactor)).toFixed(2),
                  }
                : {
                      value: (i + lineV) * this._currentScale,
                      label: ((i * -1) / (this._currentScale / this._scaleFactor)).toFixed(2),
                  };
        });

        return [...initialValues, ...pannedValues];
    }

    /**
     * Creates a string id from animation name and the keyframe index
     * @param animationName Name of animation
     * @param keyframeIndex Index of keyframe
     */
    encodeCurveId(animationName: string, keyframeIndex: number) {
        return animationName + "_" + keyframeIndex;
    }

    /**
     * Returns the animation keyframe index and the animation selected coordinate (x, y, z)
     * @param id curve id created with index and coordinate of animation
     */
    decodeCurveId(id: string) {
        const order = parseInt(id.split("_")[3]);
        const coordinate = parseInt(id.split("_")[2]);
        return { order, coordinate };
    }

    /**
     * Returns the value from a keyframe
     * @param id curve id
     */
    getKeyframeValueFromAnimation(id: string) {
        const animation = this.state.selected as Animation;
        const { order, coordinate } = this.decodeCurveId(id);
        const keys = [...animation.getKeys()];

        const key = keys.find((_, i) => i === order);

        if (key) {
            const valueAsArray = this.getValueAsArray(animation.dataType, key.value);
            return { frame: key?.frame, value: valueAsArray[coordinate] };
        } else {
            return undefined;
        }
    }

    /**
     * Keyframe Manipulation
     * This section handles events from SvgDraggableArea.
     * @param id selected keyframe id
     * @param multiselect if we are multiselecting keyframes
     */
    selectKeyframe = (id: string, multiselect: boolean) => {
        let frameValue: IActionableKeyFrame | undefined;
        const selectedKeyframe = this.state.svgKeyframes?.find((kf) => kf.id === id);
        const isKeyFrameSelected = selectedKeyframe?.selected;
        const hasCollinearPoints = this.hasCollinearPoints(selectedKeyframe);
        if (!multiselect) {
            frameValue = this.getKeyframeValueFromAnimation(id);
            this.deselectKeyframes();
        } else {
            frameValue = { frame: undefined, value: undefined };
        }

        if (isKeyFrameSelected) {
            frameValue = { frame: undefined, value: undefined };
        }

        const updatedKeyframes = this.state.svgKeyframes?.map((kf) => {
            if (kf.id === id) {
                kf.selected = !isKeyFrameSelected;
            }
            return kf;
        });

        let maxFrame = undefined;
        let minFrame = undefined;
        if (frameValue && typeof frameValue.frame === "number") {
            let { prev, next } = this.getPreviousAndNextKeyframe(frameValue.frame);
            maxFrame = next;
            minFrame = prev;
        }

        this.setState({
            svgKeyframes: updatedKeyframes,
            actionableKeyframe: frameValue ?? this.state.actionableKeyframe,
            maxFrame: maxFrame,
            minFrame: minFrame,
            isBrokenMode: !hasCollinearPoints,
        });
    };

    /**
     * Determine if two control points are collinear (flat tangent)
     * @param kf keyframe point
     */
    hasCollinearPoints = (kf: IKeyframeSvgPoint | undefined) => {
        const left = kf?.leftControlPoint;
        const right = kf?.rightControlPoint;
        if (left === undefined || right === undefined || left === null || right === null) {
            return false;
        } else {
            if (left.y === right.y) {
                return true;
            } else {
                return false;
            }
        }
    };

    /**
     * Returns the previous and next keyframe from a selected frame.
     * @param frame index of keyframe
     */
    getPreviousAndNextKeyframe = (frame: number) => {
        let prev,
            next = undefined;
        const animation = this.state.selected;
        if (animation) {
            const keys = animation.getKeys();
            if (keys) {
                const index = keys.findIndex((x) => x.frame === frame);
                prev = keys[index - 1] && keys[index - 1].frame + 1;
                next = keys[index + 1] && keys[index + 1].frame - 1;
            }
        }
        return { prev, next };
    };

    /**
     * Selects a keyframe in animation based on its Id
     * @param id keyframe id
     * @param actionableKeyframe selected keyframe
     */
    selectKeyframeFromId = (id: string, actionableKeyframe: IActionableKeyFrame) => {
        this.deselectKeyframes();
        const updatedKeyframes = this.state.svgKeyframes?.map((kf) => {
            if (kf.id === id) {
                kf.selected = true;
            }
            return kf;
        });
        let { prev, next } = this.getPreviousAndNextKeyframe(actionableKeyframe.frame as number);
        this.setState({
            svgKeyframes: updatedKeyframes,
            actionableKeyframe: actionableKeyframe ?? this.state.actionableKeyframe,
            maxFrame: next,
            minFrame: prev,
        });
    };

    /**
     * Resets the current selected keyframe as an updatable pairs by Graph Control Bar
     */
    resetActionableKeyframe = () => {
        this.setState({
            actionableKeyframe: { frame: undefined, value: undefined },
            maxFrame: undefined,
            minFrame: undefined,
        });
    };

    /**
     * Sets the selected control point.
     * @param type left or right control point
     * @param id id of selected svg keyframe
     */
    selectedControlPoint = (type: string, id: string) => {
        const controlPoint = this.state.svgKeyframes?.find((x) => x.id === id);
        if (controlPoint) {
            let isSelected;
            if (type === "left") {
                isSelected = controlPoint.isLeftActive;
                controlPoint.isLeftActive = !isSelected;
                controlPoint.isRightActive = false;
            }
            if (type === "right") {
                isSelected = controlPoint.isRightActive;
                controlPoint.isRightActive = !isSelected;
                controlPoint.isLeftActive = false;
            }
        }

        let updatedKeyframes = this.state.svgKeyframes?.map((kf) => {
            if (kf.id === id) {
                kf === controlPoint;
            }
            return kf;
        });
        this.setState({ svgKeyframes: updatedKeyframes });
    };

    /**
     * Sets the selected control point.
     */
    deselectKeyframes = () => {
        let updatedKeyframes = this.state.svgKeyframes?.map((kf) => {
            kf.isLeftActive = false;
            kf.isRightActive = false;
            kf.selected = false;
            return kf;
        });
        this.setState({
            svgKeyframes: updatedKeyframes,
            actionableKeyframe: { frame: undefined, value: undefined },
            maxFrame: undefined,
            minFrame: undefined,
        });
    };

    /**
     * Update the Animation Key values based on its type
     * @param dataType Type of animated property
     * @param newValue New value of animated property
     * @param coordinate The selected property coordinate to animate (i.e. x, y, z)
     */
    updateValuePerCoordinate(
        dataType: number,
        value: number | Vector2 | Vector3 | Color3 | Color4 | Size | Quaternion,
        newValue: number,
        coordinate?: number
    ) {
        if (dataType === Animation.ANIMATIONTYPE_FLOAT) {
            value = newValue;
        }

        if (dataType === Animation.ANIMATIONTYPE_VECTOR2) {
            switch (coordinate) {
                case SelectedCoordinate.x:
                    (value as Vector2).x = newValue;
                    break;
                case SelectedCoordinate.y:
                    (value as Vector2).y = newValue;
                    break;
            }
        }

        if (dataType === Animation.ANIMATIONTYPE_VECTOR3) {
            switch (coordinate) {
                case SelectedCoordinate.x:
                    (value as Vector3).x = newValue;
                    break;
                case SelectedCoordinate.y:
                    (value as Vector3).y = newValue;
                    break;
                case SelectedCoordinate.z:
                    (value as Vector3).z = newValue;
                    break;
            }
        }

        if (dataType === Animation.ANIMATIONTYPE_QUATERNION) {
            switch (coordinate) {
                case SelectedCoordinate.x:
                    (value as Quaternion).x = newValue;
                    break;
                case SelectedCoordinate.y:
                    (value as Quaternion).y = newValue;
                    break;
                case SelectedCoordinate.z:
                    (value as Quaternion).z = newValue;
                    break;
                case SelectedCoordinate.w:
                    (value as Quaternion).w = newValue;
                    break;
            }
        }

        if (dataType === Animation.ANIMATIONTYPE_COLOR3) {
            switch (coordinate) {
                case SelectedCoordinate.r:
                    (value as Color3).r = newValue;
                    break;
                case SelectedCoordinate.g:
                    (value as Color3).g = newValue;
                    break;
                case SelectedCoordinate.b:
                    (value as Color3).b = newValue;
                    break;
            }
        }

        if (dataType === Animation.ANIMATIONTYPE_COLOR4) {
            switch (coordinate) {
                case SelectedCoordinate.r:
                    (value as Color4).r = newValue;
                    break;
                case SelectedCoordinate.g:
                    (value as Color4).g = newValue;
                    break;
                case SelectedCoordinate.b:
                    (value as Color4).b = newValue;
                    break;
                case SelectedCoordinate.a:
                    (value as Color4).a = newValue;
                    break;
            }
        }

        if (dataType === Animation.ANIMATIONTYPE_SIZE) {
            switch (coordinate) {
                case SelectedCoordinate.width:
                    (value as Size).width = newValue;
                    break;
                case SelectedCoordinate.g:
                    (value as Size).height = newValue;
                    break;
            }
        }

        return value;
    }

    /**
     * Animation should always have a keyframe at Frame Zero
     * @param keys Animation key collection
     */
    forceFrameZeroToExist(keys: IAnimationKey[]) {
        const zeroFrame = keys.find((x) => Math.abs(x.frame) === 0);
        if (zeroFrame === undefined) {
            const prevToZero = keys.filter((x) => Math.sign(x.frame) === -1).sort((a, b) => b.frame - a.frame);
            let value;
            if (prevToZero.length !== 0) {
                value = prevToZero[0].value;
            } else {
                value = 1;
            }
            const frame: IAnimationKey = { frame: 0, value };
            keys.push(frame);
            keys.sort((a, b) => a.frame - b.frame);
        }
    }

    /**
     * Renders SVG points with dragging of the curve
     * @param updatedSvgKeyFrame selected keyframe to update
     * @param id curve id where the keyframe is localted
     */
    renderPoints = (updatedSvgKeyFrame: IKeyframeSvgPoint, id: string) => {
        let animation = this.state.selected as Animation;

        const { order: index, coordinate } = this.decodeCurveId(id);

        let keys = [...animation.getKeys()];

        let newFrame = 0;
        if (updatedSvgKeyFrame.keyframePoint.x !== 0) {
            if (updatedSvgKeyFrame.keyframePoint.x > 0 && updatedSvgKeyFrame.keyframePoint.x < 1) {
                newFrame = 0;
            } else {
                newFrame = Math.round(updatedSvgKeyFrame.keyframePoint.x / this._pixelFrameUnit);
            }
        }

        if (newFrame > keys[index].frame) {
            if (index === keys.length - 1) {
                keys[index].frame = newFrame;
            } else {
                const nextKf = keys[index + 1];
                if (nextKf) {
                    if (nextKf.frame <= newFrame) {
                        keys[index].frame = keys[index].frame;
                    } else {
                        keys[index].frame = newFrame;
                    }
                }
            }
        }

        if (newFrame < keys[index].frame) {
            if (index === 0) {
                keys[index].frame = newFrame;
            } else {
                const prevKf = keys[index - 1];
                if (prevKf) {
                    if (prevKf.frame >= newFrame) {
                        keys[index].frame = keys[index].frame;
                    } else {
                        keys[index].frame = newFrame;
                    }
                }
            }
        }

        let updatedValue =
            ((this._heightScale - updatedSvgKeyFrame.keyframePoint.y) / this._heightScale) * this._scaleFactor;

        const updatedValueInCoordinate = this.updateValuePerCoordinate(
            animation.dataType,
            keys[index].value,
            updatedValue,
            coordinate
        );

        keys[index].value = updatedValueInCoordinate;

        this.updateLeftControlPoint(updatedSvgKeyFrame, keys[index], animation.dataType, coordinate);
        this.updateRightControlPoint(updatedSvgKeyFrame, keys[index], animation.dataType, coordinate);

        this.forceFrameZeroToExist(keys);
        animation.setKeys(keys);

        let { prev, next } = this.getPreviousAndNextKeyframe(newFrame);
        this.setState({
            actionableKeyframe: { frame: newFrame, value: updatedValueInCoordinate },
            maxFrame: next,
            minFrame: prev,
        });

        this.selectAnimation(animation, coordinate);
    };

    /**
     * Updates the left control point on render points
     * @param updatedSvgKeyFrame selected svg keyframe
     * @param key animation key to update
     * @param dataType type of animation
     * @param coordinate coordinate to change its value (x, y, or z)
     */
    updateLeftControlPoint(
        updatedSvgKeyFrame: IKeyframeSvgPoint,
        key: IAnimationKey,
        dataType: number,
        coordinate: number
    ) {
        if (updatedSvgKeyFrame.isLeftActive) {
            if (updatedSvgKeyFrame.leftControlPoint !== null) {
                // Rotate Control Points
                // Get the previous svgKeyframe and measure distance between these two points
                let distanceWithPreviousKeyframe = this.getControlPointWeight(updatedSvgKeyFrame);

                let distanceAmplitudeOfX = updatedSvgKeyFrame.leftControlPoint.x - distanceWithPreviousKeyframe;

                let slope =
                    (updatedSvgKeyFrame.leftControlPoint.y - updatedSvgKeyFrame.keyframePoint.y) /
                    (updatedSvgKeyFrame.leftControlPoint.x - updatedSvgKeyFrame.keyframePoint.x);

                let newValueOfY =
                    (distanceAmplitudeOfX - updatedSvgKeyFrame.leftControlPoint.x) * slope +
                    updatedSvgKeyFrame.keyframePoint.y;

                let updatedValue =
                    ((newValueOfY - updatedSvgKeyFrame.keyframePoint.y) * this._scaleFactor) / this._heightScale;

                if (updatedValue > -100 && updatedValue < 100) {
                    key.inTangent = slope;

                    if (!this.state.isBrokenMode) {
                        if (updatedSvgKeyFrame.rightControlPoint !== null) {
                            // get angle between control points and keep angle to allow broken control points feature
                            key.outTangent = key.inTangent * -1;
                        }
                    }
                }
            }
        }
    }

    /**
     * Updates the right control point on render points
     * @param updatedSvgKeyFrame selected svg keyframe
     * @param key animation key to update
     * @param dataType type of animation
     * @param coordinate coordinate to change its value (x, y, or z)
     */
    updateRightControlPoint(
        updatedSvgKeyFrame: IKeyframeSvgPoint,
        key: IAnimationKey,
        dataType: number,
        coordinate: number
    ) {
        if (updatedSvgKeyFrame.isRightActive) {
            if (updatedSvgKeyFrame.rightControlPoint !== null) {
                // Get the next svgKeyframe and measure distance between these two points
                let distanceWithNextKeyframe = this.getControlPointWeight(updatedSvgKeyFrame);

                let distanceAmplitudeOfX = updatedSvgKeyFrame.rightControlPoint.x + distanceWithNextKeyframe;

                let slope =
                    (updatedSvgKeyFrame.rightControlPoint.y - updatedSvgKeyFrame.keyframePoint.y) /
                    (updatedSvgKeyFrame.rightControlPoint.x - updatedSvgKeyFrame.keyframePoint.x);

                let newValueOfY =
                    (distanceAmplitudeOfX - updatedSvgKeyFrame.rightControlPoint.x) * slope +
                    updatedSvgKeyFrame.keyframePoint.y;

                let updatedValue =
                    ((newValueOfY - updatedSvgKeyFrame.keyframePoint.y) * this._scaleFactor) / this._heightScale;

                if (updatedValue > -100 && updatedValue < 100) {
                    key.outTangent = slope * -1;

                    if (!this.state.isBrokenMode) {
                        if (updatedSvgKeyFrame.leftControlPoint !== null) {
                            // get angle between control points and keep angle to allow broken control points feature
                            key.inTangent = key.outTangent * -1;
                        }
                    }
                }
            }
        }
    }

    /**
     * Get the current Control Point weight (how far the X value is multiplied)
     * @param updatedSvgKeyFrame svg keyframe from which to calculate the distance to control point
     */
    getControlPointWeight(updatedSvgKeyFrame: IKeyframeSvgPoint) {
        let distanceWithPreviousKeyframe = this.state.canvasWidthScale / 4;
        if (this.state.svgKeyframes) {
            let indexOfKeyframe = this.state.svgKeyframes.indexOf(updatedSvgKeyFrame);
            let previousKeyframe = this.state.svgKeyframes[indexOfKeyframe - 1];
            if (previousKeyframe?.keyframePoint) {
                distanceWithPreviousKeyframe =
                    Vector2.Distance(updatedSvgKeyFrame.keyframePoint, previousKeyframe.keyframePoint) / 2;
            }
        }

        let distanceWithNextKeyframe = this.state.canvasWidthScale / 4;
        if (this.state.svgKeyframes) {
            let indexOfKeyframe = this.state.svgKeyframes.indexOf(updatedSvgKeyFrame);
            let nextKeyframe = this.state.svgKeyframes[indexOfKeyframe + 1];
            if (nextKeyframe?.keyframePoint) {
                distanceWithNextKeyframe =
                    Vector2.Distance(nextKeyframe.keyframePoint, updatedSvgKeyFrame.keyframePoint) / 2;
            }
        }

        if (distanceWithPreviousKeyframe < distanceWithNextKeyframe) {
            return distanceWithPreviousKeyframe;
        } else {
            return distanceWithNextKeyframe;
        }
    }

    /**
     * Handles a Frame selection change
     * @event event input event to change frame value
     */
    handleFrameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();

        let frame;
        let maxFrame = undefined;
        let minFrame = undefined;
        if (event.target.value === "") {
            frame = "";
        } else {
            frame = parseInt(event.target.value);
            const { prev, next } = this.getPreviousAndNextKeyframe(frame);
            maxFrame = next;
            minFrame = prev;
        }

        this.setState({
            actionableKeyframe: {
                frame: frame,
                value: this.state.actionableKeyframe.value,
            },
            maxFrame,
            minFrame,
        });
    };

    /**
     * Handles how a value change on a selected frame
     * @event event input event to change the value of the keyframe
     */
    handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();

        let value;

        if (event.target.value !== undefined) {
            if (event.target.value !== "") {
                value = parseFloat(event.target.value);
            } else {
                value = "";
            }

            this.setState({
                actionableKeyframe: {
                    frame: this.state.actionableKeyframe.frame,
                    value: value,
                },
                maxFrame: undefined,
                minFrame: undefined,
            });
        }
    };

    /**
     * Set the Keyframe from input control in Graph Control Bar
     * @param actionableKeyframe selected keyframe
     */
    setKeyframeValueFromInput = (actionableKeyframe: IActionableKeyFrame) => {
        this.setState(
            {
                actionableKeyframe,
            },
            this.setKeyframeValue
        );
    };

    /**
     * Sets the SVG Keyframe value
     * Finds the selected svg keyframe and passes the correct value to the correct animated keyframe.
     */
    setKeyframeValue = () => {
        if (
            this.state.actionableKeyframe.frame !== "" &&
            this.state.actionableKeyframe.frame !== undefined &&
            this.state.actionableKeyframe.value !== "" &&
            this.state.actionableKeyframe.value !== undefined
        ) {
            if (this.state.selected !== null) {
                let currentSelected = this.state.svgKeyframes?.find((kf) => kf.selected);
                if (currentSelected) {
                    let { order, coordinate } = this.decodeCurveId(currentSelected.id);
                    let animation = this.state.selected;
                    let keys = animation.getKeys();

                    let isKeyframe = keys.find((_, i) => i === order);
                    if (isKeyframe) {
                        let updatedKeys = keys.map((k, i) => {
                            if (i === order) {
                                k.frame = this.state.actionableKeyframe.frame as number;

                                const currentValue = this.getValueAsArray(animation.dataType, k.value);
                                currentValue[coordinate] = this.state.actionableKeyframe.value;
                                k.value = currentValue.length === 1 ? currentValue[0] : currentValue;
                            }
                            return k;
                        });
                        this.forceFrameZeroToExist(updatedKeys);
                        this.state.selected.setKeys(updatedKeys);
                        this.selectAnimation(animation);
                        this.setCanvasPosition({
                            frame: this.state.actionableKeyframe.frame as number,
                            value: this.state.actionableKeyframe.value,
                        });
                        const { prev, next } = this.getPreviousAndNextKeyframe(
                            this.state.actionableKeyframe.frame as number
                        );
                        this.setState({ maxFrame: next, minFrame: prev });
                    }
                }
            }
        }
    };

    /**
     * Set the flat tangent to the current selected control points.
     * get the selected control point and updates its tangent to flat the tangent
     */
    setFlatTangent = () => {
        if (this.state.selected !== null) {
            const keyframes = this.state.svgKeyframes?.filter((kf) => kf.selected).map((k) => this.decodeCurveId(k.id));
            const currentAnimation = this.state.selected;
            const keys = currentAnimation.getKeys();
            if (this.state.isBrokenMode) {
                const keyframeWithControlPointSelected = this.state.svgKeyframes?.find((kf) => kf.selected);

                if (keyframeWithControlPointSelected) {
                    keyframes?.forEach((k) => {
                        const keyframe = keys[k.order];
                        if (keyframeWithControlPointSelected.isLeftActive) {
                            keyframe.inTangent = this.returnZero(currentAnimation.dataType);
                        }
                        if (keyframeWithControlPointSelected.isRightActive) {
                            keyframe.outTangent = this.returnZero(currentAnimation.dataType);
                        }
                    });
                }
            } else {
                keyframes?.forEach((k) => {
                    const keyframe = keys[k.order];
                    keyframe.inTangent = this.returnZero(currentAnimation.dataType);
                    keyframe.outTangent = this.returnZero(currentAnimation.dataType);
                });
            }

            currentAnimation.setKeys(keys);
            this.selectAnimation(currentAnimation, this.state.selectedCoordinate);
        }
    };

    /**
     * Sets Broken mode of lines
     * Broken mode enables control points not to be connected on drag
     */
    setBrokenMode = () => {
        if (this.state.selected !== null) {
            let animation = this.state.selected;
            this.setState({ isBrokenMode: !this.state.isBrokenMode }, () =>
                this.selectAnimation(animation, this.state.selectedCoordinate)
            );
        }
    };

    /**
     * Sets a control point to be a linear interpolation with its Keyframe
     * If left or right control point is selected, sets the Tangent value to match the next keyframe and become linear
     */
    setLerpToActiveControlPoint = () => {
        const animation = this.state.selected;
        if (this.state.svgKeyframes && animation) {
            const keys = animation.getKeys();
            const selectedKeyframe = this.state.svgKeyframes.find(
                (keyframe: IKeyframeSvgPoint) => keyframe.selected && (keyframe.isLeftActive || keyframe.isRightActive)
            );

            if (selectedKeyframe !== null && selectedKeyframe) {
                const { order, coordinate } = this.decodeCurveId(selectedKeyframe.id);
                const key = keys[order];
                if (selectedKeyframe.isLeftActive && selectedKeyframe.leftControlPoint !== null) {
                    const start = new Vector2(key.frame, key.value);
                    const prev = new Vector2(keys[order - 1].frame, keys[order - 1].value);
                    let slope = (start.y - prev.y) / (start.x - prev.x);
                    key.inTangent = slope * -1;
                } else if (selectedKeyframe.isRightActive && selectedKeyframe.rightControlPoint !== null) {
                    const start = new Vector2(key.frame, key.value);
                    const next = new Vector2(keys[order + 1].frame, keys[order + 1].value);
                    let slope = (next.y - start.y) / (next.x - start.x);
                    key.outTangent = slope;
                }
                this.setState({ isBrokenMode: true }, () => {
                    this.selectAnimation(animation, coordinate);
                });
            }
        }
    };

    /**
     * Adds a new keyframe to the curve on canvas click
     */
    addKeyframeClick = () => {
        if (this.state.selected !== null) {
            let currentAnimation = this.state.selected;

            let keys = currentAnimation.getKeys();

            let x = this.state.currentFrame;

            let existValue = keys.find((k) => k.frame === x);

            if (existValue === undefined) {
                let y = this.state.actionableKeyframe.value ?? 1;

                let arrayValue: any = [];
                let emptyValue = this.returnZero(currentAnimation.dataType);

                if (emptyValue) {
                    arrayValue = this.getValueAsArray(currentAnimation.dataType, emptyValue);
                }

                // calculate point between prevkeyframe and nextkeyframe.
                const previousKFs = keys.filter((kf) => kf.frame < x);
                const nextKFs = keys.filter((kf) => kf.frame > x);
                const prev = previousKFs.slice(-1)[0];
                const next = nextKFs[0];

                if (prev === undefined && next) {
                    y = next.value;
                }

                if (prev && next === undefined) {
                    y = prev.value;
                }

                if (prev && next) {
                    const value1 = new Vector2(prev.frame, prev.value);
                    const tangent1 = new Vector2(prev.outTangent, prev.outTangent);
                    const value2 = new Vector2(next.frame, next.value);
                    const tangent2 = new Vector2(next.inTangent, next.inTangent);

                    const amount = (x - prev.frame) / (next.frame - prev.frame);
                    const newV = Vector2.Hermite(value1, tangent1, value2, tangent2, amount);
                    y = newV.y;
                }

                arrayValue[this.state.selectedCoordinate] = y;

                let actualValue = this.setValueAsType(currentAnimation.dataType, arrayValue);

                const recentlyCreated = {
                    frame: x,
                    value: actualValue,
                    inTangent: this.state.isFlatTangentMode ? 0 : 0, // check if flat mode can be turned off
                    outTangent: this.state.isFlatTangentMode ? 0 : 0, // check if flat mode can be turned off
                };

                keys.push(recentlyCreated);
                keys.sort((a, b) => a.frame - b.frame);
                const newIndex = keys.findIndex((kf) => kf.frame === x);
                const id = `${currentAnimation.name}_${currentAnimation.targetProperty}_${this.state.selectedCoordinate}`;
                const curvedId = this.encodeCurveId(id, newIndex);
                this.setState({ lastKeyframeCreated: curvedId });

                this.forceFrameZeroToExist(keys);

                currentAnimation.setKeys(keys);

                this.selectAnimation(currentAnimation, this.state.selectedCoordinate);
            }
        }
    };

    /**
     * Remove keyframe on click
     */
    removeKeyframeClick = () => {
        if (this.state.selected !== null) {
            let currentAnimation = this.state.selected;

            if (currentAnimation.dataType === Animation.ANIMATIONTYPE_FLOAT) {
                let keys = currentAnimation.getKeys();
                let x = this.state.currentFrame;
                let filteredKeys = keys.filter((kf) => kf.frame !== x);

                currentAnimation.setKeys(filteredKeys);

                this.selectAnimation(currentAnimation, this.state.selectedCoordinate);
            }
        }
    };

    /**
     * Remove the selected keyframes
     * @param points the selected keyframes to remove
     */
    removeKeyframes = (points: IKeyframeSvgPoint[]) => {
        if (this.state.selected !== null) {
            let currentAnimation = this.state.selected;

            const indexesToRemove = points.map((p) => {
                return {
                    index: parseInt(p.id.split("_")[3]),
                    coordinate: parseInt(p.id.split("_")[2]),
                };
            });

            if (currentAnimation.dataType === Animation.ANIMATIONTYPE_FLOAT) {
                let keys = currentAnimation.getKeys();

                let filteredKeys = keys.filter((_, i) => {
                    return !indexesToRemove.find((x) => x.index === i);
                });
                currentAnimation.setKeys(filteredKeys);
                this.deselectKeyframes();

                this.selectAnimation(currentAnimation, this.state.selectedCoordinate);
            }
        }
    };

    /**
     * Adds a keyframe
     * @event event Mouse click event to generate new keyframe
     */
    addKeyFrame(event: React.MouseEvent<SVGSVGElement>) {
        event.preventDefault();

        if (this.state.selected !== null) {
            var svg = event.target as SVGSVGElement;

            var pt = svg.createSVGPoint();

            pt.x = event.clientX;
            pt.y = event.clientY;

            var inverse = svg.getScreenCTM()?.inverse();

            var cursorpt = pt.matrixTransform(inverse);

            var currentAnimation = this.state.selected;

            var keys = currentAnimation.getKeys();

            var height = 100;
            var middle = height / 2;

            var keyValue;

            if (cursorpt.y < middle) {
                keyValue = 1 + (100 / cursorpt.y) * 0.1;
            }

            if (cursorpt.y > middle) {
                keyValue = 1 - (100 / cursorpt.y) * 0.1;
            }

            keys.push({ frame: cursorpt.x, value: keyValue });

            currentAnimation.setKeys(keys);

            this.selectAnimation(currentAnimation);
        }
    }

    /**
     * Curve Rendering Functions
     * This section handles how to render curves.
     * @param point point in canvas
     * @param index index of svg
     */
    setKeyframePointLinear(point: Vector2, index: number) {
        let svgKeyframe = {
            keyframePoint: point,
            rightControlPoint: null,
            leftControlPoint: null,
            id: index.toString(),
            selected: false,
            isLeftActive: false,
            isRightActive: false,
        };
        this._svgKeyframes.push(svgKeyframe);
    }

    /**
     * Flats the tangents of the selected keyframes
     * @param keyframes Selected keyframes to flat its tangents
     * @param dataType Type of animated property
     */
    flatTangents(keyframes: IAnimationKey[], dataType: number) {
        let flattened;
        if (this.state && this.state.isFlatTangentMode) {
            flattened = keyframes.map((kf) => {
                if (kf.inTangent !== undefined) {
                    kf.inTangent = this.returnZero(dataType);
                }

                if (kf.outTangent !== undefined) {
                    kf.outTangent = this.returnZero(dataType);
                }
                return kf;
            });
        } else {
            flattened = keyframes;
        }
        this.setState({ isFlatTangentMode: false });
        return flattened;
    }

    /**
     * Return a Keyframe zero value depending on Type
     * @param dataType Type of animated property
     */
    returnZero(dataType: number) {
        switch (dataType) {
            case Animation.ANIMATIONTYPE_FLOAT:
                return 0;
            case Animation.ANIMATIONTYPE_VECTOR3:
                return Vector3.Zero();
            case Animation.ANIMATIONTYPE_VECTOR2:
                return Vector2.Zero();
            case Animation.ANIMATIONTYPE_QUATERNION:
                return Quaternion.Zero();
            case Animation.ANIMATIONTYPE_COLOR3:
                return new Color3(0, 0, 0);
            case Animation.ANIMATIONTYPE_COLOR4:
                return new Color4(0, 0, 0, 0);
            case Animation.ANIMATIONTYPE_SIZE:
                return new Size(0, 0);
            default:
                return 0;
        }
    }

    /**
     * Return the keyframe value as an array depending on type
     * @param valueType type of animated property
     * @param value the value of the property
     */
    getValueAsArray(valueType: number, value: number | Vector2 | Vector3 | Color3 | Color4 | Size | Quaternion) {
        switch (valueType) {
            case Animation.ANIMATIONTYPE_FLOAT:
                return [value as number];
            case Animation.ANIMATIONTYPE_VECTOR3:
                return (value as Vector3).asArray();
            case Animation.ANIMATIONTYPE_VECTOR2:
                return (value as Vector2).asArray();
            case Animation.ANIMATIONTYPE_QUATERNION:
                return (value as Quaternion).asArray();
            case Animation.ANIMATIONTYPE_COLOR3:
                return (value as Color3).asArray();
            case Animation.ANIMATIONTYPE_COLOR4:
                return (value as Color4).asArray();
            case Animation.ANIMATIONTYPE_SIZE:
                return [(value as Size).width, (value as Size).height];
            default:
                return [];
        }
    }

    /**
     * Sets the keyframe value as an array depending on type
     * @param valueType type of animated property
     * @param arrayValue array to place the correct value
     */
    setValueAsType(valueType: number, arrayValue: number[]) {
        switch (valueType) {
            case Animation.ANIMATIONTYPE_FLOAT:
                return arrayValue[0];
            case Animation.ANIMATIONTYPE_VECTOR3:
                return new Vector3(arrayValue[0], arrayValue[1], arrayValue[2]);
            case Animation.ANIMATIONTYPE_VECTOR2:
                return new Vector2(arrayValue[0], arrayValue[1]);
            case Animation.ANIMATIONTYPE_QUATERNION:
                return new Quaternion(arrayValue[0], arrayValue[1], arrayValue[2], arrayValue[3]);
            case Animation.ANIMATIONTYPE_COLOR3:
                return new Color3(arrayValue[0], arrayValue[1], arrayValue[2]);
            case Animation.ANIMATIONTYPE_COLOR4:
                return new Color4(arrayValue[0], arrayValue[1], arrayValue[2], arrayValue[3]);
            case Animation.ANIMATIONTYPE_SIZE:
                return new Size(arrayValue[0], arrayValue[1]);
            default:
                return arrayValue[0];
        }
    }

    /**
     * Returns the SVG Path Data to render the curve
     * @param animation The animation object from where to get its keyframes
     */
    getPathData(animation: Animation | null) {
        if (animation === null) {
            return undefined;
        }

        // Get the animation keyframes
        var keyframes = animation.getKeys();

        // If no keyframes return undefined
        if (keyframes === undefined || keyframes.length === 0) {
            return undefined;
        } else {
            // Get the animation properties
            const {
                easingMode,
                easingType,
                usesTangents,
                valueType,
                highestFrame,
                name,
                targetProperty,
            } = this.getAnimationData(animation);

            // Set the initial point of the curve
            const startKey = keyframes[0];
            // Get the middle of the screen
            let middle = this._heightScale / this._scaleFactor;
            // Collection of curves if animation has coodirnates (ie. x, y, z)
            let collection: ICurveData[] = [];
            // The basic colors for curves
            const colors = ["red", "green", "blue", "white", "#7a4ece"];
            // Get the initial value of the first keyframe
            const startValue = this.getValueAsArray(valueType, startKey.value);

            // Iterate thru coordinates to create curves (x, y, z)
            for (var d = 0; d < startValue.length; d++) {
                const id = `${name}_${targetProperty}_${d}`;

                const curveColor = valueType === Animation.ANIMATIONTYPE_FLOAT ? colors[4] : colors[d];
                // START OF LINE/CURVE
                let data: string | undefined = `M${startKey.frame * this._pixelFrameUnit}, ${
                    this._heightScale - startValue[d] * middle
                }`; //

                if (this.state) {
                    if (usesTangents) {
                        // Generate the svg curve path
                        data = this.curvePathWithTangents(keyframes, data, middle, valueType, d, id);
                    } else {
                        // Perform other calculation if there are no Tangents in the animation.
                        // This would need updates if we support out of the box easings in curve editor
                        if (easingType !== undefined && easingMode !== undefined) {
                            let easingFunction = animation.getEasingFunction();
                            data = this.curvePath(keyframes, data, middle, easingFunction as EasingFunction);
                        } else {
                            if (this.state !== undefined) {
                                data = this.curvePathWithoutTangents(keyframes, data, middle, valueType, d, id);
                            }
                        }
                    }
                }

                collection.push({
                    pathData: data,
                    pathLength: highestFrame,
                    domCurve: React.createRef(),
                    color: curveColor,
                    id: id,
                });
            }

            // return the curves in animation
            return collection;
        }
    }

    /**
     * Gets the selected animation properties
     * @param animation Animation
     */
    getAnimationData(animation: Animation) {
        // General Props
        let loopMode = animation.loopMode;
        let name = animation.name;
        let blendingSpeed = animation.blendingSpeed;
        let targetProperty = animation.targetProperty;
        let targetPropertyPath = animation.targetPropertyPath;
        let framesPerSecond = animation.framePerSecond;
        let highestFrame = animation.getHighestFrame();
        let usesTangents =
            animation.getKeys().find((kf) => kf.hasOwnProperty("inTangent") || kf.hasOwnProperty("outTangent")) !==
            undefined
                ? true
                : false;
        let valueType = animation.dataType;
        let easingType, easingMode;
        let easingFunction: EasingFunction = animation.getEasingFunction() as EasingFunction;
        if (easingFunction === undefined) {
            easingType = undefined;
            easingMode = undefined;
        } else {
            easingType = easingFunction.constructor.name;
            easingMode = easingFunction.getEasingMode();
        }

        return {
            loopMode,
            name,
            blendingSpeed,
            targetPropertyPath,
            targetProperty,
            framesPerSecond,
            highestFrame,
            usesTangents,
            easingType,
            easingMode,
            valueType,
        };
    }

    /**
     * Calculate the correct tangents to be linear
     * @param keyframes the animation keyframes
     */
    calculateLinearTangents(keyframes: IAnimationKey[]) {
        const updatedKeyframes: IAnimationKey[] = keyframes.map((kf, i) => {
            if (keyframes[i + 1] !== undefined) {
                const start = new Vector2(keyframes[i].frame, keyframes[i].value);
                const next = new Vector2(keyframes[i + 1].frame, keyframes[i + 1].value);
                let slope = (next.y - start.y) / (next.x - start.x);
                kf.outTangent = slope;
            }

            if (keyframes[i - 1] !== undefined) {
                const start = new Vector2(keyframes[i].frame, keyframes[i].value);
                const prev = new Vector2(keyframes[i - 1].frame, keyframes[i - 1].value);
                let slope = (prev.y - start.y) / (prev.x - start.x);
                kf.inTangent = slope * -1;
            }

            if (i === keyframes.length - 1) {
                kf.outTangent = null;
            }

            return kf;
        });

        return updatedKeyframes;
    }

    /**
     * Calculates the proper linear tangents if there is no tangents defined
     * Before calculation of svg path we need to calculate the proper tangents
     * @param keyframes the animation keyframes
     * @param data initial svg path
     * @param middle the middle of the canvas to draw the curve
     * @param type type of animation
     * @param coordinate (x, y, z) value
     * @param animationName The animation name to generate the curve id
     */
    curvePathWithoutTangents(
        keyframes: IAnimationKey[],
        data: string,
        middle: number,
        type: number,
        coordinate: number,
        animationName: string
    ) {
        const updatedKeyframes = this.calculateLinearTangents(keyframes);
        return this.curvePathWithTangents(updatedKeyframes, data, middle, type, coordinate, animationName);
    }

    /**
     * Calculates the curve data and control points for animation
     * @param keyframes the animation keyframes
     * @param data initial svg path
     * @param middle the middle of the canvas to draw the curve
     * @param type type of animation
     * @param coordinate (x, y, z) value
     * @param animationName The animation name to generate the curve id
     */
    curvePathWithTangents(
        keyframes: IAnimationKey[],
        data: string,
        middle: number,
        type: number,
        coordinate: number,
        animationName: string
    ) {
        keyframes.forEach((key, i) => {
            // Create a unique id for curve
            const curveId = this.encodeCurveId(animationName, i);

            // identify type of value and split...
            const keyframe_valueAsArray = this.getValueAsArray(type, key.value)[coordinate];

            let svgKeyframe;
            let outTangent;
            let inTangent;
            let defaultWeight = this.state.canvasWidthScale / 2;

            // For inTangent
            // has prev frame?
            let weightIn = 0;
            if (keyframes[i - 1] !== undefined) {
                // calculate the correct weight/distance to contorl point
                let prevIn = new Vector2(keyframes[i - 1].frame, keyframes[i - 1].value);
                let currIn = new Vector2(key.frame, key.value);
                weightIn = (Vector2.Distance(prevIn, currIn) / 2) * this._pixelFrameUnit;
            }

            // For outTangent
            // has next frame?
            let weightOut = 0;
            if (keyframes[i + 1] !== undefined) {
                // calculate the correct weight/distance to contorl point
                let prevOut = new Vector2(keyframes[i + 1].frame, keyframes[i + 1].value);
                let currOut = new Vector2(key.frame, key.value);
                weightOut = (Vector2.Distance(prevOut, currOut) / 2) * this._pixelFrameUnit;
            }

            if (weightIn !== 0 && weightOut !== 0) {
                if (weightIn < weightOut) {
                    defaultWeight = weightIn > defaultWeight ? defaultWeight : weightIn;
                } else {
                    defaultWeight = weightOut > defaultWeight ? defaultWeight : weightOut;
                }
            }

            if (weightIn === 0 && weightOut !== 0) {
                defaultWeight = weightOut > defaultWeight ? defaultWeight : weightOut;
            }

            if (weightIn !== 0 && weightOut === 0) {
                defaultWeight = weightIn > defaultWeight ? defaultWeight : weightIn;
            }

            let defaultTangent: number | null = null;
            if (i !== 0 || i !== keyframes.length - 1) {
                defaultTangent = null;
            }

            // Calculate the control points from the specified tangent values
            var inT =
                key.inTangent === null || key.inTangent === undefined
                    ? defaultTangent
                    : this.getValueAsArray(type, key.inTangent)[coordinate];
            var outT =
                key.outTangent === null || key.outTangent === undefined
                    ? defaultTangent
                    : this.getValueAsArray(type, key.outTangent)[coordinate];

            defaultWeight = 1 * this._pixelFrameUnit; // update based on control points

            if (inT !== null) {
                let valueInY = inT + keyframe_valueAsArray;
                let valueIn = this._heightScale - valueInY * middle;
                inTangent = new Vector2(key.frame * this._pixelFrameUnit - defaultWeight, valueIn);
            } else {
                inTangent = null;
            }

            if (outT !== null) {
                let valueOutY = outT + keyframe_valueAsArray;
                let valueOut = this._heightScale - valueOutY * middle;
                outTangent = new Vector2(key.frame * this._pixelFrameUnit + defaultWeight, valueOut);
            } else {
                outTangent = null;
            }

            // Define each point of the cuvre and the value on the SVG Path.
            if (i === 0) {
                svgKeyframe = {
                    keyframePoint: new Vector2(
                        key.frame * this._pixelFrameUnit,
                        this._heightScale - keyframe_valueAsArray * middle
                    ),
                    rightControlPoint: outTangent,
                    leftControlPoint: null,
                    id: curveId,
                    selected: false,
                    isLeftActive: false,
                    isRightActive: false,
                };
                if (outTangent !== null) {
                    data += ` C${outTangent.x} ${outTangent.y} `;
                } else {
                    data += ` C${svgKeyframe.keyframePoint.x} ${svgKeyframe.keyframePoint.y} `;
                }
            } else {
                svgKeyframe = {
                    keyframePoint: new Vector2(
                        key.frame * this._pixelFrameUnit,
                        this._heightScale - keyframe_valueAsArray * middle
                    ),
                    rightControlPoint: outTangent,
                    leftControlPoint: inTangent,
                    id: curveId,
                    selected: false,
                    isLeftActive: false,
                    isRightActive: false,
                };

                if (outTangent !== null && inTangent !== null) {
                    data += ` ${inTangent.x} ${inTangent.y} ${svgKeyframe.keyframePoint.x} ${svgKeyframe.keyframePoint.y} C${outTangent.x} ${outTangent.y}`;
                }

                if (outTangent === null && inTangent !== null) {
                    data += ` ${inTangent.x} ${inTangent.y} ${svgKeyframe.keyframePoint.x} ${svgKeyframe.keyframePoint.y} C${svgKeyframe.keyframePoint.x} ${svgKeyframe.keyframePoint.y}`;
                }

                if (inTangent === null && outTangent !== null) {
                    const prev = this._svgKeyframes[i - 1];
                    data += ` ${prev.keyframePoint.x} ${prev.keyframePoint.y} ${svgKeyframe.keyframePoint.x} ${svgKeyframe.keyframePoint.y} C${outTangent.x} ${outTangent.y}`;
                }

                if (inTangent === null && outTangent === null) {
                    const prev = this._svgKeyframes[i - 1];
                    data += ` ${prev.keyframePoint.x} ${prev.keyframePoint.y} ${svgKeyframe.keyframePoint.x} ${svgKeyframe.keyframePoint.y} C${svgKeyframe.keyframePoint.x} ${svgKeyframe.keyframePoint.y}`;
                }
            }

            if (this.state) {
                let prev = this.state.svgKeyframes?.find((kf) => kf.id === curveId);
                if (prev) {
                    svgKeyframe.isLeftActive = prev?.isLeftActive;
                    svgKeyframe.isRightActive = prev?.isRightActive;
                    svgKeyframe.selected = prev?.selected;
                }
            }

            this._svgKeyframes.push(svgKeyframe);
        }, this);

        // Clean the last curve not to begin a new curve
        const lastCurveEnd = data.lastIndexOf("C");
        const cleanedData = data.substring(0, lastCurveEnd);

        return cleanedData;
    }

    /**
     * Calculates a curve path from predefined easing function
     * @param keyframes animation keyframes
     * @param data the initial svg path
     * @param middle the center of the canvas
     * @param easingFunction the easing function to calculate the curve from (easing function should generate the correct curve)
     */
    curvePath(keyframes: IAnimationKey[], data: string, middle: number, easingFunction: EasingFunction) {
        // This will get 1/4 and 3/4 of points in eased curve
        const u = 0.25;
        const v = 0.75;

        keyframes.forEach((key, i) => {
            // identify type of value and split...
            // Gets previous initial point of curve segment
            var pointA = new Vector2(0, 0);
            if (i === 0) {
                pointA.x = key.frame;
                pointA.y = this._heightScale - key.value * middle;

                this.setKeyframePoint([pointA], i, keyframes.length);
            } else {
                pointA.x = keyframes[i - 1].frame;
                pointA.y = this._heightScale - keyframes[i - 1].value * middle;

                // Gets the end point of this curve segment
                var pointB = new Vector2(key.frame, this._heightScale - key.value * middle);

                // Get easing value of percentage to get the bezier control points below
                let du = easingFunction.easeInCore(u); // What to do here, when user edits the curve? Option 1: Modify the curve with the new control points as BezierEaseCurve(x,y,z,w)
                let dv = easingFunction.easeInCore(v); // Option 2: Create a easeInCore function and adapt it with the new control points values... needs more revision.

                // Direction of curve up/down
                let yInt25 = 0;
                if (pointB.y > pointA.y) {
                    // if pointB.y > pointA.y = goes down
                    yInt25 = (pointB.y - pointA.y) * du + pointA.y;
                } else if (pointB.y < pointA.y) {
                    // if pointB.y < pointA.y = goes up
                    yInt25 = pointA.y - (pointA.y - pointB.y) * du;
                }

                let yInt75 = 0;
                if (pointB.y > pointA.y) {
                    yInt75 = (pointB.y - pointA.y) * dv + pointA.y;
                } else if (pointB.y < pointA.y) {
                    yInt75 = pointA.y - (pointA.y - pointB.y) * dv;
                }

                // Intermediate points in curve
                let intermediatePoint25 = new Vector2((pointB.x - pointA.x) * u + pointA.x, yInt25);
                let intermediatePoint75 = new Vector2((pointB.x - pointA.x) * v + pointA.x, yInt75);

                // Gets the four control points of bezier curve
                let controlPoints = this.interpolateControlPoints(
                    pointA,
                    intermediatePoint25,
                    u,
                    intermediatePoint75,
                    v,
                    pointB
                );

                if (controlPoints !== undefined) {
                    this.setKeyframePoint(controlPoints, i, keyframes.length);
                    data += ` C${controlPoints[1].x} ${controlPoints[1].y} ${controlPoints[2].x} ${controlPoints[2].y} ${controlPoints[3].x} ${controlPoints[3].y}`;
                }
            }
        });

        return data;
    }

    /**
     * Sets the proper SVG Keyframe points
     * @param controlPoints array of points to generate the svg keyframe collection
     * @param index index of the animation
     * @param keyframesCount How many keyframes should we process
     */
    setKeyframePoint(controlPoints: Vector2[], index: number, keyframesCount: number) {
        let svgKeyframe;
        if (index === 0) {
            svgKeyframe = {
                keyframePoint: controlPoints[0],
                rightControlPoint: null,
                leftControlPoint: null,
                id: index.toString(),
                selected: false,
                isLeftActive: false,
                isRightActive: false,
            };
        } else {
            this._svgKeyframes[index - 1].rightControlPoint = controlPoints[1];
            svgKeyframe = {
                keyframePoint: controlPoints[3],
                rightControlPoint: null,
                leftControlPoint: controlPoints[2],
                id: index.toString(),
                selected: false,
                isLeftActive: false,
                isRightActive: false,
            };
        }

        this._svgKeyframes.push(svgKeyframe);
    }

    /**
     * Creates curve based on interpolated points
     * @param p0 starting point of curve
     * @param p1 first control point
     * @param u distance between p0 and p3 as percentage to affect p1
     * @param p2 second control point
     * @param v distance between p0 and p3 as percentage to affect p2
     * @param p3 finish point of curve
     */
    interpolateControlPoints(
        p0: Vector2,
        p1: Vector2,
        u: number,
        p2: Vector2,
        v: number,
        p3: Vector2
    ): Vector2[] | undefined {
        let a = 0.0;
        let b = 0.0;
        let c = 0.0;
        let d = 0.0;
        let det = 0.0;
        let q1: Vector2 = new Vector2();
        let q2: Vector2 = new Vector2();
        let controlA: Vector2 = p0;
        let controlB: Vector2 = new Vector2();
        let controlC: Vector2 = new Vector2();
        let controlD: Vector2 = p3;

        if (u <= 0.0 || u >= 1.0 || v <= 0.0 || v >= 1.0 || u >= v) {
            return undefined;
        }

        a = 3 * (1 - u) * (1 - u) * u;
        b = 3 * (1 - u) * u * u;
        c = 3 * (1 - v) * (1 - v) * v;
        d = 3 * (1 - v) * v * v;
        det = a * d - b * c;

        if (det == 0.0) {
            return undefined;
        }

        q1.x = p1.x - ((1 - u) * (1 - u) * (1 - u) * p0.x + u * u * u * p3.x);
        q1.y = p1.y - ((1 - u) * (1 - u) * (1 - u) * p0.y + u * u * u * p3.y);

        q2.x = p2.x - ((1 - v) * (1 - v) * (1 - v) * p0.x + v * v * v * p3.x);
        q2.y = p2.y - ((1 - v) * (1 - v) * (1 - v) * p0.y + v * v * v * p3.y);

        controlB.x = (d * q1.x - b * q2.x) / det;
        controlB.y = (d * q1.y - b * q2.y) / det;

        controlC.x = (-c * q1.x + a * q2.x) / det;
        controlC.y = (-c * q1.y + a * q2.y) / det;

        return [controlA, controlB, controlC, controlD];
    }

    /**
     * Deselects the current animations
     */
    deselectAnimation = () => {
        const animations = (this.props.entity as IAnimatable).animations;
        if (animations && animations.length === 0) {
            setTimeout(() => this.cleanCanvas(), 0);
        }
        this.cleanCanvas();
    };

    /**
     * Remove all curves from canvas
     */
    cleanCanvas = () => {
        this.setState({
            selected: null,
            svgKeyframes: [],
            selectedPathData: undefined,
            selectedCoordinate: 0,
        });
    };

    /**
     * Selects the animation and renders the curve
     * @param animation the animation to select and render as curve
     * @param coordinate the property coordinate (x, y, z) to represent as curve
     */
    selectAnimation = (animation: Animation, coordinate?: SelectedCoordinate) => {
        this._svgKeyframes = [];
        let updatedPath;
        let filteredSvgKeys;
        let selectedCurve = 0;
        this.stopAnimation();
        if (coordinate === undefined) {
            updatedPath = this.getPathData(animation);
        } else {
            let curves = this.getPathData(animation);

            updatedPath = [];

            filteredSvgKeys = this._svgKeyframes?.filter((curve) => {
                let id = parseInt(curve.id.split("_")[2]);
                if (id === coordinate) {
                    return true;
                } else {
                    return false;
                }
            });

            curves?.map((curve) => {
                let id = parseInt(curve.id.split("_")[2]);
                if (id === coordinate) {
                    updatedPath.push(curve);
                }
            });

            selectedCurve = coordinate;
        }

        this.setState(
            {
                selected: animation,
                svgKeyframes: coordinate !== undefined ? filteredSvgKeys : this._svgKeyframes,
                selectedPathData: updatedPath,
                selectedCoordinate: selectedCurve,
                fps: animation.framePerSecond,
            },
            this.postSelectionEvents
        );
    };

    /**
     * Set the state for the last selected keyframe
     */
    postSelectionEvents = () => {
        if (this.state.lastKeyframeCreated !== null) {
            this.deselectKeyframes();
            this.selectKeyframe(this.state.lastKeyframeCreated, false);
            this.setState({ lastKeyframeCreated: null });
        }

        this.setMainAnimatable();
        if (this.state.selected) {
            const lastKeyframe = this.state.selected.getHighestFrame();
            const currentLimit = this.state.animationLimit;

            if (currentLimit < lastKeyframe) {
                this.changeAnimationLimit(lastKeyframe);
            }
        }
    };

    /**
     * Set main animatable to play or pause the animation
     */
    setMainAnimatable() {
        if (this.state.selected !== null) {
            let target = this.props.entity;
            if (this.props.entity instanceof TargetedAnimation) {
                target = this.props.entity.target;
            }

            this.props.scene.stopAllAnimations();

            if (this._mainAnimatable?.target !== target) {
                const keys = this.state.selected.getKeys();
                if (keys.length !== 0) {
                    const firstFrame = keys[0].frame;
                    const LastFrame = this.state.selected.getHighestFrame();
                    this._mainAnimatable = this.props.scene.beginAnimation(
                        target,
                        firstFrame,
                        LastFrame,
                        this.state.isLooping
                    );
                    this._mainAnimatable.stop();
                }
            }
        }
    }

    /**
     * Check if animation is playing
     */
    isAnimationPlaying() {
        let target = this.props.entity;
        if (this.props.entity instanceof TargetedAnimation) {
            target = this.props.entity.target;
        }

        return this.props.scene.getAllAnimatablesByTarget(target).length > 0;
    }

    /**
     * Stops the current playing animation
     */
    stopAnimation() {
        let target = this.props.entity;
        if (this.props.entity instanceof TargetedAnimation) {
            target = this.props.entity.target;
        }
        this._isPlaying = this.props.scene.getAllAnimatablesByTarget(target).length > 0;
        if (this._isPlaying) {
            this.props.playOrPause && this.props.playOrPause();
            if (this.state !== undefined) {
                this.setState({ isPlaying: false });
            }
            this._isPlaying = false;
        }
    }

    /**
     * Set if animation is looping and stops animation after it
     */
    setIsLooping = () => {
        this.setState({ isLooping: !this.state.isLooping, isPlaying: false }, () => this.stopAnimation());
    };

    setFramesPerSecond = (fps: number) => {
        this.setState({ fps: fps, isPlaying: false }, () => this.stopAnimation());
    };

    /**
     * Check if the animation has easing predefined
     */
    analyzeAnimationForLerp(animation: Animation | null) {
        if (animation !== null) {
            const { easingMode, easingType, usesTangents } = this.getAnimationData(animation);
            if (easingType === undefined && easingMode === undefined && !usesTangents) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    /**
     * Change the current frame in the canvas and timeline
     * @param frame value to update on canvas and timeline
     */
    changeCurrentFrame = (frame: number) => {
        this.stopAnimation();
        const animation = this.state.selected;
        if (animation) {
            const hasKeyframe = animation.getKeys().find((x) => x.frame === frame);
            const currentValue = this.calculateCurrentPointInCurve(frame);
            const value = hasKeyframe
                ? this.getValueAsArray(animation.dataType, hasKeyframe.value)[this.state.selectedCoordinate]
                : currentValue ?? 0;
            const keyframe: IAnimationKey = { frame, value };
            this.setState(
                {
                    currentFrame: frame,
                    isPlaying: false,
                },
                () => {
                    const index = animation.getKeys().findIndex((x) => x.frame === keyframe.frame);
                    const animationName = `${animation.name}_${animation.targetProperty}_${this.state.selectedCoordinate}`;
                    const id = this.encodeCurveId(animationName, index);
                    this.selectKeyframeFromId(id, keyframe);
                    this.setCanvasPosition(keyframe);
                }
            );
        }
    };

    /**
     * Calculate the value of the selected frame in curve
     * @param frame the frame to calculate its current value on the curve
     */
    calculateCurrentPointInCurve = (frame: number): number | undefined => {
        if (
            this.state.selectedPathData !== undefined &&
            this.state.selectedPathData[this.state.selectedCoordinate] !== undefined
        ) {
            const selectedCurve = this.state.selectedPathData[this.state.selectedCoordinate].domCurve.current;
            if (selectedCurve !== null) {
                const curveLength = selectedCurve.getTotalLength();

                const frameValue = (frame * curveLength) / 100;
                const currentPointInCurve = selectedCurve.getPointAtLength(frameValue);
                const middle = this._heightScale / 2;

                const offset =
                    (currentPointInCurve?.y * this._heightScale - this._heightScale ** 2 / 2) /
                    middle /
                    this._heightScale;

                const unit = Math.sign(offset);
                const currentValue = unit === -1 ? Math.abs(offset + unit) : unit - offset;
                this.setState({
                    currentValue: currentValue,
                    currentPoint: currentPointInCurve,
                });

                return currentValue;
            }
        }

        return undefined;
    };

    /**
     * Center the position the canvas depending on Keyframe value and frame
     * @param keyframe the keyframe to set as middle point
     */
    setCanvasPosition = (keyframe: IAnimationKey) => {
        if (this.state.selected) {
            // Changes initialframe and last frame
            const currentFramesInCanvas = this.state.framesInCanvasView.to - this.state.framesInCanvasView.from;

            const positionX = (keyframe.frame - currentFramesInCanvas / 2) * this._pixelFrameUnit;

            const newStartFrameInCanvas = Math.round(positionX / this._pixelFrameUnit);

            let value = 0;
            if (keyframe.value === null) {
                value = this.state.panningY;
            } else {
                value = this.getValueAsArray(this.state.selected.dataType, keyframe.value)[
                    this.state.selectedCoordinate
                ];
            }

            const valueScale = this._heightScale / this._scaleFactor;
            const middleCanvas = this._heightScale / 2;
            const positionY = value === 0 ? middleCanvas : middleCanvas - value * valueScale;

            this.setState({
                panningX: positionX,
                panningY: positionY,
                repositionCanvas: true,
                framesInCanvasView: { from: newStartFrameInCanvas, to: newStartFrameInCanvas + currentFramesInCanvas },
            });
        }
    };

    /**
     * Sets the current frame
     * @param frame the value to set the frame
     */
    setCurrentFrame = (frame: number) => {
        this.setState({
            currentFrame: frame,
        });
    };

    /**
     * Change the timeline animation frame limit
     */
    changeAnimationLimit = (limit: number) => {
        this.stopAnimation();
        const doubleLimit = limit * 2;
        this.setState({
            animationLimit: limit,
            canvasLength: doubleLimit,
            frameAxisLength: this.setFrameAxis(doubleLimit),
        });
    };

    /**
     * Update the frame in the selected Keyframe
     */
    updateFrameInKeyFrame = (frame: number, index: number) => {
        if (this.state && this.state.selected) {
            let animation = this.state.selected;
            let keys = [...animation.getKeys()];

            keys[index].frame = frame;

            animation.setKeys(keys);

            this.selectAnimation(animation);
        }
    };

    /**
     * Plays or pauses the animation
     * @param direction 0 stops the animation, 1 starts the animation, -1 plays animation backwards
     */
    playPause = (direction: number) => {
        this.registerObs();
        if (this.state.selected) {
            let target = this.props.entity;
            if (this.props.entity instanceof TargetedAnimation) {
                target = this.props.entity.target;
            }
            if (this.state.isPlaying && direction === 0) {
                this.props.scene.stopAnimation(target);
                this.setState({ isPlaying: false });
                this._isPlaying = false;
                this.forceUpdate();
            } else {
                if (this.state.isPlaying) {
                    this.props.scene.stopAnimation(target);
                }
                this.props.scene.stopAllAnimations();
                let keys = this.state.selected.getKeys();
                if (keys.length !== 0) {
                    let firstFrame = keys[0].frame;
                    let LastFrame = this.state.selected.getHighestFrame();
                    if (direction === 1) {
                        this._mainAnimatable = this.props.scene.beginAnimation(
                            target,
                            firstFrame,
                            LastFrame,
                            this.state.isLooping
                        );
                    }
                    if (direction === -1) {
                        this._mainAnimatable = this.props.scene.beginAnimation(
                            target,
                            LastFrame,
                            firstFrame,
                            this.state.isLooping
                        );
                    }
                    if (!this.state.isLooping && this._mainAnimatable) {
                        this._mainAnimatable.onAnimationEnd = () => this.playPause(0);
                    }
                }

                const zeroFrames = keys.filter((x) => x.frame === 0);
                if (zeroFrames.length > 1) {
                    keys.shift();
                }
                keys.sort((a, b) => a.frame - b.frame);

                this._isPlaying = true;
                this.setState({ isPlaying: true });
                this.forceUpdate();
            }
        }
    };

    /**
     * Set the frame to selected position on canvas
     * @event e click event on the SVG canvas
     */
    moveFrameTo(e: React.MouseEvent<SVGRectElement, MouseEvent>) {
        this.stopAnimation();
        var svg = e.currentTarget as SVGRectElement;
        var CTM = svg.getScreenCTM();
        let position;
        if (CTM) {
            position = new Vector2((e.clientX - CTM.e) / CTM.a, (e.clientY - CTM.f) / CTM.d);
            let selectedFrame = Math.round(position.x / this._pixelFrameUnit);
            this.setState({ currentFrame: selectedFrame, isPlaying: false }, () => {
                if (this.state.selected) {
                    const index = this.state.selected.getKeys().findIndex((x) => x.frame === selectedFrame);
                    const keyframe = this.state.selected.getKeys().find((x) => x.frame === selectedFrame);
                    if (index !== undefined && keyframe !== undefined) {
                        const animationName = `${this.state.selected.name}_${this.state.selected.targetProperty}_${this.state.selectedCoordinate}`;
                        const id = this.encodeCurveId(animationName, index);
                        this.selectKeyframeFromId(id, keyframe);
                        this.setCanvasPosition(keyframe);
                    }
                }
            });
        }
    }

    /**
     * Register the observables for the state
     */
    registerObs() {
        if (this._onBeforeRenderObserver) {
            this.props.scene.onBeforeRenderObservable.remove(this._onBeforeRenderObserver);
            this._onBeforeRenderObserver = null;
        }
        this._onBeforeRenderObserver = this.props.scene.onBeforeRenderObservable.add(() => {
            if (!this._isPlaying || !this._mainAnimatable) {
                return;
            }
            this.setState({
                currentFrame: Math.round(this._mainAnimatable.masterFrame),
            });
        });
    }

    /**
     * Checks if the current frame macthes the parameter
     * @param frame The frame to check
     */
    isCurrentFrame(frame: number) {
        return this.state.currentFrame === frame;
    }

    /**
     * Set the Vertical Panning State
     * @param panningY the vertical panning value
     */
    setPanningY = (panningY: number) => {
        this.setState({ panningY });
    };

    /**
     * Set the Vertical Panning State
     * @param panningX the horizontal panning value
     */
    setPanningX = (panningX: number) => {
        const currentFramesInCanvas = this.state.framesInCanvasView.to - this.state.framesInCanvasView.from;
        const newStartFrameInCanvas = Math.round(panningX / this._pixelFrameUnit);
        this.setState({
            panningX,
            framesInCanvasView: { from: newStartFrameInCanvas, to: newStartFrameInCanvas + currentFramesInCanvas },
        });
    };

    /**
     * Set state when canvas has been respositioned
     */
    canvasPositionEnded = () => {
        this.setState({ repositionCanvas: false });
    };

    /**
     *
     * @param message The message to display in the notification bar
     */
    setNotificationMessage = (message: string) => {
        this.setState({ notification: message });
    };

    /**
     * Zoom or frame the selected keyframes in the available canvas space
     */
    frameSelectedKeyframes = () => {
        const animation = this.state.selected;
        const coordinate = this.state.selectedCoordinate;
        if (animation) {
            let highest, lowest, firstFrame, lastFrame;
            const keysCopy = [...animation.getKeys()];
            // calculate scale factor for Value Axis //
            const selectedKeyframes = this.state.svgKeyframes?.filter((x) => x.selected);
            if (selectedKeyframes?.length === 0) {
                firstFrame = keysCopy[0].frame;
                lastFrame = keysCopy[keysCopy.length - 1].frame;
                // If not selected get all keyframes
                keysCopy.sort(
                    (a, b) =>
                        this.getValueAsArray(animation.dataType, a.value)[coordinate] -
                        this.getValueAsArray(animation.dataType, b.value)[coordinate]
                );
                lowest = keysCopy[0];
                highest = keysCopy[keysCopy.length - 1];
                keysCopy.sort((a, b) => a.frame - b.frame);
            } else {
                // If selected get keys
                const keysInRange = keysCopy.filter((kf, i) => {
                    return selectedKeyframes?.find((a: IKeyframeSvgPoint) => {
                        const { order } = this.decodeCurveId(a.id);
                        return i === order ? kf : undefined;
                    });
                });

                // Sort to get first and last frame
                keysInRange.sort((a, b) => a.frame - b.frame);

                firstFrame = keysInRange[0].frame;
                lastFrame = keysInRange[keysInRange.length - 1].frame;

                // Get previous and next non selected keyframe in range
                const prevKey = keysCopy[keysCopy.indexOf(keysInRange[0]) - 1];
                const nextKey = keysCopy[keysCopy.indexOf(keysInRange[keysInRange.length - 1]) + 1];

                // Insert keys in range
                if (prevKey) {
                    firstFrame = prevKey.frame;
                    keysInRange.push(prevKey);
                }
                if (nextKey) {
                    lastFrame = nextKey.frame;
                    keysInRange.push(nextKey);
                }

                // Sort to get lowest and highest values for scale
                keysInRange.sort(
                    (a, b) =>
                        this.getValueAsArray(animation.dataType, a.value)[coordinate] -
                        this.getValueAsArray(animation.dataType, b.value)[coordinate]
                );

                lowest = keysInRange[0];
                highest = keysInRange[keysInRange.length - 1];

                keysInRange.sort((a, b) => a.frame - b.frame);
            }

            // calculate scale...
            const scale =
                this.getValueAsArray(animation.dataType, highest?.value)[coordinate] -
                this.getValueAsArray(animation.dataType, lowest?.value)[coordinate];

            // Scale Frames to fit width of canvas
            // reposition canvas to middle value of scale
            const canvasMargin = 1.5;
            this._scaleFactor = isNaN(scale) || scale === 0 ? 2 : scale * canvasMargin;

            // Set a new scale factor but for Frames
            let currentSpace = 780;
            const frameUnit = 39;
            if (this._graphCanvas.current) {
                currentSpace = this._graphCanvas.current?.clientWidth;
            }
            const availableSpaceForFrames = currentSpace / frameUnit;
            // with client width divide the number of frames needed
            const frameDistance = lastFrame - firstFrame;
            this._pixelFrameUnit = availableSpaceForFrames / (frameDistance / 10); // Update scale here...
            if (this._pixelFrameUnit > 10) {
                this._pixelFrameUnit = 10;
            }
            const canvasValue = isNaN(scale) || scale === 0 ? 1 : scale / 2 + lowest?.value;

            const centerFrame = frameDistance / 2 + firstFrame; // add margin

            this.setState(
                {
                    framesInCanvasView: { from: firstFrame, to: lastFrame },
                },
                () => {
                    // Need to center and reposition canvas
                    this.setCanvasPosition({ frame: centerFrame, value: canvasValue });
                    // Render new points
                    this.selectAnimation(animation, coordinate);
                }
            );
        }
    };

    /**
     * Handle the frames quantity and scale on Window resize width
     */
    onWindowResizeWidth = () => {
        let framesResized: number;
        if (this._graphCanvas.current) {
            const defaultWidth = 781;
            const defaultSvgProportion = 1.8;
            const proportionResized = (defaultSvgProportion / 2) * 10;
            const svgCanvasViewBoxWidth = 200;
            const width = (this._graphCanvas.current.clientWidth / svgCanvasViewBoxWidth) * defaultSvgProportion;
            const percentResize = (this._graphCanvas.current.clientWidth * 100) / defaultWidth;

            const value = (percentResize - 100) * -1;

            const unit = 39;
            framesResized = Math.round(this._graphCanvas.current.clientWidth / unit);

            this.setState({
                valuesPositionResize: value - width + proportionResized,
                framesResized,
            });
        }
        this.onTimelineResize();
        clearTimeout(this._resizeId);
        this._resizeId = setTimeout(() => this.onWindowEndResize(framesResized), 300);
    };

    /**
     * Set the state of frames Resized on window resize event
     * @param framesResized how many frame have been added or removed on resize
     */
    onWindowEndResize = (framesResized: number) => {
        const howManyFrames = this.state.framesInCanvasView.to - this.state.framesInCanvasView.from;
        const difference = framesResized - howManyFrames;
        const framesInCanvasView = {
            from: this.state.framesInCanvasView.from - Math.round(difference / 2),
            to: this.state.framesInCanvasView.to + Math.round(difference / 2),
        };
        this.setState({
            framesInCanvasView,
        });
    };

    /** Resizes the width of the timeline */
    onTimelineResize = () => {
        if (this._editor.current) {
            const scrollHandle = this._editor.current.getElementsByClassName("scroll-handle")[0].clientWidth;
            this._resizedTimeline = scrollHandle;
        }
    };

    render() {
        return (
            <div ref={this._editor} id="animation-curve-editor">
                {/* Notifies if there is a warning or error */}
                <Notification
                    message={this.state.notification}
                    open={this.state.notification !== "" ? true : false}
                    close={this.clearNotification}
                />
                {/* Renders the actions to perform on the selected keyframe and control points */}
                <GraphActionsBar
                    setKeyframeValue={this.setKeyframeValueFromInput}
                    enabled={this.state.selected === null || this.state.selected === undefined ? false : true}
                    title={this._entityName}
                    actionableKeyframe={this.state.actionableKeyframe}
                    handleFrameChange={this.handleFrameChange}
                    handleValueChange={this.handleValueChange}
                    addKeyframe={this.addKeyframeClick}
                    removeKeyframe={this.removeKeyframeClick}
                    frameSelectedKeyframes={this.frameSelectedKeyframes}
                    brokenMode={this.state.isBrokenMode}
                    brokeTangents={this.setBrokenMode}
                    lerpMode={this.state.lerpMode}
                    setLerpToActiveControlPoint={this.setLerpToActiveControlPoint}
                    flatTangent={this.setFlatTangent}
                    frameRange={{ max: this.state.maxFrame, min: this.state.minFrame }}
                />
                {/* Animation list and edit controls */}
                <div className="content">
                    <div className="row">
                        {/* Renders the edition controls for the animations */}
                        <EditorControls
                            deselectAnimation={this.deselectAnimation}
                            selectAnimation={this.selectAnimation}
                            isTargetedAnimation={this._isTargetedAnimation}
                            entity={this.props.entity}
                            selected={this.state.selected}
                            lockObject={this.props.lockObject}
                            setNotificationMessage={this.setNotificationMessage}
                            globalState={this.props.globalState}
                            snippetServer={this._snippetUrl}
                            fps={this.state.fps}
                            setFps={this.setFramesPerSecond}
                            setIsLooping={this.setIsLooping}
                        />
                        {/* Renders the main canvas to render the curves */}
                        <div ref={this._graphCanvas} className="graph-chart" onWheel={this.zoom}>
                            {this.state.svgKeyframes && (
                                <SvgDraggableArea
                                    ref={this._svgCanvas}
                                    viewBoxScale={this.state.frameAxisLength.length}
                                    scale={this.state.scale}
                                    removeSelectedKeyframes={this.removeKeyframes}
                                    deselectKeyframes={this.deselectKeyframes}
                                    updatePosition={this.renderPoints}
                                    panningY={this.setPanningY}
                                    panningX={this.setPanningX}
                                    setCurrentFrame={this.setCurrentFrame}
                                    positionCanvas={new Vector2(this.state.panningX, this.state.panningY)}
                                    repositionCanvas={this.state.repositionCanvas}
                                    canvasPositionEnded={this.canvasPositionEnded}
                                    keyframeSvgPoints={this.state.svgKeyframes}
                                    resetActionableKeyframe={this.resetActionableKeyframe}
                                    framesInCanvasView={this.state.framesInCanvasView}
                                    framesResized={this.state.framesResized}
                                >
                                    {/* Render the value axis labels */}
                                    {this.setValueLines().map((line, i) => {
                                        return (
                                            <text
                                                key={`value_inline_${i}`}
                                                x={this.state.panningX - 5}
                                                y={line.value}
                                                dx={this.state.valuesPositionResize}
                                                textAnchor="middle"
                                                dy="-1"
                                                style={{
                                                    fontSize: `${0.18 * this.state.scale}em`,
                                                    fontWeight: "bold",
                                                    textAlign: "center",
                                                }}
                                            >
                                                {line.label}
                                            </text>
                                        );
                                    })}
                                    {/* Render the value axis lines for the canvas */}
                                    {this.setValueLines().map((line, i) => {
                                        return (
                                            <line
                                                key={i}
                                                x1={-((this.state.frameAxisLength.length * 10) / 2)}
                                                y1={line.value}
                                                x2={this.state.frameAxisLength.length * 10}
                                                y2={line.value}
                                            ></line>
                                        );
                                    })}

                                    {/* Renders the curves. Supports multiple curves  */}
                                    {this.state.selectedPathData?.map((curve, i) => (
                                        <path
                                            key={i}
                                            ref={curve.domCurve}
                                            pathLength={curve.pathLength}
                                            id="curve"
                                            d={curve.pathData}
                                            style={{
                                                stroke: curve.color,
                                                fill: "none",
                                                strokeWidth: "0.5",
                                            }}
                                        ></path>
                                    ))}

                                    {/* Render selected curve keyframes */}
                                    {this.state.svgKeyframes.map((keyframe, i) => (
                                        <KeyframeSvgPoint
                                            key={`${keyframe.id}_${i}`}
                                            id={keyframe.id}
                                            keyframePoint={keyframe.keyframePoint}
                                            leftControlPoint={keyframe.leftControlPoint}
                                            rightControlPoint={keyframe.rightControlPoint}
                                            isLeftActive={keyframe.isLeftActive}
                                            isRightActive={keyframe.isRightActive}
                                            selected={keyframe.selected}
                                            selectedControlPoint={this.selectedControlPoint}
                                            selectKeyframe={this.selectKeyframe}
                                            framesInCanvasView={this.state.framesInCanvasView}
                                        />
                                    ))}

                                    {/* Renders clickable area for frames  */}
                                    <rect
                                        onClick={(e) => this.moveFrameTo(e)}
                                        x={-((this.state.frameAxisLength.length * 10) / 2)}
                                        y={91 + this.state.panningY + "%"}
                                        width={this.state.frameAxisLength.length * 10}
                                        height="9%"
                                        fill="#222"
                                        style={{ cursor: "pointer" }}
                                    ></rect>
                                    {/* Renders frame axis labels  */}
                                    {this.state.frameAxisLength.map((f, i) => (
                                        <svg key={i} x="0" y={96 + this.state.panningY + "%"} className="frame-contain">
                                            <text
                                                x={f.value}
                                                y="1px"
                                                dx="2px"
                                                style={{ fontSize: `${0.2 * this.state.scale}em` }}
                                            >
                                                {Math.round((f.label * 10) / this._pixelFrameUnit)}
                                            </text>
                                            <line x1={f.value} y1="0" x2={f.value} y2="5%"></line>

                                            {f.value % this.state.fps === 0 && f.value !== 0 ? (
                                                <line
                                                    x1={f.value * this._pixelFrameUnit}
                                                    y1="-100%"
                                                    x2={f.value * this._pixelFrameUnit}
                                                    y2="5%"
                                                ></line>
                                            ) : null}
                                        </svg>
                                    ))}
                                    {/* Renders the playhead */}
                                    {this.state.selected && this.state.currentFrame !== undefined ? (
                                        <svg x="0" y={96 + this.state.panningY + "%"}>
                                            <line
                                                x1={this.state.currentFrame * this._pixelFrameUnit}
                                                y1="0"
                                                x2={this.state.currentFrame * this._pixelFrameUnit}
                                                y2="-100%"
                                                style={{
                                                    stroke: "#a4a4a4",
                                                    strokeWidth: 0.4,
                                                }}
                                            />
                                            <svg x={this.state.currentFrame * this._pixelFrameUnit} y="-1">
                                                <circle className="svg-playhead" cx="0" cy="0" r="2%" fill="white" />
                                                <text
                                                    x="0"
                                                    y="1%"
                                                    textAnchor="middle"
                                                    style={{
                                                        fontSize: `${0.17 * this.state.scale}em`,
                                                        pointerEvents: "none",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {this.state.currentFrame}
                                                </text>
                                            </svg>
                                        </svg>
                                    ) : null}
                                </SvgDraggableArea>
                            )}
                            <div className="rect-chart"></div>
                            <ScaleLabel current={this.state.valueScaleType} />
                        </div>
                    </div>
                    <div className="row-bottom">
                        {/* Renders the timeline of the editor  */}
                        <Timeline
                            currentFrame={this.state.currentFrame}
                            playPause={this.playPause}
                            isPlaying={this.state.isPlaying}
                            dragKeyframe={this.updateFrameInKeyFrame}
                            onCurrentFrameChange={this.changeCurrentFrame}
                            onAnimationLimitChange={this.changeAnimationLimit}
                            animationLimit={this.state.animationLimit}
                            keyframes={this.state.selected && this.state.selected.getKeys()}
                            selected={this.state.selected && this.state.selected.getKeys()[0]}
                            fps={this.state.fps}
                            repositionCanvas={this.setCanvasPosition}
                            resizeWindowProportion={this._resizedTimeline}
                        ></Timeline>
                    </div>
                </div>
            </div>
        );
    }
}
