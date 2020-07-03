export default {
    vertex: `
#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;

uniform mat4 u_M;
uniform mat4 u_MV;
uniform mat4 u_MVP;

out vec3 v_worldPosition;
out vec3 v_worldNormal;
out vec3 v_viewPosition;
out vec3 v_viewNormal;

void main() {
    vec4 worldPosition = u_M * vec4(a_position, 1.0);
    vec4 viewPosition = u_MV * vec4(a_position, 1.0);
    vec4 screenPosition = u_MVP * vec4(a_position, 1.0);
    vec3 worldNormal = normalize ((u_M * vec4(a_normal, 0.0)).xyz);
    vec3 viewNormal = normalize ((u_MV * vec4(a_normal, 0.0)).xyz);

    gl_Position = screenPosition;
    v_worldPosition = worldPosition.xyz;
    v_viewPosition = viewPosition.xyz;
    v_worldNormal = worldNormal;
    v_viewNormal = viewNormal;
}
    `.trim(),
    fragment: `
#version 300 es
precision highp float;

uniform vec3 u_Kd;
uniform vec3 u_Ks;
uniform vec3 u_Ka;
uniform float u_shininess;

uniform vec3 u_Le;
uniform vec3 u_La;
uniform vec3 u_Ld;

uniform vec3 u_cameraPosition;
uniform vec3 u_cameraForward;

in vec3 v_worldPosition;
in vec3 v_worldNormal;
in vec3 v_viewPosition;
in vec3 v_viewNormal;

out vec4 out_finalColor;

vec3 toneMap(in vec3 color) {
    return pow(color, vec3(1.0 / 2.2));
}

vec3 directionalLight(in vec3 Ld, in vec3 La, in vec3 Le) {
    vec3 result = La * u_Ka;

    float cosTheta = clamp (dot ( v_worldNormal, Ld ), 0.0, 1.0);
    result += Le * u_Kd * cosTheta;

    if (cosTheta > 0.0) {
        vec3 eyeDir = normalize(u_cameraPosition - v_worldPosition);
        vec3 halfwayDir = normalize(Ld + eyeDir);
        float cosAlpha = clamp (dot(v_worldNormal, halfwayDir), 0.0, 1.0);
        result += Le * u_Ks * pow(cosAlpha, u_shininess);
    }

    return result;
}

vec3 lighting() {

    vec3 result = directionalLight(
        u_Ld,
        u_La,
        u_Le
    ) + directionalLight (
        normalize(cross(-1.0 * u_Ld, vec3(1.0, 0.0, 0.0))),
        u_La,
        u_Le * 0.4
    );

    return result;

}

void main() {

    out_finalColor = vec4(toneMap(lighting()), 1.0);

}
`.trim(),
};
