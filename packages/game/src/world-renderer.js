import {
    Program,
    Shader,
    renderContext,
    UNIFORM,
} from "@me.bokov.webglfps/rendering";
import {
    MATERIALDIFFUSE,
    MATERIALSPECULAR,
    MATERIALAMBIENT,
    MATERIALSHININESS,
    LIGHTENERGY,
    LIGHTAMBIENT,
    LIGHTDIR,
} from "./constants";
const {
    blinnPhong: {
        vertex: blinnPhongVertexSource,
        fragment: blinnPhongFragmentSource,
    },
} = require("@me.bokov.webglfps/glsl");

export class WorldRenderer {
    init(platform) {
        const { gl } = platform;
        this.blinnPhongProgram = new Program(
            gl,
            new Shader(gl, gl.VERTEX_SHADER, blinnPhongVertexSource),
            new Shader(gl, gl.FRAGMENT_SHADER, blinnPhongFragmentSource)
        );
    }

    render(game) {
        const { gl } = renderContext;

        gl.uniform3fv(UNIFORM("u_Kd"), MATERIALDIFFUSE);
        gl.uniform3fv(UNIFORM("u_Ks"), MATERIALSPECULAR);
        gl.uniform3fv(UNIFORM("u_Ka"), MATERIALAMBIENT);
        gl.uniform1f(UNIFORM("u_shininess"), MATERIALSHININESS);

        gl.uniform3fv(UNIFORM("u_Le"), LIGHTENERGY);
        gl.uniform3fv(UNIFORM("u_La"), LIGHTAMBIENT);
        gl.uniform3fv(UNIFORM("u_Ld"), LIGHTDIR);

        game.renderables.forEach((r) => r.draw(gl));
    }

    constructor() {}
}
