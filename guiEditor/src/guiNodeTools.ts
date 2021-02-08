import { Button } from "babylonjs-gui/2D/controls/button";
import { Checkbox } from "babylonjs-gui/2D/controls/checkbox";
import { ColorPicker } from "babylonjs-gui/2D/controls/colorpicker";
import { Ellipse } from "babylonjs-gui/2D/controls/ellipse";
import { Line } from "babylonjs-gui/2D/controls/line";
import { Rectangle } from "babylonjs-gui/2D/controls/rectangle";
import { Slider } from "babylonjs-gui/2D/controls/sliders/slider";
import { TextBlock } from "babylonjs-gui/2D/controls/textBlock";
import { VirtualKeyboard } from "babylonjs-gui/2D/controls/virtualKeyboard";
import { Image } from "babylonjs-gui/2D/controls/image"
import { InputText } from "babylonjs-gui/2D/controls/inputText";
import { InputPassword } from "babylonjs-gui/2D/controls/inputPassword";
import { Grid } from "babylonjs-gui/2D/controls/grid";
import { DisplayGrid } from "babylonjs-gui/2D/controls/displayGrid";
import { StackPanel } from "babylonjs-gui/2D/controls/stackPanel";

export class GUINodeTools {
    public static CreateControlFromString (data: string) {
        //TODO: Add more elements and create default values for certain types.
        let element;
        switch (data) {
            case "Slider":
                element = new Slider("Slider");
                break;
            case "Checkbox":
                element = new Checkbox("Checkbox");
                break;
            case "ColorPicker":
                element = new ColorPicker("ColorPicker");
                break;
            case "Ellipse":
                element = new Ellipse("Ellipse");
                break;
            case "Rectangle":
                element = new Rectangle("Rectangle");
                break;
            case "Line":
                element = new Line();
                element.x1 = 10;
                element.y1 = 10;
                element.x2 = 100;
                element.y2 = 100;
                element.lineWidth = 5;
                element.dash = [50, 10];
                return element;
            case "Text":
                element = new TextBlock("Textblock");
                element.text = "My Text";
                element.resizeToFit = true;
                return element;
            case "ImageButton":
                element = Button.CreateImageButton("Button", "Click Me", "https://playground.babylonjs.com/textures/grass.png");
                break;
            case "VirtualKeyboard":
                element = new VirtualKeyboard();
                element.addKeysRow(["1","2", "3","\u2190"]);
                break;
            case "Image": 
                element = new Image("Image", "https://playground.babylonjs.com/textures/grass.png");
                element.autoScale = true;
                element.isPointerBlocker = true;
                return element;
            case "InputText":
                element = new InputText();
                element.maxWidth = 0.6;
                element.text = "Click Me";
                break;
            case "InputPassword":
                element = new InputPassword();
                break;
            case "Grid":
                element = new Grid();
                element.addColumnDefinition(100, true);
                element.addColumnDefinition(0.5);
                element.addColumnDefinition(0.5);
                element.addColumnDefinition(100, true);
                element.addRowDefinition(0.5);
                element.addRowDefinition(0.5);
                element.isHighlighted = true;
                return element;
            case "DisplayGrid":
                element = new DisplayGrid();
                element.width = "100px";
                element.height = "100px";
                return element;
            case "StackPanel":
                element = new StackPanel();
                element.width = "100px";
                element.height = "100px";
                element.isHighlighted = true;
                return element;
            default:
                element = Button.CreateSimpleButton("Button", "Click Me");
                break;
        }
        element.width = "150px";
        element.height = "40px";
        element.color = "#FFFFFFFF";
        element.isPointerBlocker = true;
        return element;
    }
}
