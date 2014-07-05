﻿var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var BABYLON;
(function (BABYLON) {
    var LinesMesh = (function (_super) {
        __extends(LinesMesh, _super);
        function LinesMesh(name, scene, updatable) {
            if (typeof updatable === "undefined") { updatable = false; }
            _super.call(this, name, scene);
            this.color = new BABYLON.Color3(1, 1, 1);
            this._indices = new Array();

            this._colorShader = new BABYLON.ShaderMaterial("colorShader", scene, "color", {
                attributes: ["position"],
                uniforms: ["worldViewProjection", "color"]
            });
        }
        Object.defineProperty(LinesMesh.prototype, "material", {
            get: function () {
                return this._colorShader;
            },
            enumerable: true,
            configurable: true
        });

        LinesMesh.prototype._bind = function (subMesh, effect, wireframe) {
            var engine = this.getScene().getEngine();

            var indexToBind = this._geometry.getIndexBuffer();

            // VBOs
            engine.bindBuffers(this._geometry.getVertexBuffer(BABYLON.VertexBuffer.PositionKind).getBuffer(), indexToBind, [3], 3 * 4, this._colorShader.getEffect());

            // Color
            this._colorShader.setColor3("color", this.color);
        };

        LinesMesh.prototype._draw = function (subMesh, useTriangles, instancesCount) {
            if (!this._geometry || !this._geometry.getVertexBuffers() || !this._geometry.getIndexBuffer()) {
                return;
            }

            var engine = this.getScene().getEngine();

            // Draw order
            engine.draw(false, subMesh.indexStart, subMesh.indexCount);
        };

        LinesMesh.prototype.dispose = function (doNotRecurse) {
            this._colorShader.dispose();

            _super.prototype.dispose.call(this, doNotRecurse);
        };
        return LinesMesh;
    })(BABYLON.Mesh);
    BABYLON.LinesMesh = LinesMesh;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.linesMesh.js.map
