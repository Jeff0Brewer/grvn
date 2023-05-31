attribute vec4 a_Position;
attribute vec4 a_Color;
attribute float a_Visibility;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjMatrix;
uniform float u_TimeStep;

varying vec4 v_Color;
varying float v_Visibility;

void main() {
    v_Color = a_Color / 255.0;
    v_Visibility = clamp(a_Visibility - u_TimeStep, 0.0, 1.0);
    gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
}
