precision highp float;

varying vec4 v_Color;
varying float v_Visibility;

void main() {
    if (v_Visibility != 0.0) {
        discard;
    }
    gl_FragColor = v_Color;
}
