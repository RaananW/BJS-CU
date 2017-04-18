layout(std140, column_major) uniform;

uniform Material
{
	uniform mat4 albedoMatrix;
	uniform vec2 vAlbedoInfos;
	uniform mat4 ambientMatrix;
	uniform vec3 vAmbientInfos;
	uniform mat4 opacityMatrix;
	uniform vec2 vOpacityInfos;
	uniform vec2 vEmissiveInfos;
	uniform mat4 emissiveMatrix;
	uniform vec2 vLightmapInfos;
	uniform mat4 lightmapMatrix;
	uniform vec3 vReflectivityInfos;
	uniform mat4 reflectivityMatrix;
	uniform vec2 vMicroSurfaceSamplerInfos;
	uniform mat4 microSurfaceSamplerMatrix;
	uniform vec3 vBumpInfos;
	uniform mat4 bumpMatrix;
	uniform float pointSize;

	uniform vec3 vEyePosition;
	uniform vec3 vAmbientColor;
	uniform vec3 vReflectionColor;
	uniform vec4 vAlbedoColor;

	uniform vec4 vLightingIntensity;
	uniform vec4 vCameraInfos;

	uniform vec4 vOverloadedIntensity;
	uniform vec3 vOverloadedAmbient;
	uniform vec3 vOverloadedAlbedo;
	uniform vec3 vOverloadedReflectivity;
	uniform vec3 vOverloadedEmissive;
	uniform vec3 vOverloadedReflection;
	uniform vec3 vOverloadedMicroSurface;

	uniform vec4 vOverloadedShadowIntensity;
	uniform vec2 vMicrosurfaceTextureLods;
	uniform vec4 vReflectivityColor;
	uniform vec3 vEmissiveColor;

	uniform vec4 opacityParts;
	uniform vec4 emissiveLeftColor;
	uniform vec4 emissiveRightColor;
	uniform vec4 vRefractionInfos;
	uniform mat4 refractionMatrix;

	uniform vec2 vReflectionInfos;
	uniform mat4 reflectionMatrix;
};

uniform Scene {
	mat4 viewProjection;
	mat4 view;
};