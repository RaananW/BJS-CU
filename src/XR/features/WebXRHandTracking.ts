import { WebXRAbstractFeature } from "./WebXRAbstractFeature";
import { WebXRSessionManager } from "../webXRSessionManager";
import { WebXRFeatureName } from "../webXRFeaturesManager";
import { AbstractMesh } from "../../Meshes/abstractMesh";
import { Mesh } from "../../Meshes/mesh";
import { WebXRInput } from "../webXRInput";
import { WebXRInputSource } from "../webXRInputSource";
import { Matrix, Quaternion } from "../../Maths/math.vector";
import { Nullable } from "../../types";
import { PhysicsImpostor } from "../../Physics/physicsImpostor";
import { WebXRFeaturesManager } from "../webXRFeaturesManager";
import { IDisposable, Scene } from "../../scene";
import { Observable } from "../../Misc/observable";
import { InstancedMesh } from "../../Meshes/instancedMesh";
import { SceneLoader } from "../../Loading/sceneLoader";
import { Color3 } from "../../Maths/math.color";
import { NodeMaterial } from "../../Materials/Node/nodeMaterial";
import { InputBlock } from "../../Materials/Node/Blocks/Input/inputBlock";
import { Material } from "../../Materials/material";
import { Engine } from "../../Engines/engine";
import { Tags } from "../../Misc/tags";
import { IcoSphereBuilder } from "../../Meshes/Builders/icoSphereBuilder";
import { TransformNode } from "../../Meshes/transformNode";
import { Axis } from "../../Maths/math.axis";

declare const XRHand: XRHand;

/**
 * Configuration interface for the hand tracking feature
 */
export interface IWebXRHandTrackingOptions {
    /**
     * The xrInput that will be used as source for new hands
     */
    xrInput: WebXRInput;

    /**
     * Configuration object for the joint meshes.
     */
    jointMeshes?: {
        /**
         * Should the meshes created be invisible (defaults to false).
         */
        invisible?: boolean;
        /**
         * A source mesh to be used to create instances. Defaults to an icosphere with two subdivisions and smooth lighting.
         * This mesh will be the source for all other (25) meshes.
         * It should have the general size of a single unit, as the instances will be scaled according to the provided radius.
         */
        sourceMesh?: Mesh;
        /**
         * This function will be called after a mesh was created for a specific joint.
         * Using this function you can either manipulate the instance or return a new mesh.
         * When returning a new mesh the instance created before will be disposed.
         */
        onHandJointMeshGenerated?: (meshInstance: InstancedMesh, jointId: number, jointName: string) => AbstractMesh | undefined;
        /**
         * Should the source mesh stay visible (defaults to false).
         */
        keepOriginalVisible?: boolean;
        /**
         * Should each instance have its own physics impostor
         */
        enablePhysics?: boolean;
        /**
         * If enabled, override default physics properties
         */
        physicsProps?: { friction?: number; restitution?: number; impostorType?: number };
        /**
         * The utilityLayer scene that contains the 3D UI elements. Passing this in turns on near interactions with the index finger tip
         */
        sceneForNearInteraction?: Scene;
        /**
         * Scale factor for all joint meshes (defaults to 1)
         */
        scaleFactor?: number;
    };

    /**
     * Configuration object for the hand meshes.
     */
    handMeshes?: {
        /**
         * Should the default hand mesh be disabled. In this case, the spheres will be visible (unless set invisible).
         */
        disableDefaultMeshes?: boolean;
        /**
         * Rigged hand meshes that will be tracked to the user's hands. This will override the default hand mesh.
         */
        customMeshes?: {
            right: AbstractMesh;
            left: AbstractMesh;
        }
        /**
         * Are the meshes prepared for a left-handed system. Default hand meshes are right-handed.
         */
        meshesUseLeftHandedCoordinates?: boolean;
        /**
         * If a hand mesh was provided, this array will define what axis will update which node. This will override the default hand mesh
         */
        customRigMappings?: {
            right: XRHandMeshRigMapping;
            left: XRHandMeshRigMapping;
        }
    };
}

/**
 * Parts of the hands divided to writs and finger names
 */
export const enum HandPart {
    /**
     * HandPart - Wrist
     */
    WRIST = "wrist",
    /**
     * HandPart - The thumb
     */
    THUMB = "thumb",
    /**
     * HandPart - Index finger
     */
    INDEX = "index",
    /**
     * HandPart - Middle finger
     */
    MIDDLE = "middle",
    /**
     * HandPart - Ring finger
     */
    RING = "ring",
    /**
     * HandPart - Little finger
     */
    LITTLE = "little",
}

/**
 * Joints of the hand as defined by the WebXR specification.
 * https://immersive-web.github.io/webxr-hand-input/#skeleton-joints-section
 */
