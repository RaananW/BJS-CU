﻿layout(std140, column_major) uniform;
uniform Material
{
	vec4 diffuseLeftColor;
	vec4 diffuseRightColor;
	vec4 opacityParts;
	vec4 reflectionLeftColor;
	vec4 reflectionRightColor;
	vec4 refractionLeftColor;
	vec4 refractionRightColor;
	vec4 emissiveLeftColor;
	vec4 emissiveRightColor;
	vec2 vDiffuseInfos;
	vec2 vAmbientInfos;
	vec2 vOpacityInfos;
	vec2 vReflectionInfos;
	vec2 vEmissiveInfos;
	vec2 vLightmapInfos;
	vec2 vSpecularInfos;
	vec3 vBumpInfos;
	mat4 diffuseMatrix;
	mat4 ambientMatrix;
	mat4 opacityMatrix;
	mat4 reflectionMatrix;
	mat4 emissiveMatrix;
	mat4 lightmapMatrix;
	mat4 specularMatrix;
	mat4 bumpMatrix;
	mat4 refractionMatrix;
	vec4 vRefractionInfos;
	float pointSize;
	vec3 vSpecularColor;
	vec3 vEmissiveColor;
	vec4 vDiffuseColor;
} uMaterial;

uniform vec3 vEyePosition;

#ifdef BUMP
#extension GL_OES_standard_derivatives : enable
#endif

#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif

// Constants
#define RECIPROCAL_PI2 0.15915494

// Input
varying vec3 vPositionW;

#ifdef NORMAL
varying vec3 vNormalW;
#endif

#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif

// Helper functions
#include<helperFunctions>

// Lights
#include<lightFragmentDeclaration>[0..maxSimultaneousLights]

#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>

// Samplers
#ifdef DIFFUSE
varying vec2 vDiffuseUV;
uniform sampler2D diffuseSampler;
#endif

#ifdef AMBIENT
varying vec2 vAmbientUV;
uniform sampler2D ambientSampler;
#endif

#ifdef OPACITY	
varying vec2 vOpacityUV;
uniform sampler2D opacitySampler;
#endif

#ifdef EMISSIVE
varying vec2 vEmissiveUV;
uniform sampler2D emissiveSampler;
#endif

#ifdef LIGHTMAP
varying vec2 vLightmapUV;
uniform sampler2D lightmapSampler;
#endif

#if defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_PROJECTION) || defined(REFRACTION)
uniform mat4 view;
#endif

#ifdef REFRACTION

#ifdef REFRACTIONMAP_3D
uniform samplerCube refractionCubeSampler;
#else
uniform sampler2D refraction2DSampler;
#endif

#endif

#if defined(SPECULAR) && defined(SPECULARTERM)
varying vec2 vSpecularUV;
uniform sampler2D specularSampler;
#endif

// Fresnel
#include<fresnelFunction>

// Reflection
#ifdef REFLECTION
#ifdef REFLECTIONMAP_3D
uniform samplerCube reflectionCubeSampler;
#else
uniform sampler2D reflection2DSampler;
#endif

#ifdef REFLECTIONMAP_SKYBOX
varying vec3 vPositionUVW;
#else
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
varying vec3 vDirectionW;
#endif

#endif

#include<reflectionFunction>

#endif

#ifdef CAMERACOLORGRADING
	#include<colorGradingDefinition>	
	#include<colorGrading>
#endif

#ifdef CAMERACOLORCURVES
	#include<colorCurvesDefinition>
	#include<colorCurves>
#endif

#include<bumpFragmentFunctions>
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>

