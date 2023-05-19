precision highp float;

varying float v_Alpha;
varying float v_Visibility;

void main() {
    if(v_Visibility == 0.0) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, v_Alpha);
    }
    else {
        discard;
    }
}
