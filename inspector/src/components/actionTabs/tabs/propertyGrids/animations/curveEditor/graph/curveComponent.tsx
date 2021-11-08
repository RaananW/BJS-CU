import { Observer } from "babylonjs/Misc/observable";
import { Nullable } from "babylonjs/types";
import * as React from "react";
import { Context } from "../context";
import { Curve } from "./curve";
import { AnimationKeyInterpolation } from "babylonjs/Animations/animationKey";

interface ICurveComponentProps {
    curve: Curve;
    convertX:(x: number) => number;
    convertY:(x: number) => number;
    context: Context;
}

interface ICurveComponentState {
    isSelected: boolean;
}

export class CurveComponent extends React.Component<
ICurveComponentProps,
ICurveComponentState
> {    
    private _onDataUpdatedObserver: Nullable<Observer<void>>;
    private _onActiveAnimationChangedObserver: Nullable<Observer<void>>;
    private _onInterpolationModeSetObserver : Nullable<Observer<{keyId: number, value: AnimationKeyInterpolation}>>;

    constructor(props: ICurveComponentProps) {
        super(props);

        this.state = { isSelected: false };

        this._onDataUpdatedObserver = this.props.curve.onDataUpdatedObservable.add(() => this.forceUpdate());

        this._onActiveAnimationChangedObserver = props.context.onActiveAnimationChanged.add(() => {
            if (this._onDataUpdatedObserver) {
                this.props.curve.onDataUpdatedObservable.remove(this._onDataUpdatedObserver);
            }
            this._onDataUpdatedObserver = null;
            this.forceUpdate();
        });
        
        this._onInterpolationModeSetObserver = props.context.onInterpolationModeSet.add(({keyId, value}) => {
            this.props.curve.updateInterpolationMode(keyId, value);
        });
    }

    componentWillUnmount() {
        if (this._onDataUpdatedObserver) {
            this.props.curve.onDataUpdatedObservable.remove(this._onDataUpdatedObserver);
        }

        if (this._onActiveAnimationChangedObserver) {
            this.props.context.onActiveAnimationChanged.remove(this._onActiveAnimationChangedObserver);
        }

        if (this._onInterpolationModeSetObserver) {
            this.props.context.onInterpolationModeSet.remove(this._onInterpolationModeSetObserver);
        }
    }

    componentDidUpdate() {
        if (!this._onDataUpdatedObserver) {            
            this._onDataUpdatedObserver = this.props.curve.onDataUpdatedObservable.add(() => this.forceUpdate());
        }

        return true;
    }

    public render() {
        if (!this.props.context.isChannelEnabled(this.props.curve.animation, this.props.curve.color)) {
            return null;
        }

        return (
            <svg
                style={{ cursor: "pointer", overflow: "auto" }}>            
            <path
                d={this.props.curve.getPathData(this.props.convertX, this.props.convertY)}
                style={{
                    stroke: this.props.curve.color,
                    fill: "none",
                    strokeWidth: "1",
                }}
            ></path>
        </svg>
        );
    }
}