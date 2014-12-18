﻿module BABYLON {
    export class Sound {
        public maxDistance: number = 20;
        public autoplay: boolean = false;
        public loop: boolean = false;
        public useBabylonJSAttenuation: boolean = true;
        public soundTrackId: number;
        private _position: Vector3 = Vector3.Zero();
        private _localDirection: Vector3 = new Vector3(1,0,0);
        private _volume: number = 1;
        private _isLoaded: boolean = false;
        private _isReadyToPlay: boolean = false;
        private _isPlaying: boolean = false;
        private _isDirectional: boolean = false;
        private _audioEngine: BABYLON.AudioEngine;
        private _readyToPlayCallback;
        private _audioBuffer;
        private _soundSource: AudioBufferSourceNode;
        private _soundPanner: PannerNode;
        private _soundGain: GainNode;
        // Used if you'd like to create a directional sound.
        // If not set, the sound will be omnidirectional
        private _coneInnerAngle: number = null;
        private _coneOuterAngle: number = null;
        private _coneOuterGain: number = null;
        private _scene: BABYLON.Scene;
        private _name: string;
        private _connectedMesh: BABYLON.AbstractMesh;

        /**
        * Create a sound and attach it to a scene
        * @param name Name of your sound 
        * @param url Url to the sound to load async
        * @param readyToPlayCallback Provide a callback function if you'd like to load your code once the sound is ready to be played
        * @param options Objects to provide with the current available options: autoplay, loop, distanceMax
        */
        constructor(name: string, url: string, scene: BABYLON.Scene, readyToPlayCallback?: () => void, options?) {
            this._name = name;
            this._scene = scene;
            this._audioEngine = this._scene.getEngine().getAudioEngine();
            this._readyToPlayCallback = readyToPlayCallback;
            if (options) {
                if (options.maxDistance) { this.maxDistance = options.maxDistance; }
                if (options.autoplay) { this.autoplay = options.autoplay; }
                if (options.loop) { this.loop = options.loop; }
                if (options.volume) { this._volume = options.volume; }
                if (options.useBabylonJSAttenuation) { this.useBabylonJSAttenuation = options.useBabylonJSAttenuation; }
            }

            if (this._audioEngine.canUseWebAudio) {
                this._soundGain = this._audioEngine.audioContext.createGain();
                this._soundGain.gain.value = this._volume;
                //this._soundGain.connect(this._audioEngine.masterGain);
                this._soundPanner = this._audioEngine.audioContext.createPanner();
                this._soundPanner.connect(this._soundGain);
                this._scene.mainSoundTrack.AddSound(this);
                BABYLON.Tools.LoadFile(url, (data) => { this._soundLoaded(data); }, null, null, true);
            }
        }

        public connectToSoundTrackAudioNode(soundTrackAudioNode: AudioNode) {
            if (this._audioEngine.canUseWebAudio) {
                this._soundGain.disconnect();
                this._soundGain.connect(soundTrackAudioNode);
            }
        }

        /**
        * Transform this sound into a directional source
        * @param coneInnerAngle Size of the inner cone in degree
        * @param coneOuterAngle Size of the outer cone in degree
        * @param coneOuterGain Volume of the sound outside the outer cone (between 0.0 and 1.0)
        */
        public setDirectionalCone(coneInnerAngle: number, coneOuterAngle: number, coneOuterGain: number) {
            if (coneOuterAngle < coneInnerAngle) {
                BABYLON.Tools.Error("setDirectionalCone(): outer angle of the cone must be superior or equal to the inner angle.");
                return;
            }
            this._coneInnerAngle = coneInnerAngle;
            this._coneOuterAngle = coneOuterAngle;
            this._coneOuterGain = coneOuterGain;
            this._isDirectional = true;

            if (this._isPlaying && this.loop) {
                this.stop();
                this.play();
            }
        }

        public setPosition(newPosition: Vector3) {
            this._position = newPosition;

            if (this._isPlaying) {
                this._soundPanner.setPosition(this._position.x, this._position.y, this._position.z);
            }
        }

        public setLocalDirectionToMesh(newLocalDirection: Vector3) {
            this._localDirection = newLocalDirection;

            if (this._connectedMesh && this._isPlaying) {
                this._updateDirection();
            }
        }

        private _updateDirection() {
            var mat = this._connectedMesh.getWorldMatrix();
            var direction = BABYLON.Vector3.TransformNormal(this._localDirection, mat);
            direction.normalize();
            this._soundPanner.setOrientation(direction.x, direction.y, direction.z);
        }

        public updateDistanceFromListener() {
            if (this._connectedMesh) {
                var distance = this._connectedMesh.getDistanceToCamera(this._scene.activeCamera);

                if (distance < 1) distance = 1;
                if (this.useBabylonJSAttenuation) {
                    if (distance < this.maxDistance) {
                        this._soundGain.gain.value = this._volume / distance;
                    }
                    else {
                        this._soundGain.gain.value = 0;
                    }
                }
            }
        }

        /**
        * Play the sound
        * @param time (optional) Start the sound after X seconds. Start immediately (0) by default.
        */
        public play(time?: number) {
            if (this._isReadyToPlay) {
                try {
                    var startTime = time ? this._audioEngine.audioContext.currentTime + time : 0;
                    this._soundSource = this._audioEngine.audioContext.createBufferSource();
                    this._soundSource.buffer = this._audioBuffer;
                    this._soundPanner.setPosition(this._position.x, this._position.y, this._position.z);
                    if (this._isDirectional) {
                        this._soundPanner.coneInnerAngle = this._coneInnerAngle;
                        this._soundPanner.coneOuterAngle = this._coneOuterAngle;
                        this._soundPanner.coneOuterGain = this._coneOuterGain;
                        this._soundPanner.setOrientation(this._localDirection.x, this._localDirection.y, this._localDirection.z);
                    }
                    this._soundSource.connect(this._soundPanner);
                    this._soundSource.loop = this.loop;
                    this._soundSource.start(startTime);
                    this._isPlaying = true;
                }
                catch (ex) {
                    BABYLON.Tools.Error("Error while trying to play audio: " + this._name + ", " + ex.message);
                }
            }
        }

        /**
        * Stop the sound
        * @param time (optional) Stop the sound after X seconds. Stop immediately (0) by default.
        */
        public stop(time?: number) {
            var stopTime = time ? this._audioEngine.audioContext.currentTime + time : 0;
            this._soundSource.stop(stopTime);
            this._isPlaying = false;
        }

        public pause() {
            //this._soundSource.p
        }

        public setVolume(newVolume: number) {
            this._volume = newVolume;
        }

        public getVolume(): number {
            return this._volume;
        }

        public attachToMesh(meshToConnectTo: BABYLON.AbstractMesh) {
            this._connectedMesh = meshToConnectTo;
            meshToConnectTo.registerAfterWorldMatrixUpdate((connectedMesh: BABYLON.AbstractMesh) => this._onRegisterAfterWorldMatrixUpdate(connectedMesh));
        }

        private _onRegisterAfterWorldMatrixUpdate(connectedMesh: BABYLON.AbstractMesh) {
            this.setPosition(connectedMesh.position);
            if (this._isDirectional && this._isPlaying) {
                this._updateDirection();
            }
        }

        private _soundLoaded(audioData: ArrayBuffer) {
            this._isLoaded = true;
            this._audioEngine.audioContext.decodeAudioData(audioData, (buffer) => {
                this._audioBuffer = buffer;
                this._isReadyToPlay = true;
                if (this.autoplay) { this.play(); }
                if (this._readyToPlayCallback) { this._readyToPlayCallback(); }
            }, function (error) {
                    BABYLON.Tools.Error("Error while decoding audio data: " + error.err);
                });
        }
    }
}