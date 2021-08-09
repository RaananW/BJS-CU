import * as React from "react";
import { GlobalState } from '../globalState';
import { CommandButtonComponent } from './commandButtonComponent';
import { CommandDropdownComponent } from './commandDropdownComponent';
import { Utilities } from '../tools/utilities';

require("../scss/commandBar.scss");

declare var Versions: any;

interface ICommandBarComponentProps {
    globalState: GlobalState;
}

export class CommandBarComponent extends React.Component<ICommandBarComponentProps> {    
  
    public constructor(props: ICommandBarComponentProps) {
        super(props);

        this.props.globalState.onLanguageChangedObservable.add(() => {
            this.forceUpdate();
        });
    }    

    onPlay() {
        this.props.globalState.onRunRequiredObservable.notifyObservers();
    }

    onNew() {
        this.props.globalState.onNewRequiredObservable.notifyObservers();
    }

    onClear() {        
        this.props.globalState.onClearRequiredObservable.notifyObservers();
    }

    onSave() {
        this.props.globalState.onSaveRequiredObservable.notifyObservers();
    }

    onDownload() {
        this.props.globalState.onDownloadRequiredObservable.notifyObservers();
    }

    onInspector() {
        this.props.globalState.onInspectorRequiredObservable.notifyObservers(!this.props.globalState.inspectorIsOpened);
    }

    onExamples() {
        this.props.globalState.onExamplesDisplayChangedObservable.notifyObservers();
    }

