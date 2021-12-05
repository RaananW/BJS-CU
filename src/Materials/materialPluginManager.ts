import { ShaderCustomProcessingFunction } from "../Engines/Processors/shaderProcessingOptions";
import { EventState } from "../Misc/observable";
import { Nullable } from "../types";
import { Material } from "./material";
import {
    EventInfoPrepareEffect,
    EventInfoBindForSubMesh,
    EventInfoDisposed,
    EventInfoGetActiveTextures,
    EventInfoGetAnimatables,
    EventInfoGetDefineNames,
    EventInfoHasTexture,
    EventInfoIsReadyForSubMesh,
    EventInfoPrepareDefines,
    EventInfoPrepareUniformBuffer,
    MaterialEvent,
    EventInfo,
} from "./materialEvent";
import { EventInfoFillRenderTargetTextures, EventInfoHardBindForSubMesh, EventInfoHasRenderTargetTextures, MaterialUserEvent } from "./materialUserEvent";

declare type Scene = import("../scene").Scene;
declare type Engine = import("../Engines/engine").Engine;
declare type MaterialPluginBase = import("./materialPluginBase").MaterialPluginBase;

declare module "./material" {
    export interface Material {
        /**
         * Plugin manager for this material
         */
        pluginManager?: MaterialPluginManager;
    }
}

/**
 * Class that manages the plugins of a material
 * @since 5.0
 */
export class MaterialPluginManager {
    protected _material: Material;
    protected _scene: Scene;
    protected _engine: Engine;
    protected _plugins: MaterialPluginBase[] = [];
    protected _activePlugins: MaterialPluginBase[] = [];
    protected _codeInjectionPoints: { [shaderType: string]: { [codeName: string]: boolean } };
    protected _defineNamesFromPlugins?: { [name: string]: { type: string; default: any } };
    protected _uboDeclaration: string;
    protected _vertexDeclaration: string;
    protected _fragmentDeclaration: string;
    protected _uniformList: string[];
    protected _samplerList: string[];
    protected _pluginsForHasRenderTargetTextures: MaterialPluginBase[] = [];
    protected _pluginsForFillRenderTargetTextures: MaterialPluginBase[] = [];
    protected _pluginsForHardBindForSubMesh: MaterialPluginBase[] = [];

    /**
     * Creates a new instance of the plugin manager
     * @param material material that this manager will manage the plugins for
     */
    constructor(material: Material) {
        this._material = material;
        this._scene = material.getScene();
        this._engine = this._scene.getEngine();
    }

    /** @hidden */
    public _addPlugin(plugin: MaterialPluginBase): void {
        for (let i = 0; i < this._plugins.length; ++i) {
            if (this._plugins[i].name === plugin.name) {
                throw `Plugin "${plugin.name}" already added to the material "${this._material.name}"!`;
            }
        }

        if (this._material._uniformBufferLayoutBuilt) {
            throw `The plugin "${plugin.name}" can't be added to the material "${this._material.name}" because this material has already been used for rendering! Please add plugins to materials before any rendering with this material occurs.`;
        }

        this._material._callbackPluginEvent = this._handlePluginEvent.bind(this);

        this._plugins.push(plugin);
        this._plugins.sort((a, b) => a.priority - b.priority);

        this._codeInjectionPoints = {};

        const defineNamesFromPlugins = {};
        for (const plugin of this._plugins) {
            plugin.collectDefines(defineNamesFromPlugins);
            this._collectPointNames("vertex", plugin.getCustomCode("vertex"));
            this._collectPointNames("fragment", plugin.getCustomCode("fragment"));
        }

        if (Object.keys(defineNamesFromPlugins).length > 0) {
            this._defineNamesFromPlugins = defineNamesFromPlugins;
        } else {
            delete this._defineNamesFromPlugins;
        }
    }

    /** @hidden */
    public _activatePlugin(plugin: MaterialPluginBase): void {
        if (this._activePlugins.indexOf(plugin) === -1) {
            this._activePlugins.push(plugin);

            this._material._callbackPluginEventIsReadyForSubMesh = this._handlePluginEventIsReadyForSubMesh.bind(this);
            this._material._callbackPluginEventPrepareDefines = this._handlePluginEventPrepareDefines.bind(this);
            this._material._callbackPluginEventBindForSubMesh = this._handlePluginEventBindForSubMesh.bind(this);
    
            const flagEvents = plugin.userEvents;

            if (flagEvents & MaterialUserEvent.HasRenderTargetTextures) {
                this._pluginsForHasRenderTargetTextures.push(plugin);
                this._pluginsForHasRenderTargetTextures.sort((a, b) => a.priority - b.priority);
                this._material._callbackPluginEventHasRenderTargetTextures = this._handlePluginEventHasRenderTargetTextures.bind(this);
            }
            if (flagEvents & MaterialUserEvent.FillRenderTargetTextures) {
                this._pluginsForFillRenderTargetTextures.push(plugin);
                this._pluginsForFillRenderTargetTextures.sort((a, b) => a.priority - b.priority);
                this._material._callbackPluginEventFillRenderTargetTextures = this._handlePluginEventFillRenderTargetTextures.bind(this);
            }
            if (flagEvents & MaterialUserEvent.HardBindForSubMesh) {
                this._pluginsForHardBindForSubMesh.push(plugin);
                this._pluginsForHardBindForSubMesh.sort((a, b) => a.priority - b.priority);
                this._material._callbackPluginEventHardBindForSubMesh = this._handlePluginEventHardBindForSubMesh.bind(this);
            }
        }
    }

