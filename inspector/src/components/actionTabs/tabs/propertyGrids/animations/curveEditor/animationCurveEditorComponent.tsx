import * as React from "react";
import { ButtonLineComponent } from "../../../../../../sharedUiComponents/lines/buttonLineComponent";
import { GlobalState } from "../../../../../globalState";
import { PopupComponent } from "../../../../../popupComponent";
import { BottomBarComponent } from "./bottomBar/bottomBarComponent";
import { Context } from "./context";
import { TopBarComponent } from "./topBarComponent";
import { CanvasComponent } from "./graph/canvasComponent";
import { SideBarComponent } from "./sideBar/sideBarComponent";

require("./scss/curveEditor.scss");

interface IAnimationCurveEditorComponentProps {
    globalState: GlobalState;
    context: Context;
}

interface IAnimationCurveEditorComponentState {
    isOpen: boolean;
}

export class AnimationCurveEditorComponent extends React.Component<
    IAnimationCurveEditorComponentProps,
    IAnimationCurveEditorComponentState
> {

    constructor(props: IAnimationCurveEditorComponentProps) {
        super(props);

        this.state = { isOpen: false };
    }

    onCloseAnimationCurveEditor(window: Window | null) {
        if (window !== null) {
            window.close();
        }
        this.setState({isOpen: false});
        this.props.context.activeAnimation = null;
        this.props.context.onActiveAnimationChanged.notifyObservers();
    }

    shouldComponentUpdate(newProps: IAnimationCurveEditorComponentProps, newState: IAnimationCurveEditorComponentState) {               
        if (newState.isOpen !== this.state.isOpen) {

            if (newState.isOpen) {
                this.props.context.prepare();
            }

            return true;
        }

        return false;
    }
    
    public render() {
        return (
            <>
                <ButtonLineComponent label="Edit" onClick={() => this.setState({isOpen: true})} />
                {
                    this.state.isOpen &&
                    <PopupComponent
                        id="curve-editor"
                        title="Animation Curve Editor"
                        size={{ width: 1024, height: 512 }}
                        onResize={() => this.props.context.onHostWindowResized.notifyObservers()}
                        onClose={(window: Window) => this.onCloseAnimationCurveEditor(window)}
                    >
                        <div id="curve-editor">
                            <TopBarComponent globalState={this.props.globalState} context={this.props.context}/>
                            <SideBarComponent globalState={this.props.globalState} context={this.props.context}/>
                            <CanvasComponent globalState={this.props.globalState} context={this.props.context}/>
                            <BottomBarComponent globalState={this.props.globalState} context={this.props.context}/>
                        </div>
                    </PopupComponent>
        }
            </>
        );
    }

}