import * as React from "react";
import { IAnimationKey } from "babylonjs/Animations/animationKey";
import { Controls } from "./controls";

interface ITimelineProps {
    // Keyframes list in the animation
    keyframes: IAnimationKey[] | null;
    // The selected animation keyframe
    selected: IAnimationKey | null;
    // The current frame of the selected animation keyframe
    currentFrame: number;
    // Selects the frame of an animation keyframe
    onCurrentFrameChange: (frame: number) => void;
    // Changes animation length limit (visible on canvas)
    onAnimationLimitChange: (limit: number) => void;
    // Keyframe to drag by the user
    dragKeyframe: (frame: number, index: number) => void;
    // Starts/stops the animation (0 stops, -1 plays backward, 1 normal)
    playPause: (direction: number) => void;
    // If animation is playing
    isPlaying: boolean;
    // The last visible frame on the canvas. Controls the length of the visible timeline
    animationLimit: number;
    // Frames per second
    fps: number;
    // Reposition the canvas and center it to the selected keyframe
    repositionCanvas: (keyframe: IAnimationKey) => void;
    // Change proportion of the resized window
    resizeWindowProportion: number;
}

interface ITimelineState {
    // Selected keyframe
    selected: IAnimationKey;
    // Active frame
    activeKeyframe: number | null;
    // Start of the timeline scrollbar
    start: number;
    // End of the timeline scrollbar
    end: number;
    // Current widht of the scrollbar
    scrollWidth: number | undefined;
    // The length of the visible frame
    selectionLength: number[];
    // Limit of the visible frames
    limitValue: number;
}

/**
 * The Timeline for the curve editor
 *
 * Has a scrollbar that can be resized and move to left and right.
 * The timeline does not affect the Canvas but only the frame container.
 */
export class Timeline extends React.Component<ITimelineProps, ITimelineState> {
    // Div Elements to display the timeline
    private _scrollable: React.RefObject<HTMLDivElement>;
    private _scrollbarHandle: React.RefObject<HTMLDivElement>;
    private _scrollContainer: React.RefObject<HTMLDivElement>;
    private _inputAnimationLimit: React.RefObject<HTMLInputElement>;
    // Direction of drag and resize of timeline
    private _direction: number;
    private _scrolling: boolean;
    private _shiftX: number;
    private _active: string = "";
    // Margin of scrollbar and container
    readonly _marginScrollbar: number;

    constructor(props: ITimelineProps) {
        super(props);

        this._scrollable = React.createRef();
        this._scrollbarHandle = React.createRef();
        this._scrollContainer = React.createRef();
        this._inputAnimationLimit = React.createRef();
        this._direction = 0;
        this._scrolling = false;
        this._shiftX = 0;
        this._marginScrollbar = 3;

        // Limit as Int because is related to Frames.
        const limit = Math.round(this.props.animationLimit / 2);
        const scrollWidth = this.calculateScrollWidth(0, limit);

        if (this.props.selected !== null) {
            this.state = {
                selected: this.props.selected,
                activeKeyframe: null,
                start: 0,
                end: limit,
                scrollWidth: scrollWidth,
                selectionLength: this.range(0, limit),
                limitValue: this.props.animationLimit,
            };
        }
    }

    /** Listen to keyup events and set the initial lenght of the scrollbar */
    componentDidMount() {
        setTimeout(() => {
            this.setState({
                scrollWidth: this.calculateScrollWidth(this.state.start, this.state.end),
            });
        }, 0);

        this._inputAnimationLimit.current?.addEventListener("keyup", this.isEnterKeyUp.bind(this));
    }

    /** Recalculate the scrollwidth if a window resize happens */
    componentDidUpdate(prevProps: ITimelineProps) {
        if (prevProps.animationLimit !== this.props.animationLimit) {
            this.setState({ limitValue: this.props.animationLimit });
        }
        if (prevProps.resizeWindowProportion !== this.props.resizeWindowProportion) {
            if (this.state.scrollWidth !== undefined) {
                this.setState({ scrollWidth: this.calculateScrollWidth(this.state.start, this.state.end) });
            }
        }
    }

    /** Remove key event listener */
    componentWillUnmount() {
        this._inputAnimationLimit.current?.removeEventListener("keyup", this.isEnterKeyUp.bind(this));
    }

