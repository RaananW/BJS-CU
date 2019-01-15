import { Scene } from "../scene";
import { Node } from "../node";
import { RuntimeAnimation } from './runtimeAnimation';
import { Matrix, Tmp, Quaternion, Vector3 } from '../Maths/math';
import { Nullable } from '../types';
import { Animation } from './animation';
import { Animatable } from './animatable';
import { PrecisionDate } from 'Misc';
import { Bone } from '../Bones/bone';

declare module "../scene" {
    export interface Scene {
        /** @hidden */
        _registerTargetForLateAnimationBinding(runtimeAnimation: RuntimeAnimation, originalValue: any): void;

        /** @hidden */
        _processLateAnimationBindingsForMatrices(holder: {
            totalWeight: number,
            animations: RuntimeAnimation[],
            originalValue: Matrix
        }): any;

        /** @hidden */
        _processLateAnimationBindingsForQuaternions(holder: {
            totalWeight: number,
            animations: RuntimeAnimation[],
            originalValue: Quaternion
        }, refQuaternion: Quaternion): Quaternion;

        /** @hidden */
        _processLateAnimationBindings(): void;

        /** @hidden */
        _animate(): void;

        /**
         * Will start the animation sequence of a given target
         * @param target defines the target
         * @param from defines from which frame should animation start
         * @param to defines until which frame should animation run.
         * @param weight defines the weight to apply to the animation (1.0 by default)
         * @param loop defines if the animation loops
         * @param speedRatio defines the speed in which to run the animation (1.0 by default)
         * @param onAnimationEnd defines the function to be executed when the animation ends
         * @param animatable defines an animatable object. If not provided a new one will be created from the given params
         * @param targetMask defines if the target should be animated if animations are present (this is called recursively on descendant animatables regardless of return value)
         * @param onAnimationLoop defines the callback to call when an animation loops
         * @returns the animatable object created for this animation
         */
        beginWeightedAnimation(target: any, from: number, to: number, weight: number, loop?: boolean, speedRatio?: number,
            onAnimationEnd?: () => void, animatable?: Animatable, targetMask?: (target: any) => boolean, onAnimationLoop?: () => void): Animatable;

        /**
         * Will start the animation sequence of a given target
         * @param target defines the target
         * @param from defines from which frame should animation start
         * @param to defines until which frame should animation run.
         * @param loop defines if the animation loops
         * @param speedRatio defines the speed in which to run the animation (1.0 by default)
         * @param onAnimationEnd defines the function to be executed when the animation ends
         * @param animatable defines an animatable object. If not provided a new one will be created from the given params
         * @param stopCurrent defines if the current animations must be stopped first (true by default)
         * @param targetMask defines if the target should be animate if animations are present (this is called recursively on descendant animatables regardless of return value)
         * @param onAnimationLoop defines the callback to call when an animation loops
         * @returns the animatable object created for this animation
         */
        beginAnimation(target: any, from: number, to: number, loop?: boolean, speedRatio?: number,
            onAnimationEnd?: () => void, animatable?: Animatable, stopCurrent?: boolean,
            targetMask?: (target: any) => boolean, onAnimationLoop?: () => void): Animatable;

        /**
         * Will start the animation sequence of a given target and its hierarchy
         * @param target defines the target
         * @param directDescendantsOnly if true only direct descendants will be used, if false direct and also indirect (children of children, an so on in a recursive manner) descendants will be used.
         * @param from defines from which frame should animation start
         * @param to defines until which frame should animation run.
         * @param loop defines if the animation loops
         * @param speedRatio defines the speed in which to run the animation (1.0 by default)
         * @param onAnimationEnd defines the function to be executed when the animation ends
         * @param animatable defines an animatable object. If not provided a new one will be created from the given params
         * @param stopCurrent defines if the current animations must be stopped first (true by default)
         * @param targetMask defines if the target should be animated if animations are present (this is called recursively on descendant animatables regardless of return value)
         * @param onAnimationLoop defines the callback to call when an animation loops
         * @returns the list of created animatables
         */
        beginHierarchyAnimation(target: any, directDescendantsOnly: boolean, from: number, to: number, loop?: boolean, speedRatio?: number,
            onAnimationEnd?: () => void, animatable?: Animatable, stopCurrent?: boolean,
            targetMask?: (target: any) => boolean, onAnimationLoop?: () => void): Animatable[];