export const enum XRHandJoint {
    /** Wrist */
    WRIST = "wrist",

    /** Thumb near wrist */
    THUMB_METACARPAL = "thumb-metacarpal",
    /** Thumb first knuckle */
    THUMB_PHALANX_PROXIMAL = "thumb-phalanx-proximal",
    /** Thumb second knuckle */
    THUMB_PHALANX_DISTAL = "thumb-phalanx-distal",
    /** Thumb tip */
    THUMB_TIP = "thumb-tip",

    /** Index finger near wrist */
    INDEX_FINGER_METACARPAL = "index-finger-metacarpal",
    /** Index finger first knuckle */
    INDEX_FINGER_PHALANX_PROXIMAL = "index-finger-phalanx-proximal",
    /** Index finger second knuckle */
    INDEX_FINGER_PHALANX_INTERMEDIATE = "index-finger-phalanx-intermediate",
    /** Index finger third knuckle */
    INDEX_FINGER_PHALANX_DISTAL = "index-finger-phalanx-distal",
    /** Index finger tip */
    INDEX_FINGER_TIP = "index-finger-tip",

    /** Middle finger near wrist */
    MIDDLE_FINGER_METACARPAL = "middle-finger-metacarpal",
    /** Middle finger first knuckle */
    MIDDLE_FINGER_PHALANX_PROXIMAL = "middle-finger-phalanx-proximal",
    /** Middle finger second knuckle */
    MIDDLE_FINGER_PHALANX_INTERMEDIATE = "middle-finger-phalanx-intermediate",
    /** Middle finger third knuckle */
    MIDDLE_FINGER_PHALANX_DISTAL = "middle-finger-phalanx-distal",
    /** Middle finger tip */
    MIDDLE_FINGER_TIP = "middle-finger-tip",

    /** Ring finger near wrist */
    RING_FINGER_METACARPAL = "ring-finger-metacarpal",
    /** Ring finger first knuckle */
    RING_FINGER_PHALANX_PROXIMAL = "ring-finger-phalanx-proximal",
    /** Ring finger second knuckle */
    RING_FINGER_PHALANX_INTERMEDIATE = "ring-finger-phalanx-intermediate",
    /** Ring finger third knuckle */
    RING_FINGER_PHALANX_DISTAL = "ring-finger-phalanx-distal",
    /** Ring finger tip */
    RING_FINGER_TIP = "ring-finger-tip",

    /** Pinky finger near wrist */
    PINKY_FINGER_METACARPAL = "pinky-finger-metacarpal",
    /** Pinky finger first knuckle */
    PINKY_FINGER_PHALANX_PROXIMAL = "pinky-finger-phalanx-proximal",
    /** Pinky finger second knuckle */
    PINKY_FINGER_PHALANX_INTERMEDIATE = "pinky-finger-phalanx-intermediate",
    /** Pinky finger third knuckle */
    PINKY_FINGER_PHALANX_DISTAL = "pinky-finger-phalanx-distal",
    /** Pinky finger tip */
    PINKY_FINGER_TIP = "pinky-finger-tip",
}

/** A type encapsulating a dictionary mapping WebXR joints to bone names in a rigged hand mesh.  */
export type XRHandMeshRigMapping = { [webXRJointName in XRHandJoint]: string };

const handJointReferenceArray: XRHandJoint[] = [
    XRHandJoint.WRIST,
    XRHandJoint.THUMB_METACARPAL,
    XRHandJoint.THUMB_PHALANX_PROXIMAL,
    XRHandJoint.THUMB_PHALANX_DISTAL,
    XRHandJoint.THUMB_TIP,
    XRHandJoint.INDEX_FINGER_METACARPAL,
    XRHandJoint.INDEX_FINGER_PHALANX_PROXIMAL,
    XRHandJoint.INDEX_FINGER_PHALANX_INTERMEDIATE,
    XRHandJoint.INDEX_FINGER_PHALANX_DISTAL,
    XRHandJoint.INDEX_FINGER_TIP,
    XRHandJoint.MIDDLE_FINGER_METACARPAL,
    XRHandJoint.MIDDLE_FINGER_PHALANX_PROXIMAL,
    XRHandJoint.MIDDLE_FINGER_PHALANX_INTERMEDIATE,
    XRHandJoint.MIDDLE_FINGER_PHALANX_DISTAL,
    XRHandJoint.MIDDLE_FINGER_TIP,
    XRHandJoint.RING_FINGER_METACARPAL,
    XRHandJoint.RING_FINGER_PHALANX_PROXIMAL,
    XRHandJoint.RING_FINGER_PHALANX_INTERMEDIATE,
    XRHandJoint.RING_FINGER_PHALANX_DISTAL,
    XRHandJoint.RING_FINGER_TIP,
    XRHandJoint.PINKY_FINGER_METACARPAL,
    XRHandJoint.PINKY_FINGER_PHALANX_PROXIMAL,
    XRHandJoint.PINKY_FINGER_PHALANX_INTERMEDIATE,
    XRHandJoint.PINKY_FINGER_PHALANX_DISTAL,
    XRHandJoint.PINKY_FINGER_TIP,
];

