import * as postProcessLibrary from "./index";

/**
 * Legacy support, defining window.BABYLON.GUI (global variable).
 *
 * This is the entry point for the UMD module.
 * The entry point for a future ESM package should be index.ts
 */
var globalObject = (typeof global !== 'undefined') ? global : ((typeof window !== 'undefined') ? window : undefined);
if (typeof globalObject !== "undefined") {
    for (var key in postProcessLibrary) {
        (<any>globalObject).BABYLON[key] = (<any>postProcessLibrary)[key];
    }
}

export * from "./index";