        /**
         * Begin a new animation on a given node
         * @param target defines the target where the animation will take place
         * @param animations defines the list of animations to start
         * @param from defines the initial value
         * @param to defines the final value
         * @param loop defines if you want animation to loop (off by default)
         * @param speedRatio defines the speed ratio to apply to all animations
         * @param onAnimationEnd defines the callback to call when an animation ends (will be called once per node)
         * @param onAnimationLoop defines the callback to call when an animation loops
         * @returns the list of created animatables
         */
        beginDirectAnimation(target: any, animations: Animation[], from: number, to: number, loop?: boolean, speedRatio?: number, onAnimationEnd?: () => void, onAnimationLoop?: () => void): Animatable;

        /**
         * Begin a new animation on a given node and its hierarchy
         * @param target defines the root node where the animation will take place
         * @param directDescendantsOnly if true only direct descendants will be used, if false direct and also indirect (children of children, an so on in a recursive manner) descendants will be used.
         * @param animations defines the list of animations to start
         * @param from defines the initial value
         * @param to defines the final value
         * @param loop defines if you want animation to loop (off by default)
         * @param speedRatio defines the speed ratio to apply to all animations
         * @param onAnimationEnd defines the callback to call when an animation ends (will be called once per node)
         * @param onAnimationLoop defines the callback to call when an animation loops
         * @returns the list of animatables created for all nodes
         */
        beginDirectHierarchyAnimation(target: Node, directDescendantsOnly: boolean, animations: Animation[], from: number, to: number, loop?: boolean, speedRatio?: number, onAnimationEnd?: () => void, onAnimationLoop?: () => void): Animatable[];

        /**
         * Gets the animatable associated with a specific target
         * @param target defines the target of the animatable
         * @returns the required animatable if found
         */
        getAnimatableByTarget(target: any): Nullable<Animatable>;

        /**
         * Gets all animatables associated with a given target
         * @param target defines the target to look animatables for
         * @returns an array of Animatables
         */
        getAllAnimatablesByTarget(target: any): Array<Animatable>;

        /**
         * Will stop the animation of the given target
         * @param target - the target
         * @param animationName - the name of the animation to stop (all animations will be stopped if both this and targetMask are empty)
         * @param targetMask - a function that determines if the animation should be stopped based on its target (all animations will be stopped if both this and animationName are empty)
         */
        stopAnimation(target: any, animationName?: string, targetMask?: (target: any) => boolean): void;

        /**
        * Stops and removes all animations that have been applied to the scene
        */
        stopAllAnimations(): void;
    }
}

Scene.prototype._animate = function(): void {
    if (!this.animationsEnabled || this._activeAnimatables.length === 0) {
        return;
    }

    // Getting time
    var now = PrecisionDate.Now;
    if (!this._animationTimeLast) {
        if (this._pendingData.length > 0) {
            return;
        }
        this._animationTimeLast = now;
    }
    var deltaTime = this.useConstantAnimationDeltaTime ? 16.0 : (now - this._animationTimeLast) * this.animationTimeScale;
    this._animationTime += deltaTime;
    this._animationTimeLast = now;
    for (var index = 0; index < this._activeAnimatables.length; index++) {
        this._activeAnimatables[index]._animate(this._animationTime);
    }

    // Late animation bindings
    this._processLateAnimationBindings();
};

Scene.prototype.beginWeightedAnimation = function(target: any, from: number, to: number, weight = 1.0, loop?: boolean, speedRatio: number = 1.0,
    onAnimationEnd?: () => void, animatable?: Animatable, targetMask?: (target: any) => boolean, onAnimationLoop?: () => void): Animatable {

    let returnedAnimatable = this.beginAnimation(target, from, to, loop, speedRatio, onAnimationEnd, animatable, false, targetMask, onAnimationLoop);
    returnedAnimatable.weight = weight;

    return returnedAnimatable;
};