const handPartsDefinition: { [key in HandPart]: XRHandJoint[] } = {
    [HandPart.WRIST]: [XRHandJoint.WRIST],
    [HandPart.THUMB]: [XRHandJoint.THUMB_METACARPAL, XRHandJoint.THUMB_PHALANX_PROXIMAL, XRHandJoint.THUMB_PHALANX_DISTAL, XRHandJoint.THUMB_TIP],
    [HandPart.INDEX]: [
        XRHandJoint.INDEX_FINGER_METACARPAL,
        XRHandJoint.INDEX_FINGER_PHALANX_PROXIMAL,
        XRHandJoint.INDEX_FINGER_PHALANX_INTERMEDIATE,
        XRHandJoint.INDEX_FINGER_PHALANX_DISTAL,
        XRHandJoint.INDEX_FINGER_TIP,
    ],
    [HandPart.MIDDLE]: [
        XRHandJoint.MIDDLE_FINGER_METACARPAL,
        XRHandJoint.MIDDLE_FINGER_PHALANX_PROXIMAL,
        XRHandJoint.MIDDLE_FINGER_PHALANX_INTERMEDIATE,
        XRHandJoint.MIDDLE_FINGER_PHALANX_DISTAL,
        XRHandJoint.MIDDLE_FINGER_TIP,
    ],
    [HandPart.RING]: [
        XRHandJoint.RING_FINGER_METACARPAL,
        XRHandJoint.RING_FINGER_PHALANX_PROXIMAL,
        XRHandJoint.RING_FINGER_PHALANX_INTERMEDIATE,
        XRHandJoint.RING_FINGER_PHALANX_DISTAL,
        XRHandJoint.RING_FINGER_TIP,
    ],
    [HandPart.LITTLE]: [
        XRHandJoint.PINKY_FINGER_METACARPAL,
        XRHandJoint.PINKY_FINGER_PHALANX_PROXIMAL,
        XRHandJoint.PINKY_FINGER_PHALANX_INTERMEDIATE,
        XRHandJoint.PINKY_FINGER_PHALANX_DISTAL,
        XRHandJoint.PINKY_FINGER_TIP,
    ],
};

/**
 * Representing a single hand (with its corresponding native XRHand object)
 */
export class WebXRHand implements IDisposable {
    private _scene: Scene;

    /**
     * Transform nodes that will directly receive the transforms from the WebXR matrix data.
     */
    private _jointTransforms = new Array<TransformNode>(handJointReferenceArray.length);

    /**
     * The float array that will directly receive the transform matrix data from WebXR.
     */
    private _jointTransformMatrices = new Float32Array(handJointReferenceArray.length * 16);

    private _tempJointMatrix = new Matrix();

    /**
     * The float array that will directly receive the joint radii from WebXR.
     */
    private _jointRadii = new Float32Array(handJointReferenceArray.length);

    /**
     * Get the hand mesh.
     */
    public get handMesh(): Nullable<AbstractMesh> {
        return this._handMesh;
    }

    /**
     * Get meshes of part of the hand.
     * @param part The part of hand to get.
     * @returns An array of meshes that correlate to the hand part requested.
     */
    public getHandPartMeshes(part: HandPart): AbstractMesh[] {
        return handPartsDefinition[part].map((name) => this._jointMeshes[handJointReferenceArray.indexOf(name)]!);
    }

    /**
     * Retrieves a mesh linked to a named joint in the hand. 
     * @param jointName The name of the joint.
     * @returns An AbstractMesh whose position corresponds with the joint position.
     */
    public getJointMesh(jointName: XRHandJoint): AbstractMesh {
        return this._jointMeshes[handJointReferenceArray.indexOf(jointName)!];
    }

