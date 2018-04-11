import { Helper } from "../../../commons/helper";
import { assert, expect } from "../viewerReference";
import { DefaultViewer, AbstractViewer, Version } from "../../../../src";

export let name = "viewer Tests";

/**
 * To prevent test-state-leakage ensure that there is a viewer.dispose() for every new DefaultViewer
 */

describe('Viewer', function () {
    it('should initialize a new viewer', (done) => {
        let viewer = Helper.getNewViewerInstance();
        viewer.onInitDoneObservable.add(() => {
            assert.isTrue(viewer != undefined, "Viewer can not be instantiated.");
            viewer.dispose();
            done();
        });
    });

    it('should not initialize if element is undefined', (done) => {
        try {
            // force typescript to "think" that the element exist with "!"
            let viewer = Helper.getNewViewerInstance(document.getElementById('doesntexist')!);
            expect(viewer).not.to.exist;
            if (viewer) viewer.dispose();
        } catch (e) {
            // exception was thrown, we are happy
            assert.isTrue(true);
        }
        done();
    });

    it('should be shown and hidden', (done) => {
        let viewer: DefaultViewer = <DefaultViewer>Helper.getNewViewerInstance();
        viewer.onInitDoneObservable.add(() => {
            // default visibility is not none
            expect(viewer.containerElement.style.display).not.to.equal('none');
            viewer.hide().then(() => {
                // element is hidden
                assert.equal(viewer.containerElement.style.display, 'none', "Viewer is still visible");
                viewer.show().then(() => {
                    //element is shown
                    assert.notEqual(viewer.containerElement.style.display, 'none', "Viewer is not visible");
                    viewer.dispose();
                    done();
                });
            });
        });
    });

    it('should execute registered functions on every rendered frame', (done) => {
        let viewer: DefaultViewer = <DefaultViewer>Helper.getNewViewerInstance();
        let renderCount = 0;
        let sceneRenderCount = 0;
        viewer.onSceneInitObservable.add(() => {
            // force-create a camera for the render loop to work
            viewer.updateConfiguration({ camera: {} });
            viewer.scene.registerAfterRender(() => {
                sceneRenderCount++;
            })
        });
        viewer.onFrameRenderedObservable.add(() => {
            renderCount++;
            assert.equal(renderCount, sceneRenderCount, "function was not executed with each frame");
            if (renderCount === 20) {
                viewer.dispose();
                done();
            }
        });
    });

    it('should disable and enable rendering', (done) => {

        let viewer: DefaultViewer = <DefaultViewer>Helper.getNewViewerInstance();
        let renderCount = 0;
        viewer.onFrameRenderedObservable.add(() => {
            renderCount++;
        });
        viewer.onInitDoneObservable.add(() => {
            // force-create a camera for the render loop to work
            viewer.updateConfiguration({ camera: {} });
            assert.equal(renderCount, 0);
            window.requestAnimationFrame(function () {
                assert.equal(renderCount, 1, "render loop should have been executed");
                viewer.runRenderLoop = false;
                window.requestAnimationFrame(function () {
                    assert.equal(renderCount, 1, "Render loop should not have been executed");
                    viewer.runRenderLoop = true;
                    window.requestAnimationFrame(function () {
                        assert.equal(renderCount, 2, "render loop should have been executed again");
                        viewer.dispose();
                        done();
                    });
                });
            });
        });
    });

    it('should have a version', (done) => {
        assert.exists(Version, "Viewer should have a version");
        assert.equal(Version, BABYLON.Engine.Version, "Viewer version should equal to Babylon's engine version");
        done();
    });

    it('should resize the viewer correctly', (done) => {

        let viewer: DefaultViewer = <DefaultViewer>Helper.getNewViewerInstance();
        let resizeCount = 0;
        //wait for the engine to init
        viewer.onEngineInitObservable.add((engine) => {
            engine.resize = () => {
                resizeCount++;
            }
        });

        viewer.onInitDoneObservable.add(() => {
            assert.equal(resizeCount, 0);
            viewer.forceResize();
            assert.equal(resizeCount, 1, "Engine should resize when Viewer.forceResize() is called.");

            viewer.canvas.style.width = '0px';
            viewer.canvas.style.height = '0px';
            viewer.forceResize();

            assert.equal(resizeCount, 1, "Engine should not resize when the canvas has width/height 0.");

            viewer.dispose();
            // any since it is protected
            viewer.forceResize();

            assert.equal(resizeCount, 1, "Engine should not resize when if Viewer has been disposed.");
            done();
        });
    })
});

//}



