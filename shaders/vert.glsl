attribute vec4 a_Position;
attribute vec4 a_Color;
attribute float a_Visibility;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjMatrix;

varying vec4 v_Color;
varying float v_Visibility;

void main() {
    v_Color = a_Color;
    v_Visibility = a_Visibility;
    gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
}
