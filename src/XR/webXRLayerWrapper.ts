import { Nullable } from "../types";
import { WebXRRenderTargetProvider, XRWebGLLayerRenderTargetProvider } from "./webXRRenderTargetProvider";
import { WebXRSessionManager } from "./webXRSessionManager";

/** Covers all supported subclasses of WebXR's XRCompositionLayer */
// TODO (rgerd): Extend for all other subclasses of XRCompositionLayer.
export type WebXRCompositionLayerType = 'XRProjectionLayer';

/** Covers all supported subclasses of WebXR's XRLayer */
export type WebXRLayerType = 'XRWebGLLayer' | WebXRCompositionLayerType;

/**
 * Creates wrappers for XR layers
 * @hidden
 */
 export interface WebXRLayerWrapperProvider {
    createLayerWrapper(layer: XRLayer): Nullable<WebXRLayerWrapper>;
}

/**
 * Wrapper over subclasses of XRLayer.
 * @hidden
 */
 export class WebXRLayerWrapper {
    /**
     * Check if fixed foveation is supported on this device
     */
    public get isFixedFoveationSupported(): boolean {
        return this.layerType == 'XRWebGLLayer' && (typeof (this.layer as XRWebGLLayer).fixedFoveation == 'number');
    }

    /**
     * Get the fixed foveation currently set, as specified by the webxr specs
     * If this returns null, then fixed foveation is not supported
     */
    public get fixedFoveation(): Nullable<number> {
        if (this.isFixedFoveationSupported) {
            return (this.layer as XRWebGLLayer).fixedFoveation!;
        }
        return null;
    }

    /**
     * Set the fixed foveation to the specified value, as specified by the webxr specs
     * This value will be normalized to be between 0 and 1, 1 being max foveation, 0 being no foveation
     */
    public set fixedFoveation(value: Nullable<number>) {
        if (this.isFixedFoveationSupported) {
            const val = Math.max(0, Math.min(1, value || 0));
            (this.layer as XRWebGLLayer).fixedFoveation = val;
        }
    }

    constructor(
        /** The width of the layer's framebuffer. */
        public getWidth: () => number,
        /** The height of the layer's framebuffer. */
        public getHeight: () => number,
        /** The XR layer that this WebXRLayerWrapper wraps. */
        public readonly layer: XRLayer,
        /** The type of XR layer that is being wrapped. */
        public readonly layerType: WebXRLayerType,
        /** Create a render target provider for the wrapped layer. */
        public createRenderTargetProvider: (xrSessionManager: WebXRSessionManager) => WebXRRenderTargetProvider) {}

    /**
     * Creates a WebXRLayerWrapper that wraps around an XRWebGLLayer.
     * @param layer is the layer to be wrapped.
     * @returns a new WebXRLayerWrapper wrapping the provided XRWebGLLayer.
     */
    public static CreateFromXRWebGLLayer(layer: XRWebGLLayer): WebXRLayerWrapper {
        return new WebXRLayerWrapper(
            () => layer.framebufferWidth,
            () => layer.framebufferHeight,
            layer,
            'XRWebGLLayer',
            (sessionManager) => new XRWebGLLayerRenderTargetProvider(sessionManager.scene, layer));
    }
}