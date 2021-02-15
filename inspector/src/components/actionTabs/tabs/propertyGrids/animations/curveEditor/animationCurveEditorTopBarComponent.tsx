import * as React from "react";
import { GlobalState } from "../../../../../globalState";
import { AnimationCurveEditorContext } from "./animationCurveEditorContext";
import { AnimationCurveEditorActionButtonComponent } from "./controls/animationCurveEditorActionButtonComponent";
import { AnimationCurveEditorTextInputComponent } from "./controls/animationCurveEditorTextInputComponent";

require("./scss/topBar.scss");

const logoIcon = require("./assets/babylonLogo.svg");
const frameIcon = require("./assets/frameIcon.svg");

interface IAnimationCurveEditorTopBarComponentProps {
    globalState: GlobalState;
    context: AnimationCurveEditorContext;
}

interface IAnimationCurveEditorTopBarComponentState {
    keyFrameValue: string;
    keyValue: string;
}

export class AnimationCurveEditorTopBarComponent extends React.Component<
IAnimationCurveEditorTopBarComponentProps,
IAnimationCurveEditorTopBarComponentState
> {
    constructor(props: IAnimationCurveEditorTopBarComponentProps) {
        super(props);

        this.state = {keyFrameValue: "", keyValue: "" };

        this.props.context.onFrameSet.add(newFrameValue => {
            this.setState({keyFrameValue: newFrameValue.toFixed(2)});
        });

        this.props.context.onValueSet.add(newValue => {
            this.setState({keyValue: newValue.toFixed(2)});
        });

        this.props.context.onActiveAnimationChanged.add(() => {
            this.setState({keyFrameValue: "", keyValue: ""});
        });

        this.props.context.onActiveKeyPointChanged.add(() => {
            this.setState({keyFrameValue: "", keyValue: ""});
        })
    }

    public render() {
        return (
            <div id="top-bar">
                <img id="logo" src={logoIcon}/>
                <div id="parent-name">
                    {this.props.context.title}
                </div>
                <AnimationCurveEditorTextInputComponent 
                    isNumber={true}
                    value={this.state.keyFrameValue}
                    tooltip="Frame"
                    id="key-frame"
                    onValueAsNumberChanged={newValue => this.props.context.onFrameManuallyEntered.notifyObservers(newValue)}
                    globalState={this.props.globalState} context={this.props.context} />  
                <AnimationCurveEditorTextInputComponent 
                    isNumber={true}
                    value={this.state.keyValue}
                    tooltip="Value"
                    id="key-value"
                    onValueAsNumberChanged={newValue => this.props.context.onValueManuallyEntered.notifyObservers(newValue)}
                    globalState={this.props.globalState} context={this.props.context} />                      
                <AnimationCurveEditorActionButtonComponent 
                    tooltip="Frame canvas"
                    id="frame-canvas" globalState={this.props.globalState} context={this.props.context} 
                    icon={frameIcon} onClick={() => this.props.context.onFrameRequired.notifyObservers()}/>
            </div>
        );
    }
}