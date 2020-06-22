import * as React from 'react';
import { IAnimationKey } from 'babylonjs/Animations/animationKey';
import { Controls } from './controls';

interface ITimelineProps {
  keyframes: IAnimationKey[] | null;
  selected: IAnimationKey | null;
  currentFrame: number;
  onCurrentFrameChange: (frame: number) => void;
  onAnimationLimitChange: (limit: number) => void;
  dragKeyframe: (frame: number, index: number) => void;
  playPause: (direction: number) => void;
  isPlaying: boolean;
  animationLimit: number;
}

export class Timeline extends React.Component<
  ITimelineProps,
  {
    selected: IAnimationKey;
    activeKeyframe: number | null;
    start: number;
    end: number;
    scrollWidth: number | undefined;
    selectionLength: number[];
  }
> {
  readonly _frames: object[] = Array(300).fill({});
  private _scrollable: React.RefObject<HTMLDivElement>;
  private _scrollbarHandle: React.RefObject<HTMLDivElement>;
  private _scrollContainer: React.RefObject<HTMLDivElement>;
  private _direction: number;
  private _scrolling: boolean;
  private _shiftX: number;

  constructor(props: ITimelineProps) {
    super(props);

    this._scrollable = React.createRef();
    this._scrollbarHandle = React.createRef();
    this._scrollContainer = React.createRef();
    this._direction = 0;
    this._scrolling = false;
    this._shiftX = 0;

    if (this.props.selected !== null) {
      this.state = {
        selected: this.props.selected,
        activeKeyframe: null,
        start: 0,
        end: this.props.animationLimit,
        scrollWidth: this.calculateScrollWidth(0, this.props.animationLimit),
        selectionLength: this.range(0, 100),
      };
    }
  }

  componentDidMount() {
    this.setState({
      scrollWidth: this.calculateScrollWidth(this.state.start, this.state.end),
    });
  }

  calculateScrollWidth(start: number, end: number) {
    if (this._scrollContainer.current) {
      const containerWidth = this._scrollContainer.current.clientWidth;
      const scrollFrameLimit = this.props.animationLimit;
      const scrollFrameLength = end - start;
      const widthPercentage = (scrollFrameLength * 100) / scrollFrameLimit;
      const scrollPixelWidth = (widthPercentage * containerWidth) / 100;
      return scrollPixelWidth;
    } else {
      return undefined;
    }
  }

  playBackwards(event: React.MouseEvent<HTMLDivElement>) {
    this.props.playPause(-1);
  }

  play(event: React.MouseEvent<HTMLDivElement>) {
    this.props.playPause(1);
  }

  pause(event: React.MouseEvent<HTMLDivElement>) {
    if (this.props.isPlaying) {
      this.props.playPause(1);
    }
  }

  handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    this.props.onCurrentFrameChange(parseInt(event.target.value));
    event.preventDefault();
  }

  handleLimitChange(event: React.ChangeEvent<HTMLInputElement>) {
    event.preventDefault();
    const newLimit = parseInt(event.target.value);
    this.setState({
      end: newLimit,
      scrollWidth: this.calculateScrollWidth(this.state.start, newLimit),
      selectionLength: this.range(this.state.start, newLimit),
    });
    this.props.onAnimationLimitChange(newLimit);
  }

  nextFrame(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    this.props.onCurrentFrameChange(this.props.currentFrame + 1);
    (this._scrollable.current as HTMLDivElement).scrollLeft =
      this.props.currentFrame * 5;
  }

  previousFrame(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    if (this.props.currentFrame !== 0) {
      this.props.onCurrentFrameChange(this.props.currentFrame - 1);
      (this._scrollable.current as HTMLDivElement).scrollLeft = -(
        this.props.currentFrame * 5
      );
    }
  }

  nextKeyframe(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    if (this.props.keyframes !== null) {
      let first = this.props.keyframes.find(
        (kf) => kf.frame > this.props.currentFrame
      );
      if (first) {
        this.props.onCurrentFrameChange(first.frame);
        this.setState({ selected: first });
        (this._scrollable.current as HTMLDivElement).scrollLeft =
          first.frame * 5;
      }
    }
  }

  previousKeyframe(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    if (this.props.keyframes !== null) {
      let keyframes = [...this.props.keyframes];
      let first = keyframes
        .reverse()
        .find((kf) => kf.frame < this.props.currentFrame);
      if (first) {
        this.props.onCurrentFrameChange(first.frame);
        this.setState({ selected: first });
        (this._scrollable.current as HTMLDivElement).scrollLeft = -(
          first.frame * 5
        );
      }
    }
  }

  dragStart(e: React.TouchEvent<SVGSVGElement>): void;
  dragStart(e: React.MouseEvent<SVGSVGElement, MouseEvent>): void;
  dragStart(e: any): void {
    e.preventDefault();
    this.setState({ activeKeyframe: parseInt(e.target.id.replace('kf_', '')) });
    this._direction = e.clientX;
  }

  drag(e: React.TouchEvent<SVGSVGElement>): void;
  drag(e: React.MouseEvent<SVGSVGElement, MouseEvent>): void;
  drag(e: any): void {
    e.preventDefault();
    if (this.props.keyframes) {
      if (
        this.state.activeKeyframe === parseInt(e.target.id.replace('kf_', ''))
      ) {
        let updatedKeyframe = this.props.keyframes[this.state.activeKeyframe];
        if (this._direction > e.clientX) {
          console.log(`Dragging left ${this.state.activeKeyframe}`);
          let used = this.isFrameBeingUsed(updatedKeyframe.frame - 1, -1);
          if (used) {
            updatedKeyframe.frame = used;
          }
        } else {
          console.log(`Dragging Right ${this.state.activeKeyframe}`);
          let used = this.isFrameBeingUsed(updatedKeyframe.frame + 1, 1);
          if (used) {
            updatedKeyframe.frame = used;
          }
        }

        this.props.dragKeyframe(
          updatedKeyframe.frame,
          this.state.activeKeyframe
        );
      }
    }
  }

  isFrameBeingUsed(frame: number, direction: number) {
    let used = this.props.keyframes?.find((kf) => kf.frame === frame);
    if (used) {
      this.isFrameBeingUsed(used.frame + direction, direction);
      return false;
    } else {
      return frame;
    }
  }

  dragEnd(e: React.TouchEvent<SVGSVGElement>): void;
  dragEnd(e: React.MouseEvent<SVGSVGElement, MouseEvent>): void;
  dragEnd(e: any): void {
    e.preventDefault();
    this._direction = 0;
    this.setState({ activeKeyframe: null });
  }

  private active: string = '';

  scrollDragStart(e: React.TouchEvent<HTMLDivElement>): void;
  scrollDragStart(e: React.MouseEvent<HTMLDivElement, MouseEvent>): void;
  scrollDragStart(e: any) {
    e.preventDefault();
    if (e.target.className === 'scrollbar') {
      if ((e.target.class = 'scrollbar') && this._scrollbarHandle.current) {
        this._scrolling = true;
        this._shiftX =
          e.clientX -
          this._scrollbarHandle.current.getBoundingClientRect().left;
        this._scrollbarHandle.current.style.left =
          e.pageX - this._shiftX + 'px';
      }
    }

    if (
      (e.target.className === 'left-grabber' ||
        e.target.className === 'left-draggable') &&
      this._scrollbarHandle.current
    ) {
      this.active = 'leftDraggable';
      this._shiftX =
        e.clientX - this._scrollbarHandle.current.getBoundingClientRect().left;
    }

    if (
      (e.target.className === 'right-grabber' ||
        e.target.className === 'right-draggable') &&
      this._scrollbarHandle.current
    ) {
      this.active = 'rightDraggable';
      this._shiftX =
        e.clientX - this._scrollbarHandle.current.getBoundingClientRect().left;
    }
  }

  scrollDrag(e: React.TouchEvent<HTMLDivElement>): void;
  scrollDrag(e: React.MouseEvent<HTMLDivElement, MouseEvent>): void;
  scrollDrag(e: any) {
    e.preventDefault();
    if (e.target.className === 'scrollbar') {
      if (this._scrolling && this._scrollbarHandle.current) {
        let moved = e.pageX - this._shiftX;
        if (moved > 233 && moved < 630) {
          this._scrollbarHandle.current.style.left = moved + 'px';
          (this._scrollable.current as HTMLDivElement).scrollLeft = moved + 10;
        }
      }
    }

    if (this.active === 'leftDraggable') {
      if (this._scrollContainer.current && this._scrollbarHandle.current) {
        let moving =
          e.clientX -
          this._scrollbarHandle.current.getBoundingClientRect().left;
        const scrollContainerWith = this._scrollContainer.current.clientWidth;
        const pixelFrameRatio = scrollContainerWith / this.props.animationLimit;

        let containerWidth = this.state.scrollWidth ?? 0;
        let resizePercentage = (100 * Math.abs(moving)) / containerWidth;

        let frameChange = (resizePercentage * this.state.end) / 100;

        let framesTo;

        if (Math.sign(moving) === 1) {
          framesTo = this.state.start + Math.round(frameChange);
        } else {
          framesTo = this.state.start - Math.round(frameChange);
        }
        let Toleft = framesTo * pixelFrameRatio + 233;

        this._scrollbarHandle.current.style.left = Toleft + 'px';

        this.setState({
          start: framesTo,
          scrollWidth: this.calculateScrollWidth(framesTo, this.state.end),
          selectionLength: this.range(framesTo, this.state.end),
        });
      }
    }

    if (this.active === 'rightDraggable') {
      if (this._scrollContainer.current && this._scrollbarHandle.current) {
        let moving =
          e.clientX -
          this._scrollbarHandle.current.getBoundingClientRect().left;
        // const scrollContainerWith = this._scrollContainer.current.clientWidth;
        //const pixelFrameRatio = scrollContainerWith / this.props.animationLimit;

        let containerWidth = this.state.scrollWidth ?? 0;
        let resizePercentage = (100 * Math.abs(moving)) / containerWidth;

        let frameChange = (resizePercentage * this.state.end) / 100;

        // let framesTo;

        // if (Math.sign(moving) === 1) {
        //   framesTo = this.state.end + Math.round(frameChange);
        // } else {
        //   framesTo = this.state.end - Math.round(frameChange);
        // }
        // let Toleft = framesTo * pixelFrameRatio + 233;
        let framesTo = Math.round(frameChange);
        console.log('frames ' + framesTo + ' >> resize' + resizePercentage);

        // this._scrollbarHandle.current.style.left = Toleft + 'px';

        this.setState({
          end: framesTo,
          scrollWidth: this.calculateScrollWidth(this.state.start, framesTo),
          selectionLength: this.range(this.state.start, framesTo),
        });
      }
    }
  }

  scrollDragEnd(e: React.TouchEvent<HTMLDivElement>): void;
  scrollDragEnd(e: React.MouseEvent<HTMLDivElement, MouseEvent>): void;
  scrollDragEnd(e: any) {
    e.preventDefault();
    if (e.target.className === 'scrollbar') {
      this._scrolling = false;
    }

    this.active = '';
    this._shiftX = 0;
  }

  range(start: number, end: number) {
    return Array.from({ length: end - start }, (_, i) => start + i * 1);
  }

  render() {
    return (
      <>
        <div className='timeline'>
          <Controls
            keyframes={this.props.keyframes}
            selected={this.props.selected}
            currentFrame={this.props.currentFrame}
            onCurrentFrameChange={this.props.onCurrentFrameChange}
            playPause={this.props.playPause}
            isPlaying={this.props.isPlaying}
            scrollable={this._scrollable}
          />
          <div className='timeline-wrapper'>
            <div ref={this._scrollable} className='display-line'>
              <svg
                style={{
                  width: '100%',
                  height: 40,
                  backgroundColor: '#222222',
                }}
                onMouseMove={(e) => this.drag(e)}
                onTouchMove={(e) => this.drag(e)}
                onTouchStart={(e) => this.dragStart(e)}
                onTouchEnd={(e) => this.dragEnd(e)}
                onMouseDown={(e) => this.dragStart(e)}
                onMouseUp={(e) => this.dragEnd(e)}
                onMouseLeave={(e) => this.dragEnd(e)}
                onDragStart={() => false}
              >
                <line
                  x1={this.props.currentFrame * 10}
                  y1='0'
                  x2={this.props.currentFrame * 10}
                  y2='40'
                  style={{ stroke: '#12506b', strokeWidth: 6 }}
                />

                {this.state.selectionLength.map((frame, i) => {
                  return (
                    <svg key={`tl_${frame}`}>
                      {
                        <>
                          <text
                            x={
                              (i * 100) / this.state.selectionLength.length +
                              '%'
                            }
                            y='18'
                            style={{ fontSize: 10, fill: '#555555' }}
                          >
                            {frame}
                          </text>
                          <line
                            x1={
                              (i * 100) / this.state.selectionLength.length +
                              '%'
                            }
                            y1='22'
                            x2={
                              (i * 100) / this.state.selectionLength.length +
                              '%'
                            }
                            y2='40'
                            style={{ stroke: '#555555', strokeWidth: 0.5 }}
                          />
                        </>
                      }
                    </svg>
                  );
                })}

                {this.props.keyframes &&
                  this.props.keyframes.map((kf, i) => {
                    return (
                      <svg
                        key={`kf_${i}`}
                        style={{ cursor: 'pointer' }}
                        tabIndex={i + 40}
                      >
                        <line
                          id={`kf_${i.toString()}`}
                          x1={kf.frame * 10}
                          y1='0'
                          x2={kf.frame * 10}
                          y2='40'
                          style={{ stroke: '#ffc017', strokeWidth: 1 }}
                        />
                      </svg>
                    );
                  })}
              </svg>
            </div>

            <div
              className='timeline-scroll-handle'
              onMouseMove={(e) => this.scrollDrag(e)}
              onTouchMove={(e) => this.scrollDrag(e)}
              onTouchStart={(e) => this.scrollDragStart(e)}
              onTouchEnd={(e) => this.scrollDragEnd(e)}
              onMouseDown={(e) => this.scrollDragStart(e)}
              onMouseUp={(e) => this.scrollDragEnd(e)}
              onMouseLeave={(e) => this.scrollDragEnd(e)}
              onDragStart={() => false}
            >
              <div className='scroll-handle' ref={this._scrollContainer}>
                <div
                  className='handle'
                  ref={this._scrollbarHandle}
                  style={{ width: this.state.scrollWidth }}
                >
                  <div className='left-grabber'>
                    <div className='left-draggable'>
                      <div className='grabber'></div>
                      <div className='grabber'></div>
                      <div className='grabber'></div>
                    </div>
                    <div className='text'>{this.state.start}</div>
                  </div>
                  <div className='scrollbar'></div>

                  <div className='right-grabber'>
                    <div className='text'>{this.state.end}</div>
                    <div className='right-draggable'>
                      <div className='grabber'></div>
                      <div className='grabber'></div>
                      <div className='grabber'></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className='input-frame'>
                <input
                  type='number'
                  value={this.props.animationLimit}
                  onChange={(e) => this.handleLimitChange(e)}
                ></input>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}