    /**
     * Gets a plugin from the list of plugins managed by this manager
     * @param name name of the plugin
     * @returns the plugin if found, else null
     */
    public getPlugin(name: string): Nullable<MaterialPluginBase> {
        for (let i = 0; i < this._plugins.length; ++i) {
            if (this._plugins[i].name === name) {
                return this._plugins[i];
            }
        }
        return null;
    }

    protected _handlePluginEventIsReadyForSubMesh(eventData: EventInfoIsReadyForSubMesh): void {
        let isReady = true;
        for (const plugin of this._activePlugins) {
            isReady = isReady && plugin.isReadyForSubMesh(eventData.defines, this._scene, this._engine, eventData.subMesh);
        }
        eventData.isReadyForSubMesh = isReady;
    }

    protected _handlePluginEventPrepareDefines(eventData: EventInfoPrepareDefines): void {
        for (const plugin of this._activePlugins) {
            plugin.prepareDefines(eventData.defines, this._scene, eventData.mesh);
        }
    }

    protected _handlePluginEventHardBindForSubMesh(eventData: EventInfoHardBindForSubMesh): void {
        for (const plugin of this._pluginsForHardBindForSubMesh) {
            plugin.hardBindForSubMesh(this._material._uniformBuffer, this._scene, this._engine, eventData.subMesh);
        }
    }

    protected _handlePluginEventBindForSubMesh(eventData: EventInfoBindForSubMesh): void {
        for (const plugin of this._activePlugins) {
            plugin.bindForSubMesh(this._material._uniformBuffer, this._scene, this._engine, eventData.subMesh);
        }
    }

    protected _handlePluginEventHasRenderTargetTextures(eventData: EventInfoHasRenderTargetTextures): void {
        let hasRenderTargetTextures = false;
        for (const plugin of this._pluginsForHasRenderTargetTextures) {
            hasRenderTargetTextures = plugin.hasRenderTargetTextures();
            if (hasRenderTargetTextures) {
                break;
            }
        }
        eventData.hasRenderTargetTextures = hasRenderTargetTextures;
    }

    protected _handlePluginEventFillRenderTargetTextures(eventData: EventInfoFillRenderTargetTextures): void {
        for (const plugin of this._pluginsForFillRenderTargetTextures) {
            plugin.fillRenderTargetTextures(eventData.renderTargets);
        }
    }

    protected _handlePluginEvent(id: number, info: EventInfo): void {
        switch (id) {
            case MaterialEvent.GetActiveTextures: {
                const eventData = info as EventInfoGetActiveTextures;
                for (const plugin of this._activePlugins) {
                    plugin.getActiveTextures(eventData.activeTextures);
                }
                break;
            }

            case MaterialEvent.GetAnimatables: {
                const eventData = info as EventInfoGetAnimatables;
                for (const plugin of this._activePlugins) {
                    plugin.getAnimatables(eventData.animatables);
                }
                break;
            }

            case MaterialEvent.HasTexture: {
                const eventData = info as EventInfoHasTexture;
                let hasTexture = false;
                for (const plugin of this._activePlugins) {
                    hasTexture = plugin.hasTexture(eventData.texture);
                    if (hasTexture) {
                        break;
                    }
                }
                eventData.hasTexture = hasTexture;
                break;
            }

            case MaterialEvent.Disposed: {
                const eventData = info as EventInfoDisposed;
                for (const plugin of this._plugins) {
                    plugin.dispose(eventData.forceDisposeTextures);
                }
                break;
            }

            case MaterialEvent.GetDefineNames: {
                const eventData = info as EventInfoGetDefineNames;
                eventData.defineNames = this._defineNamesFromPlugins;
                break;
            }

            case MaterialEvent.PrepareEffect: {
                const eventData = info as EventInfoPrepareEffect;
                for (const plugin of this._activePlugins) {
                    eventData.fallbackRank = plugin.addFallbacks(eventData.defines, eventData.fallbacks, eventData.fallbackRank);
                }
                if (this._uniformList.length > 0) {
                    eventData.uniforms.push(...this._uniformList);
                }
                if (this._samplerList.length > 0) {
                    eventData.samplers.push(...this._samplerList);
                }
                eventData.customCode = this._injectCustomCode(eventData.customCode);
                break;
            }

            case MaterialEvent.PrepareUniformBuffer: {
                const eventData = info as EventInfoPrepareUniformBuffer;
                this._uboDeclaration = "";
                this._vertexDeclaration = "";
                this._fragmentDeclaration = "";
                this._uniformList = [];
                this._samplerList = [];
                for (const plugin of this._plugins) {
                    const uniforms = plugin.getUniforms();
                    if (uniforms) {
                        if (uniforms.ubo) {
                            for (const uniform of uniforms.ubo) {
                                eventData.ubo.addUniform(uniform.name, uniform.size);
                                this._uboDeclaration += `${uniform.type} ${uniform.name};\r\n`;
                                this._uniformList.push(uniform.name);
                            }
                        }
                        if (uniforms.vertex) {
                            this._vertexDeclaration += uniforms.vertex + "\r\n";
                        }
                        if (uniforms.fragment) {
                            this._fragmentDeclaration += uniforms.fragment + "\r\n";
                        }
                    }
                    plugin.getSamplers(this._samplerList);
                }
                break;
            }
        }
    }