    /**
     * Construct a new hand object
     * @param xrController The controller to which the hand correlates.
     * @param _jointMeshes The meshes to be used to track the hand joints.
     * @param _handMesh An optional hand mesh.
     * @param rigMapping An optional rig mapping for the hand mesh.
     *                   If not provided (but a hand mesh is provided),
     *                   it will be assumed that the hand mesh's bones are named
     *                   directly after the WebXR bone names.
     * @param _nearInteractionMesh As optional mesh used for near interaction collision checking
     * @param _leftHandedMeshes Are the hand meshes left-handed-system meshes
     * @param _jointsInvisible Are the tracked joint meshes visible
     * @param _jointScaleFactor Scale factor for all joint meshes
     */
    constructor(
        /** The controller to which the hand correlates. */
        public readonly xrController: WebXRInputSource,
        private readonly _jointMeshes: AbstractMesh[],
        private _handMesh: Nullable<AbstractMesh>,
        /** An optional rig mapping for the hand mesh. If not provided (but a hand mesh is provided),
          * it will be assumed that the hand mesh's bones are named directly after the WebXR bone names. */
        readonly rigMapping: Nullable<XRHandMeshRigMapping>,
        private readonly _nearInteractionMesh?: Nullable<AbstractMesh>,
        private readonly _leftHandedMeshes: boolean = false,
        private readonly _jointsInvisible: boolean = false,
        private readonly _jointScaleFactor: number = 1
    ) {
        this._scene = _jointMeshes[0].getScene();

        // Initialize the joint transform quaternions and link the transforms to the bones.
        for (let jointIdx = 0; jointIdx < this._jointTransforms.length; jointIdx++) {
            const jointTransform = this._jointTransforms[jointIdx] = new TransformNode(handJointReferenceArray[jointIdx], this._scene);
            jointTransform.rotationQuaternion = new Quaternion();

            // Set the rotation quaternion so we can use it later for tracking.
            _jointMeshes[jointIdx].rotationQuaternion = new Quaternion();
        }

        if (_handMesh) {
            // Note that this logic needs to happen after we initialize the joint tracking transform nodes.
            this.setHandMesh(_handMesh, rigMapping);

            // Avoid any strange frustum culling. We will manually control visibility via attach and detach.
            _handMesh.alwaysSelectAsActiveMesh = true;
            _handMesh.getChildMeshes().forEach((mesh) => (mesh.alwaysSelectAsActiveMesh = true));
        }

        // hide the motion controller, if available/loaded
        if (this.xrController.motionController) {
            if (this.xrController.motionController.rootMesh) {
                this.xrController.motionController.rootMesh.setEnabled(false);
            } else {
                this.xrController.motionController.onModelLoadedObservable.add((controller) => {
                    if (controller.rootMesh) {
                        controller.rootMesh.setEnabled(false);
                    }
                });
            }
        }

        this.xrController.onMotionControllerInitObservable.add((motionController) => {
            motionController.onModelLoadedObservable.add((controller) => {
                if (controller.rootMesh) {
                    controller.rootMesh.setEnabled(false);
                }
            });
            if (motionController.rootMesh) {
                motionController.rootMesh.setEnabled(false);
            }
        });
    }

    /**
     * Sets the current hand mesh to render for the WebXRHand.
     * @param handMesh The rigged hand mesh that will be tracked to the user's hand.
     * @param rigMapping The mapping from XRHandJoint to bone names to use with the mesh.
     */
    public setHandMesh(handMesh: AbstractMesh, rigMapping: Nullable<XRHandMeshRigMapping>) {
        this._handMesh = handMesh;

        // Link the bones in the hand mesh to the transform nodes that will be bound to the WebXR tracked joints.
        if (this._handMesh.skeleton) {
            const handMeshSkeleton = this._handMesh.skeleton;
            handJointReferenceArray.forEach((jointName, jointIdx) => {
                const jointBoneIdx = handMeshSkeleton.getBoneIndexByName(rigMapping ? rigMapping[jointName] : jointName);
                if (jointBoneIdx !== -1) {
                    handMeshSkeleton.bones[jointBoneIdx].linkTransformNode(this._jointTransforms[jointIdx]);
                }
            });
        }
    }

