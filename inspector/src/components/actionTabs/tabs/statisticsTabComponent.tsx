import * as React from "react";
import { PaneComponent, IPaneComponentProps } from "../paneComponent";
import { TextLineComponent } from "../lines/textLineComponent";
import { LineContainerComponent } from "../lineContainerComponent";
import { SceneInstrumentation, EngineInstrumentation, Nullable } from "babylonjs";
import { ValueLineComponent } from "../lines/valueLineComponent";
import { BooleanLineComponent } from "../lines/booleanLineComponent";

export class StatisticsTabComponent extends PaneComponent {
    private _sceneInstrumentation: Nullable<SceneInstrumentation>;
    private _engineInstrumentation: Nullable<EngineInstrumentation>;
    private _timerIntervalId: number;

    constructor(props: IPaneComponentProps) {
        super(props);
    }

    componentWillMount() {
        const scene = this.props.scene;

        if (!scene) {
            return;
        }

        this._sceneInstrumentation = new BABYLON.SceneInstrumentation(scene);
        this._sceneInstrumentation.captureActiveMeshesEvaluationTime = true;
        this._sceneInstrumentation.captureRenderTargetsRenderTime = true;
        this._sceneInstrumentation.captureFrameTime = true;
        this._sceneInstrumentation.captureRenderTime = true;
        this._sceneInstrumentation.captureInterFrameTime = true;
        this._sceneInstrumentation.captureParticlesRenderTime = true;
        this._sceneInstrumentation.captureSpritesRenderTime = true;
        this._sceneInstrumentation.capturePhysicsTime = true;
        this._sceneInstrumentation.captureAnimationsTime = true;

        this._engineInstrumentation = new BABYLON.EngineInstrumentation(scene.getEngine());
        this._engineInstrumentation.captureGPUFrameTime = true;

        this._timerIntervalId = window.setInterval(() => this.forceUpdate(), 500);
    }

    componentWillUnmount() {
        if (this._sceneInstrumentation) {
            this._sceneInstrumentation.dispose();
            this._sceneInstrumentation = null;
        }

        if (this._engineInstrumentation) {
            this._engineInstrumentation.dispose();
            this._engineInstrumentation = null;
        }

        window.clearInterval(this._timerIntervalId);
    }

