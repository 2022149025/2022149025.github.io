#version 300 es
layout(location = 0) in vec3 aPos;

uniform vec2 uOffset;

void main() {
    gl_Position = vec4(aPos.xy + uOffset, aPos.z, 1.0);
}