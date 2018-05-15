import { Helper } from "../../../commons/helper";
import { assert, expect, should } from "../viewerReference";
import { DefaultViewer, AbstractViewer, Version, viewerManager } from "../../../../src";

export let name = "scene manager";

describe(name, function () {

    it("should be initialized when a viewer is created", (done) => {
        let viewer = Helper.getNewViewerInstance();
        assert.isDefined(viewer.sceneManager, "scene manager should be defined");
        viewer.dispose();
        done();
    })

    it("should have objects initialized after init", (done) => {
        let viewer = Helper.getNewViewerInstance();
        viewer.onInitDoneObservable.add(() => {
            assert.isDefined(viewer.sceneManager.scene);
            assert.isDefined(viewer.sceneManager.labs);
            assert.isDefined(viewer.sceneManager.scene.animationPropertiesOverride);
            assert.isDefined(viewer.sceneManager.camera);
            assert.isDefined(viewer.sceneManager.mainColor);
            assert.isDefined(viewer.sceneManager.reflectionColor);
            // default is white
            ["r", "g", "b"].forEach(l => {
                assert.equal(viewer.sceneManager.mainColor[l], 1);
                assert.equal(viewer.sceneManager.reflectionColor[l], 1);
            });
            assert.isArray(viewer.sceneManager.models);
            assert.isEmpty(viewer.sceneManager.models);

            viewer.dispose();
            done();
        });
    });

    it("should set the default material to be PBR-Enabled per default", (done) => {
        let viewer = Helper.getNewViewerInstance();
        viewer.onInitDoneObservable.add(() => {
            assert.isTrue(viewer.sceneManager.scene.defaultMaterial instanceof BABYLON.PBRMaterial);

            viewer.dispose();
            done();
        });
    });

    it("should call observers correctly", (done) => {
        let viewer = Helper.getNewViewerInstance(undefined, { extends: "none" });
        let sceneInitCalled = false;
        viewer.runRenderLoop = false;
        viewer.sceneManager.onSceneInitObservable.clear();
        viewer.sceneManager.onSceneInitObservable.add(() => {
            assert.isDefined(viewer.sceneManager.scene);
            assert.isUndefined(viewer.sceneManager.camera);
            sceneInitCalled = true;
        });

        const s: string[] = [];

        let update = (str: string, data) => {
            if (s.indexOf(str) !== -1) {
                assert.fail(false, true, str + " observer already called");
                return false;
            } else {
                s.push(str);
                return true;
            }
        }

        viewer.sceneManager.onCameraConfiguredObservable.add(update.bind(null, "camera"));
        viewer.sceneManager.onLightsConfiguredObservable.add(update.bind(null, "light"));
        viewer.sceneManager.onEnvironmentConfiguredObservable.add(update.bind(null, "env"));
        viewer.sceneManager.onSceneConfiguredObservable.add(update.bind(null, "scene"));
        viewer.sceneManager.onSceneOptimizerConfiguredObservable.add(update.bind(null, "optimizer"));

        viewer.onInitDoneObservable.add(() => {
            viewer.updateConfiguration({
                scene: {},
                optimizer: false,
                skybox: false
            });
            assert.isTrue(sceneInitCalled);
            assert.lengthOf(s, 5);
            viewer.dispose();
            done();
        });
    });

    it("should delete and rebuild post process pipeline when enabled and disabled", (done) => {
        let viewer = Helper.getNewViewerInstance(undefined, {
            scene: {
                imageProcessingConfiguration: {
                    isEnabled: true
                }
            },
            lab: {
                defaultRenderingPipelines: true
            }
        });

        viewer.runRenderLoop = false;
        viewer.sceneManager.onSceneInitObservable.clear();
        viewer.sceneManager.onSceneInitObservable.add((scene) => {
            viewer.onSceneInitObservable.notifyObserversWithPromise(scene);
        })

        viewer.onInitDoneObservable.add(() => {
            assert.isDefined(viewer.sceneManager.defaultRenderingPipeline);
            assert.isTrue(viewer.sceneManager.defaultRenderingPipelineEnabled);

            viewer.sceneManager.defaultRenderingPipelineEnabled = false;

            assert.isNull(viewer.sceneManager.defaultRenderingPipeline);
            assert.isFalse(viewer.sceneManager.defaultRenderingPipelineEnabled);

            viewer.sceneManager.defaultRenderingPipelineEnabled = true;

            assert.isDefined(viewer.sceneManager.defaultRenderingPipeline);
            assert.isTrue(viewer.sceneManager.defaultRenderingPipelineEnabled);

            viewer.dispose();
            done();
        });
    });
});
