import { Nullable } from "babylonjs/types";
import { Animation } from "babylonjs/Animations/animation";
import { Observable } from "babylonjs/Misc/observable";
import { AnimationCurveEditorKeyPointComponent } from "./graph/animationCurveEditorKeyPoint";

export class AnimationCurveEditorContext {
    title: string;
    animations: Nullable<Animation[]>;
    activeAnimation: Nullable<Animation>;
    activeKeyPoints: Nullable<AnimationCurveEditorKeyPointComponent[]>;

    onActiveAnimationChanged = new Observable<void>();
    onActiveKeyPointChanged = new Observable<Nullable<{keyPoint: AnimationCurveEditorKeyPointComponent, channel: string}>>();
    onHostWindowResized = new Observable<void>();

    onFrameRequired = new Observable<void>();
}