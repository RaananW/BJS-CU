import { Nullable } from "babylonjs/types";
import { Animation } from "babylonjs/Animations/animation";
import { Observable } from "babylonjs/Misc/observable";
import { KeyPointComponent } from "./graph/keyPoint";
import { Scene } from "babylonjs/scene";
import { IAnimatable } from "babylonjs/Animations/animatable.interface";

export class Context {
    title: string;
    animations: Nullable<Animation[]>;
    scene: Scene;
    target: IAnimatable;
    activeAnimation: Nullable<Animation>;
    activeKeyPoints: Nullable<KeyPointComponent[]>;

    activeFrame: number;
    fromKey: number;
    toKey: number;
    forwardAnimation = true;
    isPlaying: boolean

    onActiveAnimationChanged = new Observable<void>();
    onActiveKeyPointChanged = new Observable<Nullable<{keyPoint: KeyPointComponent, channel: string}>>();
    onHostWindowResized = new Observable<void>();

    onActiveKeyFrameChanged = new Observable<number>();
    
    onFrameSet = new Observable<number>();
    onFrameManuallyEntered = new Observable<number>();

    onValueSet = new Observable<number>();
    onValueManuallyEntered = new Observable<number>();

    onFrameRequired = new Observable<void>();

    onDeleteAnimation = new Observable<Animation>();

    onGraphMoved = new Observable<number>();
    onGraphScaled = new Observable<number>();

    onAnimationStateChanged = new Observable<void>();

    public prepare() {        
        this.isPlaying = false;
        if (!this.animations || !this.animations.length) {
            return;
        }

        let animation = this.animations[0];
    
        if (!animation || !animation.hasRunningRuntimeAnimations) {
            return;
        }
        this.isPlaying = true;
    }

    public play(forward: boolean) {
        this.isPlaying = true;
        this.scene.stopAnimation(this.target);
        if (forward) {
            this.scene.beginAnimation(this.target, this.fromKey, this.toKey, true);
        } else {
            this.scene.beginAnimation(this.target, this.toKey, this.fromKey, true);
        }
        this.forwardAnimation = forward;

        this.onAnimationStateChanged.notifyObservers();
    }

    public stop() {
        this.isPlaying = false;
        this.scene.stopAnimation(this.target);
    
        this.onAnimationStateChanged.notifyObservers();
    }

    public moveToFrame(frame: number) {
        if (!this.animations || !this.animations.length) {
            return;
        }

        this.activeFrame = frame;

        if (!this.isPlaying) {
            this.scene.beginAnimation(this.target, frame, frame, false);
            return;
        }

        for (var animation of this.animations) {
            if (!animation.hasRunningRuntimeAnimations) {
                return;
            }

            for (var runtimeAnimation of animation.runtimeAnimations) {
                runtimeAnimation.goToFrame(frame);
            }
        }

        this.stop();
    }
}