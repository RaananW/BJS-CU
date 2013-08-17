﻿var BABYLON = BABYLON || {};

(function () {
    BABYLON.BoundingSphere = function (positions, start, count) {
        var minimum = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        var maximum = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

        for (var index = start; index < start + count; index++) {
            var current = new BABYLON.Vector3(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]);

            minimum = BABYLON.Vector3.Minimize(current, minimum);
            maximum = BABYLON.Vector3.Maximize(current, maximum);
        }
        
        var distance = BABYLON.Vector3.Distance(minimum, maximum);
        
        this.center = BABYLON.Vector3.Lerp(minimum, maximum, 0.5);;
        this.radius = distance * 0.5;

        this.centerWorld = BABYLON.Vector3.Zero();
    };
    
    // Methods
    BABYLON.BoundingSphere.prototype._update = function (world, scale) {
        BABYLON.Vector3.TransformCoordinatesToRef(this.center, world, this.centerWorld);
        this.radiusWorld = this.radius * scale;
    };
    
    BABYLON.BoundingSphere.prototype.isInFrustrum = function (frustumPlanes) {
        for (var i = 0; i < 6; i++) {
            if (frustumPlanes[i].dotCoordinate(this.centerWorld) <= -this.radiusWorld)
                return false;
        }

        return true;
    };

    BABYLON.BoundingSphere.prototype.intersectsPoint = function(point) {
        var x = this.centerWorld.x - point.x;
        var y = this.centerWorld.y - point.y;
        var z = this.centerWorld.z - point.z;

        var distance = Math.sqrt((x * x) + (y * y) + (z * z));

        if (this.radiusWorld < distance)
            return false;

        return true;
    };

    // Statics
    BABYLON.BoundingSphere.intersects = function (sphere0, sphere1) {
        var x = sphere0.centerWorld.x - sphere1.centerWorld.x;
        var y = sphere0.centerWorld.y - sphere1.centerWorld.y;
        var z = sphere0.centerWorld.z - sphere1.centerWorld.z;

        var distance = Math.sqrt((x * x) + (y * y) + (z * z));

        if (sphere0.radiusWorld + sphere1.radiusWorld < distance)
            return false;

        return true;
    };

})();