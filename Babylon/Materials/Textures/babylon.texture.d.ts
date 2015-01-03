﻿declare module BABYLON {
    class Texture extends BaseTexture {
        static NEAREST_SAMPLINGMODE: number;
        static BILINEAR_SAMPLINGMODE: number;
        static TRILINEAR_SAMPLINGMODE: number;
        static EXPLICIT_MODE: number;
        static SPHERICAL_MODE: number;
        static PLANAR_MODE: number;
        static CUBIC_MODE: number;
        static PROJECTION_MODE: number;
        static SKYBOX_MODE: number;
        static CLAMP_ADDRESSMODE: number;
        static WRAP_ADDRESSMODE: number;
        static MIRROR_ADDRESSMODE: number;
        public url: string;
        public uOffset: number;
        public vOffset: number;
        public uScale: number;
        public vScale: number;
        public uAng: number;
        public vAng: number;
        public wAng: number;
        private _noMipmap;
        public _invertY: boolean;
        private _rowGenerationMatrix;
        private _cachedTextureMatrix;
        private _projectionModeMatrix;
        private _t0;
        private _t1;
        private _t2;
        private _cachedUOffset;
        private _cachedVOffset;
        private _cachedUScale;
        private _cachedVScale;
        private _cachedUAng;
        private _cachedVAng;
        private _cachedWAng;
        private _cachedCoordinatesMode;
        public _samplingMode: number;
        private _buffer;
        private _deleteBuffer;
        constructor(url: string, scene: Scene, noMipmap?: boolean, invertY?: boolean, samplingMode?: number, onLoad?: () => void, onError?: () => void, buffer?: any, deleteBuffer?: boolean);
        public delayLoad(): void;
        private _prepareRowForTextureGeneration(x, y, z, t);
        public getTextureMatrix(): Matrix;
        public getReflectionTextureMatrix(): Matrix;
        public clone(): Texture;
        static CreateFromBase64String(data: string, name: string, scene: Scene, noMipmap?: boolean, invertY?: boolean, samplingMode?: number, onLoad?: () => void, onError?: () => void): Texture;
    }
}
