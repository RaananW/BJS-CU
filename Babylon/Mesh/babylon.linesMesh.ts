﻿module BABYLON {
    export class LinesMesh extends Mesh {
        public color = new BABYLON.Color3(1, 1, 1);
        public alpha = 1;

        private _colorShader: ShaderMaterial;
        private _ib: WebGLBuffer;

        private _indicesLength: number;
        private _indices = new Array<number>();

        constructor(name: string, scene: Scene, updatable = false) {
            super(name, scene);

            this._colorShader = new ShaderMaterial("colorShader", scene, "color",
                {
                    attributes: ["position"],
                    uniforms: ["worldViewProjection", "color"],
                    needAlphaBlending: true
                });
        }

        public get material(): Material {
            return this._colorShader;
        }

        public get isPickable(): boolean {
            return false;
        }

        public get checkCollisions(): boolean {
            return false;
        }

        public _bind(subMesh: SubMesh, effect: Effect, fillMode: number): void {
            var engine = this.getScene().getEngine();

            var indexToBind = this._geometry.getIndexBuffer();

            // VBOs
            engine.bindBuffers(this._geometry.getVertexBuffer(VertexBuffer.PositionKind).getBuffer(), indexToBind, [3], 3 * 4, this._colorShader.getEffect());

            // Color
            this._colorShader.setColor4("color", this.color.toColor4(this.alpha));
        }

        public _draw(subMesh: SubMesh, fillMode: number, instancesCount?: number): void {
            if (!this._geometry || !this._geometry.getVertexBuffers() || !this._geometry.getIndexBuffer()) {
                return;
            }

            var engine = this.getScene().getEngine();

            // Draw order
            engine.draw(false, subMesh.indexStart, subMesh.indexCount);
        }

        public intersects(ray: Ray, fastCheck?: boolean) {
            return null;
        }

        public dispose(doNotRecurse?: boolean): void {
            this._colorShader.dispose();

            super.dispose(doNotRecurse);
        }
    }
} 