    /**
     * Set component state if enter key is pressed
     * @param event enter key event
     */
    isEnterKeyUp(event: KeyboardEvent) {
        event.preventDefault();
        if (event.key === "Enter") {
            this.setControlState();
        }
    }

    /**
     * Detect blur event
     * @param event Blur event
     */
    onInputBlur(event: React.FocusEvent<HTMLInputElement>) {
        event.preventDefault();
        this.setControlState();
    }

    /** Set component state (scrollbar width, position, and start and end) */
    setControlState() {
        this.props.onAnimationLimitChange(this.state.limitValue);
        const newEnd = Math.round(this.state.limitValue / 2);
        this.setState(
            {
                start: 0,
                end: newEnd,
                selectionLength: this.range(0, newEnd),
            },
            () => {
                this.setState({
                    scrollWidth: this.calculateScrollWidth(0, newEnd),
                });
                if (this._scrollbarHandle.current && this._scrollContainer.current) {
                    this._scrollbarHandle.current.style.left = `${
                        this._scrollContainer.current.getBoundingClientRect().left + this._marginScrollbar
                    }px`;
                }
            }
        );
    }

    /**
     * Set scrollwidth on the timeline
     * @param {number} start Frame from which the scrollbar should begin.
     * @param {number} end Last frame for the timeline.
     */
    calculateScrollWidth(start: number, end: number) {
        if (this._scrollContainer.current && this.props.animationLimit !== 0) {
            const containerMarginLeftRight = this._marginScrollbar * 2;
            const containerWidth = this._scrollContainer.current.clientWidth - containerMarginLeftRight;
            const scrollFrameLimit = this.props.animationLimit;
            const scrollFrameLength = end - start;
            const widthPercentage = Math.round((scrollFrameLength * 100) / scrollFrameLimit);
            const scrollPixelWidth = Math.round((widthPercentage * containerWidth) / 100);
            if (scrollPixelWidth === Infinity || scrollPixelWidth > containerWidth) {
                return containerWidth;
            }
            return scrollPixelWidth;
        } else {
            return undefined;
        }
    }

    /**
     * Play animation backwards
     * @param event Mouse event
     */
    playBackwards(event: React.MouseEvent<HTMLDivElement>) {
        this.props.playPause(-1);
    }

    /**
     * Play animation
     * @param event Mouse event
     */
    play(event: React.MouseEvent<HTMLDivElement>) {
        this.props.playPause(1);
    }

    /**
     * Pause the animation
     * @param event Mouse event
     */
    pause(event: React.MouseEvent<HTMLDivElement>) {
        if (this.props.isPlaying) {
            this.props.playPause(1);
        }
    }

