import { InternalTexture } from "../Materials/Textures/internalTexture";
import { BaseTexture } from "../Materials/Textures/baseTexture";
import { Texture } from "../Materials/Textures/texture";
import { RenderTargetTexture } from "../Materials/Textures/renderTargetTexture";
import { PassPostProcess } from "../PostProcesses/passPostProcess";
import { Constants } from "../Engines/constants";
import { Scene } from "../scene";

/**
 * Class used to host texture specific utilities
 */
export class TextureTools {
    /**
     * Uses the GPU to create a copy texture rescaled at a given size
     * @param texture Texture to copy from
     * @param width defines the desired width
     * @param height defines the desired height
     * @param useBilinearMode defines if bilinear mode has to be used
     * @return the generated texture
     */
    public static CreateResizedCopy(texture: Texture, width: number, height: number, useBilinearMode: boolean = true): Texture {

        var scene = <Scene>texture.getScene();
        var engine = scene.getEngine();

        let rtt = new RenderTargetTexture(
            'resized' + texture.name,
            { width: width, height: height },
            scene,
            !texture.noMipmap,
            true,
            (<InternalTexture>texture._texture).type,
            false,
            texture.samplingMode,
            false
        );

        rtt.wrapU = texture.wrapU;
        rtt.wrapV = texture.wrapV;
        rtt.uOffset = texture.uOffset;
        rtt.vOffset = texture.vOffset;
        rtt.uScale = texture.uScale;
        rtt.vScale = texture.vScale;
        rtt.uAng = texture.uAng;
        rtt.vAng = texture.vAng;
        rtt.wAng = texture.wAng;
        rtt.coordinatesIndex = texture.coordinatesIndex;
        rtt.level = texture.level;
        rtt.anisotropicFilteringLevel = texture.anisotropicFilteringLevel;
        (<InternalTexture>rtt._texture).isReady = false;

        texture.wrapU = Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = Texture.CLAMP_ADDRESSMODE;

        let passPostProcess = new PassPostProcess("pass", 1, null, useBilinearMode ? Texture.BILINEAR_SAMPLINGMODE : Texture.NEAREST_SAMPLINGMODE, engine, false, Constants.TEXTURETYPE_UNSIGNED_INT);
        passPostProcess.getEffect().executeWhenCompiled(() => {
            passPostProcess.onApply = function(effect) {
                effect.setTexture("textureSampler", texture);
            };

            let internalTexture = rtt.getInternalTexture();

            if (internalTexture) {
                scene.postProcessManager.directRender([passPostProcess], internalTexture);

                engine.unBindFramebuffer(internalTexture);
                rtt.disposeFramebufferObjects();
                passPostProcess.dispose();

                internalTexture.isReady = true;
            }
        });

        return rtt;
    }

    /**
     * Gets a default environment BRDF for MS-BRDF Height Correlated BRDF
     * @param scene defines the hosting scene
     * @returns the environment BRDF texture
     */
    public static GetEnvironmentBRDFTexture(scene: Scene): BaseTexture {
        if (!scene._environmentBRDFTexture) {
            var texture = Texture.CreateFromBase64String(this._environmentBRDFBase64Texture, "EnvironmentBRDFTexture", scene, true, true, Texture.BILINEAR_SAMPLINGMODE);

            texture.wrapU = Texture.CLAMP_ADDRESSMODE;
            texture.wrapV = Texture.CLAMP_ADDRESSMODE;
            scene._environmentBRDFTexture = texture;
        }

        return scene._environmentBRDFTexture;
    }

    private static _environmentBRDFBase64Texture = "data:image/png;base64,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";
}