    public render() {
        let activeVersion = Utilities.ReadStringFromStore("version", "Latest");
        let activeEngineVersion = Utilities.ReadStringFromStore("engineVersion", "WebGL2");

        if (location.href.indexOf("webgpu") !== -1 && !!navigator.gpu) {
            activeEngineVersion = "WebGPU";
            Utilities.StoreStringToStore("Engine", "WebGPU");
        }

        var versionOptions = Object.keys(Versions).map(key => {
            return { 
                label: key,
                tooltip: `Use Babylon.js version: ${key}`,
                storeKey: "version",
                isActive: activeVersion === key,
                onClick: () => {
                    Utilities.StoreStringToStore("version", key);
                    window.location.reload();
                }
            }
        });

        var engineOptions = [
            {
                label: "WebGL2",
                tooltip: "Use WebGL 2 API",
                storeKey: "engineVersion",
                isActive: activeEngineVersion === "WebGL2",
                onClick: () => {
                    Utilities.StoreStringToStore("engineVersion", "WebGL2");
                    window.location.reload();
                }
            },
            {
                label: "WebGL",
                tooltip: "Use WebGL 1 API",
                storeKey: "engineVersion",
                isActive: activeEngineVersion === "WebGL",
                onClick: () => {
                    Utilities.StoreStringToStore("engineVersion", "WebGL");
                    window.location.reload();
                }
            }
        ];

        if (!!navigator.gpu) {
            engineOptions.splice(0,0, {
                label: "WebGPU",
                tooltip: "Use WebGPU API (experimental)",
                storeKey: "engineVersion",
                isActive: activeEngineVersion === "WebGPU",
                onClick: () => {
                    Utilities.StoreStringToStore("engineVersion", "WebGPU");
                    window.location.reload();
                }
            });
        }

        return (
            <div className={"commands " + (this.props.globalState.language === "JS" ? "background-js" : "background-ts")}>
                <div className="commands-left">
                <CommandButtonComponent globalState={this.props.globalState} tooltip="Run" icon="play" shortcut="Alt+Enter" isActive={true} onClick={()=> this.onPlay()}/>
                <CommandButtonComponent globalState={this.props.globalState} tooltip="Save" icon="save" shortcut="Ctrl+S" isActive={false} onClick={()=> this.onSave()}/>
                <CommandButtonComponent globalState={this.props.globalState} tooltip="Inspector" icon="inspector" isActive={false} onClick={()=> this.onInspector()}/>
                <CommandButtonComponent globalState={this.props.globalState} tooltip="Download" icon="download" shortcut="Shift+Ctrl+S"isActive={false} onClick={()=> this.onDownload()}/>
                <CommandButtonComponent globalState={this.props.globalState} tooltip="Create new" icon="new" isActive={false} onClick={()=> this.onNew()}/>
                <CommandButtonComponent globalState={this.props.globalState} tooltip="Clear code" icon="clear" isActive={false} onClick={()=> this.onClear()}/>
                <CommandDropdownComponent globalState={this.props.globalState} icon="options" tooltip="Options" items={[
                    {
                        label: "Theme",
                        tooltip: "Controls the color scheme of the playground",
                        storeKey: "theme",
                        defaultValue: "Light",
                        subItems: [
                            "Light",
                            "Dark"
                        ],
                        onClick: () => {
                            this.props.globalState.onThemeChangedObservable.notifyObservers();
                        }
                    },  
                    {
                        label: "Font size",
                        tooltip: "Change the font size of the code editor",
                        storeKey: "font-size",
                        defaultValue: "14",
                        subItems: [
                            "12",
                            "14",
                            "16",
                            "18",
                            "20",
                            "22",
                            "24",
                            "26",
                            "28",
                            "30",
                        ],
                        onClick: () => {
                            this.props.globalState.onFontSizeChangedObservable.notifyObservers();
                        }
                    },
                    {
                        label: "Safe mode",
                        tooltip: "Asks to confirm if you leave page without saving",
                        storeKey: "safe-mode",
                        defaultValue: false,
                        onCheck: () => {}
                    },                     
                    {
                        label: "CTRL+S to save",
                        tooltip: "Saves your playground code online and creates a shareable link",
                        storeKey: "ctrl-s-to-save",
                        defaultValue: true,
                        onCheck: () => {}
                    }, 
                    {
                        label: "editor",
                        tooltip: "Show/Hide the Code Editor",
                        storeKey: "editor",
                        defaultValue: true,
                        onCheck: (value) => {this.props.globalState.onEditorDisplayChangedObservable.notifyObservers(value)}
                    }, {
                        label: "minimap",
                        tooltip: "Show/Hide the Code Minimap",
                        storeKey: "minimap",
                        defaultValue: true,
                        onCheck: (value) => {this.props.globalState.onMinimapChangedObservable.notifyObservers(value)}
                    }, {
                        label: "fullscreen",
                        tooltip: "Makes the canvas fullscreen",
                        onClick: () => {this.props.globalState.onFullcreenRequiredObservable.notifyObservers()}
                    },                     {
                        label: "fullscreen editor",
                        tooltip: "Makes the code editor fullscreen",
                        onClick: () => {this.props.globalState.onEditorFullcreenRequiredObservable.notifyObservers()}
                    },                   {
                        label: "format code",
                        tooltip: "Autoformats code",
                        onClick: () => {this.props.globalState.onFormatCodeRequiredObservable.notifyObservers()}
                    },
                    {
                        label: "metadata",
                        tooltip: "Edit the playground title, description, and tags",
                        onClick: () => {this.props.globalState.onDisplayMetadataObservable.notifyObservers(true)}
                    },
                    {
                        label: "QR code",
                        tooltip: "Shows a QR code that points to this playground",
                        onClick: () => {this.props.globalState.onQRCodeRequiredObservable.notifyObservers(true)}
                    },                 
                    {
                        label: "Load Unity Toolkit",
                        tooltip: "Loads the Unity Toolkit into the playground",
                        storeKey: "unity-toolkit",
                        defaultValue: false,
                        onCheck: () => {}
                    }, 
                ]}/>
                </div>
                <div className="commands-right">
                    <CommandDropdownComponent globalState={this.props.globalState} defaultValue={activeEngineVersion} tooltip="Engine" toRight={true} items={engineOptions} />                    
                    <CommandDropdownComponent globalState={this.props.globalState} defaultValue={activeVersion} tooltip="Versions" toRight={true} items={versionOptions} />                    
                    <CommandButtonComponent globalState={this.props.globalState} tooltip="Examples" icon="examples" onClick={()=> this.onExamples()} isActive={false}/>
                </div>
            </div>
        );
    }
}