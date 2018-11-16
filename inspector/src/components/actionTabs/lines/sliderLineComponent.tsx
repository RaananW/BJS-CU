import * as React from "react";
import { Observable } from "babylonjs";
import { PropertyChangedEvent } from "../../propertyChangedEvent";

interface ISliderLineComponentProps {
    label: string,
    target?: any,
    propertyName?: string,
    minimum: number,
    maximum: number,
    step: number,
    directValue?: number,
    onChange?: (value: number) => void,
    onInput?: (value: number) => void,
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>
}

export class SliderLineComponent extends React.Component<ISliderLineComponentProps, { value: number }> {
    private _localChange = false;
    constructor(props: ISliderLineComponentProps) {
        super(props);

        if (this.props.directValue !== undefined) {
            this.state = {
                value: this.props.directValue
            }
        } else {
            this.state = { value: this.props.target![this.props.propertyName!] };
        }
    }

    shouldComponentUpdate(nextProps: ISliderLineComponentProps, nextState: { value: number }) {
        if (nextProps.directValue !== undefined) {
            nextState.value = nextProps.directValue;
            return true;
        }
        const currentState = nextProps.target![nextProps.propertyName!];

        if (currentState !== nextState.value || this._localChange) {
            nextState.value = currentState;
            this._localChange = false;
            return true;
        }
        return false;
    }

    onChange(newValueString: any) {
        this._localChange = true;
        const newValue = parseFloat(newValueString);

        if (this.props.target) {
            if (this.props.onPropertyChangedObservable) {
                this.props.onPropertyChangedObservable.notifyObservers({
                    object: this.props.target,
                    property: this.props.propertyName!,
                    value: newValue,
                    initialValue: this.state.value
                });
            }

            this.props.target[this.props.propertyName!] = newValue;
        }

        if (this.props.onChange) {
            this.props.onChange(newValue);
        }

        this.setState({ value: newValue });
    }

    onInput(newValueString: any) {
        const newValue = parseFloat(newValueString);
        if (this.props.onInput) {
            this.props.onInput(newValue);
        }
    }

    render() {
        return (
            <div className="sliderLine">
                <div className="label">
                    {this.props.label}
                </div>
                <div className="slider">
                    {this.state.value ? this.state.value.toFixed(2) : "0"}&nbsp;<input className="range" type="range" step={this.props.step} min={this.props.minimum} max={this.props.maximum} value={this.state.value}
                        onInput={evt => this.onInput((evt.target as HTMLInputElement).value)}
                        onChange={evt => this.onChange(evt.target.value)} />
                </div>
            </div>
        );
    }
}