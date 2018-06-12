﻿// Attributes
attribute vec3 position;
attribute vec4 color;
attribute float angle;
attribute vec2 offset;
attribute vec2 size;
#ifdef ANIMATESHEET	
attribute float cellIndex;
#endif
#ifndef BILLBOARD	
attribute vec3 direction;
#endif

// Uniforms
uniform mat4 view;
uniform mat4 projection;

#ifdef ANIMATESHEET	
uniform vec3 particlesInfos; // x (number of rows) y(number of columns) z(rowSize)
#endif

// Output
varying vec2 vUV;
varying vec4 vColor;

#ifdef CLIPPLANE
uniform vec4 vClipPlane;
uniform mat4 invView;
varying float fClipDistance;
#endif

void main(void) {	
	vec2 cornerPos;
	
	cornerPos = vec2(offset.x - 0.5, offset.y  - 0.5) * size;

#ifdef BILLBOARD	
	// Rotate
	vec3 rotatedCorner;
	rotatedCorner.x = cornerPos.x * cos(angle) - cornerPos.y * sin(angle);
	rotatedCorner.y = cornerPos.x * sin(angle) + cornerPos.y * cos(angle);
	rotatedCorner.z = 0.;

	vec3 viewPos = (view * vec4(position, 1.0)).xyz + rotatedCorner; 

	// Position
	gl_Position = projection * vec4(viewPos, 1.0);   
#else
	// Rotate
	vec3 rotatedCorner;
	rotatedCorner.x = cornerPos.x * cos(angle) - cornerPos.y * sin(angle);
	rotatedCorner.z = cornerPos.x * sin(angle) + cornerPos.y * cos(angle);
	rotatedCorner.y = 0.;

	vec3 worldPos = position + rotatedCorner; 

	vec3 yaxis = normalize(direction);
	vec3 xaxis = normalize(cross(vec3(0., 1.0, 0.), yaxis));
	vec3 zaxis = normalize(cross(yaxis, xaxis));

	vec4 row0 = vec4(xaxis.x, xaxis.y, xaxis.z, 0.);
	vec4 row1 = vec4(yaxis.x, yaxis.y, yaxis.z, 0.);
	vec4 row2 = vec4(zaxis.x, zaxis.y, zaxis.z, 0.);
	// vec4 row0 = vec4(1., 0., 0., 0.);
	// vec4 row1 = vec4(0., 1., 0., 0.);
	// vec4 row2 = vec4(0., 0., 1., 0.);
	vec4 row3 = vec4(0., 0., 0., 1.0);

	mat4 rotMatrix =  mat4(row0, row1, row2, row3);

	vec4 alignedWorld = rotMatrix * vec4(worldPos, 0.0);

	gl_Position = projection * view * vec4(alignedWorld.xyz, 1.0);  
#endif	
	vColor = color;

	#ifdef ANIMATESHEET
		float rowOffset = floor(cellIndex / particlesInfos.z);
		float columnOffset = cellIndex - rowOffset * particlesInfos.z;

		vec2 uvScale = particlesInfos.xy;
		vec2 uvOffset = vec2(offset.x , 1.0 - offset.y);
		vUV = (uvOffset + vec2(columnOffset, rowOffset)) * uvScale;
	#else
		vUV = offset;
	#endif

	// Clip plane
#ifdef CLIPPLANE
	vec4 worldPos = invView * vec4(viewPos, 1.0);
	fClipDistance = dot(worldPos, vClipPlane);
#endif
}