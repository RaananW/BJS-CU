import { IShaderProcessor } from './iShaderProcessor';
import { Nullable } from '../../types';

/** @hidden */
export interface ProcessingOptions {
    defines: string[];
    indexParameters: any;
    isFragment: boolean;
    shouldUseHighPrecisionShader: boolean;
    supportsUniformBuffers: boolean;
    shadersRepository: string;
    includesShadersStore: { [key: string]: string };
    processor: Nullable<IShaderProcessor>;
    version: string;
    platformName: string;
    lookForClosingBracketForUniformBuffer?: boolean;
}