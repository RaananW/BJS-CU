﻿var BABYLON;
(function (BABYLON) {
    var Sound = (function () {
        /**
        * Create a sound and attach it to a scene
        * @param name Name of your sound
        * @param url Url to the sound to load async
        * @param readyToPlayCallback Provide a callback function if you'd like to load your code once the sound is ready to be played
        * @param options Objects to provide with the current available options: autoplay, loop, distanceMax
        */
        function Sound(name, url, scene, readyToPlayCallback, options) {
            var _this = this;
            this.maxDistance = 20;
            this.autoplay = false;
            this.loop = false;
            this.useBabylonJSAttenuation = true;
            this._position = BABYLON.Vector3.Zero();
            this._localDirection = new BABYLON.Vector3(1, 0, 0);
            this._volume = 1;
            this._isLoaded = false;
            this._isReadyToPlay = false;
            this._isPlaying = false;
            this._isDirectional = false;
            // Used if you'd like to create a directional sound.
            // If not set, the sound will be omnidirectional
            this._coneInnerAngle = null;
            this._coneOuterAngle = null;
            this._coneOuterGain = null;
            this._name = name;
            this._scene = scene;
            this._audioEngine = this._scene.getEngine().getAudioEngine();
            this._readyToPlayCallback = readyToPlayCallback;
            if (options) {
                if (options.maxDistance) {
                    this.maxDistance = options.maxDistance;
                }
                if (options.autoplay) {
                    this.autoplay = options.autoplay;
                }
                if (options.loop) {
                    this.loop = options.loop;
                }
                if (options.volume) {
                    this._volume = options.volume;
                }
                if (options.useBabylonJSAttenuation) {
                    this.useBabylonJSAttenuation = options.useBabylonJSAttenuation;
                }
            }

            if (this._audioEngine.canUseWebAudio) {
                this._soundGain = this._audioEngine.audioContext.createGain();
                this._soundGain.gain.value = this._volume;

                //this._soundGain.connect(this._audioEngine.masterGain);
                this._soundPanner = this._audioEngine.audioContext.createPanner();
                this._soundPanner.connect(this._soundGain);
                this._scene.mainSoundTrack.AddSound(this);
                BABYLON.Tools.LoadFile(url, function (data) {
                    _this._soundLoaded(data);
                }, null, null, true);
            }
        }
        Sound.prototype.connectToSoundTrackAudioNode = function (soundTrackAudioNode) {
            if (this._audioEngine.canUseWebAudio) {
                this._soundGain.disconnect();
                this._soundGain.connect(soundTrackAudioNode);
            }
        };

        /**
        * Transform this sound into a directional source
        * @param coneInnerAngle Size of the inner cone in degree
        * @param coneOuterAngle Size of the outer cone in degree
        * @param coneOuterGain Volume of the sound outside the outer cone (between 0.0 and 1.0)
        */
        Sound.prototype.setDirectionalCone = function (coneInnerAngle, coneOuterAngle, coneOuterGain) {
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
        };

        Sound.prototype.setPosition = function (newPosition) {
            this._position = newPosition;

            if (this._isPlaying) {
                this._soundPanner.setPosition(this._position.x, this._position.y, this._position.z);
            }
        };

        Sound.prototype.setLocalDirectionToMesh = function (newLocalDirection) {
            this._localDirection = newLocalDirection;

            if (this._connectedMesh && this._isPlaying) {
                this._updateDirection();
            }
        };

        Sound.prototype._updateDirection = function () {
            var mat = this._connectedMesh.getWorldMatrix();
            var direction = BABYLON.Vector3.TransformNormal(this._localDirection, mat);
            direction.normalize();
            this._soundPanner.setOrientation(direction.x, direction.y, direction.z);
        };

        Sound.prototype.updateDistanceFromListener = function () {
            if (this._connectedMesh) {
                var distance = this._connectedMesh.getDistanceToCamera(this._scene.activeCamera);

                if (distance < 1)
                    distance = 1;
                if (this.useBabylonJSAttenuation) {
                    if (distance < this.maxDistance) {
                        this._soundGain.gain.value = this._volume / distance;
                    } else {
                        this._soundGain.gain.value = 0;
                    }
                }
            }
        };

        /**
        * Play the sound
        * @param time (optional) Start the sound after X seconds. Start immediately (0) by default.
        */
        Sound.prototype.play = function (time) {
            if (this._isReadyToPlay) {
                try  {
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
                } catch (ex) {
                    BABYLON.Tools.Error("Error while trying to play audio: " + this._name + ", " + ex.message);
                }
            }
        };

        /**
        * Stop the sound
        * @param time (optional) Stop the sound after X seconds. Stop immediately (0) by default.
        */
        Sound.prototype.stop = function (time) {
            var stopTime = time ? this._audioEngine.audioContext.currentTime + time : 0;
            this._soundSource.stop(stopTime);
            this._isPlaying = false;
        };

        Sound.prototype.pause = function () {
            //this._soundSource.p
        };

        Sound.prototype.setVolume = function (newVolume) {
            this._volume = newVolume;
        };

        Sound.prototype.getVolume = function () {
            return this._volume;
        };

        Sound.prototype.attachToMesh = function (meshToConnectTo) {
            var _this = this;
            this._connectedMesh = meshToConnectTo;
            meshToConnectTo.registerAfterWorldMatrixUpdate(function (connectedMesh) {
                return _this._onRegisterAfterWorldMatrixUpdate(connectedMesh);
            });
        };

        Sound.prototype._onRegisterAfterWorldMatrixUpdate = function (connectedMesh) {
            this.setPosition(connectedMesh.position);
            if (this._isDirectional && this._isPlaying) {
                this._updateDirection();
            }
        };

        Sound.prototype._soundLoaded = function (audioData) {
            var _this = this;
            this._isLoaded = true;
            this._audioEngine.audioContext.decodeAudioData(audioData, function (buffer) {
                _this._audioBuffer = buffer;
                _this._isReadyToPlay = true;
                if (_this.autoplay) {
                    _this.play();
                }
                if (_this._readyToPlayCallback) {
                    _this._readyToPlayCallback();
                }
            }, function (error) {
                BABYLON.Tools.Error("Error while decoding audio data: " + error.err);
            });
        };
        return Sound;
    })();
    BABYLON.Sound = Sound;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.sound.js.map
