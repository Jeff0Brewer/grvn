precision highp float;

varying float v_Alpha;

void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, v_Alpha);
}
