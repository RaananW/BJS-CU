import * as React from "react";
import * as ReactDOM from "react-dom";
import { GlobalState } from './globalState';
import { WorkbenchEditor } from './workbenchEditor';
import { Popup } from "./sharedComponents/popup";
import { SerializationTools } from './serializationTools';
import { Observable } from 'babylonjs/Misc/observable';
/**
 * Interface used to specify creation options for the gui editor
 */
export interface IGuiEditorOptions {
    hostElement?: HTMLElement,
    customSave?: {label: string, action: (data: string) => Promise<void>};
    customLoadObservable?: Observable<any>
}

/**
 * Class used to create a gui editor
 */
export class GuiEditor {
    private static _CurrentState: GlobalState;

    /**
     * Show the gui editor
     * @param options defines the options to use to configure the gui editor
     */
    public static Show(options: IGuiEditorOptions) {
        if (this._CurrentState) {
            var popupWindow = (Popup as any)["gui-editor"];
            if (popupWindow) {
                popupWindow.close();
            }
        }

        let hostElement = options.hostElement;
        
        if (!hostElement) {
            hostElement = Popup.CreatePopup("BABYLON.JS GUI EDITOR", "gui-editor", 1000, 800)!;
        }

        let globalState = new GlobalState();
        globalState.hostElement = hostElement;
        globalState.hostDocument = hostElement.ownerDocument!;
        globalState.customSave = options.customSave;
        globalState.hostWindow =  hostElement.ownerDocument!.defaultView!;

        const graphEditor = React.createElement(WorkbenchEditor, {
            globalState: globalState
        });

        ReactDOM.render(graphEditor, hostElement);
        
        // create the middle workbench canvas
        if(!globalState.guiTexture) {
            globalState.workbench.createGUICanvas();
        }

        if (options.customLoadObservable) {
            options.customLoadObservable.add(data => {
                SerializationTools.Deserialize(data, globalState);
                globalState.onResetRequiredObservable.notifyObservers();
                globalState.onBuiltObservable.notifyObservers();
            })
        }

        this._CurrentState = globalState;

        // Close the popup window when the page is refreshed or scene is disposed
        var popupWindow = (Popup as any)["gui-editor"];
        if (popupWindow) {
            window.onbeforeunload = () => {
                var popupWindow = (Popup as any)["gui-editor"];
                if (popupWindow) {
                    popupWindow.close();
                }

            };
        }
        window.addEventListener('beforeunload', () => {
        });
    }
}