Scene.prototype.beginAnimation = function(target: any, from: number, to: number, loop?: boolean, speedRatio: number = 1.0,
    onAnimationEnd?: () => void, animatable?: Animatable, stopCurrent = true,
    targetMask?: (target: any) => boolean, onAnimationLoop?: () => void): Animatable {

    if (from > to && speedRatio > 0) {
        speedRatio *= -1;
    }

    if (stopCurrent) {
        this.stopAnimation(target, undefined, targetMask);
    }

    if (!animatable) {
        animatable = new Animatable(this, target, from, to, loop, speedRatio, onAnimationEnd, undefined, onAnimationLoop);
    }

    const shouldRunTargetAnimations = targetMask ? targetMask(target) : true;
    // Local animations
    if (target.animations && shouldRunTargetAnimations) {
        animatable.appendAnimations(target, target.animations);
    }

    // Children animations
    if (target.getAnimatables) {
        var animatables = target.getAnimatables();
        for (var index = 0; index < animatables.length; index++) {
            this.beginAnimation(animatables[index], from, to, loop, speedRatio, onAnimationEnd, animatable, stopCurrent, targetMask, onAnimationLoop);
        }
    }

    animatable.reset();

    return animatable;
};

Scene.prototype.beginHierarchyAnimation = function(target: any, directDescendantsOnly: boolean, from: number, to: number, loop?: boolean, speedRatio: number = 1.0,
    onAnimationEnd?: () => void, animatable?: Animatable, stopCurrent = true,
    targetMask?: (target: any) => boolean, onAnimationLoop?: () => void): Animatable[] {

    let children = target.getDescendants(directDescendantsOnly);

    let result = [];
    result.push(this.beginAnimation(target, from, to, loop, speedRatio, onAnimationEnd, animatable, stopCurrent, targetMask));
    for (var child of children) {
        result.push(this.beginAnimation(child, from, to, loop, speedRatio, onAnimationEnd, animatable, stopCurrent, targetMask));
    }

    return result;
};

Scene.prototype.beginDirectAnimation = function(target: any, animations: Animation[], from: number, to: number, loop?: boolean, speedRatio?: number, onAnimationEnd?: () => void, onAnimationLoop?: () => void): Animatable {
    if (speedRatio === undefined) {
        speedRatio = 1.0;
    }

    var animatable = new Animatable(this, target, from, to, loop, speedRatio, onAnimationEnd, animations, onAnimationLoop);

    return animatable;
};

Scene.prototype.beginDirectHierarchyAnimation = function(target: Node, directDescendantsOnly: boolean, animations: Animation[], from: number, to: number, loop?: boolean, speedRatio?: number, onAnimationEnd?: () => void, onAnimationLoop?: () => void): Animatable[] {
    let children = target.getDescendants(directDescendantsOnly);

    let result = [];
    result.push(this.beginDirectAnimation(target, animations, from, to, loop, speedRatio, onAnimationEnd, onAnimationLoop));
    for (var child of children) {
        result.push(this.beginDirectAnimation(child, animations, from, to, loop, speedRatio, onAnimationEnd, onAnimationLoop));
    }

    return result;
};

Scene.prototype.getAnimatableByTarget = function(target: any): Nullable<Animatable> {
    for (var index = 0; index < this._activeAnimatables.length; index++) {
        if (this._activeAnimatables[index].target === target) {
            return this._activeAnimatables[index];
        }
    }

    return null;
};

Scene.prototype.getAllAnimatablesByTarget = function(target: any): Array<Animatable> {
    let result = [];
    for (var index = 0; index < this._activeAnimatables.length; index++) {
        if (this._activeAnimatables[index].target === target) {
            result.push(this._activeAnimatables[index]);
        }
    }

    return result;
};

