﻿// Attributes
attribute float index;
attribute vec2 zBias;
attribute vec4 transformX;
attribute vec4 transformY;
attribute vec2 origin;

#ifdef Border
attribute float borderThickness;
#endif

#ifdef FillSolid
attribute vec4 fillSolidColor;
#endif

#ifdef BorderSolid
attribute vec4 borderSolidColor;
#endif

#ifdef FillGradient
attribute vec4 fillGradientColor1;
attribute vec4 fillGradientColor2;
attribute vec4 fillGradientTY;
#endif

#ifdef BorderGradient
attribute vec4 borderGradientColor1;
attribute vec4 borderGradientColor2;
attribute vec4 borderGradientTY;
#endif

// xyzw are: width, height, roundRadius (0.0 for simple rectangle with four vertices)
attribute vec3 properties;

// First index is the center, then there's four sections of 16 subdivisions

#define rsub0 17.0
#define rsub1 33.0
#define rsub2 49.0
#define rsub3 65.0
#define rsub 64.0
#define TWOPI 6.28318530

// Output
varying vec2 vUV;
varying vec4 vColor;

void main(void) {

	vec2 pos2;

	// notRound case, only four vertices
	if (properties.z == 0.0) {
		if (index == 1.0) {
			pos2 = vec2(1.0, 1.0);
		} else if (index == 2.0) {
			pos2 = vec2(0.0, 1.0);
		} else if (index == 3.0) {
			pos2 = vec2(0.0, 0.0);
		} else {
			pos2 = vec2(1.0, 0.0);
		}
	}
	else 
	{
#ifdef Border
		float w = properties.x;
		float h = properties.y;
		float r = properties.z;
		float nru = r / w;
		float nrv = r / h;
		vec2 borderOffset = vec2(1.0, 1.0);

		float segi = index;
		if (index < rsub) {
			borderOffset = vec2(1.0-(borderThickness*2.0 / w), 1.0-(borderThickness*2.0 / h));
		}
		else {
			segi -= rsub;
		}

		// right/bottom
		if (segi < rsub0) {
			pos2 = vec2(1.0 - nru, nrv);
		}
		// left/bottom
		else if (segi < rsub1) {
			pos2 = vec2(nru, nrv);
		}
		// left/top
		else if (segi < rsub2) {
			pos2 = vec2(nru, 1.0 - nrv);
		}
		// right/top
		else {
			pos2 = vec2(1.0 - nru, 1.0 - nrv);
		}

		float angle = TWOPI - ((index - 1.0) * TWOPI / (rsub - 0.5));
		pos2.x += cos(angle) * nru;
		pos2.y += sin(angle) * nrv;

		pos2.x = ((pos2.x - 0.5) * borderOffset.x) + 0.5;
		pos2.y = ((pos2.y - 0.5) * borderOffset.y) + 0.5;

#else
		if (index == 0.0) {
			pos2 = vec2(0.5, 0.5);
		}
		else {
			float w = properties.x;
			float h = properties.y;
			float r = properties.z;
			float nru = r / w;
			float nrv = r / h;

			// right/bottom
			if (index < rsub0) {
				pos2 = vec2(1.0 - nru, nrv);
			}
			// left/bottom
			else if (index < rsub1) {
				pos2 = vec2(nru, nrv);
			}
			// left/top
			else if (index < rsub2) {
				pos2 = vec2(nru, 1.0 - nrv);
			}
			// right/top
			else {
				pos2 = vec2(1.0 - nru, 1.0 - nrv);
			}

			float angle = TWOPI - ((index - 1.0) * TWOPI / (rsub - 0.5));
			pos2.x += cos(angle) * nru;
			pos2.y += sin(angle) * nrv;
		}
#endif
	}

#ifdef FillSolid
	vColor = fillSolidColor;
#endif

#ifdef BorderSolid
	vColor = borderSolidColor;
#endif

#ifdef FillGradient
	float v = dot(vec4(pos2.xy, 1, 1), fillGradientTY);
	vColor = mix(fillGradientColor2, fillGradientColor1, v);	// As Y is inverted, Color2 first, then Color1
#endif

#ifdef BorderGradient
	float v = dot(vec4(pos2.xy, 1, 1), borderGradientTY);
	vColor = mix(borderGradientColor2, borderGradientColor1, v);	// As Y is inverted, Color2 first, then Color1
#endif

	vec4 pos;
	pos.xy = (pos2.xy - origin) * properties.xy;
	pos.z = 1.0;
	pos.w = 1.0;
	gl_Position = vec4(dot(pos, transformX), dot(pos, transformY), zBias.x, zBias.y);

}