    render() {
        const scene = this.props.scene;

        if (!scene || !this._sceneInstrumentation || !this._engineInstrumentation) {
            return null;
        }

        const engine = scene.getEngine();
        const sceneInstrumentation = this._sceneInstrumentation;
        const engineInstrumentation = this._engineInstrumentation;
        const caps = engine.getCaps();

        return (
            <div className="pane">
                <TextLineComponent label="Version" value={BABYLON.Engine.Version} color="rgb(113, 159, 255)" />
                <ValueLineComponent label="FPS" value={engine.getFps()} fractionDigits={0} />
                <LineContainerComponent title="COUNT">
                    <TextLineComponent label="Total meshes" value={scene.meshes.length.toString()} />
                    <TextLineComponent label="Active meshes" value={scene.getActiveMeshes().length.toString()} />
                    <TextLineComponent label="Active indices" value={scene.getActiveIndices().toString()} />
                    <TextLineComponent label="Active faces" value={(scene.getActiveIndices() / 3).toString()} />
                    <TextLineComponent label="Active bones" value={scene.getActiveBones().toString()} />
                    <TextLineComponent label="Active particles" value={scene.getActiveParticles().toString()} />
                    <TextLineComponent label="Draw calls" value={sceneInstrumentation.drawCallsCounter.current.toString()} />
                    <TextLineComponent label="Texture collisions" value={sceneInstrumentation.textureCollisionsCounter.current.toString()} />
                    <TextLineComponent label="Total lights" value={scene.lights.length.toString()} />
                    <TextLineComponent label="Total vertices" value={scene.getTotalVertices().toString()} />
                    <TextLineComponent label="Total materials" value={scene.materials.length.toString()} />
                    <TextLineComponent label="Total textures" value={scene.textures.length.toString()} />
                </LineContainerComponent>
                <LineContainerComponent title="FRAME STEPS DURATION">
                    <ValueLineComponent label="Absolute FPS" value={1000.0 / this._sceneInstrumentation!.frameTimeCounter.current} fractionDigits={0} />
                    <ValueLineComponent label="Meshes selection" value={sceneInstrumentation.activeMeshesEvaluationTimeCounter.current} units="ms" />
                    <ValueLineComponent label="Render targets" value={sceneInstrumentation.renderTargetsRenderTimeCounter.current} units="ms" />
                    <ValueLineComponent label="Particles" value={sceneInstrumentation.particlesRenderTimeCounter.current} units="ms" />
                    <ValueLineComponent label="Sprites" value={sceneInstrumentation.spritesRenderTimeCounter.current} units="ms" />
                    <ValueLineComponent label="Animations" value={sceneInstrumentation.animationsTimeCounter.current} units="ms" />
                    <ValueLineComponent label="Physics" value={sceneInstrumentation.physicsTimeCounter.current} units="ms" />
                    <ValueLineComponent label="Render" value={sceneInstrumentation.renderTimeCounter.current} units="ms" />
                    <ValueLineComponent label="Frame total" value={sceneInstrumentation.frameTimeCounter.current} units="ms" />
                    <ValueLineComponent label="Inter-frame" value={sceneInstrumentation.interFrameTimeCounter.current} units="ms" />
                    <ValueLineComponent label="GPU Frame time" value={engineInstrumentation.gpuFrameTimeCounter.current * 0.000001} units="ms" />
                    <ValueLineComponent label="GPU Frame time (average)" value={engineInstrumentation.gpuFrameTimeCounter.average * 0.000001} units="ms" />
                </LineContainerComponent>
                <LineContainerComponent title="SYSTEM INFO">
                    <TextLineComponent label="Resolution" value={engine.getRenderWidth() + "x" + engine.getRenderHeight()} />
                    <TextLineComponent label="WebGL version" value={engine.webGLVersion.toString()} />
                    <BooleanLineComponent label="Std derivatives" value={caps.standardDerivatives} />
                    <BooleanLineComponent label="Compressed textures" value={caps.s3tc !== undefined} />
                    <BooleanLineComponent label="Hardware instances" value={caps.instancedArrays} />
                    <BooleanLineComponent label="Texture float" value={caps.textureFloat} />
                    <BooleanLineComponent label="Texture half-float" value={caps.textureHalfFloat} />
                    <BooleanLineComponent label="Render to texture float" value={caps.textureFloatRender} />
                    <BooleanLineComponent label="Render to texture half-float" value={caps.textureHalfFloatRender} />
                    <BooleanLineComponent label="32bits indices" value={caps.uintIndices} />
                    <BooleanLineComponent label="Fragment depth" value={caps.fragmentDepthSupported} />
                    <BooleanLineComponent label="High precision shaders" value={caps.highPrecisionShaderSupported} />
                    <BooleanLineComponent label="Draw buffers" value={caps.drawBuffersExtension} />
                    <BooleanLineComponent label="Vertex array object" value={caps.vertexArrayObject} />
                    <BooleanLineComponent label="Timer query" value={caps.timerQuery !== undefined} />
                    <BooleanLineComponent label="Stencil" value={engine.isStencilEnable} />
                    <ValueLineComponent label="Max textures units" value={caps.maxTexturesImageUnits} fractionDigits={0} />
                    <ValueLineComponent label="Max textures size" value={caps.maxTextureSize} fractionDigits={0} />
                    <ValueLineComponent label="Max anisotropy" value={caps.maxAnisotropy} fractionDigits={0} />
                    <TextLineComponent label="Driver" value={engine.getGlInfo().renderer} />
                </LineContainerComponent>
            </div>
        );
    }
}
