attribute vec4 a_Position;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjMatrix;
uniform mat4 u_GrainPos;
uniform vec4 u_Color;

varying vec4 v_Color;

void main() {
    gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * u_GrainPos * a_Position;
    v_Color = u_Color;
}
