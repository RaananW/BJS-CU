#if SM_USEDISTANCE == 1
    vPositionWSM = worldPos.xyz;
#endif

#if SM_DEPTHTEXTURE == 1
    // Depth texture Linear bias.
    #if SM_USE_REVERSE_DEPTHBUFFER == 1
        gl_Position.z -= biasAndScaleSM.x * gl_Position.w;
    #else
        gl_Position.z += biasAndScaleSM.x * gl_Position.w;
    #endif
#endif

#if defined(SM_DEPTHCLAMP) &&  SM_DEPTHCLAMP == 1
    #if SM_USE_REVERSE_DEPTHBUFFER == 1
        zSM = -gl_Position.z;
    #else
        zSM = gl_Position.z;
    #endif
    gl_Position.z = 0.0;
#elif SM_USEDISTANCE == 0
    // Color Texture Linear bias.
    #if SM_USE_REVERSE_DEPTHBUFFER == 1
        vDepthMetricSM = ((-gl_Position.z + depthValuesSM.x) / (depthValuesSM.y)) + biasAndScaleSM.x;
    #else
        vDepthMetricSM = ((gl_Position.z + depthValuesSM.x) / (depthValuesSM.y)) + biasAndScaleSM.x;
    #endif
#endif
