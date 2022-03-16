import { Nullable } from "core/types";
import { Vector2 } from "core/Maths/math.vector";

import { Rectangle } from "./rectangle";
import { Control } from "./control";
import { TextBlock } from "./textBlock";
import { Image } from "./image";
import { RegisterClass } from "core/Misc/typeStore";
import { PointerInfoBase } from "core/Events/pointerEvents";
import { AdvancedDynamicTexture } from "../advancedDynamicTexture";

/**
 * Class used to create 2D buttons
 */
export class Button extends Rectangle {
    /**
     * Function called to generate a pointer enter animation
     */
    public pointerEnterAnimation: () => void;
    /**
     * Function called to generate a pointer out animation
     */
    public pointerOutAnimation: () => void;
    /**
     * Function called to generate a pointer down animation
     */
    public pointerDownAnimation: () => void;
    /**
     * Function called to generate a pointer up animation
     */
    public pointerUpAnimation: () => void;

    /**
     * Gets or sets a boolean indicating that the button will let internal controls handle picking instead of doing it directly using its bounding info
     */
    public delegatePickingToChildren = false;

    private _image: Nullable<Image>;
    /**
     * Returns the image part of the button (if any)
     */
    public get image(): Nullable<Image> {
        return this._image;
    }

    private _textBlock: Nullable<TextBlock>;
    /**
     * Returns the image part of the button (if any)
     */
    public get textBlock(): Nullable<TextBlock> {
        return this._textBlock;
    }

    /**
     * Creates a new Button
     * @param name defines the name of the button
     */
    constructor(public name?: string) {
        super(name);

        this.thickness = 1;
        this.isPointerBlocker = true;

        let alphaStore: Nullable<number> = null;

        this.pointerEnterAnimation = () => {
            alphaStore = this.alpha;
            this.alpha -= 0.1;
        };

        this.pointerOutAnimation = () => {
            if (alphaStore !== null) {
                this.alpha = alphaStore;
            }
        };

        this.pointerDownAnimation = () => {
            this.scaleX -= 0.05;
            this.scaleY -= 0.05;
        };

        this.pointerUpAnimation = () => {
            this.scaleX += 0.05;
            this.scaleY += 0.05;
        };
    }

    protected _getTypeName(): string {
        return "Button";
    }

    // While being a container, the button behaves like a control.
    /**
     * @param x
     * @param y
     * @param pi
     * @param type
     * @param pointerId
     * @param buttonIndex
     * @param deltaX
     * @param deltaY
     * @hidden
     */
    public _processPicking(x: number, y: number, pi: PointerInfoBase, type: number, pointerId: number, buttonIndex: number, deltaX?: number, deltaY?: number): boolean {
        if (!this._isEnabled || !this.isHitTestVisible || !this.isVisible || this.notRenderable) {
            return false;
        }

        if (!super.contains(x, y)) {
            return false;
        }

        if (this.delegatePickingToChildren) {
            let contains = false;
            for (let index = this._children.length - 1; index >= 0; index--) {
                const child = this._children[index];
                if (child.isEnabled && child.isHitTestVisible && child.isVisible && !child.notRenderable && child.contains(x, y)) {
                    contains = true;
                    break;
                }
            }

            if (!contains) {
                return false;
            }
        }

        this._processObservables(type, x, y, pi, pointerId, buttonIndex, deltaX, deltaY);

        return true;
    }

    /**
     * @param target
     * @param pi
     * @hidden
     */
    public _onPointerEnter(target: Control, pi: PointerInfoBase): boolean {
        if (!super._onPointerEnter(target, pi)) {
            return false;
        }

        if (!this.isReadOnly && this.pointerEnterAnimation) {
            this.pointerEnterAnimation();
        }

        return true;
    }

    /**
     * @param target
     * @param pi
     * @param force
     * @hidden
     */
    public _onPointerOut(target: Control, pi: PointerInfoBase, force = false): void {
        if (!this.isReadOnly && this.pointerOutAnimation) {
            this.pointerOutAnimation();
        }

        super._onPointerOut(target, pi, force);
    }