/**
 * Will stop the animation of the given target
 * @param target - the target
 * @param animationName - the name of the animation to stop (all animations will be stopped if both this and targetMask are empty)
 * @param targetMask - a function that determines if the animation should be stopped based on its target (all animations will be stopped if both this and animationName are empty)
 */
Scene.prototype.stopAnimation = function(target: any, animationName?: string, targetMask?: (target: any) => boolean): void {
    var animatables = this.getAllAnimatablesByTarget(target);

    for (var animatable of animatables) {
        animatable.stop(animationName, targetMask);
    }
};

/**
 * Stops and removes all animations that have been applied to the scene
 */
Scene.prototype.stopAllAnimations = function(): void {
    if (this._activeAnimatables) {
        for (let i = 0; i < this._activeAnimatables.length; i++) {
            this._activeAnimatables[i].stop();
        }
        this._activeAnimatables = [];
    }

    for (var group of this.animationGroups) {
        group.stop();
    }
};

Scene.prototype._registerTargetForLateAnimationBinding = function(runtimeAnimation: RuntimeAnimation, originalValue: any): void {
    let target = runtimeAnimation.target;
    this._registeredForLateAnimationBindings.pushNoDuplicate(target);

    if (!target._lateAnimationHolders) {
        target._lateAnimationHolders = {};
    }

    if (!target._lateAnimationHolders[runtimeAnimation.targetPath]) {
        target._lateAnimationHolders[runtimeAnimation.targetPath] = {
            totalWeight: 0,
            animations: [],
            originalValue: originalValue
        };
    }

    target._lateAnimationHolders[runtimeAnimation.targetPath].animations.push(runtimeAnimation);
    target._lateAnimationHolders[runtimeAnimation.targetPath].totalWeight += runtimeAnimation.weight;
};

Scene.prototype._processLateAnimationBindingsForMatrices = function(holder: {
    totalWeight: number,
    animations: RuntimeAnimation[],
    originalValue: Matrix
}): any {
    let normalizer = 1.0;
    let finalPosition = Tmp.Vector3[0];
    let finalScaling = Tmp.Vector3[1];
    let finalQuaternion = Tmp.Quaternion[0];
    let startIndex = 0;
    let originalAnimation = holder.animations[0];
    let originalValue = holder.originalValue;

    var scale = 1;
    if (holder.totalWeight < 1.0) {
        // We need to mix the original value in
        originalValue.decompose(finalScaling, finalQuaternion, finalPosition);
        scale = 1.0 - holder.totalWeight;
    } else {
        startIndex = 1;
        // We need to normalize the weights
        normalizer = holder.totalWeight;
        originalAnimation.currentValue.decompose(finalScaling, finalQuaternion, finalPosition);
        scale = originalAnimation.weight / normalizer;
        if (scale == 1) {
            return originalAnimation.currentValue;
        }
    }

    finalScaling.scaleInPlace(scale);
    finalPosition.scaleInPlace(scale);
    finalQuaternion.scaleInPlace(scale);

    for (var animIndex = startIndex; animIndex < holder.animations.length; animIndex++) {
        var runtimeAnimation = holder.animations[animIndex];
        var scale = runtimeAnimation.weight / normalizer;
        let currentPosition = Tmp.Vector3[2];
        let currentScaling = Tmp.Vector3[3];
        let currentQuaternion = Tmp.Quaternion[1];

        runtimeAnimation.currentValue.decompose(currentScaling, currentQuaternion, currentPosition);
        currentScaling.scaleAndAddToRef(scale, finalScaling);
        currentQuaternion.scaleAndAddToRef(scale, finalQuaternion);
        currentPosition.scaleAndAddToRef(scale, finalPosition);
    }

    Matrix.ComposeToRef(finalScaling, finalQuaternion, finalPosition, originalAnimation._workValue);
    return originalAnimation._workValue;
};