    /**
     * Set the selected frame
     * @param event Mouse event
     */
    setCurrentFrame = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (this._scrollable.current) {
            this._scrollable.current.focus();
            const containerWidth = this._scrollable.current?.clientWidth - 20;
            const framesOnView = this.state.selectionLength.length;
            const unit = containerWidth / framesOnView;
            const frame = Math.round((event.clientX - 230) / unit) + this.state.start;
            this.props.onCurrentFrameChange(frame);
        }
    };

    /**
     * Handles the change of number of frames available in the timeline.
     */
    handleLimitChange(event: React.ChangeEvent<HTMLInputElement>) {
        event.preventDefault();
        let newLimit = parseInt(event.target.value);
        if (isNaN(newLimit)) {
            newLimit = 0;
        }
        this.setState({
            limitValue: newLimit,
        });
    }

    /**
     * Starts the scrollbar dragging
     * @param e Mouse event on SVG Element
     */
    dragStart = (e: React.MouseEvent<SVGSVGElement, MouseEvent>): void => {
        e.preventDefault();
        this.setState({ activeKeyframe: parseInt((e.target as SVGSVGElement).id.replace("kf_", "")) });
        this._direction = e.clientX;
    };

    /**
     * Update the canvas visible frames while dragging
     * @param e Mouse event
     */
    drag = (e: React.MouseEvent<SVGSVGElement, MouseEvent>): void => {
        e.preventDefault();
        if (this.props.keyframes) {
            if (this.state.activeKeyframe === parseInt((e.target as SVGSVGElement).id.replace("kf_", ""))) {
                let updatedKeyframe = this.props.keyframes[this.state.activeKeyframe];
                if (this._direction > e.clientX) {
                    let used = this.isFrameBeingUsed(updatedKeyframe.frame - 1, -1);
                    if (used) {
                        updatedKeyframe.frame = used;
                    }
                } else {
                    let used = this.isFrameBeingUsed(updatedKeyframe.frame + 1, 1);
                    if (used) {
                        updatedKeyframe.frame = used;
                    }
                }

                this.props.dragKeyframe(updatedKeyframe.frame, this.state.activeKeyframe);
            }
        }
    };

    /**
     * Check if the frame is being used as a Keyframe by the animation
     * @param frame number of frame
     * @param direction frame increment or decrement
     */
    isFrameBeingUsed(frame: number, direction: number) {
        let used = this.props.keyframes?.find((kf) => kf.frame === frame);
        if (used) {
            this.isFrameBeingUsed(used.frame + direction, direction);
            return false;
        } else {
            return frame;
        }
    }

    /**
     * Reset drag state
     * @param e Mouse event on SVG Element
     */
    dragEnd = (e: React.MouseEvent<SVGSVGElement, MouseEvent>): void => {
        e.preventDefault();
        this._direction = 0;
        this.setState({ activeKeyframe: null });
    };

    /**
     * Change position of the scrollbar
     * @param e Mouse event
     */
    scrollDragStart = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        e.preventDefault();
        this._scrollContainer.current && this._scrollContainer.current.focus();

        if ((e.target as HTMLDivElement).className === "scrollbar") {
            if (this._scrollbarHandle.current) {
                this._scrolling = true;
                this._shiftX = e.clientX - this._scrollbarHandle.current.getBoundingClientRect().left;
                this._scrollbarHandle.current.style.left = e.pageX - this._shiftX + "px";
            }
        }

        if ((e.target as HTMLDivElement).className === "left-draggable" && this._scrollbarHandle.current) {
            this._active = "leftDraggable";
            this._shiftX = e.clientX - this._scrollbarHandle.current.getBoundingClientRect().left - 3;
        }

        if ((e.target as HTMLDivElement).className === "right-draggable" && this._scrollbarHandle.current) {
            this._active = "rightDraggable";
            this._shiftX = e.clientX - this._scrollbarHandle.current.getBoundingClientRect().left + 3;
        }
    };

    /**
     * Change size of scrollbar
     * @param e Mouse event
     */
    scrollDrag = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        e.preventDefault();
        if ((e.target as HTMLDivElement).className === "scrollbar") {
            this.moveScrollbar(e.pageX);
        }

        if (this._active === "leftDraggable") {
            this.resizeScrollbarLeft(e.clientX);
        }

        if (this._active === "rightDraggable") {
            this.resizeScrollbarRight(e.clientX);
        }
    };

    /**
     * Reset scroll drag
     * @param e Mouse event
     */
    scrollDragEnd = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        e.preventDefault();
        this._scrolling = false;
        this._active = "";
        this._shiftX = 0;
    };

    /**
     * Sets the start, end and selection length of the scrollbar. This will control the width and
     * height of the scrollbar as well as the number of frames available
     * @param {number} pageX Controls the X axis of the scrollbar movement.
     */
    moveScrollbar(pageX: number) {
        if (this._scrolling && this._scrollbarHandle.current && this._scrollContainer.current) {
            const moved = pageX - this._shiftX;
            const scrollContainerWith = this._scrollContainer.current.clientWidth;
            const startPixel = moved - this._scrollContainer.current.getBoundingClientRect().left;
            const limitRight = scrollContainerWith - (this.state.scrollWidth || 0) - this._marginScrollbar;

            if (moved > 233 && startPixel < limitRight) {
                this._scrollbarHandle.current.style.left = moved + "px";
                (this._scrollable.current as HTMLDivElement).scrollLeft = moved + 10;

                const startPixelPercent = (startPixel * 100) / scrollContainerWith;

                const selectionStartFrame = Math.round((startPixelPercent * this.props.animationLimit) / 100);

                const selectionEndFrame = this.state.selectionLength.length + selectionStartFrame;

                this.setState({
                    start: selectionStartFrame,
                    end: selectionEndFrame,
                    selectionLength: this.range(selectionStartFrame, selectionEndFrame),
                });
            }
        }
    }

    /**
     * Controls the resizing of the scrollbar from the right handle
     * @param {number} clientX how much mouse has moved
     */
    resizeScrollbarRight(clientX: number) {
        if (this._scrollContainer.current && this._scrollbarHandle.current) {
            const moving = clientX - this._scrollContainer.current.getBoundingClientRect().left;

            const unit = this._scrollContainer.current.clientWidth / this.props.animationLimit;
            const priorLastFrame = this.state.end * unit;
            const mouseMoved = moving - priorLastFrame;

            let framesTo = 0;
            if (Math.sign(mouseMoved) !== -1) {
                framesTo = Math.round(mouseMoved / unit) + this.state.end;
            } else {
                framesTo = this.state.end - Math.round(Math.abs(mouseMoved) / unit);
            }

            if (!(framesTo <= this.state.start + 20)) {
                if (framesTo <= this.props.animationLimit) {
                    this.setState({
                        end: framesTo,
                        scrollWidth: this.calculateScrollWidth(this.state.start, framesTo),
                        selectionLength: this.range(this.state.start, framesTo),
                    });
                }
            }
        }
    }

    /**
     * Controls the resizing of the scrollbar from the left handle
     *  @param {number} clientX how much mouse has moved
     */
    resizeScrollbarLeft(clientX: number) {
        if (this._scrollContainer.current && this._scrollbarHandle.current) {
            const moving = clientX - this._scrollContainer.current.getBoundingClientRect().left;

            const unit = this._scrollContainer.current.clientWidth / this.props.animationLimit;
            const priorFirstFrame = this.state.start !== 0 ? this.state.start * unit : 0;
            const mouseMoved = moving - priorFirstFrame;

            let framesTo = 0;

            if (Math.sign(mouseMoved) !== -1) {
                framesTo = Math.round(mouseMoved / unit) + this.state.start;
            } else {
                framesTo = this.state.start !== 0 ? this.state.start - Math.round(Math.abs(mouseMoved) / unit) : 0;
            }

            if (!(framesTo >= this.state.end - 20)) {
                let toleft =
                    framesTo * unit +
                    this._scrollContainer.current.getBoundingClientRect().left +
                    this._marginScrollbar * 2;
                if (this._scrollbarHandle.current) {
                    this._scrollbarHandle.current.style.left = toleft + "px";
                }
                this.setState({
                    start: framesTo,
                    scrollWidth: this.calculateScrollWidth(framesTo, this.state.end),
                    selectionLength: this.range(framesTo, this.state.end),
                });
            }
        }
    }

    /**
     * Returns array with the expected length between two numbers
     * @param start initial visible frame
     * @param stop last visible frame
     */
    range(start: number, end: number) {
        return Array.from({ length: end - start }, (_, i) => start + i * 1);
    }

    /**
     * Get the animation keyframe
     * @param frame Frame
     */
    getKeyframe(frame: number) {
        if (this.props.keyframes) {
            return this.props.keyframes.find((x) => x.frame === frame);
        } else {
            return false;
        }
    }

    /**
     * Get the current animation keyframe
     * @param frame Frame
     */
    getCurrentFrame(frame: number) {
        if (this.props.currentFrame === frame) {
            return true;
        } else {
            return false;
        }
    }

    /* Overrides default DOM drag */
    dragDomFalse = () => false;

    render() {
        return (
            <>
                <div className="timeline">
                    {/* Renders the play animation controls */}
                    <Controls
                        keyframes={this.props.keyframes}
                        selected={this.props.selected}
                        currentFrame={this.props.currentFrame}
                        onCurrentFrameChange={this.props.onCurrentFrameChange}
                        repositionCanvas={this.props.repositionCanvas}
                        playPause={this.props.playPause}
                        isPlaying={this.props.isPlaying}
                        scrollable={this._scrollable}
                    />
                    <div className="timeline-wrapper">
                        {/* Renders the timeline that displays the animation keyframes */}
                        <div
                            ref={this._scrollable}
                            className="display-line"
                            onClick={this.setCurrentFrame}
                            tabIndex={50}
                        >
                            <svg
                                style={{
                                    width: "100%",
                                    height: 40,
                                    backgroundColor: "#222222",
                                }}
                                onMouseMove={this.drag}
                                onMouseDown={this.dragStart}
                                onMouseUp={this.dragEnd}
                                onMouseLeave={this.dragEnd}
                            >
                                {/* Renders the visible frames */}
                                {this.state.selectionLength.map((frame, i) => {
                                    return (
                                        <svg key={`tl_${frame}`}>
                                            {
                                                <>
                                                    {frame % Math.round(this.state.selectionLength.length / 20) ===
                                                    0 ? (
                                                        <>
                                                            <text
                                                                x={(i * 100) / this.state.selectionLength.length + "%"}
                                                                y="18"
                                                                style={{ fontSize: 10, fill: "#555555" }}
                                                            >
                                                                {frame}
                                                            </text>
                                                            <line
                                                                x1={(i * 100) / this.state.selectionLength.length + "%"}
                                                                y1="22"
                                                                x2={(i * 100) / this.state.selectionLength.length + "%"}
                                                                y2="40"
                                                                style={{ stroke: "#555555", strokeWidth: 0.5 }}
                                                            />
                                                        </>
                                                    ) : null}
                                                    {this.getCurrentFrame(frame) ? (
                                                        <svg
                                                            x={
                                                                this._scrollable.current
                                                                    ? this._scrollable.current.clientWidth /
                                                                      this.state.selectionLength.length /
                                                                      2
                                                                    : 1
                                                            }
                                                        >
                                                            <line
                                                                x1={(i * 100) / this.state.selectionLength.length + "%"}
                                                                y1="0"
                                                                x2={(i * 100) / this.state.selectionLength.length + "%"}
                                                                y2="40"
                                                                style={{
                                                                    stroke: "rgba(18, 80, 107, 0.26)",
                                                                    strokeWidth: this._scrollable.current
                                                                        ? this._scrollable.current.clientWidth /
                                                                          this.state.selectionLength.length
                                                                        : 1,
                                                                }}
                                                            />
                                                        </svg>
                                                    ) : null}

                                                    {this.getKeyframe(frame) ? (
                                                        <svg key={`kf_${i}`} tabIndex={i + 40}>
                                                            <line
                                                                id={`kf_${i.toString()}`}
                                                                x1={(i * 100) / this.state.selectionLength.length + "%"}
                                                                y1="0"
                                                                x2={(i * 100) / this.state.selectionLength.length + "%"}
                                                                y2="40"
                                                                style={{ stroke: "#ffc017", strokeWidth: 1 }}
                                                            />
                                                        </svg>
                                                    ) : null}
                                                </>
                                            }
                                        </svg>
                                    );
                                })}
                            </svg>
                        </div>
                        {/* Timeline scrollbar that has drag events */}
                        <div
                            className="timeline-scroll-handle"
                            onMouseMove={this.scrollDrag}
                            onMouseDown={this.scrollDragStart}
                            onMouseUp={this.scrollDragEnd}
                            onMouseLeave={this.scrollDragEnd}
                            onDragStart={this.dragDomFalse}
                        >
                            <div className="scroll-handle" ref={this._scrollContainer} tabIndex={60}>
                                <div
                                    className="handle"
                                    ref={this._scrollbarHandle}
                                    style={{ width: this.state.scrollWidth }}
                                >
                                    {/* Handle that resizes the scrollbar to the left */}
                                    <div className="left-grabber">
                                        <div className="left-draggable">
                                            <div className="grabber"></div>
                                            <div className="grabber"></div>
                                            <div className="grabber"></div>
                                        </div>
                                        <div className="text">{this.state.start}</div>
                                    </div>
                                    <div className="scrollbar"></div>
                                    {/* Handle that resizes the scrollbar to the right */}
                                    <div className="right-grabber">
                                        <div className="text">{this.state.end}</div>
                                        <div className="right-draggable">
                                            <div className="grabber"></div>
                                            <div className="grabber"></div>
                                            <div className="grabber"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Handles the limit of number of frames in the selected animation */}
                        <div className="input-frame">
                            <input
                                ref={this._inputAnimationLimit}
                                type="number"
                                value={this.state.limitValue}
                                onChange={(e) => this.handleLimitChange(e)}
                                onBlur={(e) => this.onInputBlur(e)}
                            ></input>
                        </div>
                    </div>
                </div>
            </>
        );
    }
}
