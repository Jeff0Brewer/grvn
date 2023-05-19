attribute vec4 a_Position;
attribute vec4 a_Color;
attribute float a_Visibility;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjMatrix;

varying vec3 v_Position;
varying vec4 v_Color;
varying float v_Visibility;

void main() {
    gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_Position = vec3(u_ModelMatrix * a_Position);
    v_Visibility = a_Visibility;
    v_Color = a_Color;
}