    /**
     * Update this hand from the latest xr frame.
     * @param xrFrame The latest frame received from WebXR.
     * @param referenceSpace The current viewer reference space.
     */
    public updateFromXRFrame(xrFrame: XRFrame, referenceSpace: XRReferenceSpace) {
        const hand = this.xrController.inputSource.hand;
        if (!hand) {
            return;
        }

        const anyHand: any = hand;
        const jointSpaces: XRJointSpace[] = handJointReferenceArray.map((jointName) => anyHand[jointName]);
        let trackingSuccessful = true;

        if (xrFrame.fillPoses && xrFrame.fillJointRadii) {
            trackingSuccessful = xrFrame.fillPoses(jointSpaces, referenceSpace, this._jointTransformMatrices) &&
                xrFrame.fillJointRadii(jointSpaces, this._jointRadii);
        } else if (xrFrame.getJointPose) {
            // Warning: This codepath is slow by comparison, only here for compat.
            for (let jointIdx = 0; jointIdx < jointSpaces.length; jointIdx++) {
                const jointPose = xrFrame.getJointPose(jointSpaces[jointIdx], referenceSpace);
                if (jointPose) {
                    this._jointTransformMatrices.set(jointPose.transform.matrix, jointIdx * 16);
                    this._jointRadii[jointIdx] = jointPose.radius || 0.008;
                } else {
                    trackingSuccessful = false;
                    break;
                }
            }
        } else {
            throw new Error("XRFrame does not support joint tracking!");
        }

        if (!trackingSuccessful) {
            return;
        }

        handJointReferenceArray.forEach((jointName, jointIdx) => {
            const jointTransform = this._jointTransforms[jointIdx];
            Matrix.FromArrayToRef(this._jointTransformMatrices, jointIdx * 16, this._tempJointMatrix);
            this._tempJointMatrix.decompose(undefined, jointTransform.rotationQuaternion!, jointTransform.position);

            // The radius we need to make the joint in order for it to roughly cover the joints of the user's real hand.
            const scaledJointRadius = this._jointRadii[jointIdx] * this._jointScaleFactor;

            const jointMesh = this._jointMeshes[jointIdx];
            jointMesh.isVisible = !this._handMesh && !this._jointsInvisible;
            jointMesh.position.copyFrom(jointTransform.position);
            jointMesh.rotationQuaternion!.copyFrom(jointTransform.rotationQuaternion!);
            jointMesh.scaling.copyFromFloats(scaledJointRadius, scaledJointRadius, scaledJointRadius);

            // The WebXR data comes as right-handed, so we might need to do some conversions.
            if (!this._scene.useRightHandedSystem) {
                jointMesh.position.z *= -1;
                jointMesh.rotationQuaternion!.z *= -1;
                jointMesh.rotationQuaternion!.w *= -1;

                if (this._leftHandedMeshes && this._handMesh) {
                    jointTransform.position.z *= -1;
                    jointTransform.rotationQuaternion!.z *= -1;
                    jointTransform.rotationQuaternion!.w *= -1;
                }
            }

            // Update the invisible fingertip collidable
            if (this._nearInteractionMesh && jointName == "index-finger-tip") {
                this._nearInteractionMesh.position.copyFrom(jointTransform.position);
                this._nearInteractionMesh.scaling.copyFromFloats(scaledJointRadius, scaledJointRadius, scaledJointRadius);
                if (!this._scene.useRightHandedSystem) {
                    this._nearInteractionMesh.position.z *= -1;
                }
            }
        });

        if (this._handMesh) {
            this._handMesh.isVisible = true;
        }
    }

    /**
     * Dispose this Hand object
     */
    public dispose() {
        if (this._nearInteractionMesh) {
            this._nearInteractionMesh.dispose();
        }
        if (this._handMesh) {
            this._handMesh.isVisible = false;
        }
    }
}

/**
 * WebXR Hand Joint tracking feature, available for selected browsers and devices
 */
export class WebXRHandTracking extends WebXRAbstractFeature {
    /**
     * The module's name
     */
    public static readonly Name = WebXRFeatureName.HAND_TRACKING;
    /**
     * The (Babylon) version of this module.
     * This is an integer representing the implementation version.
     * This number does not correspond to the WebXR specs version
     */
    public static readonly Version = 1;

    /** The base URL for the default hand model. */
    public static DEFAULT_HAND_MODEL_BASE_URL = "https://assets.babylonjs.com/meshes/HandMeshes/";
    /** The filename to use for the default right hand model. */
    public static DEFAULT_HAND_MODEL_RIGHT_FILENAME = "r_hand_rhs.glb";
    /** The filename to use for the default left hand model. */
    public static DEFAULT_HAND_MODEL_LEFT_FILENAME = "l_hand_rhs.glb";
    /** The URL pointing to the default hand model NodeMaterial shader. */
    public static DEFAULT_HAND_MODEL_SHADER_URL = "https://assets.babylonjs.com/meshes/HandMeshes/handsShader.json";

    // We want to use lightweight models, diameter will initially be 1 but scaled to the values returned from WebXR.
    private static readonly _ICOSPHERE_PARAMS = { radius: 0.5, flat: false, subdivisions: 2 };

    private static _generateTrackedJointMeshes(featureOptions: IWebXRHandTrackingOptions): { left: AbstractMesh[], right: AbstractMesh[] } {
        const meshes: { [handedness: string]: AbstractMesh[] } = {};
        ["left", "right"].map((handedness) => {
            const trackedMeshes = [];
            const originalMesh = featureOptions.jointMeshes?.sourceMesh || IcoSphereBuilder.CreateIcoSphere("jointParent", WebXRHandTracking._ICOSPHERE_PARAMS);
            originalMesh.isVisible = !!featureOptions.jointMeshes?.keepOriginalVisible;
            for (let i = 0; i < handJointReferenceArray.length; ++i) {
                let newInstance: AbstractMesh = originalMesh.createInstance(`${handedness}-handJoint-${i}`);
                if (featureOptions.jointMeshes?.onHandJointMeshGenerated) {
                    const returnedMesh = featureOptions.jointMeshes.onHandJointMeshGenerated(newInstance as InstancedMesh, i, handJointReferenceArray[i]);
                    if (returnedMesh) {
                        if (returnedMesh !== newInstance) {
                            newInstance.dispose();
                            newInstance = returnedMesh;
                        }
                    }
                }
                newInstance.isPickable = false;
                if (featureOptions.jointMeshes?.enablePhysics) {
                    const props = featureOptions.jointMeshes?.physicsProps || {};
                    const type = props.impostorType !== undefined ? props.impostorType : PhysicsImpostor.SphereImpostor;
                    newInstance.physicsImpostor = new PhysicsImpostor(newInstance, type, { mass: 0, ...props });
                }
                newInstance.rotationQuaternion = new Quaternion();
                newInstance.isVisible = false;
                trackedMeshes.push(newInstance);
            }

            meshes[handedness] = trackedMeshes;
        });
        return { left: meshes.left, right: meshes.right };
    }