Scene.prototype._processLateAnimationBindingsForQuaternions = function(holder: {
    totalWeight: number,
    animations: RuntimeAnimation[],
    originalValue: Quaternion
}, refQuaternion: Quaternion): Quaternion {
    let originalAnimation = holder.animations[0];
    let originalValue = holder.originalValue;

    if (holder.animations.length === 1) {
        Quaternion.SlerpToRef(originalValue, originalAnimation.currentValue, Math.min(1.0, holder.totalWeight), refQuaternion);
        return refQuaternion;
    }

    let normalizer = 1.0;
    let quaternions: Array<Quaternion>;
    let weights: Array<number>;

    if (holder.totalWeight < 1.0) {
        let scale = 1.0 - holder.totalWeight;

        quaternions = [];
        weights = [];

        quaternions.push(originalValue);
        weights.push(scale);
    } else {
        if (holder.animations.length === 2) { // Slerp as soon as we can
            Quaternion.SlerpToRef(holder.animations[0].currentValue, holder.animations[1].currentValue, holder.animations[1].weight / holder.totalWeight, refQuaternion);
            return refQuaternion;
        }
        quaternions = [];
        weights = [];

        normalizer = holder.totalWeight;
    }
    for (var animIndex = 0; animIndex < holder.animations.length; animIndex++) {
        let runtimeAnimation = holder.animations[animIndex];
        quaternions.push(runtimeAnimation.currentValue);
        weights.push(runtimeAnimation.weight / normalizer);
    }

    // https://gamedev.stackexchange.com/questions/62354/method-for-interpolation-between-3-quaternions

    let cumulativeAmount = 0;
    let cumulativeQuaternion: Nullable<Quaternion> = null;
    for (var index = 0; index < quaternions.length;) {
        if (!cumulativeQuaternion) {
            Quaternion.SlerpToRef(quaternions[index], quaternions[index + 1], weights[index + 1] / (weights[index] + weights[index + 1]), refQuaternion);
            cumulativeQuaternion = refQuaternion;
            cumulativeAmount = weights[index] + weights[index + 1];
            index += 2;
            continue;
        }
        cumulativeAmount += weights[index];
        Quaternion.SlerpToRef(cumulativeQuaternion, quaternions[index], weights[index] / cumulativeAmount, cumulativeQuaternion);
        index++;
    }

    return cumulativeQuaternion!;
};

Scene.prototype._processLateAnimationBindings = function(): void {
    if (!this._registeredForLateAnimationBindings.length) {
        return;
    }
    for (var index = 0; index < this._registeredForLateAnimationBindings.length; index++) {
        var target = this._registeredForLateAnimationBindings.data[index];

        for (var path in target._lateAnimationHolders) {
            var holder = target._lateAnimationHolders[path];
            let originalAnimation: RuntimeAnimation = holder.animations[0];
            let originalValue = holder.originalValue;

            let matrixDecomposeMode = Animation.AllowMatrixDecomposeForInterpolation && originalValue.m; // ie. data is matrix

            let finalValue: any = target[path];
            if (matrixDecomposeMode) {
                finalValue = this._processLateAnimationBindingsForMatrices(holder);
            } else {
                let quaternionMode = originalValue.w !== undefined;
                if (quaternionMode) {
                    finalValue = this._processLateAnimationBindingsForQuaternions(holder, finalValue || Quaternion.Identity());
                } else {

                    let startIndex = 0;
                    let normalizer = 1.0;

                    if (holder.totalWeight < 1.0) {
                        // We need to mix the original value in
                        if (originalValue.scale) {
                            finalValue = originalValue.scale(1.0 - holder.totalWeight);
                        } else {
                            finalValue = originalValue * (1.0 - holder.totalWeight);
                        }
                    } else {
                        // We need to normalize the weights
                        normalizer = holder.totalWeight;
                        let scale = originalAnimation.weight / normalizer;
                        if (scale !== 1) {
                            if (originalAnimation.currentValue.scale) {
                                finalValue = originalAnimation.currentValue.scale(scale);
                            } else {
                                finalValue = originalAnimation.currentValue * scale;
                            }
                        } else {
                            finalValue = originalAnimation.currentValue;
                        }

                        startIndex = 1;
                    }

                    for (var animIndex = startIndex; animIndex < holder.animations.length; animIndex++) {
                        var runtimeAnimation = holder.animations[animIndex];
                        var scale = runtimeAnimation.weight / normalizer;
                        if (runtimeAnimation.currentValue.scaleAndAddToRef) {
                            runtimeAnimation.currentValue.scaleAndAddToRef(scale, finalValue);
                        } else {
                            finalValue += runtimeAnimation.currentValue * scale;
                        }
                    }
                }
            }
            target[path] = finalValue;
        }

        target._lateAnimationHolders = {};
    }
    this._registeredForLateAnimationBindings.reset();
};

