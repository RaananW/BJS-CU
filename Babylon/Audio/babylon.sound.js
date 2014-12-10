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
            this.maxDistance = 10;
            this.autoplay = false;
            this.loop = false;
            this._position = BABYLON.Vector3.Zero();
            this._direction = BABYLON.Vector3.Zero();
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
                if (options.distanceMax) {
                    this.maxDistance = options.distanceMax;
                }
                if (options.autoplay) {
                    this.autoplay = options.autoplay;
                }
                if (options.loop) {
                    this.loop = options.loop;
                }
            }

            if (this._audioEngine.canUseWebAudio) {
                BABYLON.Tools.LoadFile(url, function (data) {
                    _this._soundLoaded(data);
                }, null, null, true);
            }
        }
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

        Sound.prototype.setDirection = function (newDirection) {
            this._direction = newDirection;

            if (this._isPlaying) {
                console.log(this._direction.x + " " + this._direction.y + " " + this._direction.z);
                this._soundPanner.setOrientation(this._direction.x, this._direction.y, this._direction.z);
            }
        };

        Sound.prototype.play = function () {
            if (this._isReadyToPlay) {
                try  {
                    this._soundSource = this._audioEngine.audioContext.createBufferSource();
                    this._soundSource.buffer = this._audioBuffer;
                    this._soundPanner = this._audioEngine.audioContext.createPanner();
                    this._soundPanner.setPosition(this._position.x, this._position.y, this._position.z);

                    //this._soundPanner.maxDistance = this.maxDistance;
                    if (this._isDirectional) {
                        this._soundPanner.coneInnerAngle = this._coneInnerAngle;
                        this._soundPanner.coneOuterAngle = this._coneOuterAngle;
                        this._soundPanner.coneOuterGain = this._coneOuterGain;
                        this._soundPanner.setOrientation(this._direction.x, this._direction.y, this._direction.z);
                    }
                    this._soundPanner.connect(this._audioEngine.masterGain);
                    this._soundSource.connect(this._soundPanner);
                    this._soundSource.loop = this.loop;
                    this._soundSource.start(0);
                    this._isPlaying = true;
                } catch (ex) {
                    BABYLON.Tools.Error("Error while trying to play audio: " + this._name + ", " + ex.message);
                }
            }
        };

        Sound.prototype.stop = function () {
            this._soundSource.stop(0);
            this._isPlaying = false;
        };

        Sound.prototype.pause = function () {
        };

        Sound.prototype.attachToMesh = function (meshToConnectTo) {
            var _this = this;
            meshToConnectTo.registerAfterWorldMatrixUpdate(function (connectedMesh) {
                return _this._onRegisterAfterWorldMatrixUpdate(connectedMesh);
            });
        };

        Sound.prototype._onRegisterAfterWorldMatrixUpdate = function (connectedMesh) {
            this.setPosition(connectedMesh.position);
            if (this._isDirectional) {
                var mat = connectedMesh.getWorldMatrix();
                var direction = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 0, 1), mat);
                direction.normalize();
                this.setDirection(direction);
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
