/**
 * This webGL Support shim will allow running tests using the normal engine in chrome headless.
 */

//Tests should be in the same condition no matter what environment they are running in.
//!(<any>window).WebGLRenderingContext){
export default function webglSupport() {

    //mock webgl support
    (<any>HTMLCanvasElement.prototype)._getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (ctxName, options) {
        //patch in mock webgl
        switch (ctxName) {
            case 'webgl':
            case 'experimental-webgl':
                var ctx = new (<any>window).WebGLRenderingContext();
                // tslint:disable-next-line:no-invalid-this
                ctx.canvas = this;
                // tslint:disable-next-line:no-invalid-this
                ctx.drawingBufferWidth = this.clientWidth;
                // tslint:disable-next-line:no-invalid-this
                ctx.drawingBufferHeight = this.clientHeight;
                return (<any>ctx);
        }
        //pass through to default behavior
        // tslint:disable-next-line:no-invalid-this
        return this._getContext.apply(this, arguments);
    };

    //define WebGLRenderingContext
    (<any>window).WebGLRenderingContext = () => { };

    (<any>window).WebGLRenderingContext.prototype = {
        /* ClearBufferMask */
        DEPTH_BUFFER_BIT: 0x00000100,
        STENCIL_BUFFER_BIT: 0x00000400,
        COLOR_BUFFER_BIT: 0x00004000,

        /* BeginMode */
        POINTS: 0x0000,
        LINES: 0x0001,
        LINE_LOOP: 0x0002,
        LINE_STRIP: 0x0003,
        TRIANGLES: 0x0004,
        TRIANGLE_STRIP: 0x0005,
        TRIANGLE_FAN: 0x0006,

        /* AlphaFunction (not supported in ES20) */
        /*      NEVER */
        /*      LESS */
        /*      EQUAL */
        /*      LEQUAL */
        /*      GREATER */
        /*      NOTEQUAL */
        /*      GEQUAL */
        /*      ALWAYS */

        /* BlendingFactorDest */
        ZERO: 0,
        ONE: 1,
        SRC_COLOR: 0x0300,
        ONE_MINUS_SRC_COLOR: 0x0301,
        SRC_ALPHA: 0x0302,
        ONE_MINUS_SRC_ALPHA: 0x0303,
        DST_ALPHA: 0x0304,
        ONE_MINUS_DST_ALPHA: 0x0305,

        /* BlendingFactorSrc */
        /*      ZERO */
        /*      ONE */
        DST_COLOR: 0x0306,
        ONE_MINUS_DST_COLOR: 0x0307,
        SRC_ALPHA_SATURATE: 0x0308,
        /*      SRC_ALPHA */
        /*      ONE_MINUS_SRC_ALPHA */
        /*      DST_ALPHA */
        /*      ONE_MINUS_DST_ALPHA */

        /* BlendEquationSeparate */
        FUNC_ADD: 0x8006,
        BLEND_EQUATION: 0x8009,
        BLEND_EQUATION_RGB: 0x8009,   /* same as BLEND_EQUATION */
        BLEND_EQUATION_ALPHA: 0x883D,

        /* BlendSubtract */
        FUNC_SUBTRACT: 0x800A,
        FUNC_REVERSE_SUBTRACT: 0x800B,

        /* Separate Blend Functions */
        BLEND_DST_RGB: 0x80C8,
        BLEND_SRC_RGB: 0x80C9,
        BLEND_DST_ALPHA: 0x80CA,
        BLEND_SRC_ALPHA: 0x80CB,
        CONSTANT_COLOR: 0x8001,
        ONE_MINUS_CONSTANT_COLOR: 0x8002,
        CONSTANT_ALPHA: 0x8003,
        ONE_MINUS_CONSTANT_ALPHA: 0x8004,
        BLEND_COLOR: 0x8005,

        /* Buffer Objects */
        ARRAY_BUFFER: 0x8892,
        ELEMENT_ARRAY_BUFFER: 0x8893,
        ARRAY_BUFFER_BINDING: 0x8894,
        ELEMENT_ARRAY_BUFFER_BINDING: 0x8895,
        STREAM_DRAW: 0x88E0,
        STATIC_DRAW: 0x88E4,
        DYNAMIC_DRAW: 0x88E8,
        BUFFER_SIZE: 0x8764,
        BUFFER_USAGE: 0x8765,
        CURRENT_VERTEX_ATTRIB: 0x8626,

        /* CullFaceMode */
        FRONT: 0x0404,
        BACK: 0x0405,
        FRONT_AND_BACK: 0x0408,

        /* DepthFunction */
        /*      NEVER */
        /*      LESS */
        /*      EQUAL */
        /*      LEQUAL */
        /*      GREATER */
        /*      NOTEQUAL */
        /*      GEQUAL */
        /*      ALWAYS */

        /* EnableCap */
        /* TEXTURE_2D */
        CULL_FACE: 0x0B44,
        BLEND: 0x0BE2,
        DITHER: 0x0BD0,
        STENCIL_TEST: 0x0B90,
        DEPTH_TEST: 0x0B71,
        SCISSOR_TEST: 0x0C11,
        POLYGON_OFFSET_FILL: 0x8037,
        SAMPLE_ALPHA_TO_COVERAGE: 0x809E,
        SAMPLE_COVERAGE: 0x80A0,

        /* ErrorCode */
        NO_ERROR: 0,
        INVALID_ENUM: 0x0500,
        INVALID_VALUE: 0x0501,
        INVALID_OPERATION: 0x0502,
        OUT_OF_MEMORY: 0x0505,

        /* FrontFaceDirection */
        CW: 0x0900,
        CCW: 0x0901,

        /* GetPName */
        LINE_WIDTH: 0x0B21,
        ALIASED_POINT_SIZE_RANGE: 0x846D,
        ALIASED_LINE_WIDTH_RANGE: 0x846E,
        CULL_FACE_MODE: 0x0B45,
        FRONT_FACE: 0x0B46,
        DEPTH_RANGE: 0x0B70,
        DEPTH_WRITEMASK: 0x0B72,
        DEPTH_CLEAR_VALUE: 0x0B73,
        DEPTH_FUNC: 0x0B74,
        STENCIL_CLEAR_VALUE: 0x0B91,
        STENCIL_FUNC: 0x0B92,
        STENCIL_FAIL: 0x0B94,
        STENCIL_PASS_DEPTH_FAIL: 0x0B95,
        STENCIL_PASS_DEPTH_PASS: 0x0B96,
        STENCIL_REF: 0x0B97,
        STENCIL_VALUE_MASK: 0x0B93,
        STENCIL_WRITEMASK: 0x0B98,
        STENCIL_BACK_FUNC: 0x8800,
        STENCIL_BACK_FAIL: 0x8801,
        STENCIL_BACK_PASS_DEPTH_FAIL: 0x8802,
        STENCIL_BACK_PASS_DEPTH_PASS: 0x8803,
        STENCIL_BACK_REF: 0x8CA3,
        STENCIL_BACK_VALUE_MASK: 0x8CA4,
        STENCIL_BACK_WRITEMASK: 0x8CA5,
        VIEWPORT: 0x0BA2,
        SCISSOR_BOX: 0x0C10,
        /*      SCISSOR_TEST */
        COLOR_CLEAR_VALUE: 0x0C22,
        COLOR_WRITEMASK: 0x0C23,
        UNPACK_ALIGNMENT: 0x0CF5,
        PACK_ALIGNMENT: 0x0D05,
        MAX_TEXTURE_SIZE: 0x0D33,
        MAX_VIEWPORT_DIMS: 0x0D3A,
        SUBPIXEL_BITS: 0x0D50,
        RED_BITS: 0x0D52,
        GREEN_BITS: 0x0D53,
        BLUE_BITS: 0x0D54,
        ALPHA_BITS: 0x0D55,
        DEPTH_BITS: 0x0D56,
        STENCIL_BITS: 0x0D57,
        POLYGON_OFFSET_UNITS: 0x2A00,
        /*      POLYGON_OFFSET_FILL */
        POLYGON_OFFSET_FACTOR: 0x8038,
        TEXTURE_BINDING_2D: 0x8069,
        SAMPLE_BUFFERS: 0x80A8,
        SAMPLES: 0x80A9,
        SAMPLE_COVERAGE_VALUE: 0x80AA,
        SAMPLE_COVERAGE_INVERT: 0x80AB,

        /* GetTextureParameter */
        /*      TEXTURE_MAG_FILTER */
        /*      TEXTURE_MIN_FILTER */
        /*      TEXTURE_WRAP_S */
        /*      TEXTURE_WRAP_T */
        COMPRESSED_TEXTURE_FORMATS: 0x86A3,

        /* HintMode */
        DONT_CARE: 0x1100,
        FASTEST: 0x1101,
        NICEST: 0x1102,

        /* HintTarget */
        GENERATE_MIPMAP_HINT: 0x8192,

        /* DataType */
        BYTE: 0x1400,
        UNSIGNED_BYTE: 0x1401,
        SHORT: 0x1402,
        UNSIGNED_SHORT: 0x1403,
        INT: 0x1404,
        UNSIGNED_INT: 0x1405,
        FLOAT: 0x1406,

        /* PixelFormat */
        DEPTH_COMPONENT: 0x1902,
        ALPHA: 0x1906,
        RGB: 0x1907,
        RGBA: 0x1908,
        LUMINANCE: 0x1909,
        LUMINANCE_ALPHA: 0x190A,

        /* PixelType */
        /*      UNSIGNED_BYTE */
        UNSIGNED_SHORT_4_4_4_4: 0x8033,
        UNSIGNED_SHORT_5_5_5_1: 0x8034,
        UNSIGNED_SHORT_5_6_5: 0x8363,

        /* Shaders */
        FRAGMENT_SHADER: 0x8B30,
        VERTEX_SHADER: 0x8B31,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8DFB,
        MAX_VARYING_VECTORS: 0x8DFC,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8B4D,
        MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8B4C,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8DFD,
        SHADER_TYPE: 0x8B4F,
        DELETE_STATUS: 0x8B80,
        LINK_STATUS: 0x8B82,
        VALIDATE_STATUS: 0x8B83,
        ATTACHED_SHADERS: 0x8B85,
        ACTIVE_UNIFORMS: 0x8B86,
        ACTIVE_ATTRIBUTES: 0x8B89,
        SHADING_LANGUAGE_VERSION: 0x8B8C,
        CURRENT_PROGRAM: 0x8B8D,

        /* StencilFunction */
        NEVER: 0x0200,
        LESS: 0x0201,
        EQUAL: 0x0202,
        LEQUAL: 0x0203,
        GREATER: 0x0204,
        NOTEQUAL: 0x0205,
        GEQUAL: 0x0206,
        ALWAYS: 0x0207,

        /* StencilOp */
        /*      ZERO */
        KEEP: 0x1E00,
        REPLACE: 0x1E01,
        INCR: 0x1E02,
        DECR: 0x1E03,
        INVERT: 0x150A,
        INCR_WRAP: 0x8507,
        DECR_WRAP: 0x8508,

        /* StringName */
        VENDOR: 0x1F00,
        RENDERER: 0x1F01,
        VERSION: 0x1F02,

        /* TextureMagFilter */
        NEAREST: 0x2600,
        LINEAR: 0x2601,

        /* TextureMinFilter */
        /*      NEAREST */
        /*      LINEAR */
        NEAREST_MIPMAP_NEAREST: 0x2700,
        LINEAR_MIPMAP_NEAREST: 0x2701,
        NEAREST_MIPMAP_LINEAR: 0x2702,
        LINEAR_MIPMAP_LINEAR: 0x2703,

        /* TextureParameterName */
        TEXTURE_MAG_FILTER: 0x2800,
        TEXTURE_MIN_FILTER: 0x2801,
        TEXTURE_WRAP_S: 0x2802,
        TEXTURE_WRAP_T: 0x2803,

        /* TextureTarget */
        TEXTURE_2D: 0x0DE1,
        TEXTURE: 0x1702,
        TEXTURE_CUBE_MAP: 0x8513,
        TEXTURE_BINDING_CUBE_MAP: 0x8514,
        TEXTURE_CUBE_MAP_POSITIVE_X: 0x8515,
        TEXTURE_CUBE_MAP_NEGATIVE_X: 0x8516,
        TEXTURE_CUBE_MAP_POSITIVE_Y: 0x8517,
        TEXTURE_CUBE_MAP_NEGATIVE_Y: 0x8518,
        TEXTURE_CUBE_MAP_POSITIVE_Z: 0x8519,
        TEXTURE_CUBE_MAP_NEGATIVE_Z: 0x851A,
        MAX_CUBE_MAP_TEXTURE_SIZE: 0x851C,

        /* TextureUnit */
        TEXTURE0: 0x84C0,
        TEXTURE1: 0x84C1,
        TEXTURE2: 0x84C2,
        TEXTURE3: 0x84C3,
        TEXTURE4: 0x84C4,
        TEXTURE5: 0x84C5,
        TEXTURE6: 0x84C6,
        TEXTURE7: 0x84C7,
        TEXTURE8: 0x84C8,
        TEXTURE9: 0x84C9,
        TEXTURE10: 0x84CA,
        TEXTURE11: 0x84CB,
        TEXTURE12: 0x84CC,
        TEXTURE13: 0x84CD,
        TEXTURE14: 0x84CE,
        TEXTURE15: 0x84CF,
        TEXTURE16: 0x84D0,
        TEXTURE17: 0x84D1,
        TEXTURE18: 0x84D2,
        TEXTURE19: 0x84D3,
        TEXTURE20: 0x84D4,
        TEXTURE21: 0x84D5,
        TEXTURE22: 0x84D6,
        TEXTURE23: 0x84D7,
        TEXTURE24: 0x84D8,
        TEXTURE25: 0x84D9,
        TEXTURE26: 0x84DA,
        TEXTURE27: 0x84DB,
        TEXTURE28: 0x84DC,
        TEXTURE29: 0x84DD,
        TEXTURE30: 0x84DE,
        TEXTURE31: 0x84DF,
        ACTIVE_TEXTURE: 0x84E0,

        /* TextureWrapMode */
        REPEAT: 0x2901,
        CLAMP_TO_EDGE: 0x812F,
        MIRRORED_REPEAT: 0x8370,

        /* Uniform Types */
        FLOAT_VEC2: 0x8B50,
        FLOAT_VEC3: 0x8B51,
        FLOAT_VEC4: 0x8B52,
        INT_VEC2: 0x8B53,
        INT_VEC3: 0x8B54,
        INT_VEC4: 0x8B55,
        BOOL: 0x8B56,
        BOOL_VEC2: 0x8B57,
        BOOL_VEC3: 0x8B58,
        BOOL_VEC4: 0x8B59,
        FLOAT_MAT2: 0x8B5A,
        FLOAT_MAT3: 0x8B5B,
        FLOAT_MAT4: 0x8B5C,
        SAMPLER_2D: 0x8B5E,
        SAMPLER_CUBE: 0x8B60,

        /* Vertex Arrays */
        VERTEX_ATTRIB_ARRAY_ENABLED: 0x8622,
        VERTEX_ATTRIB_ARRAY_SIZE: 0x8623,
        VERTEX_ATTRIB_ARRAY_STRIDE: 0x8624,
        VERTEX_ATTRIB_ARRAY_TYPE: 0x8625,
        VERTEX_ATTRIB_ARRAY_NORMALIZED: 0x886A,
        VERTEX_ATTRIB_ARRAY_POINTER: 0x8645,
        VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 0x889F,

        /* Read Format */
        IMPLEMENTATION_COLOR_READ_TYPE: 0x8B9A,
        IMPLEMENTATION_COLOR_READ_FORMAT: 0x8B9B,

        /* Shader Source */
        COMPILE_STATUS: 0x8B81,

        /* Shader Precision-Specified Types */
        LOW_FLOAT: 0x8DF0,
        MEDIUM_FLOAT: 0x8DF1,
        HIGH_FLOAT: 0x8DF2,
        LOW_INT: 0x8DF3,
        MEDIUM_INT: 0x8DF4,
        HIGH_INT: 0x8DF5,

        /* Framebuffer Object. */
        FRAMEBUFFER: 0x8D40,
        RENDERBUFFER: 0x8D41,
        RGBA4: 0x8056,
        RGB5_A1: 0x8057,
        RGB565: 0x8D62,
        DEPTH_COMPONENT16: 0x81A5,
        STENCIL_INDEX: 0x1901,
        STENCIL_INDEX8: 0x8D48,
        DEPTH_STENCIL: 0x84F9,
        RENDERBUFFER_WIDTH: 0x8D42,
        RENDERBUFFER_HEIGHT: 0x8D43,
        RENDERBUFFER_INTERNAL_FORMAT: 0x8D44,
        RENDERBUFFER_RED_SIZE: 0x8D50,
        RENDERBUFFER_GREEN_SIZE: 0x8D51,
        RENDERBUFFER_BLUE_SIZE: 0x8D52,
        RENDERBUFFER_ALPHA_SIZE: 0x8D53,
        RENDERBUFFER_DEPTH_SIZE: 0x8D54,
        RENDERBUFFER_STENCIL_SIZE: 0x8D55,
        FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE: 0x8CD0,
        FRAMEBUFFER_ATTACHMENT_OBJECT_NAME: 0x8CD1,
        FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL: 0x8CD2,
        FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: 0x8CD3,
        COLOR_ATTACHMENT0: 0x8CE0,
        DEPTH_ATTACHMENT: 0x8D00,
        STENCIL_ATTACHMENT: 0x8D20,
        DEPTH_STENCIL_ATTACHMENT: 0x821A,
        NONE: 0,
        FRAMEBUFFER_COMPLETE: 0x8CD5,
        FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 0x8CD6,
        FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: 0x8CD7,
        FRAMEBUFFER_INCOMPLETE_DIMENSIONS: 0x8CD9,
        FRAMEBUFFER_UNSUPPORTED: 0x8CDD,
        FRAMEBUFFER_BINDING: 0x8CA6,
        RENDERBUFFER_BINDING: 0x8CA7,
        MAX_RENDERBUFFER_SIZE: 0x84E8,
        INVALID_FRAMEBUFFER_OPERATION: 0x0506,

        /* WebGL-specific enums */
        UNPACK_FLIP_Y_WEBGL: 0x9240,
        UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
        CONTEXT_LOST_WEBGL: 0x9242,
        UNPACK_COLORSPACE_CONVERSION_WEBGL: 0x9243,
        BROWSER_DEFAULT_WEBGL: 0x9244,

        canvas: null,
        drawingBufferWidth: 0,
        drawingBufferHeight: 0,

        getContextAttributes: function () { return {}; },
        isContextLost: function () { return {}; },
        getSupportedExtensions: function () { return {}; },
        getExtension: function (name) { return name === "EXT_texture_filter_anisotropic" ? {} : null; },
        activeTexture: function () { return {}; },
        attachShader: function () { return {}; },
        bindAttribLocation: function () { return {}; },
        bindBuffer: function () { return {}; },
        bindFramebuffer: function () { return {}; },
        bindRenderbuffer: function () { return {}; },
        bindTexture: function () { return {}; },
        blendColor: function () { return {}; },
        blendEquation: function () { return {}; },
        blendEquationSeparate: function () { return {}; },
        blendFunc: function () { return {}; },
        blendFuncSeparate: function () { return {}; },
        bufferData: function () { return {}; },
        bufferSubData: function () { return {}; },
        checkFramebufferStatus: function () { return {}; },
        clear: function () { return {}; },
        clearColor: function () { return {}; },
        clearDepth: function () { return {}; },
        clearStencil: function () { return {}; },
        colorMask: function () { return {}; },
        compileShader: function () { return {}; },
        compressedTexImage2D: function () { return {}; },
        compressedTexSubImage2D: function () { return {}; },
        copyTexImage2D: function () { return {}; },
        copyTexSubImage2D: function () { return {}; },
        createBuffer: function () { return {}; },
        createFramebuffer: function () { return {}; },
        createProgram: function () { return {}; },
        createRenderbuffer: function () { return {}; },
        createShader: function () { return {}; },
        createTexture: function () { return {}; },
        cullFace: function () { return {}; },
        deleteBuffer: function () { return {}; },
        deleteFramebuffer: function () { return {}; },
        deleteProgram: function () { return {}; },
        deleteRenderbuffer: function () { return {}; },
        deleteShader: function () { return {}; },
        deleteTexture: function () { return {}; },
        depthFunc: function () { return {}; },
        depthMask: function () { return {}; },
        depthRange: function () { return {}; },
        detachShader: function () { return {}; },
        disable: function () { return {}; },
        disableVertexAttribArray: function () { return {}; },
        drawArrays: function () { return {}; },
        drawElements: function () { return {}; },
        enable: function () { return {}; },
        enableVertexAttribArray: function () { return {}; },
        finish: function () { return {}; },
        flush: function () { return {}; },
        framebufferRenderbuffer: function () { return {}; },
        framebufferTexture2D: function () { return {}; },
        frontFace: function () { return {}; },
        generateMipmap: function () { return {}; },
        getActiveAttrib: function () { return {}; },
        getActiveUniform: function () { return {}; },
        getAttachedShaders: function () { return {}; },
        getAttribLocation: function () { return {}; },
        getBufferParameter: function () { return {}; },
        getParameter: function () { return 256; },
        getError: function () { return 0; },
        getFramebufferAttachmentParameter: function () { return {}; },
        getProgramParameter: function () { return {}; },
        getProgramInfoLog: function () { return {}; },
        getRenderbufferParameter: function () { return {}; },
        getShaderParameter: function () { return {}; },
        getShaderPrecisionFormat: function () { return {}; },
        getShaderInfoLog: function () { return {}; },
        getShaderSource: function () { return {}; },
        getTexParameter: function () { return {}; },
        getUniform: function () { return {}; },
        getUniformLocation: function () { return {}; },
        getVertexAttrib: function () { return {}; },
        getVertexAttribOffset: function () { return {}; },
        hint: function () { return {}; },
        isBuffer: function () { return {}; },
        isEnabled: function () { return {}; },
        isFramebuffer: function () { return {}; },
        isProgram: function () { return {}; },
        isRenderbuffer: function () { return {}; },
        isShader: function () { return {}; },
        isTexture: function () { return {}; },
        lineWidth: function () { return {}; },
        linkProgram: function () { return {}; },
        pixelStorei: function () { return {}; },
        polygonOffset: function () { return {}; },
        readPixels: function () { return {}; },
        renderbufferStorage: function () { return {}; },
        sampleCoverage: function () { return {}; },
        scissor: function () { return {}; },
        shaderSource: function () { return {}; },
        stencilFunc: function () { return {}; },
        stencilFuncSeparate: function () { return {}; },
        stencilMask: function () { return {}; },
        stencilMaskSeparate: function () { return {}; },
        stencilOp: function () { return {}; },
        stencilOpSeparate: function () { return {}; },
        texImage2D: function () { return {}; },
        texImage3D: function () { return {}; },
        texParameterf: function () { return {}; },
        texParameteri: function () { return {}; },
        texSubImage2D: function () { return {}; },
        uniform1f: function () { return {}; },
        uniform1fv: function () { return {}; },
        uniform1i: function () { return {}; },
        uniform1iv: function () { return {}; },
        uniform2f: function () { return {}; },
        uniform2fv: function () { return {}; },
        uniform2i: function () { return {}; },
        uniform2iv: function () { return {}; },
        uniform3f: function () { return {}; },
        uniform3fv: function () { return {}; },
        uniform3i: function () { return {}; },
        uniform3iv: function () { return {}; },
        uniform4f: function () { return {}; },
        uniform4fv: function () { return {}; },
        uniform4i: function () { return {}; },
        uniform4iv: function () { return {}; },
        uniformMatrix2fv: function () { return {}; },
        uniformMatrix3fv: function () { return {}; },
        uniformMatrix4fv: function () { return {}; },
        useProgram: function () { return {}; },
        validateProgram: function () { return {}; },
        vertexAttrib1f: function () { return {}; },
        vertexAttrib1fv: function () { return {}; },
        vertexAttrib2f: function () { return {}; },
        vertexAttrib2fv: function () { return {}; },
        vertexAttrib3f: function () { return {}; },
        vertexAttrib3fv: function () { return {}; },
        vertexAttrib4f: function () { return {}; },
        vertexAttrib4fv: function () { return {}; },
        vertexAttribPointer: function () { return {}; },
        viewport: function () { return {}; }
    };

}