/*QUnit.test('Viewer HDR', function (assert) {
    let done = assert.async();

    //override _handleHardwareLimitations with no-op to ensure HDR isn't disabled
    (<any>AbstractViewer.prototype)._handleHardwareLimitations = () => { };

    let viewer: AbstractViewer;

    let frameCount = 0;
    viewer = new DefaultViewer(Helper.getCanvas(), {
        hdr: true,
        renderCallback: () => {
            frameCount++;
            if (frameCount === 30) {
                viewer.dispose();
                viewer = null;
                assert.ok(true, 'Successfully rendered 30 HDR frames and disposed');
                done();
            }
        }
    });
    viewer.onInitDoneObservable.add(() => {
        assert.ok(true, "not initialized");
    });
});

QUnit.test('Viewer LDR', function (assert) {
    let done = assert.async();

    let viewer: AbstractViewer;

    let frameCount = 0;
    viewer = new DefaultViewer(Helper.getCanvas(), {
        hdr: false,
        renderCallback: () => {
            frameCount++;
            if (frameCount === 30) {
                viewer.dispose();
                viewer = null;
                assert.ok(true, 'Successfully rendered 30 LDR frames and disposed');
                done();
            }
        }
    });
});

QUnit.test('Viewer disable render in background', function (assert) {
    let viewer = new DefaultViewer(Helper.getCanvas());

    QUnit.assert.ok(viewer.RenderInBackground, "Viewer renders in background default.");

    viewer.dispose();
    viewer = null;

    viewer = new DefaultViewer(Helper.getCanvas(), {
        disableRenderInBackground: true
    });

    QUnit.assert.ok(viewer.RenderInBackground === false, "Viewer does not render in background with disableRenderInBackground set to true.");

    viewer.dispose();
});

QUnit.test('Viewer disable camera control', function (assert) {
    let viewer = new DefaultViewer(Helper.getCanvas());

    QUnit.assert.ok(viewer.Scene.Camera.inputs.attachedElement, "Viewer should attach camera control by default.");

    viewer.dispose();
    viewer = null;

    viewer = new DefaultViewer(Helper.getCanvas(), {
        disableCameraControl: true
    });

    QUnit.assert.ok(!viewer.Scene.Camera.inputs.attachedElement, "Viewer should not attach camera control with disableCameraControl set to true.");

    viewer.dispose();
});

QUnit.test('Viewer disable ctrl for panning', function (assert) {
    let viewer = new DefaultViewer(Helper.getCanvas());

    QUnit.assert.ok(viewer.Scene.Camera._useCtrlForPanning, "Viewer should use CTRL for panning by default.");

    viewer.dispose();
    viewer = null;

    viewer = new DefaultViewer(Helper.getCanvas(), {
        disableCtrlForPanning: true
    });

    QUnit.assert.ok(viewer.Scene.Camera._useCtrlForPanning === false, "Viewer should not use CTRL for panning with disableCameraControl set to true.");
    viewer.dispose();
});

QUnit.test('Viewer get models', function (assert) {
    let viewer = new DefaultViewer(Helper.getCanvas());

    let mesh1 = Helper.createMockMesh(viewer);
    let mesh2 = Helper.createMockMesh(viewer);
    let model1 = new SPECTRE.Model(viewer, "Model 1");
    let model2 = new SPECTRE.Model(viewer, "Model 2");
    model1.setMesh(mesh1);
    model2.setMesh(mesh2);

    viewer.Scene.addModel(model1, false);
    viewer.Scene.addModel(model2, false);

    QUnit.assert.equal(viewer.Scene.Models.length, 2, "Viewer.getModels should return all models in the scene by default.");

    // Further tests fail unless this viewer is disposed
    // TODO fully isolate tests
    viewer.dispose();
});

QUnit.test('Viewer model add/remove', function (assert) {
    let modelsInScene = 0;

    let viewer = new DefaultViewer(Helper.getCanvas(), {
        onModelAdd: function () {
            modelsInScene += 1;
        },
        onModelRemove: function () {
            modelsInScene -= 1;
        }
    });

    let mesh1 = Helper.createMockMesh(viewer);
    let model = new SPECTRE.Model(viewer, "Model");
    model.setMesh(mesh1);

    viewer.Scene.addModel(model, false);

    QUnit.assert.equal(modelsInScene, 1, "onModelAdd should be called when a model is registered");

    viewer.Scene.removeModel(model, false);

    QUnit.assert.equal(modelsInScene, 0, "onModelRemove should be called when a model is unregistered");

    viewer.dispose();
});

QUnit.test('Viewer typical case with dispose', function (assert) {
    let done = assert.async();

    let viewer = new DefaultViewer(Helper.getCanvas(), {
        environmentAssetsRootURL: 'base/assets/environment/',
        environmentMap: 'legacy/joa-256.env',
        unifiedConfiguration: 'base/assets/UnifiedConfiguration.json'
    });

    //load different models sequentially to simulate typical use
    viewer.loadGLTF('base/assets/Modok/Modok.FBX.gltf', {
        completeCallback: (model) => {
            model.EngineModel.translate(new BABYLON.Vector3(1, 0, 0), 0.1);

            setTimeout(() => {
                viewer.Scene.removeModel(model, true, () => {
                    viewer.loadGLTF('base/assets/Modok/Modok.FBX.gltf', {
                        readyCallback: () => {
                            //starting loading a few assets and ensure there's no failure when disposing
                            viewer.loadEnvironment('legacy/joa-256.env', () => {
                                assert.ok(false, 'Viewer should have been disposed! Load should not complete.');
                            });
                            viewer.loadGLTF('base/assets/Modok/Modok.FBX.gltf', {
                                readyCallback: () => {
                                    assert.ok(false, 'Viewer should have been disposed! Load should not complete.');
                                },
                            });

                            try {
                                console.log('Disposing viewer');
                                viewer.dispose();
                                viewer = null;
                                console.log('Viewer disposed');
                            } catch (e) {
                                assert.ok(false, `Viewer failed to dispose without exception ${e}`);
                            }

                            setTimeout(() => {
                                //wait some time to verify there were no exceptions no complete callbacks fire unexpectedly
                                assert.strictEqual(viewer, null, 'Viewer should be set to null');
                                done();
                            }, 2000);
                        }
                    });
                });
            }, 3000);
        }
    });
});

QUnit.test('Test getEnvironmentAssetUrl relative no root', function (assert) {
    var viewer = Helper.createViewer();
    assert.ok(viewer.getEnvironmentAssetUrl("foo.png") === "foo.png", "Relative url should be return unmodified without configuration.");
});

QUnit.test('Test getEnvironmentAssetUrl absolute no root', function (assert) {
    var viewer = Helper.createViewer();
    assert.ok(viewer.getEnvironmentAssetUrl("http://foo.png") === "http://foo.png", "Absolute url should not be undefined without configuration.");
});

QUnit.test('Test getEnvironmentAssetUrl relative root', function (assert) {
    var viewer = Helper.createViewer({ environmentAssetsRootURL: "https://foo/" });
    assert.ok(viewer.getEnvironmentAssetUrl("foo.png") === "https://foo/foo.png", "Relative url should not be be undefined with configuration.");
});

QUnit.test('Test getEnvironmentAssetUrl absolute root', function (assert) {
    var viewer = Helper.createViewer({ environmentAssetsRootURL: "https://foo/" });
    assert.ok(viewer.getEnvironmentAssetUrl("http://foo.png") === "http://foo.png", "Absolute url should not be undefined with configuration.");
});

QUnit.test('unlockBabylonFeatures', function () {
    let viewer = Helper.createViewer();

    QUnit.assert.ok(viewer.Scene.EngineScene.shadowsEnabled, "shadowsEnabled");
    QUnit.assert.ok(!viewer.Scene.EngineScene.particlesEnabled, "particlesEnabled");
    QUnit.assert.ok(!viewer.Scene.EngineScene.collisionsEnabled, "collisionsEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.lightsEnabled, "lightsEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.texturesEnabled, "texturesEnabled");
    QUnit.assert.ok(!viewer.Scene.EngineScene.lensFlaresEnabled, "lensFlaresEnabled");
    QUnit.assert.ok(!viewer.Scene.EngineScene.proceduralTexturesEnabled, "proceduralTexturesEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.renderTargetsEnabled, "renderTargetsEnabled");
    QUnit.assert.ok(!viewer.Scene.EngineScene.spritesEnabled, "spritesEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.skeletonsEnabled, "skeletonsEnabled");
    QUnit.assert.ok(!viewer.Scene.EngineScene.audioEnabled, "audioEnabled");

    viewer.unlockBabylonFeatures();

    QUnit.assert.ok(viewer.Scene.EngineScene.shadowsEnabled, "shadowsEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.particlesEnabled, "particlesEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.postProcessesEnabled, "postProcessesEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.collisionsEnabled, "collisionsEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.lightsEnabled, "lightsEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.texturesEnabled, "texturesEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.lensFlaresEnabled, "lensFlaresEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.proceduralTexturesEnabled, "proceduralTexturesEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.renderTargetsEnabled, "renderTargetsEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.spritesEnabled, "spritesEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.skeletonsEnabled, "skeletonsEnabled");
    QUnit.assert.ok(viewer.Scene.EngineScene.audioEnabled, "audioEnabled");
});

QUnit.test('Take Screenshot', function (assert) {
    let viewer = Helper.createViewer();
    let done = assert.async();

    Helper.MockScreenCapture(viewer, Helper.mockScreenCaptureData());

    viewer.takeScreenshot(function (data) {
        QUnit.assert.ok(data === Helper.mockScreenCaptureData(), "Screenshot failed.");
        done();
    });
});
*/