declare module "../Bones/bone" {
    export interface Bone {
        /**
         * Copy an animation range from another bone
         * @param source defines the source bone
         * @param rangeName defines the range name to copy
         * @param frameOffset defines the frame offset
         * @param rescaleAsRequired defines if rescaling must be applied if required
         * @param skelDimensionsRatio defines the scaling ratio
         * @returns true if operation was successful
         */
        copyAnimationRange(source: Bone, rangeName: string, frameOffset: number, rescaleAsRequired: boolean, skelDimensionsRatio: Nullable<Vector3>): boolean;
    }
}

Bone.prototype.copyAnimationRange = function(source: Bone, rangeName: string, frameOffset: number, rescaleAsRequired = false, skelDimensionsRatio: Nullable<Vector3> = null): boolean {
    // all animation may be coming from a library skeleton, so may need to create animation
    if (this.animations.length === 0) {
        this.animations.push(new Animation(this.name, "_matrix", source.animations[0].framePerSecond, Animation.ANIMATIONTYPE_MATRIX, 0));
        this.animations[0].setKeys([]);
    }

    // get animation info / verify there is such a range from the source bone
    var sourceRange = source.animations[0].getRange(rangeName);
    if (!sourceRange) {
        return false;
    }
    var from = sourceRange.from;
    var to = sourceRange.to;
    var sourceKeys = source.animations[0].getKeys();

    // rescaling prep
    var sourceBoneLength = source.length;
    var sourceParent = source.getParent();
    var parent = this.getParent();
    var parentScalingReqd = rescaleAsRequired && sourceParent && sourceBoneLength && this.length && sourceBoneLength !== this.length;
    var parentRatio = parentScalingReqd && parent && sourceParent ? parent.length / sourceParent.length : 1;

    var dimensionsScalingReqd = rescaleAsRequired && !parent && skelDimensionsRatio && (skelDimensionsRatio.x !== 1 || skelDimensionsRatio.y !== 1 || skelDimensionsRatio.z !== 1);

    var destKeys = this.animations[0].getKeys();

    // loop vars declaration
    var orig: { frame: number, value: Matrix };
    var origTranslation: Vector3;
    var mat: Matrix;

    for (var key = 0, nKeys = sourceKeys.length; key < nKeys; key++) {
        orig = sourceKeys[key];
        if (orig.frame >= from && orig.frame <= to) {
            if (rescaleAsRequired) {
                mat = orig.value.clone();

                // scale based on parent ratio, when bone has parent
                if (parentScalingReqd) {
                    origTranslation = mat.getTranslation();
                    mat.setTranslation(origTranslation.scaleInPlace(parentRatio));

                    // scale based on skeleton dimension ratio when root bone, and value is passed
                } else if (dimensionsScalingReqd && skelDimensionsRatio) {
                    origTranslation = mat.getTranslation();
                    mat.setTranslation(origTranslation.multiplyInPlace(skelDimensionsRatio));

                    // use original when root bone, and no data for skelDimensionsRatio
                } else {
                    mat = orig.value;
                }
            } else {
                mat = orig.value;
            }
            destKeys.push({ frame: orig.frame + frameOffset, value: mat });
        }
    }
    this.animations[0].createRange(rangeName, from + frameOffset, to + frameOffset);
    return true;
};
