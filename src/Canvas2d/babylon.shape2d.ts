﻿module BABYLON {

    @className("Shape2D")
    export class Shape2D extends RenderablePrim2D {
        static SHAPE2D_BORDERPARTID            = 1;
        static SHAPE2D_FILLPARTID              = 2;
        static SHAPE2D_CATEGORY_BORDERSOLID    = "BorderSolid";
        static SHAPE2D_CATEGORY_BORDERGRADIENT = "BorderGradient";
        static SHAPE2D_CATEGORY_FILLSOLID      = "FillSolid";
        static SHAPE2D_CATEGORY_FILLGRADIENT   = "FillGradient";

        static SHAPE2D_PROPCOUNT: number = RenderablePrim2D.RENDERABLEPRIM2D_PROPCOUNT + 5;
        public static borderProperty: Prim2DPropInfo;
        public static fillProperty: Prim2DPropInfo;

        @modelLevelProperty(RenderablePrim2D.RENDERABLEPRIM2D_PROPCOUNT + 1, pi => Shape2D.borderProperty = pi, true)
        public get border(): IBrush2D {
            return this._border;
        }

        public set border(value: IBrush2D) {
            this._border = value;
        }

        @modelLevelProperty(RenderablePrim2D.RENDERABLEPRIM2D_PROPCOUNT + 2, pi => Shape2D.fillProperty = pi, true)
        public get fill(): IBrush2D {
            return this._fill;
        }

        public set fill(value: IBrush2D) {
            this._fill = value;
        }

        protected getUsedShaderCategories(dataPart: InstanceDataBase): string[] {
            var cat = super.getUsedShaderCategories(dataPart);

            // Fill Part
            if (dataPart.id === Shape2D.SHAPE2D_FILLPARTID) {
                let fill = this.fill;
                if (fill instanceof SolidColorBrush2D) {
                    cat.push(Shape2D.SHAPE2D_CATEGORY_FILLSOLID);
                }
                if (fill instanceof GradientColorBrush2D) {
                    cat.push(Shape2D.SHAPE2D_CATEGORY_FILLGRADIENT);
                }
            }

            // Fill Part
            if (dataPart.id === Shape2D.SHAPE2D_BORDERPARTID) {
                let border = this.border;
                if (border instanceof SolidColorBrush2D) {
                    cat.push(Shape2D.SHAPE2D_CATEGORY_BORDERSOLID);
                }
                if (border instanceof GradientColorBrush2D) {
                    cat.push(Shape2D.SHAPE2D_CATEGORY_BORDERGRADIENT);
                }
            }

            return cat;
        }

        protected refreshInstanceDataParts(part: InstanceDataBase): boolean {
            if (!super.refreshInstanceDataParts(part)) {
                return false;
            }

            // Fill Part
            if (part.id === Shape2D.SHAPE2D_FILLPARTID) {
                let d = <Shape2DInstanceData>part;

                if (this.border) {
                    let border = this.border;
                    if (border instanceof SolidColorBrush2D) {
                        d.borderSolidColor = border.color;
                    }
                }

                if (this.fill) {
                    let fill = this.fill;
                    if (fill instanceof SolidColorBrush2D) {
                        d.fillSolidColor = fill.color;
                    }

                    else if (fill instanceof GradientColorBrush2D) {
                        d.fillGradientColor1 = fill.color1;
                        d.fillGradientColor2 = fill.color2;
                        var t = Matrix.Compose(new Vector3(fill.scale, fill.scale, fill.scale), Quaternion.RotationAxis(new Vector3(0, 0, 1), fill.rotation), new Vector3(fill.translation.x, fill.translation.y, 0));

                        let ty = new Vector4(t.m[1], t.m[5], t.m[9], t.m[13]);
                        d.fillGradientTY = ty;
                    }
                }
            }
            return true;
        }

        private _border: IBrush2D;
        private _fill: IBrush2D;
    }

    export class Shape2DInstanceData extends InstanceDataBase {
        @instanceData(Shape2D.SHAPE2D_CATEGORY_BORDERSOLID)
        get borderSolidColor(): Color4 {
            return null;
        }

        @instanceData(Shape2D.SHAPE2D_CATEGORY_FILLSOLID)
        get fillSolidColor(): Color4 {
            return null;
        }

        @instanceData(Shape2D.SHAPE2D_CATEGORY_FILLGRADIENT)
        get fillGradientColor1(): Color4 {
            return null;
        }

        @instanceData(Shape2D.SHAPE2D_CATEGORY_FILLGRADIENT)
        get fillGradientColor2(): Color4 {
            return null;
        }

        @instanceData(Shape2D.SHAPE2D_CATEGORY_FILLGRADIENT)
        get fillGradientTY(): Vector4 {
            return null;
        }

    }


}