void main(void) {
#include<clipPlaneFragment>

	vec3 viewDirectionW = normalize(vEyePosition - vPositionW);

	// Base color
	vec4 baseColor = vec4(1., 1., 1., 1.);
	vec3 diffuseColor = uMaterial.vDiffuseColor.rgb;

	// Alpha
	float alpha = uMaterial.vDiffuseColor.a;

	// Bump
#ifdef NORMAL
	vec3 normalW = normalize(vNormalW);
#else
	vec3 normalW = vec3(1.0, 1.0, 1.0);
#endif

#include<bumpFragment>

#ifdef TWOSIDEDLIGHTING
	normalW = gl_FrontFacing ? normalW : -normalW;
#endif

#ifdef DIFFUSE
	baseColor = texture2D(diffuseSampler, vDiffuseUV + uvOffset);

#ifdef ALPHATEST
	if (baseColor.a < 0.4)
		discard;
#endif

#ifdef ALPHAFROMDIFFUSE
	alpha *= baseColor.a;
#endif

	baseColor.rgb *= uMaterial.vDiffuseInfos.y;
#endif

#ifdef VERTEXCOLOR
	baseColor.rgb *= vColor.rgb;
#endif

	// Ambient color
	vec3 baseAmbientColor = vec3(1., 1., 1.);

#ifdef AMBIENT
	baseAmbientColor = texture2D(ambientSampler, vAmbientUV + uvOffset).rgb * uMaterial.vAmbientInfos.y;
#endif

	// Specular map
#ifdef SPECULARTERM
	float glossiness = uMaterial.vSpecularColor.a;
	vec3 specularColor = uMaterial.vSpecularColor.rgb;

#ifdef SPECULAR
	vec4 specularMapColor = texture2D(specularSampler, vSpecularUV + uvOffset);
	specularColor = specularMapColor.rgb;
#ifdef GLOSSINESS
	glossiness = glossiness * specularMapColor.a;
#endif
#endif
#else
	float glossiness = 0.;
#endif

	// Lighting
	vec3 diffuseBase = vec3(0., 0., 0.);
	lightingInfo info;
#ifdef SPECULARTERM
	vec3 specularBase = vec3(0., 0., 0.);
#endif
	float shadow = 1.;

#ifdef LIGHTMAP
	vec3 lightmapColor = texture2D(lightmapSampler, vLightmapUV + uvOffset).rgb * uMaterial.vLightmapInfos.y;
#endif

#include<lightFragment>[0..maxSimultaneousLights]

	// Refraction
	vec3 refractionColor = vec3(0., 0., 0.);

#ifdef REFRACTION
	vec3 refractionVector = normalize(refract(-viewDirectionW, normalW, uMaterial.vRefractionInfos.y));
#ifdef REFRACTIONMAP_3D

	refractionVector.y = refractionVector.y * uMaterial.vRefractionInfos.w;

	if (dot(refractionVector, viewDirectionW) < 1.0)
	{
		refractionColor = textureCube(refractionCubeSampler, refractionVector).rgb * uMaterial.vRefractionInfos.x;
	}
#else
	vec3 vRefractionUVW = vec3(uMaterial.refractionMatrix * (view * vec4(vPositionW + refractionVector * uMaterial.vRefractionInfos.z, 1.0)));

	vec2 refractionCoords = vRefractionUVW.xy / vRefractionUVW.z;

	refractionCoords.y = 1.0 - refractionCoords.y;

	refractionColor = texture2D(refraction2DSampler, refractionCoords).rgb * uMaterial.vRefractionInfos.x;
#endif
#endif

	// Reflection
	vec3 reflectionColor = vec3(0., 0., 0.);

#ifdef REFLECTION
	vec3 vReflectionUVW = computeReflectionCoords(vec4(vPositionW, 1.0), normalW);

#ifdef REFLECTIONMAP_3D
#ifdef ROUGHNESS
	float bias = uMaterial.vReflectionInfos.y;

#ifdef SPECULARTERM
	#ifdef SPECULAR
		#ifdef GLOSSINESS
			bias *= (1.0 - specularMapColor.a);
		#endif
	#endif
#endif

	reflectionColor = textureCube(reflectionCubeSampler, vReflectionUVW, bias).rgb * uMaterial.vReflectionInfos.x;
#else
	reflectionColor = textureCube(reflectionCubeSampler, vReflectionUVW).rgb * uMaterial.vReflectionInfos.x;
#endif

#else
	vec2 coords = vReflectionUVW.xy;

#ifdef REFLECTIONMAP_PROJECTION
	coords /= vReflectionUVW.z;
#endif

	coords.y = 1.0 - coords.y;

	reflectionColor = texture2D(reflection2DSampler, coords).rgb * uMaterial.vReflectionInfos.x;
#endif

#ifdef REFLECTIONFRESNEL
	float reflectionFresnelTerm = computeFresnelTerm(viewDirectionW, normalW, uMaterial.reflectionRightColor.a, uMaterial.reflectionLeftColor.a);

#ifdef REFLECTIONFRESNELFROMSPECULAR
#ifdef SPECULARTERM
	reflectionColor *= specularColor.rgb * (1.0 - reflectionFresnelTerm) + reflectionFresnelTerm * uMaterial.reflectionRightColor.rgb;
#else
	reflectionColor *= uMaterial.reflectionLeftColor.rgb * (1.0 - reflectionFresnelTerm) + reflectionFresnelTerm * uMaterial.reflectionRightColor.rgb;
#endif
#else
	reflectionColor *= uMaterial.reflectionLeftColor.rgb * (1.0 - reflectionFresnelTerm) + reflectionFresnelTerm * uMaterial.reflectionRightColor.rgb;
#endif
#endif
#endif

#ifdef REFRACTIONFRESNEL
	float refractionFresnelTerm = computeFresnelTerm(viewDirectionW, normalW, uMaterial.refractionRightColor.a, uMaterial.refractionLeftColor.a);

	refractionColor *= uMaterial.refractionLeftColor.rgb * (1.0 - refractionFresnelTerm) + refractionFresnelTerm * uMaterial.refractionRightColor.rgb;
#endif

#ifdef OPACITY
	vec4 opacityMap = texture2D(opacitySampler, vOpacityUV + uvOffset);

#ifdef OPACITYRGB
	opacityMap.rgb = opacityMap.rgb * vec3(0.3, 0.59, 0.11);
	alpha *= (opacityMap.x + opacityMap.y + opacityMap.z)* uMaterial.vOpacityInfos.y;
#else
	alpha *= opacityMap.a * uMaterial.vOpacityInfos.y;
#endif

#endif

#ifdef VERTEXALPHA
	alpha *= vColor.a;
#endif

#ifdef OPACITYFRESNEL
	float opacityFresnelTerm = computeFresnelTerm(viewDirectionW, normalW, uMaterial.opacityParts.z, uMaterial.opacityParts.w);

	alpha += uMaterial.opacityParts.x * (1.0 - opacityFresnelTerm) + opacityFresnelTerm * uMaterial.opacityParts.y;
#endif

	// Emissive
	vec3 emissiveColor = uMaterial.vEmissiveColor;
#ifdef EMISSIVE
	emissiveColor += texture2D(emissiveSampler, vEmissiveUV + uvOffset).rgb * uMaterial.vEmissiveInfos.y;
#endif

#ifdef EMISSIVEFRESNEL
	float emissiveFresnelTerm = computeFresnelTerm(viewDirectionW, normalW, uMaterial.emissiveRightColor.a, uMaterial.emissiveLeftColor.a);

	emissiveColor *= uMaterial.emissiveLeftColor.rgb * (1.0 - emissiveFresnelTerm) + emissiveFresnelTerm * uMaterial.emissiveRightColor.rgb;
#endif

	// Fresnel
#ifdef DIFFUSEFRESNEL
	float diffuseFresnelTerm = computeFresnelTerm(viewDirectionW, normalW, uMaterial.diffuseRightColor.a, uMaterial.diffuseLeftColor.a);

	diffuseBase *= uMaterial.diffuseLeftColor.rgb * (1.0 - diffuseFresnelTerm) + diffuseFresnelTerm * uMaterial.diffuseRightColor.rgb;
#endif

	// Composition
#ifdef EMISSIVEASILLUMINATION
	vec3 finalDiffuse = clamp(diffuseBase * diffuseColor + vAmbientColor, 0.0, 1.0) * baseColor.rgb;
#else
#ifdef LINKEMISSIVEWITHDIFFUSE
	vec3 finalDiffuse = clamp((diffuseBase + emissiveColor) * diffuseColor + vAmbientColor, 0.0, 1.0) * baseColor.rgb;
#else
	vec3 finalDiffuse = clamp(diffuseBase * diffuseColor + emissiveColor + vAmbientColor, 0.0, 1.0) * baseColor.rgb;
#endif
#endif

#ifdef SPECULARTERM
	vec3 finalSpecular = specularBase * specularColor;
#else
	vec3 finalSpecular = vec3(0.0);
#endif

#ifdef SPECULAROVERALPHA
	alpha = clamp(alpha + dot(finalSpecular, vec3(0.3, 0.59, 0.11)), 0., 1.);
#endif

#ifdef REFLECTIONOVERALPHA
	alpha = clamp(alpha + dot(reflectionColor, vec3(0.3, 0.59, 0.11)), 0., 1.);
#endif

	// Composition
#ifdef EMISSIVEASILLUMINATION
	vec4 color = vec4(clamp(finalDiffuse * baseAmbientColor + finalSpecular + reflectionColor + emissiveColor + refractionColor, 0.0, 1.0), alpha);
#else
	vec4 color = vec4(finalDiffuse * baseAmbientColor + finalSpecular + reflectionColor + refractionColor, alpha);
#endif

//Old lightmap calculation method
#ifdef LIGHTMAP
    #ifndef LIGHTMAPEXCLUDED
        #ifdef USELIGHTMAPASSHADOWMAP
            color.rgb *= lightmapColor;
        #else
            color.rgb += lightmapColor;
        #endif
    #endif
#endif

#include<logDepthFragment>
#include<fogFragment>

#ifdef CAMERACOLORGRADING
	color = colorGrades(color);
#endif

#ifdef CAMERACOLORCURVES
	color.rgb = applyColorCurves(color.rgb);
#endif

	gl_FragColor = color;
}