    protected _collectPointNames(shaderType: string, customCode: Nullable<{ [pointName: string]: string }> | undefined): void {
        if (!customCode) {
            return;
        }
        for (const pointName in customCode) {
            if (!this._codeInjectionPoints[shaderType]) {
                this._codeInjectionPoints[shaderType] = {};
            }
            this._codeInjectionPoints[shaderType][pointName] = true;
        }
    }

    protected _injectCustomCode(existingCallback?: (shaderType: string, code: string) => string): ShaderCustomProcessingFunction {
        return (shaderType: string, code: string) => {
            if (existingCallback) {
                code = existingCallback(shaderType, code);
            }
            if (this._uboDeclaration) {
                code = code.replace("#define ADDITIONAL_UBO_DECLARATION", this._uboDeclaration);
            }
            if (this._vertexDeclaration) {
                code = code.replace("#define ADDITIONAL_VERTEX_DECLARATION", this._vertexDeclaration);
            }
            if (this._fragmentDeclaration) {
                code = code.replace("#define ADDITIONAL_FRAGMENT_DECLARATION", this._fragmentDeclaration);
            }
            const points = this._codeInjectionPoints?.[shaderType];
            if (!points) {
                return code;
            }
            for (const pointName in points) {
                let injectedCode = "";
                for (const plugin of this._plugins) {
                    const customCode = plugin.getCustomCode(shaderType);
                    if (customCode?.[pointName]) {
                        injectedCode += customCode[pointName] + "\r\n";
                    }
                }
                if (injectedCode.length > 0) {
                    if (pointName.charAt(0) === "!") {
                        // pointName is a regular expression
                        const rx = new RegExp(pointName.substring(1), "g");
                        let match = rx.exec(code);
                        while (match !== null) {
                            code = code.replace(match[0], injectedCode);
                            match = rx.exec(code);
                        }
                    } else {
                        const fullPointName = "#define " + pointName;
                        code = code.replace(fullPointName, "\r\n" + injectedCode + "\r\n" + fullPointName);
                    }
                }
            }
            return code;
        };
    }
}

/**
 * Type for plugin material factories.
 */
export type PluginMaterialFactory = (material: Material) => Nullable<MaterialPluginBase>;

let _Plugins: Array<[string, PluginMaterialFactory]> = [];
let _Inited = false;

/**
 * Registers a new material plugin through a factory, or updates it. This makes the plugin available to all materials instantiated after its registration.
 * @param pluginName The plugin name
 * @param factory The factory function which allows to create the plugin
 */
export function RegisterMaterialPlugin(pluginName: string, factory: PluginMaterialFactory): void {
    if (!_Inited) {
        Material.OnEventObservable.add((material: Material, eventState: EventState) => {
            for (const [_name, factory] of _Plugins) {
                factory(material);
            }
        }, MaterialEvent.Created);
        _Inited = true;
    }
    const existing = _Plugins.filter(([name, _factory]) => name === pluginName);
    if (existing.length > 0) {
        existing[0][1] = factory;
    } else {
        _Plugins.push([pluginName, factory]);
    }
}

/**
 * Removes a material plugin from the list of global plugins.
 * @param pluginName The plugin name
 * @returns true if the plugin has been removed, else false
 */
export function UnregisterMaterialPlugin(pluginName: string): boolean {
    for (let i = 0; i < _Plugins.length; ++i) {
        if (_Plugins[i][0] === pluginName) {
            _Plugins.splice(i, 1);
            return true;
        }
    }
    return false;
}

/**
 * Clear the list of global material plugins
 */
export function UnregisterAllMaterialPlugins(): void {
    _Plugins.length = 0;
}
