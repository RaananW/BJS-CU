﻿module BABYLON {

    export interface PhysicsImpostorJoint {
        mainImpostor: PhysicsImpostor;
        connectedImpostor: PhysicsImpostor;
        joint: PhysicsJoint;
    }

    export class PhysicsEngine {

        public gravity: Vector3;

        constructor(gravity: Nullable<Vector3>, private _physicsPlugin: IPhysicsEnginePlugin = new CannonJSPlugin()) {
            if (!this._physicsPlugin.isSupported()) {
                throw new Error("Physics Engine " + this._physicsPlugin.name + " cannot be found. "
                    + "Please make sure it is included.")
            }
            gravity = gravity || new Vector3(0, -9.807, 0)
            this.setGravity(gravity);
            this.setTimeStep();
        }

        public setGravity(gravity: Vector3): void {
            this.gravity = gravity;
            this._physicsPlugin.setGravity(this.gravity);
        }

        /**
         * Set the time step of the physics engine.
         * default is 1/60.
         * To slow it down, enter 1/600 for example.
         * To speed it up, 1/30
         * @param {number} newTimeStep the new timestep to apply to this world.
         */
        public setTimeStep(newTimeStep: number = 1 / 60) {
            this._physicsPlugin.setTimeStep(newTimeStep);
        }

        /**
         * Get the time step of the physics engine.
         */
        public getTimeStep(): number {
            return this._physicsPlugin.getTimeStep();
        }

        public dispose(): void {
            this._impostors.forEach(function (impostor) {
                impostor.dispose();
            })
            this._physicsPlugin.dispose();
        }

        public getPhysicsPluginName(): string {
            return this._physicsPlugin.name;
        }

        // Statics
        public static Epsilon = 0.001;

        //new methods and parameters

        private _impostors: Array<PhysicsImpostor> = [];
        private _joints: Array<PhysicsImpostorJoint> = [];

        /**
         * Adding a new impostor for the impostor tracking.
         * This will be done by the impostor itself.
         * @param {PhysicsImpostor} impostor the impostor to add
         */
        public addImpostor(impostor: PhysicsImpostor) {
            impostor.uniqueId = this._impostors.push(impostor);
            //if no parent, generate the body
            if (!impostor.parent) {
                this._physicsPlugin.generatePhysicsBody(impostor);
            }
        }

        /**
         * Remove an impostor from the engine.
         * This impostor and its mesh will not longer be updated by the physics engine.
         * @param {PhysicsImpostor} impostor the impostor to remove
         */
        public removeImpostor(impostor: PhysicsImpostor) {
            var index = this._impostors.indexOf(impostor);
            if (index > -1) {
                var removed = this._impostors.splice(index, 1);
                //Is it needed?
                if (removed.length) {
                    //this will also remove it from the world.
                    removed[0].physicsBody = null;
                }
            }
        }

        /**
         * Add a joint to the physics engine
         * @param {PhysicsImpostor} mainImpostor the main impostor to which the joint is added.
         * @param {PhysicsImpostor} connectedImpostor the impostor that is connected to the main impostor using this joint
         * @param {PhysicsJoint} the joint that will connect both impostors.
         */
        public addJoint(mainImpostor: PhysicsImpostor, connectedImpostor: PhysicsImpostor, joint: PhysicsJoint) {
            var impostorJoint = {
                mainImpostor: mainImpostor,
                connectedImpostor: connectedImpostor,
                joint: joint
            }
            joint.physicsPlugin = this._physicsPlugin;
            this._joints.push(impostorJoint);
            this._physicsPlugin.generateJoint(impostorJoint);
        }

        public removeJoint(mainImpostor: PhysicsImpostor, connectedImpostor: PhysicsImpostor, joint: PhysicsJoint) {
            var matchingJoints = this._joints.filter(function (impostorJoint) {
                return (impostorJoint.connectedImpostor === connectedImpostor
                    && impostorJoint.joint === joint
                    && impostorJoint.mainImpostor === mainImpostor)
            });
            if (matchingJoints.length) {
                this._physicsPlugin.removeJoint(matchingJoints[0]);
                //TODO remove it from the list as well

            }
        }

        /**
         * Called by the scene. no need to call it.
         */
        public _step(delta: number) {
            //check if any mesh has no body / requires an update
            this._impostors.forEach((impostor) => {

                if (impostor.isBodyInitRequired()) {
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

        public getImpostorForPhysicsObject(object: IPhysicsEnabledObject): Nullable<PhysicsImpostor> {
            for (var i = 0; i < this._impostors.length; ++i) {
                if (this._impostors[i].object === object) {
                    return this._impostors[i];
                }
            }

            return null;
        }

        public getImpostorWithPhysicsBody(body: any): Nullable<PhysicsImpostor> {
            for (var i = 0; i < this._impostors.length; ++i) {
                if (this._impostors[i].physicsBody === body) {
                    return this._impostors[i];
                }
            }

            return null;
        }

        public applyRadialImpulse(origin: Vector3, radius: number, strength: number, falloff: PhysicsRadialImpulseFallof = PhysicsRadialImpulseFallof.Constant) {
            if (this._impostors.length === 0) {
                return null;
            }

            for (var i = 0; i < this._impostors.length; ++i) {
                var impostor = this._impostors[i];
                var impostorForceAndContactPoint = this.getImpostorForceAndContactPoint(
                    impostor,
                    origin,
                    radius,
                    strength,
                    falloff
                );
                if (impostorForceAndContactPoint === false) {
                    continue;
                }

                impostor.applyImpulse(
                    impostorForceAndContactPoint.force,
                    impostorForceAndContactPoint.contactPoint
                );
            }

            return null;
        }

        public applyRadialForce(origin: Vector3, radius: number, strength: number, falloff: PhysicsRadialImpulseFallof = PhysicsRadialImpulseFallof.Constant) {
            if (this._impostors.length === 0) {
                return null;
            }

            for (var i = 0; i < this._impostors.length; ++i) {
                var impostor = this._impostors[i];
                var impostorForceAndContactPoint = this.getImpostorForceAndContactPoint(
                    impostor,
                    origin,
                    radius,
                    strength,
                    falloff
                );
                if (impostorForceAndContactPoint === false) {
                    continue;
                }

                impostor.applyForce(
                    impostorForceAndContactPoint.force,
                    impostorForceAndContactPoint.contactPoint
                );
            }

            return null;
        }

        private getImpostorForceAndContactPoint(impostor: PhysicsImpostor, origin: Vector3, radius: number, strength: number, falloff: PhysicsRadialImpulseFallof) {
            if (impostor.mass === 0) {
                return false;
            }

            if (!this.intersectsWithRadialSphere(impostor, origin, radius)) {
                return false;
            }

            var impostorObject = (<Mesh>impostor.object);
            var impostorObjectCenter = impostor.getObjectCenter();
            var direction = impostorObjectCenter.subtract(origin);

            var ray = new Ray(origin, direction, radius);
            var hit = ray.intersectsMesh(impostorObject);

            var contactPoint = hit.pickedPoint;
            if (!contactPoint) {
                return false;
            }

            var distanceFromOrigin = BABYLON.Vector3.Distance(origin, contactPoint);
            if (distanceFromOrigin > radius) {
                return false;
            }
            
            var multiplier = falloff === PhysicsRadialImpulseFallof.Constant
                ? strength
                : strength * (1 - (distanceFromOrigin / radius));

            var force = direction.multiplyByFloats(multiplier, multiplier, multiplier);

            return { force: force, contactPoint: contactPoint };
        }

        private _radialSphere: Mesh;
        private _prepareRadialSphere(scene: Scene) {
            if (!this._radialSphere) {
                this._radialSphere = BABYLON.Mesh.CreateSphere(
                    "radialSphere",
                    32,
                    1,
                    scene
                );
                this._radialSphere.isVisible = false;
            }
        }

        private intersectsWithRadialSphere(impostor: PhysicsImpostor, origin: Vector3, radius: number): boolean {
            var impostorObject = <Mesh>impostor.object;

            this._prepareRadialSphere(impostorObject.getScene());

            this._radialSphere.position = origin;
            this._radialSphere.scaling = new Vector3(radius * 2, radius * 2, radius * 2);
            this._radialSphere._updateBoundingInfo();
            this._radialSphere.computeWorldMatrix(true);
  
            if (this._radialSphere.intersectsMesh(
                impostorObject,
                true
            )) {
                return true;
            }

            return false;
        }

        public showRadialSphere(scene: Scene) {
            this._prepareRadialSphere(scene);

            this._radialSphere.isVisible = true;
            if (!this._radialSphere.material) {
                var radialSphereMaterial = new StandardMaterial("radialSphereMaterial", scene);
                radialSphereMaterial.alpha = 0.5;
                this._radialSphere.material = radialSphereMaterial;
            }
        }

        public hideRadialSphere() {
            if (this._radialSphere) {
                this._radialSphere.isVisible = false;
            }
        }
    }

    export interface IPhysicsEnginePlugin {
        world: any;
        name: string;
        setGravity(gravity: Vector3): void;
        setTimeStep(timeStep: number): void;
        getTimeStep(): number;
        executeStep(delta: number, impostors: Array<PhysicsImpostor>): void; //not forgetting pre and post events
        applyImpulse(impostor: PhysicsImpostor, force: Vector3, contactPoint: Vector3): void;
        applyForce(impostor: PhysicsImpostor, force: Vector3, contactPoint: Vector3): void;
        generatePhysicsBody(impostor: PhysicsImpostor): void;
        removePhysicsBody(impostor: PhysicsImpostor): void;
        generateJoint(joint: PhysicsImpostorJoint): void;
        removeJoint(joint: PhysicsImpostorJoint): void;
        isSupported(): boolean;
        setTransformationFromPhysicsBody(impostor: PhysicsImpostor): void;
        setPhysicsBodyTransformation(impostor: PhysicsImpostor, newPosition: Vector3, newRotation: Quaternion): void;
        setLinearVelocity(impostor: PhysicsImpostor, velocity: Nullable<Vector3>): void;
        setAngularVelocity(impostor: PhysicsImpostor, velocity: Nullable<Vector3>): void;
        getLinearVelocity(impostor: PhysicsImpostor): Nullable<Vector3>;
        getAngularVelocity(impostor: PhysicsImpostor): Nullable<Vector3>;
        setBodyMass(impostor: PhysicsImpostor, mass: number): void;
        getBodyMass(impostor: PhysicsImpostor): number;
        getBodyFriction(impostor: PhysicsImpostor): number;
        setBodyFriction(impostor: PhysicsImpostor, friction: number): void;
        getBodyRestitution(impostor: PhysicsImpostor): number;
        setBodyRestitution(impostor: PhysicsImpostor, restitution: number): void;
        sleepBody(impostor: PhysicsImpostor): void;
        wakeUpBody(impostor: PhysicsImpostor): void;
        //Joint Update
        updateDistanceJoint(joint: PhysicsJoint, maxDistance:number, minDistance?: number): void;
        setMotor(joint: IMotorEnabledJoint, speed: number, maxForce?: number, motorIndex?: number): void;
        setLimit(joint: IMotorEnabledJoint, upperLimit: number, lowerLimit?: number, motorIndex?: number): void;
        getRadius(impostor: PhysicsImpostor):number;
        getBoxSizeToRef(impostor: PhysicsImpostor, result:Vector3): void;
        syncMeshWithImpostor(mesh:AbstractMesh, impostor:PhysicsImpostor): void;
        dispose(): void;
    }
    
    export enum PhysicsRadialImpulseFallof {
        Constant, // impulse is constant in strength across it's whole radius
        Linear // impulse gets weaker if it's further from the origin
    }
    
}
