import * as React from "react";

interface IPlayheadProps {
    // Message to display
    message: string;
    // open or close state
    open: boolean;
    // event to close the notification bar
    close: () => void;
}

/**
 * Renders the notification for the user
 */
export class Notification extends React.Component<IPlayheadProps> {
    constructor(props: IPlayheadProps) {
        super(props);
    }

    render() {
        return (
            <div className="notification-area" style={{ display: this.props.open ? "block" : "none" }}>
                <div className="alert alert-error">
                    <button type="button" className="close" data-dismiss="alert" onClick={this.props.close}>
                        &times;
                    </button>
                    {this.props.message}
                </div>
            </div>
        );
    }
}
