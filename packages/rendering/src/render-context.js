import { mat4, vec3 } from "gl-matrix";

const SYM_RENDER_CONTEXT = Symbol.for("@me.bokov.webglfps/renderContext");
if (typeof window[SYM_RENDER_CONTEXT] === "undefined") {
    window[SYM_RENDER_CONTEXT] = {
        transform: {
            view: mat4.create(),
            projection: mat4.create(),
            model: mat4.create(),
            modelView: mat4.create(),
            modelViewProjection: mat4.create(),
        },
        camera: {
            position: vec3.create(),
            forward: vec3.create(),
            right: vec3.create(),
            up: vec3.create(),
        },
        program: undefined,
        gl: undefined,
    };
}

export var renderContext = window[SYM_RENDER_CONTEXT];

export function patchRenderContext(patch) {
    renderContext = Object.assign(renderContext, patch);
}

export function updateRenderContext(opts) {
    renderContext.program = opts.program;
    renderContext.gl = opts.gl;
    renderContext.transform.modelView = mat4.mul(
        renderContext.transform.modelView,
        renderContext.transform.view,
        renderContext.transform.model
    );
    renderContext.transform.modelViewProjection = mat4.clone(
        renderContext.transform.projection
    );
    renderContext.transform.modelViewProjection = mat4.multiply(
        renderContext.transform.modelViewProjection,
        renderContext.transform.modelViewProjection,
        renderContext.transform.view
    );
    renderContext.transform.modelViewProjection = mat4.multiply(
        renderContext.transform.modelViewProjection,
        renderContext.transform.modelViewProjection,
        renderContext.transform.model
    );
}

export function UNIFORM(name) {
    if (renderContext.program && renderContext.gl) {
        return renderContext.program.uniformLocation(renderContext.gl, name);
    }
    throw new Error(
        "UNIFORM can only be used when the WebGL context and the shader program is set in the renderContext!"
    );
}
