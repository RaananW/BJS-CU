﻿module BABYLON {

    export interface PhysicsImpostorJoint {
        mainImpostor: PhysicsImpostor;
        connectedImpostor: PhysicsImpostor;
        joint: PhysicsJoint;
    }

    export class PhysicsEngine {

        public gravity: Vector3;

        constructor(gravity?: Vector3, private _physicsPlugin: IPhysicsEnginePlugin = new CannonJSPlugin()) {
            if (!this._physicsPlugin.isSupported()) {
                throw new Error("Physics Engine " + this._physicsPlugin.name + " cannot be found. "
                    + "Please make sure it is included.")
            }
            gravity = gravity || new Vector3(0, -9.807, 0)
            this.setGravity(gravity);
        }

        public setGravity(gravity: Vector3): void {
            this.gravity = gravity;
            this._physicsPlugin.setGravity(this.gravity);
        }

        public dispose(): void {
            this._impostors.forEach(function(impostor) {
                impostor.dispose();
            })
            this._physicsPlugin.dispose();
        }

        public getPhysicsPluginName(): string {
            return this._physicsPlugin.name;
        }

        // Statics, Legacy support.
        /**
         * @Deprecated
         *  
         */
        public static NoImpostor = PhysicsImpostor.NoImpostor;
        public static SphereImpostor = PhysicsImpostor.SphereImpostor;
        public static BoxImpostor = PhysicsImpostor.BoxImpostor;
        public static PlaneImpostor = PhysicsImpostor.PlaneImpostor;
        public static MeshImpostor = PhysicsImpostor.MeshImpostor;
        public static CapsuleImpostor = PhysicsImpostor.CapsuleImpostor;
        public static ConeImpostor = PhysicsImpostor.ConeImpostor;
        public static CylinderImpostor = PhysicsImpostor.CylinderImpostor;
        public static ConvexHullImpostor = PhysicsImpostor.ConvexHullImpostor;
        public static HeightmapImpostor = PhysicsImpostor.HeightmapImpostor;

        public static Epsilon = 0.001;
        
        //new methods and parameters
        
        private _impostors: Array<PhysicsImpostor> = [];
        private _joints: Array<PhysicsImpostorJoint> = [];

        public addImpostor(impostor: PhysicsImpostor) {
            this._impostors.push(impostor);
        }

        public removeImpostor(impostor: PhysicsImpostor) {
            var index = this._impostors.indexOf(impostor);
            if (index > -1) {
                var removed = this._impostors.splice(index, 1);
                //Is it needed?
                if(removed.length) {
                    this._physicsPlugin.removePhysicsBody(removed[0]);
                }
            }
        }

        public addJoint(mainImpostor: PhysicsImpostor, connectedImpostor: PhysicsImpostor, joint: PhysicsJoint) {
            this._joints.push({
                mainImpostor: mainImpostor,
                connectedImpostor: connectedImpostor,
                joint: joint
            });
        }

        public removeJoint(mainImpostor: PhysicsImpostor, connectedImpostor: PhysicsImpostor, joint: PhysicsJoint) {
            var matchingJoints = this._joints.filter(function(impostorJoint) {
                return (impostorJoint.connectedImpostor === connectedImpostor
                    && impostorJoint.joint === joint
                    && impostorJoint.mainImpostor === mainImpostor)
            });
            if(matchingJoints.length) {
                this._physicsPlugin.removeJoint(matchingJoints[0]);
                //TODO remove it from the list as well
                
            }
        }

        public _step(delta: number) {
            //check if any mesh has no body / requires an update
            this._impostors.forEach((impostor) => {

                if (impostor.isUpdateRequired()) {
                    this._physicsPlugin.generatePhysicsBody(impostor);
                }
            });

            if (delta > 0.1) {
                delta = 0.1;
            } else if (delta <= 0) {
                delta = 1.0 / 60.0;
            }

            this._physicsPlugin.executeStep(delta, this._impostors);
        }

        public getPhysicsPlugin(): IPhysicsEnginePlugin {
            return this._physicsPlugin;
        }

        public getImpostorWithPhysicsBody(body: any): PhysicsImpostor {
            for (var i = 0; i < this._impostors.length; ++i) {
                if (this._impostors[i].physicsBody === body) {
                    return this._impostors[i];
                }
            }
        }
    }

    export enum PhysicsFeature {
        PIVOT_IN_JOINT,
        TRIMESH,

    }

    export interface PhysicsFeatures {

    }

    export interface IPhysicsEnginePlugin {
        world: any;
        name: string;
        setGravity(gravity: Vector3);
        executeStep(delta: number, impostors: Array<PhysicsImpostor>): void; //not forgetting pre and post events
        applyImpulse(impostor: PhysicsImpostor, force: Vector3, contactPoint: Vector3);
        applyForce(impostor: PhysicsImpostor, force: Vector3, contactPoint: Vector3);
        generatePhysicsBody(impostor: PhysicsImpostor);
        removePhysicsBody(impostor: PhysicsImpostor);
        generateJoint(joint: PhysicsImpostorJoint);
        removeJoint(joint: PhysicsImpostorJoint)
        isSupported(): boolean;
        supports(feature: PhysicsFeature): boolean;
        setTransformationFromPhysicsBody(impostor: PhysicsImpostor);
        setPhysicsBodyTransformation(impostor: PhysicsImpostor, newPosition:Vector3, newRotation: Quaternion);
        dispose();
    }
}
