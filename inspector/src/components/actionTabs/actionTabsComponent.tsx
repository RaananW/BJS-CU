import * as React from "react";
import { Nullable } from "babylonjs/types";
import { Observer } from "babylonjs/Misc/observable";
import { Scene } from "babylonjs/scene";
import { TabsComponent } from "./tabsComponent";
import { faFileAlt, faWrench, faBug, faChartBar } from '@fortawesome/free-solid-svg-icons';
import { StatisticsTabComponent } from "./tabs/statisticsTabComponent";
import { DebugTabComponent } from "./tabs/debugTabComponent";
import Resizable from "re-resizable";
import { PropertyGridTabComponent } from "./tabs/propertyGridTabComponent";
import { HeaderComponent } from "../headerComponent";
import { ToolsTabComponent } from "./tabs/toolsTabComponent";
import { GlobalState } from "components/globalState";

require("./actionTabs.scss");

interface IActionTabsComponentProps {
    scene: Scene,
    noCommands?: boolean,
    noHeader?: boolean,
    noExpand?: boolean,
    noClose?: boolean,
    popupMode?: boolean,
    onPopup?: () => void,
    onClose?: () => void,
    globalState: GlobalState
}

export class ActionTabsComponent extends React.Component<IActionTabsComponentProps, { selectedEntity: any, selectedIndex: number }> {
    private _onSelectionChangeObserver: Nullable<Observer<any>>;
    private _onTabChangedObserver: Nullable<Observer<any>>;
    private _once = true;

    constructor(props: IActionTabsComponentProps) {
        super(props);

        let initialIndex = 0;

        const validationResutls = this.props.globalState.validationResults;
        if (validationResutls) {
            if (validationResutls.issues.numErrors || validationResutls.issues.numWarnings) {
                initialIndex = 3;
            }
        }

        this.state = { selectedEntity: null, selectedIndex: initialIndex }
    }

    componentWillMount() {
        this._onSelectionChangeObserver = this.props.globalState.onSelectionChangedObservable.add((entity) => {
            this.setState({ selectedEntity: entity, selectedIndex: 0 });
        });

        this._onTabChangedObserver = this.props.globalState.onTabChangedObservable.add(index => {
            this.setState({ selectedIndex: index });
        });
    }

    componentWillUnmount() {
        if (this._onSelectionChangeObserver) {
            this.props.globalState.onSelectionChangedObservable.remove(this._onSelectionChangeObserver);
        }

        if (this._onTabChangedObserver) {
            this.props.globalState.onTabChangedObservable.remove(this._onTabChangedObserver);
        }
    }

    changeSelectedTab(index: number) {
        this.props.globalState.onTabChangedObservable.notifyObservers(index);
    }

    renderContent() {
        return (
            <TabsComponent selectedIndex={this.state.selectedIndex} onSelectedIndexChange={(value) => this.changeSelectedTab(value)}>
                <PropertyGridTabComponent
                    title="Properties" icon={faFileAlt} scene={this.props.scene} selectedEntity={this.state.selectedEntity}
                    globalState={this.props.globalState}
                    onSelectionChangedObservable={this.props.globalState.onSelectionChangedObservable}
                    onPropertyChangedObservable={this.props.globalState.onPropertyChangedObservable} />
                <DebugTabComponent title="Debug" icon={faBug} scene={this.props.scene} globalState={this.props.globalState} />
                <StatisticsTabComponent title="Statistics" icon={faChartBar} scene={this.props.scene} globalState={this.props.globalState} />
                <ToolsTabComponent title="Tools" icon={faWrench} scene={this.props.scene} globalState={this.props.globalState} />
            </TabsComponent>
        )
    }

    onClose() {
        if (!this.props.onClose) {
            return;
        }
        this.props.onClose();
    }

    onPopup() {
        if (!this.props.onPopup) {
            return;
        }
        this.props.onPopup();
    }

    render() {
        if (this.props.popupMode) {
            return (
                <div id="actionTabs">
                    {
                        !this.props.noHeader &&
                        <HeaderComponent title="INSPECTOR" handleBack={true} noClose={this.props.noClose} noExpand={this.props.noExpand} noCommands={this.props.noCommands} onClose={() => this.onClose()} onPopup={() => this.onPopup()} onSelectionChangedObservable={this.props.globalState.onSelectionChangedObservable} />
                    }
                    {this.renderContent()}
                </div>
            );
        }

        if (this._once) {
            this._once = false;
            // A bit hacky but no other way to force the initial width to 300px and not auto
            setTimeout(() => {
                const element = document.getElementById("actionTabs");
                if (!element) {
                    return;
                }
                element.style.width = "300px";
            }, 150);
        }

        return (
            <Resizable id="actionTabs" minWidth={300} maxWidth={600} size={{ height: "100%" }} minHeight="100%" enable={{ top: false, right: false, bottom: false, left: true, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}>
                {
                    !this.props.noHeader &&
                    <HeaderComponent title="INSPECTOR" handleBack={true} noClose={this.props.noClose} noExpand={this.props.noExpand} noCommands={this.props.noCommands} onClose={() => this.onClose()} onPopup={() => this.onPopup()} onSelectionChangedObservable={this.props.globalState.onSelectionChangedObservable} />
                }
                {this.renderContent()}
            </Resizable>
        );
    }
}
