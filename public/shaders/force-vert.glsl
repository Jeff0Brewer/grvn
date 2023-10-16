attribute float a_Index;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjMatrix;

uniform vec3 u_CameraPosition;
uniform float u_DirectionOffset;
uniform vec2 u_TextureDimensions;
uniform sampler2D u_Texture;

varying float v_Alpha;

const float invScale = 1.0 / 100000.0;
float floatFromRgba (vec4 rgba) {
    vec4 bytes = rgba * 255.0;
    float decoded = bytes.a * 1.0 + bytes.b * 255.0 + bytes.g * 65025.0 + bytes.r * 16581375.0;
    return decoded * invScale * 2500.0 - 500.0;
}

vec2 indexToCoord (float index) {
    float row = floor(index / u_TextureDimensions[0]);
    float col = mod(index, u_TextureDimensions[0]);
    // add 0.5 to center on pixel
    return vec2(
        (col + 0.5) / u_TextureDimensions[0],
        (row + 0.5) / u_TextureDimensions[1]
    );
}

vec2 indexToCorner (float index) {
    float ind = floor(mod(index, 6.0) + 0.5);
    return vec2(
        ind < 1.0 || ind > 3.0 ? 1.0 : -1.0,
        ind < 2.0 || ind > 4.0 ? 1.0 : -1.0
    );
}

float magnitudeToAlpha (float magnitude) {
    return min(pow(magnitude, 1.25) * 2.5, 1.0);
}

void main() {
    // get data from texture for center xyz, line direction, and line length
    float lineIndex = floor(a_Index / 6.0);
    vec4 xData = texture2D(u_Texture, indexToCoord(lineIndex * 3.0));
    vec4 yData = texture2D(u_Texture, indexToCoord(lineIndex * 3.0 + 1.0));
    vec4 zData = texture2D(u_Texture, indexToCoord(lineIndex * 3.0 + 2.0));
    vec4 dirData = texture2D(u_Texture, indexToCoord(lineIndex + u_DirectionOffset));

    // parse byte data into float values
    vec3 center = vec3(
        floatFromRgba(xData),
        floatFromRgba(yData),
        floatFromRgba(zData)
    );

    vec3 direction = normalize(vec3(
        dirData.r - 0.5,
        dirData.g - 0.5,
        dirData.b - 0.5
    ));

    float magnitude = dirData.a;

    vec3 cameraVec = normalize(center - u_CameraPosition);
    vec3 perpDirection = cross(cameraVec, direction);

    vec2 corner = indexToCorner(a_Index);

    float length = magnitude * 60.0;
    float width = 1.0;
    vec3 position = center + direction * corner[0] * length + perpDirection * corner[1] * width;

    gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * vec4(position, 1.0);
    v_Alpha = magnitudeToAlpha(magnitude);
}
