
import * as React from "react";
import { GlobalState } from '../../../globalState';
import { InputBlock } from 'babylonjs/Materials/Node/Blocks/Input/inputBlock';
import { MatrixLineComponent } from '../../../sharedComponents/matrixLineComponent';

interface IMatrixPropertyTabComponentProps {
    globalState: GlobalState;
    inputBlock: InputBlock;
}

export class MatrixPropertyTabComponent extends React.Component<IMatrixPropertyTabComponentProps> {

    render() {
        return (
            <MatrixLineComponent label="Value" target={this.props.inputBlock} propertyName="value" onChange={() => {
                this.props.globalState.onUpdateRequiredObservable.notifyObservers();
            }}></MatrixLineComponent>
        );
    }
}