﻿vec2 uvOffset = vec2(0.0, 0.0);

#if defined(BUMP) || defined(PARALLAX) || defined(DETAIL)
	#ifdef NORMALXYSCALE
		float normalScale = 1.0;
	#elif defined(BUMP)
		float normalScale = vBumpInfos.y;
	#else
		float normalScale = vDetailInfos.z;
	#endif

	#if defined(TANGENT) && defined(NORMAL)
		mat3 TBN = vTBN;
	#elif defined(BUMP)
		mat3 TBN = cotangent_frame(normalW * normalScale, vPositionW, vBumpUV);
    #else
		mat3 TBN = cotangent_frame(normalW * normalScale, vPositionW, vDetailUV, vec2(1., 1.));
	#endif
#elif defined(ANISOTROPIC)
	#if defined(TANGENT) && defined(NORMAL)
		mat3 TBN = vTBN;
	#else
		mat3 TBN = cotangent_frame(normalW, vPositionW, vMainUV1, vec2(1., 1.));
	#endif
#endif

#ifdef PARALLAX
	mat3 invTBN = transposeMat3(TBN);

	#ifdef PARALLAXOCCLUSION
		uvOffset = parallaxOcclusion(invTBN * -viewDirectionW, invTBN * normalW, vBumpUV, vBumpInfos.z);
	#else
		uvOffset = parallaxOffset(invTBN * viewDirectionW, vBumpInfos.z);
	#endif
#endif

#ifdef DETAIL
	vec4 detailColor = texture2D(detailSampler, vDetailUV + uvOffset);
    vec2 detailNormalRG = detailColor.wy * 2.0 - 1.0;
    float detailNormalNormalB = sqrt(1. - saturate(dot(detailNormalRG, detailNormalRG)));
    vec3 detailNormal = vec3(detailNormalRG, detailNormalNormalB);
#endif

#ifdef BUMP
	#ifdef OBJECTSPACE_NORMALMAP
		normalW = normalize(texture2D(bumpSampler, vBumpUV).xyz  * 2.0 - 1.0);
		normalW = normalize(mat3(normalMatrix) * normalW);	
	#elif !defined(DETAIL)
		normalW = perturbNormal(TBN, vBumpUV + uvOffset);
    #else
        vec3 bumpNormal = texture2D(bumpSampler, vBumpUV + uvOffset).xyz * 2.0 - 1.0;
        #if DETAIL_NORMALBLENDMETHOD == 0 // linear
            vec3 blendedNormal = normalize(bumpNormal + detailNormal * vec3(vDetailInfos.z));
        #elif DETAIL_NORMALBLENDMETHOD == 1 // whiteout
            detailNormal.xy *= vDetailInfos.z;
            vec3 blendedNormal = normalize(vec3(bumpNormal.xy + detailNormal.xy, bumpNormal.z * detailNormal.z));
        #elif DETAIL_NORMALBLENDMETHOD == 2 // RNM
            detailNormal.xy *= vDetailInfos.z;
            bumpNormal += vec3(0.0, 0.0, 1.0);
            detailNormal *= vec3(-1.0, -1.0, 1.0);
            vec3 blendedNormal = bumpNormal * dot(bumpNormal, detailNormal) / bumpNormal.z - detailNormal;
        #endif
        normalW = perturbNormalBase(TBN, blendedNormal, vBumpInfos.y);
	#endif
#elif defined(DETAIL)    
		normalW = perturbNormalBase(TBN, detailNormal, 1.0 / vDetailInfos.z);
#endif