    private static _generateDefaultHandMeshesAsync(scene: Scene): Promise<{ left: AbstractMesh, right: AbstractMesh }> {
        return new Promise(async (resolve) => {
            const riggedMeshes: { [handedness: string]: AbstractMesh } = {};

            const rightHandGLB = await SceneLoader.ImportMeshAsync("", WebXRHandTracking.DEFAULT_HAND_MODEL_BASE_URL, WebXRHandTracking.DEFAULT_HAND_MODEL_RIGHT_FILENAME, scene);
            const leftHandGLB = await SceneLoader.ImportMeshAsync("", WebXRHandTracking.DEFAULT_HAND_MODEL_BASE_URL, WebXRHandTracking.DEFAULT_HAND_MODEL_LEFT_FILENAME, scene);

            const handShader = new NodeMaterial("handShader", scene, { emitComments: false });
            await handShader.loadAsync(WebXRHandTracking.DEFAULT_HAND_MODEL_SHADER_URL);

            // depth prepass and alpha mode
            handShader.needDepthPrePass = true;
            handShader.transparencyMode = Material.MATERIAL_ALPHABLEND;
            handShader.alphaMode = Engine.ALPHA_COMBINE;

            // build node materials
            handShader.build(false);

            // shader
            const handColors = {
                base: Color3.FromInts(116, 63, 203),
                fresnel: Color3.FromInts(149, 102, 229),
                fingerColor: Color3.FromInts(177, 130, 255),
                tipFresnel: Color3.FromInts(220, 200, 255),
            };

            const handNodes = {
                base: handShader.getBlockByName("baseColor") as InputBlock,
                fresnel: handShader.getBlockByName("fresnelColor") as InputBlock,
                fingerColor: handShader.getBlockByName("fingerColor") as InputBlock,
                tipFresnel: handShader.getBlockByName("tipFresnelColor") as InputBlock,
            };

            handNodes.base.value = handColors.base;
            handNodes.fresnel.value = handColors.fresnel;
            handNodes.fingerColor.value = handColors.fingerColor;
            handNodes.tipFresnel.value = handColors.tipFresnel;

            ["left", "right"].forEach((handedness) => {
                const handGLB = handedness == "left" ? leftHandGLB : rightHandGLB;

                const handMesh = handGLB.meshes[1];
                handMesh._internalAbstractMeshDataInfo._computeBonesUsingShaders = true;
                handMesh.material = handShader.clone(`${handedness}HandShaderClone`, true);
                handMesh.isVisible = false;

                riggedMeshes[handedness] = handMesh;

                // single change for left handed systems
                if (!scene.useRightHandedSystem) {
                    handGLB.transformNodes[0].rotate(Axis.Y, Math.PI);
                }
            });

            handShader.dispose();
            resolve({ left: riggedMeshes.left, right: riggedMeshes.right });
        });
    }

