﻿declare module BABYLON {
    class ArcRotateCamera extends Camera {
        public alpha: number;
        public beta: number;
        public radius: number;
        public target: any;
        public inertialAlphaOffset: number;
        public inertialBetaOffset: number;
        public inertialRadiusOffset: number;
        public lowerAlphaLimit: any;
        public upperAlphaLimit: any;
        public lowerBetaLimit: number;
        public upperBetaLimit: number;
        public lowerRadiusLimit: any;
        public upperRadiusLimit: any;
        public angularSensibility: number;
        public wheelPrecision: number;
        public keysUp: number[];
        public keysDown: number[];
        public keysLeft: number[];
        public keysRight: number[];
        public zoomOnFactor: number;
        public targetScreenOffset: Vector2;
        private _keys;
        private _viewMatrix;
        private _attachedElement;
        private _onPointerDown;
        private _onPointerUp;
        private _onPointerMove;
        private _wheel;
        private _onMouseMove;
        private _onKeyDown;
        private _onKeyUp;
        private _onLostFocus;
        private _reset;
        private _onGestureStart;
        private _onGesture;
        private _MSGestureHandler;
        public onCollide: (collidedMesh: AbstractMesh) => void;
        public checkCollisions: boolean;
        public collisionRadius: Vector3;
        private _collider;
        private _previousPosition;
        private _collisionVelocity;
        private _newPosition;
        private _previousAlpha;
        private _previousBeta;
        private _previousRadius;
        public pinchPrecision: number;
        private _touchStart;
        private _touchMove;
        private _touchEnd;
        private _pinchStart;
        private _pinchMove;
        private _pinchEnd;
        constructor(name: string, alpha: number, beta: number, radius: number, target: any, scene: Scene);
        public _getTargetPosition(): Vector3;
        public _initCache(): void;
        public _updateCache(ignoreParentClass?: boolean): void;
        public _isSynchronizedViewMatrix(): boolean;
        public attachControl(element: HTMLElement, noPreventDefault?: boolean): void;
        public detachControl(element: HTMLElement): void;
        public _update(): void;
        public setPosition(position: Vector3): void;
        public _getViewMatrix(): Matrix;
        public zoomOn(meshes?: AbstractMesh[]): void;
        public focusOn(meshesOrMinMaxVectorAndDistance: any): void;
    }
}
