import { TreeItemSpecializedComponent } from "./treeItemSpecializedComponent";
import { Observable, Nullable, IExplorerExtensibilityGroup } from "babylonjs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Tools } from "../../tools";
import * as ReactDOM from "react-dom";
import * as React from "react";

export interface ITreeItemSelectableComponentProps {
    entity: any,
    selectedEntity?: any,
    mustExpand?: boolean,
    offset: number,
    extensibilityGroups?: IExplorerExtensibilityGroup[],
    onSelectionChangedObservable?: Observable<any>,
    filter: Nullable<string>
}

export class TreeItemSelectableComponent extends React.Component<ITreeItemSelectableComponentProps, { isExpanded: boolean, isSelected: boolean }> {
    private _wasSelected = false;

    constructor(props: ITreeItemSelectableComponentProps) {
        super(props);

        this.state = { isSelected: this.props.entity === this.props.selectedEntity, isExpanded: this.props.mustExpand || Tools.LookForItem(this.props.entity, this.props.selectedEntity) };
    }

    switchExpandedState(): void {
        this.setState({ isExpanded: !this.state.isExpanded });
    }

    shouldComponentUpdate(nextProps: ITreeItemSelectableComponentProps, nextState: { isExpanded: boolean, isSelected: boolean }) {
        if (!nextState.isExpanded && this.state.isExpanded) {
            return true;
        }

        if (nextProps.selectedEntity) {
            if (nextProps.entity === nextProps.selectedEntity) {
                nextState.isSelected = true;
                return true;
            } else {
                nextState.isSelected = false;
            }

            if (Tools.LookForItem(nextProps.entity, nextProps.selectedEntity)) {
                nextState.isExpanded = true;
                return true;
            }
        }

        return true;
    }

    scrollIntoView() {
        const element = ReactDOM.findDOMNode(this) as Element;

        if (element) {
            element.scrollIntoView();
        }
    }

    componentDidMount() {
        if (this.state.isSelected) {
            this.scrollIntoView();
        }
    }

    componentDidUpdate() {
        if (this.state.isSelected && !this._wasSelected) {
            this.scrollIntoView();
        }
        this._wasSelected = false;
    }

    onSelect() {
        if (!this.props.onSelectionChangedObservable) {
            return;
        }
        this._wasSelected = true;
        const entity = this.props.entity;
        this.props.onSelectionChangedObservable.notifyObservers(entity);
    }

    renderChildren() {
        const entity = this.props.entity;
        if (!entity.getChildren && !entity.children || !this.state.isExpanded) {
            return null;
        }

        const children = Tools.SortAndFilter(entity, entity.getChildren ? entity.getChildren() : entity.children);
        return (
            children.map(item => {

                return (
                    <TreeItemSelectableComponent mustExpand={this.props.mustExpand} extensibilityGroups={this.props.extensibilityGroups} selectedEntity={this.props.selectedEntity} key={item.uniqueId} offset={this.props.offset + 2} entity={item} onSelectionChangedObservable={this.props.onSelectionChangedObservable} filter={this.props.filter} />
                );
            })
        )
    }

    render() {
        const marginStyle = {
            paddingLeft: (10 * (this.props.offset + 0.5)) + "px"
        };
        const entity = this.props.entity;

        const chevron = this.state.isExpanded ? <FontAwesomeIcon icon={faMinus} /> : <FontAwesomeIcon icon={faPlus} />
        const children = Tools.SortAndFilter(entity, entity.getChildren ? entity.getChildren() : entity.children);
        const hasChildren = children.length > 0;

        if (!entity.metadata) {
            entity.metadata = {};
        }

        entity.metadata.setExpandedState = (value: boolean) => {
            this.setState({ isExpanded: value });
        }
        entity.metadata.isExpanded = this.state.isExpanded;

        if (this.props.filter) {
            const lowerCaseFilter = this.props.filter.toLowerCase();
            if (!entity.name || entity.name.toLowerCase().indexOf(lowerCaseFilter) === -1) {
                if (!hasChildren) {
                    return null;
                }

                if (entity.getDescendants) {
                    if (entity.getDescendants(false, (n: any) => {
                        console.log(n.name);
                        return n.name && n.name.toLowerCase().indexOf(lowerCaseFilter) !== -1
                    }).length === 0) {
                        return null;
                    }
                }
            }
        }

        return (
            <div>
                <div className={this.state.isSelected ? "itemContainer selected" : "itemContainer"} style={marginStyle} >
                    {
                        hasChildren &&
                        <div className="arrow icon" onClick={() => this.switchExpandedState()}>
                            {chevron}
                        </div>
                    }
                    <TreeItemSpecializedComponent extensibilityGroups={this.props.extensibilityGroups} label={entity.name} entity={entity} onClick={() => this.onSelect()} onSelectionChangedObservable={this.props.onSelectionChangedObservable} />
                </div>
                {
                    this.renderChildren()
                }
            </div >
        );
    }
}