    /**
     * Generates a mapping from XRHandJoint to bone name for the default hand mesh.
     * @param handedness The handedness being mapped for.
     */
    private static _generateDefaultHandMeshRigMapping(handedness: XRHandedness): XRHandMeshRigMapping {
        const H = handedness == "right" ? "R" : "L";
        return {
            [XRHandJoint.WRIST]: `wrist_${H}`,
            [XRHandJoint.THUMB_METACARPAL]: `thumb_metacarpal_${H}`,
            [XRHandJoint.THUMB_PHALANX_PROXIMAL]: `thumb_proxPhalanx_${H}`,
            [XRHandJoint.THUMB_PHALANX_DISTAL]: `thumb_distPhalanx_${H}`,
            [XRHandJoint.THUMB_TIP]: `thumb_tip_${H}`,
            [XRHandJoint.INDEX_FINGER_METACARPAL]: `index_metacarpal_${H}`,
            [XRHandJoint.INDEX_FINGER_PHALANX_PROXIMAL]: `index_proxPhalanx_${H}`,
            [XRHandJoint.INDEX_FINGER_PHALANX_INTERMEDIATE]: `index_intPhalanx_${H}`,
            [XRHandJoint.INDEX_FINGER_PHALANX_DISTAL]: `index_distPhalanx_${H}`,
            [XRHandJoint.INDEX_FINGER_TIP]: `index_tip_${H}`,
            [XRHandJoint.MIDDLE_FINGER_METACARPAL]: `middle_metacarpal_${H}`,
            [XRHandJoint.MIDDLE_FINGER_PHALANX_PROXIMAL]: `middle_proxPhalanx_${H}`,
            [XRHandJoint.MIDDLE_FINGER_PHALANX_INTERMEDIATE]: `middle_intPhalanx_${H}`,
            [XRHandJoint.MIDDLE_FINGER_PHALANX_DISTAL]: `middle_distPhalanx_${H}`,
            [XRHandJoint.MIDDLE_FINGER_TIP]: `middle_tip_${H}`,
            [XRHandJoint.RING_FINGER_METACARPAL]: `ring_metacarpal_${H}`,
            [XRHandJoint.RING_FINGER_PHALANX_PROXIMAL]: `ring_proxPhalanx_${H}`,
            [XRHandJoint.RING_FINGER_PHALANX_INTERMEDIATE]: `ring_intPhalanx_${H}`,
            [XRHandJoint.RING_FINGER_PHALANX_DISTAL]: `ring_distPhalanx_${H}`,
            [XRHandJoint.RING_FINGER_TIP]: `ring_tip_${H}`,
            [XRHandJoint.PINKY_FINGER_METACARPAL]: `little_metacarpal_${H}`,
            [XRHandJoint.PINKY_FINGER_PHALANX_PROXIMAL]: `little_proxPhalanx_${H}`,
            [XRHandJoint.PINKY_FINGER_PHALANX_INTERMEDIATE]: `little_intPhalanx_${H}`,
            [XRHandJoint.PINKY_FINGER_PHALANX_DISTAL]: `little_distPhalanx_${H}`,
            [XRHandJoint.PINKY_FINGER_TIP]: `little_tip_${H}`,
        };
    }

    private _attachedHands: {
        [uniqueId: string]: WebXRHand
    } = {};

    private _trackingHands: {
        left: Nullable<WebXRHand>,
        right: Nullable<WebXRHand>
    } = { left: null, right: null };

    private _handResources: {
        jointMeshes: Nullable<{ left: AbstractMesh[], right: AbstractMesh[] }>,
        handMeshes: Nullable<{ left: AbstractMesh, right: AbstractMesh }>,
        rigMappings: Nullable<{ left: XRHandMeshRigMapping, right: XRHandMeshRigMapping }>,
    } = { jointMeshes: null, handMeshes: null, rigMappings: null };

    /**
     * This observable will notify registered observers when a new hand object was added and initialized
     */
    public onHandAddedObservable: Observable<WebXRHand> = new Observable();
    /**
     * This observable will notify its observers right before the hand object is disposed
     */
    public onHandRemovedObservable: Observable<WebXRHand> = new Observable();

    /**
     * Check if the needed objects are defined.
     * This does not mean that the feature is enabled, but that the objects needed are well defined.
     */
    public isCompatible(): boolean {
        return typeof XRHand !== "undefined";
    }

    /**
     * Get the hand object according to the controller id
     * @param controllerId the controller id to which we want to get the hand
     * @returns null if not found or the WebXRHand object if found
     */
    public getHandByControllerId(controllerId: string): Nullable<WebXRHand> {
        return this._attachedHands[controllerId];
    }

    /**
     * Get a hand object according to the requested handedness
     * @param handedness the handedness to request
     * @returns null if not found or the WebXRHand object if found
     */
    public getHandByHandedness(handedness: XRHandedness): Nullable<WebXRHand> {
        if (handedness == "none") {
            return null;
        }
        return this._trackingHands[handedness];
    }

    /**
     * Creates a new instance of the XR hand tracking feature.
     * @param _xrSessionManager An instance of WebXRSessionManager.
     * @param options Options to use when constructing this feature.
     */
    constructor(
        _xrSessionManager: WebXRSessionManager,
        /** Options to use when constructing this feature. */
        public readonly options: IWebXRHandTrackingOptions
    ) {
        super(_xrSessionManager);
        this.xrNativeFeatureName = "hand-tracking";
    }

