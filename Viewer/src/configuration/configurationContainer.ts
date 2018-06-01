import { ViewerConfiguration } from './configuration';
import { Color3 } from 'babylonjs';

export class ConfigurationContainer {

    public configuration: ViewerConfiguration;

    public viewerId: string;

    public mainColor: Color3 = Color3.White();
    public reflectionColor: Color3 = Color3.White();
}