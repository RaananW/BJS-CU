import * as React from "react";
import { Observable } from "core/Misc/observable";
import { PropertyChangedEvent } from "../propertyChangedEvent";
import { LockObject } from "../tabs/propertyGrids/lockObject";
import { ColorLineComponent } from "./colorLineComponent";

export interface IColor4LineComponentProps {
    label: string;
    target?: any;
    propertyName: string;
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>;
    onChange?: () => void;
    isLinear?: boolean;
    icon?: string;
    iconLabel?: string;
    lockObject?: LockObject;
}

export class Color4LineComponent extends React.Component<IColor4LineComponentProps> {
    render() {
        const props = this.props;
        return <ColorLineComponent {...props} />;
    }
}