    /**
     * Attach this feature.
     * Will usually be called by the features manager.
     *
     * @returns true if successful.
     */
    public attach(): boolean {
        if (!super.attach()) {
            return false;
        }

        this._handResources = {
            jointMeshes: WebXRHandTracking._generateTrackedJointMeshes(this.options),
            handMeshes: this.options.handMeshes?.customMeshes || null,
            rigMappings: this.options.handMeshes?.customRigMappings || null,
        };

        // If they didn't supply custom meshes and are not disabling the default meshes...
        if (!this.options.handMeshes?.customMeshes && !this.options.handMeshes?.disableDefaultMeshes) {
            WebXRHandTracking._generateDefaultHandMeshesAsync(Engine.LastCreatedScene!).then((defaultHandMeshes) => {
                this._handResources.handMeshes = defaultHandMeshes;
                this._handResources.rigMappings = {
                    left: WebXRHandTracking._generateDefaultHandMeshRigMapping("left"),
                    right: WebXRHandTracking._generateDefaultHandMeshRigMapping("right"),
                };

                // Apply meshes to existing hands if already tracking.
                this._trackingHands.left?.setHandMesh(this._handResources.handMeshes.left, this._handResources.rigMappings.left);
                this._trackingHands.right?.setHandMesh(this._handResources.handMeshes.right, this._handResources.rigMappings.right);
            });
        }

        this.options.xrInput.controllers.forEach(this._attachHand);
        this._addNewAttachObserver(this.options.xrInput.onControllerAddedObservable, this._attachHand);
        this._addNewAttachObserver(this.options.xrInput.onControllerRemovedObservable, this._detachHand);

        return true;
    }

    protected _onXRFrame(_xrFrame: XRFrame): void {
        this._trackingHands.left?.updateFromXRFrame(_xrFrame, this._xrSessionManager.referenceSpace);
        this._trackingHands.right?.updateFromXRFrame(_xrFrame, this._xrSessionManager.referenceSpace);
    }

    private _attachHand = (xrController: WebXRInputSource) => {
        if (!xrController.inputSource.hand ||
            xrController.inputSource.handedness == "none" ||
            !this._handResources.jointMeshes) {
            return;
        }

        let touchMesh: Nullable<AbstractMesh> = null;
        if (this.options.jointMeshes?.sceneForNearInteraction) {
            touchMesh = IcoSphereBuilder.CreateIcoSphere(`${xrController.uniqueId}-handJoint-indexCollidable`, WebXRHandTracking._ICOSPHERE_PARAMS, this.options.jointMeshes.sceneForNearInteraction);
            touchMesh.isVisible = false;
            Tags.AddTagsTo(touchMesh, "touchEnabled");
        }

        const handedness = xrController.inputSource.handedness;
        const webxrHand = new WebXRHand(
            xrController,
            this._handResources.jointMeshes[handedness],
            this._handResources.handMeshes && this._handResources.handMeshes[handedness],
            this._handResources.rigMappings && this._handResources.rigMappings[handedness],
            touchMesh,
            this.options.handMeshes?.meshesUseLeftHandedCoordinates,
            this.options.jointMeshes?.invisible,
            this.options.jointMeshes?.scaleFactor
        );

        this._attachedHands[xrController.uniqueId] = webxrHand;
        this._trackingHands[handedness] = webxrHand;

        this.onHandAddedObservable.notifyObservers(webxrHand);
    }

    private _detachHandById(controllerId: string) {
        const hand = this.getHandByControllerId(controllerId);
        if (hand) {
            const handedness = hand.xrController.inputSource.handedness == "left" ? "left" : "right";
            if (this._trackingHands[handedness]?.xrController.uniqueId === controllerId) {
                this._trackingHands[handedness] = null;
            }
            this.onHandRemovedObservable.notifyObservers(hand);
            hand.dispose();
            delete this._attachedHands[controllerId];
        }
    }

    private _detachHand = (xrController: WebXRInputSource) => {
        this._detachHandById(xrController.uniqueId);
    }

    /**
     * Detach this feature.
     * Will usually be called by the features manager.
     *
     * @returns true if successful.
     */
    public detach(): boolean {
        if (!super.detach()) {
            return false;
        }

        Object.keys(this._attachedHands).forEach((uniqueId) => this._detachHandById(uniqueId));

        return true;
    }

    /**
     * Dispose this feature and all of the resources attached.
     */
    public dispose(): void {
        super.dispose();
        this.onHandAddedObservable.clear();
        this.onHandRemovedObservable.clear();

        if (this._handResources.handMeshes && !this.options.handMeshes?.customMeshes) {
            this._handResources.handMeshes.left.dispose();
            this._handResources.handMeshes.right.dispose();
        }

        if (this._handResources.jointMeshes) {
            this._handResources.jointMeshes.left.forEach((trackedMesh) => trackedMesh.dispose());
            this._handResources.jointMeshes.right.forEach((trackedMesh) => trackedMesh.dispose());
        }
    }
}

//register the plugin
WebXRFeaturesManager.AddWebXRFeature(
    WebXRHandTracking.Name,
    (xrSessionManager, options) => {
        return () => new WebXRHandTracking(xrSessionManager, options);
    },
    WebXRHandTracking.Version,
    false
);