    /**
     * @param target
     * @param coordinates
     * @param pointerId
     * @param buttonIndex
     * @param pi
     * @hidden
     */
    public _onPointerDown(target: Control, coordinates: Vector2, pointerId: number, buttonIndex: number, pi: PointerInfoBase): boolean {
        if (!super._onPointerDown(target, coordinates, pointerId, buttonIndex, pi)) {
            return false;
        }

        if (!this.isReadOnly && this.pointerDownAnimation) {
            this.pointerDownAnimation();
        }

        return true;
    }

    /**
     * @param target
     * @param coordinates
     * @param pointerId
     * @param buttonIndex
     * @param notifyClick
     * @param pi
     * @hidden
     */
    public _onPointerUp(target: Control, coordinates: Vector2, pointerId: number, buttonIndex: number, notifyClick: boolean, pi: PointerInfoBase): void {
        if (!this.isReadOnly && this.pointerUpAnimation) {
            this.pointerUpAnimation();
        }

        super._onPointerUp(target, coordinates, pointerId, buttonIndex, notifyClick, pi);
    }

    /**
     * Serializes the current button
     * @param serializationObject defines the JSON serialized object
     */
    public serialize(serializationObject: any) {
        super.serialize(serializationObject);

        if (this._textBlock) {
            serializationObject.textBlockName = this._textBlock.name;
        }
        if (this._image) {
            serializationObject.imageName = this._image.name;
        }
    }

    /**
     * @param serializedObject
     * @param host
     * @hidden
     */
    public _parseFromContent(serializedObject: any, host: AdvancedDynamicTexture) {
        super._parseFromContent(serializedObject, host);

        if (serializedObject.textBlockName) {
            this._textBlock = this.getChildByName(serializedObject.textBlockName) as Nullable<TextBlock>;
        }

        if (serializedObject.imageName) {
            this._image = this.getChildByName(serializedObject.imageName) as Nullable<Image>;
        }
    }

    // Statics
    /**
     * Creates a new button made with an image and a text
     * @param name defines the name of the button
     * @param text defines the text of the button
     * @param imageUrl defines the url of the image
     * @returns a new Button
     */
    public static CreateImageButton(name: string, text: string, imageUrl: string): Button {
        const result = new this(name);

        // Adding text
        const textBlock = new TextBlock(name + "_button", text);
        textBlock.textWrapping = true;
        textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        textBlock.paddingLeft = "20%";
        result.addControl(textBlock);

        // Adding image
        const iconImage = new Image(name + "_icon", imageUrl);
        iconImage.width = "20%";
        iconImage.stretch = Image.STRETCH_UNIFORM;
        iconImage.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        result.addControl(iconImage);

        // Store
        result._image = iconImage;
        result._textBlock = textBlock;

        return result;
    }

    /**
     * Creates a new button made with an image
     * @param name defines the name of the button
     * @param imageUrl defines the url of the image
     * @returns a new Button
     */
    public static CreateImageOnlyButton(name: string, imageUrl: string): Button {
        const result = new this(name);

        // Adding image
        const iconImage = new Image(name + "_icon", imageUrl);
        iconImage.stretch = Image.STRETCH_FILL;
        iconImage.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        result.addControl(iconImage);

        // Store
        result._image = iconImage;

        return result;
    }

    /**
     * Creates a new button made with a text
     * @param name defines the name of the button
     * @param text defines the text of the button
     * @returns a new Button
     */
    public static CreateSimpleButton(name: string, text: string): Button {
        const result = new this(name);

        // Adding text
        const textBlock = new TextBlock(name + "_button", text);
        textBlock.textWrapping = true;
        textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        result.addControl(textBlock);

        // Store
        result._textBlock = textBlock;

        return result;
    }

    /**
     * Creates a new button made with an image and a centered text
     * @param name defines the name of the button
     * @param text defines the text of the button
     * @param imageUrl defines the url of the image
     * @returns a new Button
     */
    public static CreateImageWithCenterTextButton(name: string, text: string, imageUrl: string): Button {
        const result = new this(name);

        // Adding image
        const iconImage = new Image(name + "_icon", imageUrl);
        iconImage.stretch = Image.STRETCH_FILL;
        result.addControl(iconImage);

        // Adding text
        const textBlock = new TextBlock(name + "_button", text);
        textBlock.textWrapping = true;
        textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        result.addControl(textBlock);

        // Store
        result._image = iconImage;
        result._textBlock = textBlock;

        return result;
    }
}
RegisterClass("BABYLON.GUI.Button", Button);
