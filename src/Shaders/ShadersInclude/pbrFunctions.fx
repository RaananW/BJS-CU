// Constants
#define RECIPROCAL_PI2 0.15915494
#define FRESNEL_MAXIMUM_ON_ROUGH 0.25

// PBR CUSTOM CONSTANTS
const float kRougnhessToAlphaScale = 0.1;
const float kRougnhessToAlphaOffset = 0.29248125;

float convertRoughnessToAverageSlope(float roughness)
{
    // Calculate AlphaG as square of roughness; add epsilon to avoid numerical issues
    const float kMinimumVariance = 0.0005;
    float alphaG = square(roughness) + kMinimumVariance;
    return alphaG;
}

// Based on Beckamm roughness to Blinn exponent + http://casual-effects.blogspot.ca/2011/08/plausible-environment-lighting-in-two.html 
float getMipMapIndexFromAverageSlope(float maxMipLevel, float alpha)
{
    // do not take in account lower mips hence -1... and wait from proper preprocess.
    // formula comes from approximation of the mathematical solution.
    //float mip = maxMipLevel + kRougnhessToAlphaOffset + 0.5 * log2(alpha);
    
    // In the mean time 
    // Always [0..1] goes from max mip to min mip in a log2 way.  
    // Change 5 to nummip below.
    // http://www.wolframalpha.com/input/?i=x+in+0..1+plot+(+5+%2B+0.3+%2B+0.1+*+5+*+log2(+(1+-+x)+*+(1+-+x)+%2B+0.0005))
    float mip = kRougnhessToAlphaOffset + maxMipLevel + (maxMipLevel * kRougnhessToAlphaScale * log2(alpha));
    
    return clamp(mip, 0., maxMipLevel);
}

float getMipMapIndexFromAverageSlopeWithPMREM(float maxMipLevel, float alphaG)
{
    float specularPower = clamp(2. / alphaG - 2., 0.000001, 2048.);
    
    // Based on CubeMapGen for cosine power with 2048 spec default and 0.25 dropoff 
    return clamp(- 0.5 * log2(specularPower) + 5.5, 0., maxMipLevel);
}

// From Microfacet Models for Refraction through Rough Surfaces, Walter et al. 2007
float smithVisibilityG1_TrowbridgeReitzGGX(float dot, float alphaG)
{
    float tanSquared = (1.0 - dot * dot) / (dot * dot);
    return 2.0 / (1.0 + sqrt(1.0 + alphaG * alphaG * tanSquared));
}

float smithVisibilityG_TrowbridgeReitzGGX_Walter(float NdotL, float NdotV, float alphaG)
{
    return smithVisibilityG1_TrowbridgeReitzGGX(NdotL, alphaG) * smithVisibilityG1_TrowbridgeReitzGGX(NdotV, alphaG);
}

// Trowbridge-Reitz (GGX)
// Generalised Trowbridge-Reitz with gamma power=2.0
float normalDistributionFunction_TrowbridgeReitzGGX(float NdotH, float alphaG)
{
    // Note: alphaG is average slope (gradient) of the normals in slope-space.
    // It is also the (trigonometric) tangent of the median distribution value, i.e. 50% of normals have
    // a tangent (gradient) closer to the macrosurface than this slope.
    float a2 = square(alphaG);
    float d = NdotH * NdotH * (a2 - 1.0) + 1.0;
    return a2 / (PI * d * d);
}

vec3 fresnelSchlickGGX(float VdotH, vec3 reflectance0, vec3 reflectance90)
{
    return reflectance0 + (reflectance90 - reflectance0) * pow(clamp(1.0 - VdotH, 0., 1.), 5.0);
}

vec3 fresnelSchlickEnvironmentGGX(float VdotN, vec3 reflectance0, vec3 reflectance90, float smoothness)
{
    // Schlick fresnel approximation, extended with basic smoothness term so that rough surfaces do not approach reflectance90 at grazing angle
    float weight = mix(FRESNEL_MAXIMUM_ON_ROUGH, 1.0, smoothness);
    return reflectance0 + weight * (reflectance90 - reflectance0) * pow(clamp(1.0 - VdotN, 0., 1.), 5.0);
}

// Cook Torance Specular computation.
vec3 computeSpecularTerm(float NdotH, float NdotL, float NdotV, float VdotH, float roughness, vec3 reflectance0, vec3 reflectance90)
{
    float alphaG = convertRoughnessToAverageSlope(roughness);
    float distribution = normalDistributionFunction_TrowbridgeReitzGGX(NdotH, alphaG);
    float visibility = smithVisibilityG_TrowbridgeReitzGGX_Walter(NdotL, NdotV, alphaG);
    visibility /= (4.0 * NdotL * NdotV); // Cook Torance Denominator  integated in viibility to avoid issues when visibility function changes.
    float specTerm = max(0., visibility * distribution) * NdotL;

    vec3 fresnel = fresnelSchlickGGX(VdotH, reflectance0, reflectance90);
    return fresnel * specTerm;
}

float computeDiffuseTerm(float NdotL, float NdotV, float VdotH, float roughness)
{
    // Diffuse fresnel falloff as per Disney principled BRDF, and in the spirit of
    // of general coupled diffuse/specular models e.g. Ashikhmin Shirley.
    float diffuseFresnelNV = pow(clamp(1.0 - NdotL, 0.000001, 1.), 5.0);
    float diffuseFresnelNL = pow(clamp(1.0 - NdotV, 0.000001, 1.), 5.0);
    float diffuseFresnel90 = 0.5 + 2.0 * VdotH * VdotH * roughness;
    float fresnel =
        (1.0 + (diffuseFresnel90 - 1.0) * diffuseFresnelNL) *
        (1.0 + (diffuseFresnel90 - 1.0) * diffuseFresnelNV);

    return fresnel * NdotL / PI;
}

float adjustRoughnessFromLightProperties(float roughness, float lightRadius, float lightDistance)
{
    #ifdef USEPHYSICALLIGHTFALLOFF
        // At small angle this approximation works. 
        float lightRoughness = lightRadius / lightDistance;
        // Distribution can sum.
        float totalRoughness = clamp(lightRoughness + roughness, 0., 1.);
        return totalRoughness;
    #else
        return roughness;
    #endif
}

float computeDefaultMicroSurface(float microSurface, vec3 reflectivityColor)
{
    const float kReflectivityNoAlphaWorkflow_SmoothnessMax = 0.95;

    float reflectivityLuminance = getLuminance(reflectivityColor);
    float reflectivityLuma = sqrt(reflectivityLuminance);
    microSurface = reflectivityLuma * kReflectivityNoAlphaWorkflow_SmoothnessMax;

    return microSurface;
}

// For typical incident reflectance range (between 4% to 100%) set the grazing reflectance to 100% for typical fresnel effect.
// For very low reflectance range on highly diffuse objects (below 4%), incrementally reduce grazing reflecance to 0%.
float fresnelGrazingReflectance(float reflectance0) {
	float reflectance90 = clamp(reflectance0 * 25.0, 0.0, 1.0);
	return reflectance90;
}